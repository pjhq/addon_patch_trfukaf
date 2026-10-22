import { describe, expect, test } from "bun:test";

import { auditConfigs, renderMarkdown, type AuditFile } from "../scripts/lib/audit-analysis.ts";

function file(relativePath: string, content: string): AuditFile {
  return {
    absolutePath: `C:/fixture/${relativePath}`,
    relativePath,
    addon: relativePath.split("/")[0] ?? relativePath,
    content
  };
}

const source = file(
  "TRF_TEST/config.cpp",
  `
    class CfgWeapons {
      class ItemCore;
      class ArmoredHelmet: ItemCore {
        class ItemInfo: HeadgearItem {
          class HitpointsProtectionInfo { class Head { armor = 10; }; };
        };
      };
      class SoftHat: ItemCore {
        class ItemInfo: HeadgearItem {
          class HitpointsProtectionInfo { class Head { armor = 0; }; };
        };
      };
      class ArmoredVest: ItemCore {
        class ItemInfo: VestItem {
          class HitpointsProtectionInfo { class Chest { armor = 20; }; };
        };
      };
      class ChildVest: ArmoredVest {};
      class Webbing: ItemCore { class ItemInfo: VestItem {}; };
      class TestUniform: Uniform_Base {
        class ItemInfo: UniformItem { uniformClass = "Test_Soldier"; };
      };
    };
    class CfgVehicles {
      class Test_Soldier: B_Soldier_base_F { uniformClass = "TestUniform"; };
      class Rifleman: B_Soldier_F {};
      class Test_Backpack: B_AssaultPack_mcamo {};
      class Test_Prop: House_F {};
    };
  `
);

describe("TRF UKAF audit", () => {
  test("finds armored gear and linked uniform soldiers only", () => {
    const patch = file(
      "patch/config.cpp",
      `
        class CfgWeapons {
          PJHQ_PATCH_HELMET_ARMOR(armoredhelmet);
          PJHQ_PATCH_VEST_ARMOR(ArmoredVest);
        };
        class CfgVehicles {
          PJHQ_HIDE_PLACEABLE(TEST_SOLDIER);
          PJHQ_HIDE_PLACEABLE(Rifleman);
        };
      `
    );
    const result = auditConfigs([source], [patch]);

    expect(result.candidates.helmet.map((candidate) => candidate.className)).toEqual(["ArmoredHelmet"]);
    expect(result.candidates.vest.map((candidate) => candidate.className)).toEqual(["ArmoredVest", "ChildVest"]);
    expect(result.candidates.soldierUnit.map((candidate) => candidate.className)).toEqual(["Rifleman", "Test_Soldier"]);
    expect(result.missing.helmet).toHaveLength(0);
    expect(result.missing.vest.map((candidate) => candidate.className)).toEqual(["ChildVest"]);
    expect(result.missing.soldierUnit).toHaveLength(0);
  });

  test("reports missing classnames and source context in Markdown", () => {
    const result = auditConfigs([source], []);
    const markdown = renderMarkdown(result);

    expect(markdown).toContain("`ArmoredHelmet`");
    expect(markdown).toContain("`ArmoredVest`");
    expect(markdown).toContain("`Test_Soldier`");
    expect(markdown).toContain("`Rifleman`");
    expect(markdown).toContain("uniform item `TestUniform`");
    expect(markdown).not.toContain("Test_Backpack");
    expect(markdown).not.toContain("Test_Prop");
  });

  test("reports hidden backpacks and props as unexpected", () => {
    const patch = file(
      "patch/config.cpp",
      `
        class CfgVehicles {
          PJHQ_HIDE_PLACEABLE(Test_Soldier);
          PJHQ_HIDE_PLACEABLE(Test_Backpack);
          PJHQ_HIDE_PLACEABLE(Test_Prop);
        };
      `
    );
    const result = auditConfigs([source], [patch]);

    expect(result.unexpectedHidden).toEqual(["Test_Backpack", "Test_Prop"]);
    expect(renderMarkdown(result)).toContain("## Unexpected hidden placeables");
  });
});

function addonFile(directory: string, addon: string, dependencies: string[] = [], content = ""): AuditFile {
  return file(
    `${directory}/config.cpp`,
    `class CfgPatches { class ${addon} { requiredAddons[] = {${dependencies.map((dependency) => `"${dependency}"`).join(",")}}; }; }; ${content}`
  );
}

const revision = addonFile("helmet_pbo", "TRF_REVISION", ["A3_Characters_F"], "class CfgWeapons { class Helmet: ItemCore {}; };");
const virtus = addonFile("vest_pbo", "TRF_VIRTUS", [], "class CfgWeapons { class Vest: ItemCore {}; };");
const uniforms = addonFile("uniform_pbo", "TRF_UNIFORMS", [], "class CfgVehicles { class Soldier: B_Soldier_base_F {}; };");
const combinedTargets = "class CfgWeapons { PJHQ_PATCH_HELMET_ARMOR(Helmet); PJHQ_PATCH_VEST_ARMOR(Vest); }; class CfgVehicles { PJHQ_HIDE_PLACEABLE(Soldier); };";

