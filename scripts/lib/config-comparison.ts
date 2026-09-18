import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface PatchTargets {
  directory: string;
  helmet: string[];
  vest: string[];
  hidden: string[];
}

export interface ValueChange {
  area: string;
  property: string;
  from: string;
  to: string;
  status: string;
}

export interface ConfigComparison {
  helmet: ValueChange[];
  vest: ValueChange[];
  visibility: ValueChange[];
  unknownScopeCurator: string[];
}

type ConfigObject = Record<string, unknown>;
type ConfigScalar = number | string;
type ProtectionKind = "helmet" | "vest";

interface HitpointValues {
  hitpointName?: ConfigScalar;
  armor?: ConfigScalar;
  passThrough?: ConfigScalar;
}

interface ProtectionBaseline {
  kind: ProtectionKind;
  hitpoints: Record<string, HitpointValues>;
}

interface VisibilityBaseline {
  scope?: ConfigScalar;
  scopeCurator?: ConfigScalar;
}

interface BaselineSnapshot {
  schemaVersion: 1;
  generatedBy: string;
  weapons: Record<string, ProtectionBaseline>;
  vehicles: Record<string, VisibilityBaseline>;
}

export const UNKNOWN_VALUE = "Not declared; inherited value unavailable";

const hitpointProperties = ["hitpointName", "armor", "passThrough"] as const;
const vestHitpoints = ["Neck", "Chest", "Diaphragm", "Abdomen", "Body"] as const;

function objectValue(value: unknown, description: string): ConfigObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected ${description} to be a config object`);
  }
  return value as ConfigObject;
}

function child(object: ConfigObject, name: string): unknown {
  const key = Object.keys(object).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : object[key];
}

function childObject(object: ConfigObject, name: string): ConfigObject | undefined {
  const value = child(object, name);
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ConfigObject) : undefined;
}

function scalar(object: ConfigObject | undefined, name: string): ConfigScalar | undefined {
  if (!object) return undefined;
  const value = child(object, name);
  return typeof value === "number" || typeof value === "string" ? value : undefined;
}

function registryClass(root: ConfigObject, registry: string, className: string): ConfigObject | undefined {
  return childObject(childObject(root, registry) ?? {}, className);
}

function extractHitpointValues(hitpoint: ConfigObject | undefined): HitpointValues {
  return {
    hitpointName: scalar(hitpoint, "hitpointName"),
    armor: scalar(hitpoint, "armor"),
    passThrough: scalar(hitpoint, "passThrough")
  };
}

function extractProtection(root: ConfigObject, className: string, kind: ProtectionKind): ProtectionBaseline {
  const configClass = registryClass(root, "CfgWeapons", className);
  if (!configClass) {
    throw new Error(`HEMTT JSON does not contain CfgWeapons.${className}`);
  }
  const protection = childObject(childObject(configClass, "ItemInfo") ?? {}, "HitpointsProtectionInfo");
  if (!protection) {
    throw new Error(`HEMTT JSON does not contain protection data for CfgWeapons.${className}`);
  }
  const names = kind === "helmet" ? ["HeadgearItem"] : [...vestHitpoints];
  return {
    kind,
    hitpoints: Object.fromEntries(names.map((name) => [name, extractHitpointValues(childObject(protection, name))]))
  };
}

function extractVisibility(root: ConfigObject, className: string): VisibilityBaseline {
  const configClass = registryClass(root, "CfgVehicles", className);
  if (!configClass) {
    throw new Error(`HEMTT JSON does not contain CfgVehicles.${className}`);
  }
  return {
    scope: scalar(configClass, "scope"),
    scopeCurator: scalar(configClass, "scopeCurator")
  };
}

async function convertConfig(hemttPath: string, input: string, output: string, cwd: string): Promise<ConfigObject> {
  const process = Bun.spawn([hemttPath, "utils", "config", "convert", input, output, "--format", "json"], {
    cwd,
    stdout: "pipe",
    stderr: "pipe"
  });
  const [exitCode, stdout, stderr] = await Promise.all([process.exited, new Response(process.stdout).text(), new Response(process.stderr).text()]);
  if (exitCode !== 0) {
    throw new Error(`HEMTT could not convert ${input} (exit code ${exitCode})\n${stderr || stdout}`);
  }
  return objectValue(JSON.parse(await readFile(output, "utf8")), output);
}

function uniqueExtraction<T>(roots: ConfigObject[], registry: string, className: string, extract: (root: ConfigObject) => T): T {
  const matches = roots.filter((root) => registryClass(root, registry, className));
  if (matches.length === 0) {
    throw new Error(`Could not find ${registry}.${className} in converted upstream configs`);
  }
  const extracted = matches.map(extract);
  const values = new Set(extracted.map((value) => JSON.stringify(value)));
  if (values.size !== 1) {
    throw new Error(`Upstream configs disagree on ${registry}.${className}`);
  }
  const first = extracted[0];
  if (first === undefined) {
    throw new Error(`Could not extract ${registry}.${className}`);
  }
  return first;
}

async function refreshBaselines(root: string, addons: PatchTargets[], hemttPath: string, temporaryRoot: string): Promise<BaselineSnapshot> {
  const sourceRoot = path.join(root, "source_addons", "trf_ukaf");
  const sourceStats = await stat(sourceRoot).catch(() => undefined);
  if (!sourceStats?.isDirectory()) {
    throw new Error(`Extracted source configs are unavailable. Run: bun run extract`);
  }
  const sourcePaths = await Array.fromAsync(new Bun.Glob("**/config.cpp").scan({ cwd: sourceRoot, absolute: true, onlyFiles: true }));
  sourcePaths.sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
  const sourceRoots = await Promise.all(sourcePaths.map((sourcePath, index) => convertConfig(hemttPath, sourcePath, path.join(temporaryRoot, `source-${index}.json`), root)));

  const helmets = [...new Set(addons.flatMap((addon) => addon.helmet))].sort();
  const vests = [...new Set(addons.flatMap((addon) => addon.vest))].sort();
  const hidden = [...new Set(addons.flatMap((addon) => addon.hidden))].sort();
  const weapons: Record<string, ProtectionBaseline> = {};
  const vehicles: Record<string, VisibilityBaseline> = {};
  for (const className of helmets) {
    weapons[className] = uniqueExtraction(sourceRoots, "CfgWeapons", className, (source) => extractProtection(source, className, "helmet"));
  }
  for (const className of vests) {
    weapons[className] = uniqueExtraction(sourceRoots, "CfgWeapons", className, (source) => extractProtection(source, className, "vest"));
  }
  for (const className of hidden) {
    vehicles[className] = uniqueExtraction(sourceRoots, "CfgVehicles", className, (source) => extractVisibility(source, className));
  }

  return {
    schemaVersion: 1,
    generatedBy: "hemtt utils config convert",
    weapons,
    vehicles
  };
}

async function convertPatches(root: string, addons: PatchTargets[], hemttPath: string, temporaryRoot: string): Promise<Map<string, ConfigObject>> {
  const [armorMacros, placeableMacros] = await Promise.all([
    readFile(path.join(root, "addons", "main", "armor_macros.hpp"), "utf8"),
    readFile(path.join(root, "addons", "main", "placeable_macros.hpp"), "utf8")
  ]);
  const macroSource = `${armorMacros}\n${placeableMacros}\n`;
  const converted = await Promise.all(
    addons
      .filter((addon) => addon.helmet.length + addon.vest.length + addon.hidden.length > 0)
      .map(async (addon): Promise<[string, ConfigObject]> => {
        const config = await readFile(path.join(root, "addons", addon.directory, "config.cpp"), "utf8");
        const flattened = `${macroSource}${config.replace(/^\s*#include\s+"[^"]+"\s*$/gm, "")}`;
        const input = path.join(temporaryRoot, `${addon.directory}.cpp`);
        const output = path.join(temporaryRoot, `${addon.directory}.json`);
        await writeFile(input, flattened, "utf8");
        return [addon.directory, await convertConfig(hemttPath, input, output, root)];
      })
  );
  return new Map(converted);
}

