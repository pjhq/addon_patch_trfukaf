import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { inventoryFromConfigs, patchedInventory, prepareHistory, readHistory, readPatchVersion, refreshHistory, renderChangelog, saveHistory } from "../scripts/lib/changelog.ts";

const inventory = (content: string, addon = "TRF") => inventoryFromConfigs([{ addon, content }]);
const oldInventory = inventory("class CfgWeapons { class Old {}; };");
const newInventory = inventory("class CfgWeapons { class Old {}; class New {}; };");

describe("versioned patch changelog", () => {
  test("tracks declared registry children, excluding nested and forward classes", () => {
    expect(inventory("class CfgWeapons { class External; class Vest: External { class ItemInfo {}; }; }; class Other { class Ignore {}; };")).toEqual([
      { registry: "CfgWeapons", className: "Vest", addons: ["TRF"] }
    ]);
  });

  test("first version establishes a baseline without listing every class", () => {
    const history = refreshHistory(undefined, oldInventory, "0.1.0");
    expect(history.versions).toHaveLength(1);
    expect(renderChangelog(history).trim()).toBe("## 0.1.0");
  });

  test("renders only additions from the previous version, not old classes or removals", () => {
    const baseline = refreshHistory(undefined, oldInventory, "0.1.0");
    const next = refreshHistory(baseline, inventory("class CfgWeapons { class New {}; };"), "0.1.1");
    expect(renderChangelog(next).trim()).toBe("## 0.1.1\n\n### TRF.pbo\n\n- `New`");
    expect(next.versions[0]?.inventory).toEqual(oldInventory);
  });

  test("same-version refresh retains the previous-version comparison", () => {
    const baseline = refreshHistory(undefined, oldInventory, "0.1.0");
    const next = refreshHistory(baseline, newInventory, "0.1.1");
    expect(refreshHistory(next, newInventory, "0.1.1")).toEqual(next);
    const updated = refreshHistory(next, inventory("class CfgWeapons { class Old {}; class Later {}; };"), "0.1.1");
    expect(updated.versions).toHaveLength(2);
    expect(renderChangelog(updated)).toContain("`Later`");
    expect(renderChangelog(updated)).not.toContain("`New`");
    expect(() => refreshHistory(next, oldInventory, "0.1.0")).toThrow("historical patch version");
  });

  test("each new version replaces the changelog instead of accumulating previous releases", () => {
    const baseline = refreshHistory(undefined, oldInventory, "0.1.0");
    const next = refreshHistory(baseline, newInventory, "0.1.1");
    const latest = refreshHistory(next, inventory("class CfgWeapons { class Old {}; class New {}; class Latest {}; };"), "0.1.2");
    expect(renderChangelog(latest).trim()).toBe("## 0.1.2\n\n### TRF.pbo\n\n- `Latest`");
  });

  test("groups and sorts additions under each source PBO", () => {
    const baseline = refreshHistory(undefined, oldInventory, "0.1.0");
    const source = inventoryFromConfigs([
      { addon: "Z", content: "class CfgWeapons { class Zebra {}; class Shared {}; };" },
      { addon: "A", content: "class CfgWeapons { class Shared {}; class Alpha {}; };" }
    ]);
    const next = refreshHistory(baseline, source, "0.1.1");
    expect(renderChangelog(next).trim()).toBe(
      "## 0.1.1\n\n### A.pbo\n\n- `Alpha`\n- `Shared`\n\n### Z.pbo\n\n- `Shared`\n- `Zebra`"
    );
  });

  test("addon moves and property changes are not additions", () => {
    const baseline = refreshHistory(undefined, inventory("class CfgWeapons { class Vest { armor = 24; }; };", "OldAddon"), "0.1.0");
    const next = refreshHistory(baseline, inventory("class cfgweapons { class VEST { armor = 15; }; };", "NewAddon"), "0.1.1");
    expect(renderChangelog(next)).not.toContain(".pbo");
  });

  test("merges origins and includes only patched targets", () => {
    const source = inventoryFromConfigs([
      { addon: "Z", content: "class CfgWeapons { class Vest {}; class Unpatched {}; };" },
      { addon: "A", content: "class CfgWeapons { class Vest {}; };" }
    ]);
    const targets = [{ directory: "patch", helmet: [], vest: ["Vest"], hidden: [] }];
    expect(patchedInventory(source, targets)).toEqual([{ registry: "CfgWeapons", className: "Vest", addons: ["A", "Z"] }]);
    expect(() => patchedInventory(source, [{ directory: "patch", helmet: [], vest: ["Missing"], hidden: [] }])).toThrow("not found");
  });

  test("refresh uses HEMTT version, ordinary docs do not update history, and legacy baseline migrates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "trf-changelog-test-"));
    try {
      await mkdir(path.join(root, ".hemtt"));
      await writeFile(path.join(root, ".hemtt/project.toml"), "[version]\nmajor = 0\nminor = 1\npatch = 1\n");
      expect(await readPatchVersion(root)).toBe("0.1.1");
      const baseline = refreshHistory(undefined, oldInventory, "0.1.0");
      await saveHistory(root, baseline);
      const source = path.join(root, "source_addons/trf_ukaf/TRF");
      await mkdir(source, { recursive: true });
      await writeFile(path.join(source, "config.cpp"), "class CfgWeapons { class Old {}; class New {}; };");
      const targets = [{ directory: "patch", helmet: [], vest: ["Old", "New"], hidden: [] }];
      expect(await prepareHistory(root, false, targets)).toEqual(baseline);
      const refreshed = await prepareHistory(root, true, targets);
      expect(refreshed?.versions.at(-1)?.version).toBe("0.1.1");
      expect(await readHistory(root)).toEqual(baseline);
      await saveHistory(root, refreshed!);
      expect(await readHistory(root)).toEqual(refreshed);
      const file = path.join(root, "docs/history/patch.json");
      const before = await readFile(file, "utf8");
      await saveHistory(root, refreshed!);
      expect(await readFile(file, "utf8")).toBe(before);
      await writeFile(file, JSON.stringify({ schemaVersion: 1, baselineInventory: oldInventory, inventory: oldInventory, entries: [] }));
      expect((await readHistory(root))?.versions[0]?.version).toBe("0.1.1");
      await writeFile(file, '{"schemaVersion":2}');
      await expect(readHistory(root)).rejects.toThrow("Invalid classname history");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
