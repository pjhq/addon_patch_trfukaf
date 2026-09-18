import { describe, expect, test } from "bun:test";

import { childClass, macroArguments, numberProperty, parseConfig, stringProperty } from "../scripts/lib/arma-config.ts";

describe("Arma config parser", () => {
  test("parses nested classes, inheritance, arrays, and scalar properties", () => {
    const source = `
      class CfgWeapons {
        class ItemCore;
        class Example: ItemCore {
          displayName = "Example // not a comment";
          values[] = {1, 2, 3};
          class ItemInfo: VestItem {
            uniformClass = "EXAMPLE_TEX";
            class HitpointsProtectionInfo {
              class Chest { armor = 24; };
            };
          };
        };
      };
    `;

    const weapons = parseConfig(source)[0];
    const itemCore = weapons && childClass(weapons, "ItemCore");
    const example = weapons && childClass(weapons, "Example");
    const itemInfo = example && childClass(example, "ItemInfo");
    const protection = itemInfo && childClass(itemInfo, "HitpointsProtectionInfo");
    const chest = protection && childClass(protection, "Chest");

    expect(itemCore?.declared).toBeFalse();
    expect(example?.parent).toBe("ItemCore");
    expect(stringProperty(example!, "displayName")).toBe("Example // not a comment");
    expect(stringProperty(itemInfo!, "uniformClass")).toBe("EXAMPLE_TEX");
    expect(numberProperty(chest!, "armor")).toBe(24);
  });

  test("finds macro calls without matching comments or preprocessor definitions", () => {
    const source = `
      // PJHQ_HIDE_PLACEABLE(Commented);
      #define PJHQ_HIDE_PLACEABLE(CLASS_NAME) class CLASS_NAME {}
      PJHQ_HIDE_PLACEABLE(Actual);
      /* PJHQ_HIDE_PLACEABLE(AlsoCommented); */
    `;

    expect(macroArguments(source, "PJHQ_HIDE_PLACEABLE")).toEqual(["Actual"]);
  });
});