describe("addon dependency audit", () => {
  test("reports absent renamed addons even when a matching PBO folder exists", () => {
    const patch = addonFile("patch", "PATCH", ["helmet_pbo", "TRF_OLD_SHOOTER"], "class CfgWeapons { PJHQ_PATCH_HELMET_ARMOR(Helmet); };");
    const result = auditConfigs([revision], [patch]);

    expect(result.dependencyIssues).toHaveLength(3);
    expect(result.dependencyIssues.some((issue) => issue.includes("required addon helmet_pbo is absent"))).toBe(true);
    expect(result.dependencyIssues.some((issue) => issue.includes("required addon TRF_OLD_SHOOTER is absent"))).toBe(true);
    expect(result.dependencyIssues.some((issue) => issue.includes("no dependency path to its owner TRF_REVISION"))).toBe(true);
    expect(renderMarkdown(result)).toContain("## Dependency and load-order issues");
    expect(renderMarkdown(result)).toContain("required addon TRF_OLD_SHOOTER is absent");
  });

  test("stale but existing dependencies do not establish owner ordering", () => {
    const old = addonFile("old_pbo", "TRF_OLD");
    const patch = addonFile("patch", "PATCH", ["TRF_OLD"], "class CfgWeapons { PJHQ_PATCH_HELMET_ARMOR(Helmet); };");
    const issues = auditConfigs([old, revision], [patch]).dependencyIssues;

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("CfgWeapons.Helmet has no dependency path to its owner TRF_REVISION");
  });

  test("requires every owner for combined helmet, vest and uniform components", () => {
    const patch = addonFile("patch", "PATCH", ["TRF_REVISION"], combinedTargets);
    const sources = [revision, virtus, uniforms];
    const issues = auditConfigs(sources, [patch]).dependencyIssues;

    expect(issues).toHaveLength(2);
    expect(issues.some((issue) => issue.includes("CfgWeapons.Vest") && issue.includes("TRF_VIRTUS"))).toBe(true);
    expect(issues.some((issue) => issue.includes("CfgVehicles.Soldier") && issue.includes("TRF_UNIFORMS"))).toBe(true);
    expect(auditConfigs(sources, [addonFile("patch", "PATCH", ["TRF_REVISION", "TRF_VIRTUS", "TRF_UNIFORMS"], combinedTargets)]).dependencyIssues).toEqual([]);
  });

  test("accepts transitive upstream and local dependency paths case-insensitively", () => {
    const upstream = addonFile("bundle_pbo", "TRF_BUNDLE", ["TRF_REVISION", "TRF_VIRTUS", "TRF_UNIFORMS"]);
    const main = addonFile("main", "PATCH_MAIN", ["trf_bundle"]);
    const patch = addonFile("patch", "PATCH", ["patch_main"], combinedTargets);

    expect(auditConfigs([revision, virtus, uniforms, upstream], [main, patch]).dependencyIssues).toEqual([]);
  });

  test("ignores forward declarations when finding owners and direct patch targets", () => {
    const forwards = addonFile("forward_pbo", "TRF_FORWARDS", [], "class CfgWeapons { class Helmet; class Vest; }; class CfgVehicles { class Soldier; };");
    const patch = addonFile("patch", "PATCH", ["TRF_REVISION"], "class CfgWeapons { class Helmet { armor = 10; }; class Vest; }; class CfgVehicles { class Soldier; };");

    expect(auditConfigs([revision, virtus, uniforms, forwards], [patch]).dependencyIssues).toEqual([]);
  });

  test("accepts an alias CfgPatches entry in the same source file", () => {
    const source = addonFile("renamed_pbo", "TRF_NEW", [], "class CfgPatches { class TRF_OLD {}; }; class CfgWeapons { class Helmet {}; };");
    const patch = addonFile("patch", "PATCH", ["TRF_OLD"], "class CfgWeapons { PJHQ_PATCH_HELMET_ARMOR(Helmet); };");

    expect(auditConfigs([source], [patch]).dependencyIssues).toEqual([]);
  });

  test("requires ordering after every defining file, not just one duplicate definition", () => {
    const override = addonFile("override_pbo", "TRF_OVERRIDE", [], "class CfgWeapons { class Helmet {}; };");
    const patch = addonFile("patch", "PATCH", ["TRF_REVISION"], "class CfgWeapons { PJHQ_PATCH_HELMET_ARMOR(Helmet); };");
    const issues = auditConfigs([revision, override], [patch]).dependencyIssues;

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("TRF_OVERRIDE");
  });

  test("requires explicit permission for external patch dependencies", () => {
    const patch = addonFile("patch", "PATCH", ["ace_main"]);

    expect(auditConfigs([], [patch]).dependencyIssues).toHaveLength(1);
    expect(auditConfigs([], [patch], { externalAddons: ["ACE_MAIN"] }).dependencyIssues).toEqual([]);
  });

  test("reports missing local dependencies through their declaring component", () => {
    const main = addonFile("main", "PATCH_MAIN", ["TRF_REMOVED"]);
    const patch = addonFile("patch", "PATCH", ["PATCH_MAIN"]);
    const issues = auditConfigs([], [main, patch]).dependencyIssues;

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("PATCH_MAIN (main/config.cpp): required addon TRF_REMOVED is absent");
  });

  test("reports dependency cycles without recursing indefinitely", () => {
    const first = addonFile("first", "FIRST", ["SECOND"]);
    const second = addonFile("second", "SECOND", ["FIRST"]);
    const patch = addonFile("patch", "PATCH", ["FIRST"]);

    expect(auditConfigs([first, second], [patch]).dependencyIssues[0]).toContain("dependency cycle PATCH -> FIRST -> SECOND -> FIRST");
  });

  test("reports patches or source owners without a CfgPatches declaration", () => {
    const patch = file("patch/config.cpp", "class CfgWeapons { PJHQ_PATCH_HELMET_ARMOR(Helmet); };");
    expect(auditConfigs([revision], [patch]).dependencyIssues[0]).toContain("patch targets have no CfgPatches declaration");
    const source = file("source/config.cpp", "class CfgWeapons { class Helmet {}; };");
    const declaredPatch = addonFile("patch", "PATCH", [], patch.content);
    expect(auditConfigs([source], [declaredPatch]).dependencyIssues[0]).toContain("source/config.cpp, which has no CfgPatches declaration");
  });
});
