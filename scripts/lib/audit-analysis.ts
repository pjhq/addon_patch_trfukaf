import path from "node:path";

import { childClass, macroArguments, numberProperty, parseConfig, stringProperty, type ConfigClass } from "./arma-config.ts";

export type AuditCategory = "helmet" | "soldierUnit" | "vest";

export interface AuditFile {
  absolutePath: string;
  relativePath: string;
  addon: string;
  content: string;
}

export interface CandidateOrigin {
  addon: string;
  file: string;
  line: number;
  uniformItem?: string;
}

export interface AuditCandidate {
  className: string;
  category: AuditCategory;
  origins: CandidateOrigin[];
}

export interface PatchInventory {
  directWeapons: Set<string>;
  helmets: Set<string>;
  hidden: Set<string>;
  hiddenClassNames: Map<string, string>;
  vests: Set<string>;
}

export interface AuditResult {
  candidates: Record<AuditCategory, AuditCandidate[]>;
  missing: Record<AuditCategory, AuditCandidate[]>;
  patchInventory: PatchInventory;
  sourceAddons: string[];
  sourceFileCount: number;
  untargetedAddons: string[];
  unexpectedHidden: string[];
  warnings: string[];
}

interface ClassRecord {
  configClass: ConfigClass;
  file: AuditFile;
}

type ItemKind = "headgear" | "uniform" | "vest";

const itemKinds = new Map<string, ItemKind>([
  ["headgearitem", "headgear"],
  ["uniformitem", "uniform"],
  ["vestitem", "vest"]
]);

function normalized(className: string): string {
  return className.toLowerCase();
}

