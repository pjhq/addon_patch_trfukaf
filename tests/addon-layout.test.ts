import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { macroArguments, parseConfig } from "../scripts/lib/arma-config.ts";

const root = path.resolve(import.meta.dir, "../addons");
const components = ["main", "trf_pilot", "trf_ukaf_accessories", "trf_ukaf_revision", "trf_ukaf_sfsg", "trf_ukaf_uniforms", "trf_ukaf_virtus"];

describe("upstream-aligned patch PBO layout", () => {
  test("ships only shared main and components named for their upstream PBOs", async () => {
    const directories = (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(directories).toEqual(components);

    for (const directory of components) {
      const config = parseConfig(await readFile(path.join(root, directory, "config.cpp"), "utf8"));
      const patches = config.find((registry) => registry.name.toLowerCase() === "cfgpatches")?.classes.filter((item) => item.declared);
      expect(patches).toHaveLength(1);
      const dependencies = patches?.[0]?.properties
        .get("requiredaddons")
        ?.filter((token) => token.kind === "string")
        .map((token) => token.value);
      expect(dependencies).toEqual(directory === "main" ? [] : ["PJHQ_Patch_TRFUKAF_Main", directory.toUpperCase()]);
      const suffix = directory === "trf_pilot" ? "PILOT" : directory.replace("trf_ukaf_", "").toUpperCase();
      expect(patches?.[0]?.name.toLowerCase()).toBe(`PJHQ_Patch_TRFUKAF_${suffix}`.toLowerCase());
      expect((await readFile(path.join(root, directory, "$PBOPREFIX$"), "utf8")).trim()).toBe(`pjhq\\patch_trfukaf\\addons\\${directory}`);
    }
  });

  test("retains all targets exactly once in their owning components", async () => {
    const counts: Record<string, number[]> = {
      main: [0, 0, 0],
      trf_pilot: [0, 0, 5],
      trf_ukaf_accessories: [0, 0, 1],
      trf_ukaf_revision: [12, 0, 0],
      trf_ukaf_sfsg: [1, 8, 13],
      trf_ukaf_uniforms: [0, 0, 199],
      trf_ukaf_virtus: [0, 28, 0]
    };
    const targets: string[] = [];
    for (const directory of components) {
      const content = await readFile(path.join(root, directory, "config.cpp"), "utf8");
      const groups = ["PJHQ_PATCH_HELMET_ARMOR", "PJHQ_PATCH_VEST_ARMOR", "PJHQ_HIDE_PLACEABLE"].map((macro) => macroArguments(content, macro));
      expect(groups.map((group) => group.length)).toEqual(counts[directory]!);
      targets.push(...groups.flat().map((name) => name.toLowerCase()));
    }
    expect(targets).toHaveLength(267);
    expect(new Set(targets).size).toBe(targets.length);
  });
});
