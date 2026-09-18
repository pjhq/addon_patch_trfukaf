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