function topLevelClasses(records: AuditFile[], registryName: string): ClassRecord[] {
  const result: ClassRecord[] = [];
  for (const file of records) {
    let parsed: ConfigClass[];
    try {
      parsed = parseConfig(file.content);
    } catch (error) {
      throw new Error(`Could not parse ${file.relativePath}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
    for (const registry of parsed.filter((configClass) => configClass.name.toLowerCase() === registryName.toLowerCase())) {
      for (const configClass of registry.classes) {
        result.push({ configClass, file });
      }
    }
  }
  return result;
}

function findParent(record: ClassRecord, records: ClassRecord[]): ClassRecord | undefined {
  const parent = record.configClass.parent;
  if (!parent) {
    return undefined;
  }
  const parentName = normalized(parent);
  return (
    records.find((candidate) => candidate.file.absolutePath === record.file.absolutePath && normalized(candidate.configClass.name) === parentName) ??
    records.find((candidate) => normalized(candidate.configClass.name) === parentName)
  );
}

function ownItemKind(configClass: ConfigClass): ItemKind | undefined {
  const parent = childClass(configClass, "ItemInfo")?.parent;
  return parent ? itemKinds.get(normalized(parent)) : undefined;
}

function effectiveItemKind(record: ClassRecord, records: ClassRecord[], seen = new Set<string>()): ItemKind | undefined {
  const key = `${record.file.absolutePath}:${normalized(record.configClass.name)}`;
  if (seen.has(key)) {
    return undefined;
  }
  seen.add(key);

  const own = ownItemKind(record.configClass);
  if (own) {
    return own;
  }
  const parent = childClass(record.configClass, "ItemInfo") ? undefined : findParent(record, records);
  return parent ? effectiveItemKind(parent, records, seen) : undefined;
}

function hasPositiveArmorIn(configClass: ConfigClass): boolean {
  if ((numberProperty(configClass, "armor") ?? 0) > 0) {
    return true;
  }
  return configClass.classes.some(hasPositiveArmorIn);
}

function hasEffectivePositiveArmor(record: ClassRecord, records: ClassRecord[], seen = new Set<string>()): boolean {
  const key = `${record.file.absolutePath}:${normalized(record.configClass.name)}`;
  if (seen.has(key)) {
    return false;
  }
  seen.add(key);

  const itemInfo = childClass(record.configClass, "ItemInfo");
  if (itemInfo) {
    const protection = childClass(itemInfo, "HitpointsProtectionInfo");
    return protection ? hasPositiveArmorIn(protection) : false;
  }
  const parent = findParent(record, records);
  return parent ? hasEffectivePositiveArmor(parent, records, seen) : false;
}

function effectiveUniformClass(record: ClassRecord, records: ClassRecord[], seen = new Set<string>()): string | undefined {
  const key = `${record.file.absolutePath}:${normalized(record.configClass.name)}`;
  if (seen.has(key)) {
    return undefined;
  }
  seen.add(key);

  const itemInfo = childClass(record.configClass, "ItemInfo");
  if (itemInfo) {
    return stringProperty(itemInfo, "uniformClass");
  }
  const parent = findParent(record, records);
  return parent ? effectiveUniformClass(parent, records, seen) : undefined;
}

function isSoldierBase(className: string): boolean {
  const name = normalized(className);
  return name === "man" || name === "camanbase" || /(^|_)soldier(_|$)/.test(name);
}

function isSoldierUnit(record: ClassRecord, records: ClassRecord[], seen = new Set<string>()): boolean {
  const key = `${record.file.absolutePath}:${normalized(record.configClass.name)}`;
  if (seen.has(key)) {
    return false;
  }
  seen.add(key);

  const parentName = record.configClass.parent;
  if (!parentName) {
    return false;
  }
  if (isSoldierBase(parentName)) {
    return true;
  }
  const parent = findParent(record, records);
  return parent ? isSoldierUnit(parent, records, seen) : false;
}

function addCandidate(candidates: Map<string, AuditCandidate>, className: string, category: AuditCategory, origin: CandidateOrigin): void {
  const key = normalized(className);
  const existing = candidates.get(key);
  if (existing) {
    if (!existing.origins.some((candidate) => candidate.file === origin.file && candidate.line === origin.line && candidate.uniformItem === origin.uniformItem)) {
      existing.origins.push(origin);
    }
    return;
  }
  candidates.set(key, { className, category, origins: [origin] });
}

function sortedCandidates(candidates: Map<string, AuditCandidate>): AuditCandidate[] {
  return [...candidates.values()].sort((left, right) => left.className.localeCompare(right.className, "en", { sensitivity: "base" }));
}

function sourceCandidates(files: AuditFile[]): { candidates: Record<AuditCategory, AuditCandidate[]>; warnings: string[] } {
  const weapons = topLevelClasses(files, "CfgWeapons").filter((record) => record.configClass.declared);
  const vehicles = topLevelClasses(files, "CfgVehicles").filter((record) => record.configClass.declared);
  const vehicleNames = new Set(vehicles.map((record) => normalized(record.configClass.name)));
  const helmets = new Map<string, AuditCandidate>();
  const vests = new Map<string, AuditCandidate>();
  const soldierUnits = new Map<string, AuditCandidate>();
  const uniformItems = new Map<string, string[]>();
  const warnings: string[] = [];

  for (const weapon of weapons) {
    const kind = effectiveItemKind(weapon, weapons);
    const origin = { addon: weapon.file.addon, file: weapon.file.relativePath, line: weapon.configClass.line };
    if (kind === "headgear" && hasEffectivePositiveArmor(weapon, weapons)) {
      addCandidate(helmets, weapon.configClass.name, "helmet", origin);
    } else if (kind === "vest" && hasEffectivePositiveArmor(weapon, weapons)) {
      addCandidate(vests, weapon.configClass.name, "vest", origin);
    } else if (kind === "uniform") {
      const uniformClass = effectiveUniformClass(weapon, weapons);
      if (!uniformClass) {
        warnings.push(`${weapon.file.relativePath}:${weapon.configClass.line}: uniform ${weapon.configClass.name} has no uniformClass`);
        continue;
      }
      const linkedItems = uniformItems.get(normalized(uniformClass)) ?? [];
      linkedItems.push(weapon.configClass.name);
      uniformItems.set(normalized(uniformClass), linkedItems);
      if (!vehicleNames.has(normalized(uniformClass))) {
        warnings.push(`${weapon.file.relativePath}:${weapon.configClass.line}: uniform ${weapon.configClass.name} references missing CfgVehicles class ${uniformClass}`);
      }
    }
  }

  for (const vehicle of vehicles) {
    if (!isSoldierUnit(vehicle, vehicles)) {
      continue;
    }
    const linkedItems = uniformItems.get(normalized(vehicle.configClass.name));
    if (linkedItems?.length) {
      for (const uniformItem of linkedItems) {
        addCandidate(soldierUnits, vehicle.configClass.name, "soldierUnit", {
          addon: vehicle.file.addon,
          file: vehicle.file.relativePath,
          line: vehicle.configClass.line,
          uniformItem
        });
      }
    } else {
      addCandidate(soldierUnits, vehicle.configClass.name, "soldierUnit", {
        addon: vehicle.file.addon,
        file: vehicle.file.relativePath,
        line: vehicle.configClass.line
      });
    }
  }

  return {
    candidates: {
      helmet: sortedCandidates(helmets),
      vest: sortedCandidates(vests),
      soldierUnit: sortedCandidates(soldierUnits)
    },
    warnings: warnings.sort()
  };
}

export function patchedClasses(files: AuditFile[]): PatchInventory {
  const inventory: PatchInventory = {
    directWeapons: new Set(),
    helmets: new Set(),
    hidden: new Set(),
    hiddenClassNames: new Map(),
    vests: new Set()
  };

  const addHidden = (className: string): void => {
    const key = normalized(className);
    inventory.hidden.add(key);
    if (!inventory.hiddenClassNames.has(key)) inventory.hiddenClassNames.set(key, className);
  };

  for (const file of files) {
    for (const className of macroArguments(file.content, "PJHQ_PATCH_HELMET_ARMOR")) inventory.helmets.add(normalized(className));
    for (const className of macroArguments(file.content, "PJHQ_PATCH_VEST_ARMOR")) inventory.vests.add(normalized(className));
    for (const className of macroArguments(file.content, "PJHQ_HIDE_PLACEABLE")) addHidden(className);
  }

  for (const record of topLevelClasses(files, "CfgWeapons")) {
    if (record.configClass.declared) {
      inventory.directWeapons.add(normalized(record.configClass.name));
    }
  }
  for (const record of topLevelClasses(files, "CfgVehicles")) {
    if (record.configClass.declared && numberProperty(record.configClass, "scope") === 1 && numberProperty(record.configClass, "scopeCurator") === 0) {
      addHidden(record.configClass.name);
    }
  }

  return inventory;
}

function isPatched(candidate: AuditCandidate, inventory: PatchInventory): boolean {
  const key = normalized(candidate.className);
  if (candidate.category === "helmet") return inventory.helmets.has(key) || inventory.directWeapons.has(key);
  if (candidate.category === "vest") return inventory.vests.has(key) || inventory.directWeapons.has(key);
  return inventory.hidden.has(key);
}

export function auditConfigs(sourceFiles: AuditFile[], patchFiles: AuditFile[]): AuditResult {
  const { candidates, warnings } = sourceCandidates(sourceFiles);
  const patchInventory = patchedClasses(patchFiles);
  const missing: Record<AuditCategory, AuditCandidate[]> = {
    helmet: candidates.helmet.filter((candidate) => !isPatched(candidate, patchInventory)),
    vest: candidates.vest.filter((candidate) => !isPatched(candidate, patchInventory)),
    soldierUnit: candidates.soldierUnit.filter((candidate) => !isPatched(candidate, patchInventory))
  };
  const sourceAddons = [...new Set(sourceFiles.map((file) => file.addon))].sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
  const targetedAddons = new Set(Object.values(candidates).flatMap((category) => category.flatMap((candidate) => candidate.origins.map((origin) => origin.addon))));
  const soldierUnits = new Set(candidates.soldierUnit.map((candidate) => normalized(candidate.className)));
  const unexpectedHidden = [...patchInventory.hiddenClassNames]
    .filter(([className]) => !soldierUnits.has(className))
    .map(([, className]) => className)
    .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));

  return {
    candidates,
    missing,
    patchInventory,
    sourceAddons,
    sourceFileCount: sourceFiles.length,
    untargetedAddons: sourceAddons.filter((addon) => !targetedAddons.has(addon)),
    unexpectedHidden,
    warnings
  };
}

const categoryLabels: Record<AuditCategory, string> = {
  helmet: "Armored helmets",
  vest: "Armored vests",
  soldierUnit: "Soldier/unit placeables"
};

function originText(origin: CandidateOrigin): string {
  const uniform = origin.uniformItem ? `, uniform item \`${origin.uniformItem}\`` : "";
  return `\`${origin.file}:${origin.line}\`${uniform}`;
}

function markdownCategory(result: AuditResult, category: AuditCategory): string[] {
  const candidates = result.candidates[category];
  const missing = result.missing[category];
  const lines = [`## ${categoryLabels[category]}`, "", `Covered: **${candidates.length - missing.length}/${candidates.length}**`, ""];
  if (missing.length === 0) {
    lines.push("No missing classnames.", "");
    return lines;
  }
  for (const candidate of missing) {
    lines.push(`- \`${candidate.className}\` (${candidate.origins.map(originText).join("; ")})`);
  }
  lines.push("");
  return lines;
}

export function renderMarkdown(result: AuditResult): string {
  const totalCandidates = Object.values(result.candidates).reduce((total, candidates) => total + candidates.length, 0);
  const totalMissing = Object.values(result.missing).reduce((total, candidates) => total + candidates.length, 0);
  const lines = [
    "# TRF UKAF Missing Patch Audit",
    "",
    `Scanned **${result.sourceFileCount}** source config files across **${result.sourceAddons.length}** extracted addons.`,
    `Found **${totalMissing}** missing classnames out of **${totalCandidates}** audit targets.`,
    "Placeable checks include only `CfgVehicles` classes in a soldier/man inheritance chain; backpacks, props, and wearable inventory classes are excluded.",
    "",
    ...markdownCategory(result, "helmet"),
    ...markdownCategory(result, "vest"),
    ...markdownCategory(result, "soldierUnit"),
    "## Unexpected hidden placeables",
    "",
    ...(result.unexpectedHidden.length === 0 ? ["No unexpected classnames."] : result.unexpectedHidden.map((className) => `- \`${className}\``)),
    "",
    "## Extracted addons without armor or soldier/unit targets",
    "",
    ...(result.untargetedAddons.length === 0 ? ["None."] : result.untargetedAddons.map((addon) => `- \`${addon}\``)),
    ""
  ];
  if (result.warnings.length > 0) {
    lines.push("## Warnings", "", ...result.warnings.map((warning) => `- ${warning}`), "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function printAudit(result: AuditResult): void {
  console.log(`Scanned ${result.sourceFileCount} CPP files across ${result.sourceAddons.length} extracted addons.`);
  for (const category of ["helmet", "vest", "soldierUnit"] as const) {
    const candidates = result.candidates[category];
    const missing = result.missing[category];
    console.log(`${categoryLabels[category]}: ${candidates.length - missing.length}/${candidates.length} covered`);
    for (const candidate of missing) {
      console.log(`  ${candidate.className}`);
    }
  }
  console.log(`Unexpected hidden placeables: ${result.unexpectedHidden.length}`);
  for (const className of result.unexpectedHidden) console.log(`  ${className}`);
  if (result.warnings.length > 0) {
    console.warn(`Warnings: ${result.warnings.length}`);
    for (const warning of result.warnings) console.warn(`  ${warning}`);
  }
}

export function auditFile(absolutePath: string, root: string, content: string): AuditFile {
  const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, "/");
  return {
    absolutePath,
    relativePath,
    addon: relativePath.split("/")[0] ?? relativePath,
    content
  };
}