function commonValue(values: Array<ConfigScalar | undefined>, description: string): ConfigScalar | undefined {
  const unique = new Set(values.map((value) => JSON.stringify(value)));
  if (unique.size !== 1) {
    throw new Error(`Compared classes do not share one value for ${description}: ${[...unique].join(", ")}`);
  }
  return values[0];
}

function displayValue(value: ConfigScalar | undefined): string {
  if (value === undefined) return UNKNOWN_VALUE;
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function patchedProtection(patchRoots: Map<string, ConfigObject>, addons: PatchTargets[], className: string, kind: ProtectionKind): ProtectionBaseline[] {
  return addons
    .filter((addon) => addon[kind].includes(className))
    .map((addon) => {
      const root = patchRoots.get(addon.directory);
      if (!root) throw new Error(`Missing converted patch config for ${addon.directory}`);
      return extractProtection(root, className, kind);
    });
}

function protectionChanges(
  kind: ProtectionKind,
  classNames: string[],
  hitpoints: readonly string[],
  snapshot: BaselineSnapshot,
  patchRoots: Map<string, ConfigObject>,
  addons: PatchTargets[]
): ValueChange[] {
  for (const className of classNames) {
    const baseline = snapshot.weapons[className];
    if (!baseline) {
      throw new Error(`Config baseline is missing CfgWeapons.${className}. Run: bun run docs:refresh`);
    }
    if (baseline.kind !== kind) {
      throw new Error(`Config baseline classifies CfgWeapons.${className} as ${baseline.kind}, expected ${kind}`);
    }
  }
  return hitpoints.flatMap((area) =>
    hitpointProperties.map((property): ValueChange => {
      const from = commonValue(
        classNames.map((className) => snapshot.weapons[className]?.hitpoints[area]?.[property]),
        `${kind}.${area}.${property} FROM`
      );
      const to = commonValue(
        classNames.flatMap((className) => patchedProtection(patchRoots, addons, className, kind).map((protection) => protection.hitpoints[area]?.[property])),
        `${kind}.${area}.${property} TO`
      );
      return {
        area: area === "HeadgearItem" ? "Head" : area,
        property,
        from: displayValue(from),
        to: displayValue(to),
        status: from === undefined ? "Unavailable; inherited" : from === to ? "Verified; reassigned unchanged" : "Verified"
      };
    })
  );
}

function visibilityChanges(
  classNames: string[],
  snapshot: BaselineSnapshot,
  patchRoots: Map<string, ConfigObject>,
  addons: PatchTargets[]
): { changes: ValueChange[]; unknownScopeCurator: string[] } {
  for (const className of classNames) {
    if (!snapshot.vehicles[className]) {
      throw new Error(`Config baseline is missing CfgVehicles.${className}. Run: bun run docs:refresh`);
    }
  }
  const patched = (className: string): VisibilityBaseline[] =>
    addons
      .filter((addon) => addon.hidden.includes(className))
      .map((addon) => {
        const root = patchRoots.get(addon.directory);
        if (!root) throw new Error(`Missing converted patch config for ${addon.directory}`);
        return extractVisibility(root, className);
      });
  const scopeFrom = commonValue(
    classNames.map((className) => snapshot.vehicles[className]?.scope),
    "CfgVehicles.scope FROM"
  );
  const scopeTo = commonValue(
    classNames.flatMap((className) => patched(className).map((value) => value.scope)),
    "CfgVehicles.scope TO"
  );
  const groups = Map.groupBy(classNames, (className) => JSON.stringify(snapshot.vehicles[className]?.scopeCurator));
  const curatorChanges = [...groups.values()]
    .sort((left, right) => Number(snapshot.vehicles[left[0] ?? ""]?.scopeCurator === undefined) - Number(snapshot.vehicles[right[0] ?? ""]?.scopeCurator === undefined))
    .map((classes): ValueChange => {
      const first = classes[0];
      if (!first) throw new Error("Encountered an empty scopeCurator comparison group");
      const from = snapshot.vehicles[first]?.scopeCurator;
      const to = commonValue(
        classes.flatMap((className) => patched(className).map((value) => value.scopeCurator)),
        "CfgVehicles.scopeCurator TO"
      );
      return {
        area: `${classes.length} target classes`,
        property: "scopeCurator",
        from: displayValue(from),
        to: displayValue(to),
        status: from === undefined ? "Unavailable; inherited" : "Verified"
      };
    });
  return {
    changes: [{ area: "All target classes", property: "scope", from: displayValue(scopeFrom), to: displayValue(scopeTo), status: "Verified" }, ...curatorChanges],
    unknownScopeCurator: classNames.filter((className) => snapshot.vehicles[className]?.scopeCurator === undefined)
  };
}

export async function compareConfigs(root: string, addons: PatchTargets[], refresh: boolean): Promise<ConfigComparison> {
  const hemttPath = Bun.which("hemtt");
  if (!hemttPath) {
    throw new Error("HEMTT is not available on PATH");
  }
  const baselinePath = path.join(root, "scripts", "config-baselines.json");
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "patch-trfukaf-docs-"));
  try {
    if (refresh) {
      const refreshed = await refreshBaselines(root, addons, hemttPath, temporaryRoot);
      await writeFile(baselinePath, `${JSON.stringify(refreshed, null, 2)}\n`, "utf8");
      console.log(`Generated ${path.relative(root, baselinePath)}`);
    }
    const snapshot = objectValue(JSON.parse(await readFile(baselinePath, "utf8")), baselinePath) as unknown as BaselineSnapshot;
    if (snapshot.schemaVersion !== 1) {
      throw new Error("Unsupported config baseline schema");
    }
    const patchRoots = await convertPatches(root, addons, hemttPath, temporaryRoot);
    const helmets = [...new Set(addons.flatMap((addon) => addon.helmet))].sort();
    const vests = [...new Set(addons.flatMap((addon) => addon.vest))].sort();
    const hidden = [...new Set(addons.flatMap((addon) => addon.hidden))].sort();
    const visibility = visibilityChanges(hidden, snapshot, patchRoots, addons);
    return {
      helmet: protectionChanges("helmet", helmets, ["HeadgearItem"], snapshot, patchRoots, addons),
      vest: protectionChanges("vest", vests, vestHitpoints, snapshot, patchRoots, addons),
      visibility: visibility.changes,
      unknownScopeCurator: visibility.unknownScopeCurator
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
