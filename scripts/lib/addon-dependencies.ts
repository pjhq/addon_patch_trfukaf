import { macroArguments, parseConfig, type ConfigClass } from "./arma-config.ts";
import type { AuditFile } from "./audit-analysis.ts";

export interface DependencyAuditOptions {
  // Dependencies supplied by other mods must be explicitly allowed; their configs are not extracted here.
  externalAddons?: string[];
}

interface AddonDeclaration {
  name: string;
  file: AuditFile;
  dependencies: string[];
}

interface ParsedFile {
  file: AuditFile;
  registries: ConfigClass[];
  addons: AddonDeclaration[];
}

function parseFile(file: AuditFile): ParsedFile {
  const registries = parseConfig(file.content);
  const addons = registries
    .filter((registry) => registry.name.toLowerCase() === "cfgpatches")
    .flatMap((registry) => registry.classes)
    .filter((configClass) => configClass.declared)
    .map((configClass) => ({
      name: configClass.name,
      file,
      dependencies: (configClass.properties.get("requiredaddons") ?? []).filter((token) => token.kind === "string").map((token) => token.value)
    }));
  return { file, registries, addons };
}

function targetKey(registry: string, className: string): string {
  return `${registry}.${className}`.toLowerCase();
}

function patchTargets(file: ParsedFile): Map<string, string> {
  const targets = new Map<string, string>();
  for (const [registry, macros] of [
    ["CfgWeapons", ["PJHQ_PATCH_HELMET_ARMOR", "PJHQ_PATCH_VEST_ARMOR"]],
    ["CfgVehicles", ["PJHQ_HIDE_PLACEABLE"]]
  ] as const) {
    for (const macro of macros) {
      for (const name of macroArguments(file.file.content, macro)) targets.set(targetKey(registry, name), `${registry}.${name}`);
    }
    for (const configClass of file.registries.filter((item) => item.name.toLowerCase() === registry.toLowerCase()).flatMap((item) => item.classes)) {
      if (configClass.declared) targets.set(targetKey(registry, configClass.name), `${registry}.${configClass.name}`);
    }
  }
  return targets;
}

export function auditDependencies(sourceFiles: AuditFile[], patchFiles: AuditFile[], options: DependencyAuditOptions = {}): string[] {
  const sources = sourceFiles.map(parseFile);
  const patches = patchFiles.map(parseFile);
  const graph = new Map<string, AddonDeclaration>();
  for (const file of [...sources, ...patches]) {
    for (const addon of file.addons) graph.set(addon.name.toLowerCase(), addon);
  }
  const external = new Set(options.externalAddons?.map((name) => name.toLowerCase()));
  const issues = new Set<string>();

  // Each defining source file must load first. Multiple CfgPatches entries in one
  // PBO are aliases for ordering purposes; reaching any one loads that file.
  const owners = new Map<string, ParsedFile[]>();
  for (const source of sources) {
    for (const registry of source.registries.filter((item) => ["cfgweapons", "cfgvehicles"].includes(item.name.toLowerCase()))) {
      for (const configClass of registry.classes.filter((item) => item.declared)) {
        const key = targetKey(registry.name, configClass.name);
        const files = owners.get(key) ?? [];
        if (!files.includes(source)) files.push(source);
        owners.set(key, files);
      }
    }
  }

  for (const patch of patches) {
    const targets = patchTargets(patch);
    if (targets.size > 0 && patch.addons.length === 0) {
      issues.add(`${patch.file.relativePath}: patch targets have no CfgPatches declaration.`);
    }
    for (const component of patch.addons) {
      const context = `${component.name} (${patch.file.relativePath})`;
      const reachable = new Set<string>();
      const active = new Set<string>();
      const visit = (name: string, trail: string[]): void => {
        const key = name.toLowerCase();
        if (active.has(key)) {
          issues.add(`${context}: dependency cycle ${[...trail, name].join(" -> ")}.`);
          return;
        }
        if (reachable.has(key)) return;
        reachable.add(key);
        active.add(key);
        for (const dependency of graph.get(key)?.dependencies ?? []) visit(dependency, [...trail, name]);
        active.delete(key);
      };
      // Check local declarations, not external dependencies of upstream mods.
      // Those mods (A3/RHS/ACE/etc.) are outside the extracted source inventory.
      for (const dependency of component.dependencies) {
        if (!graph.has(dependency.toLowerCase()) && !external.has(dependency.toLowerCase())) {
          issues.add(`${context}: required addon ${dependency} is absent from upstream/local CfgPatches and the external allowlist.`);
        }
      }
      visit(component.name, []);
      reachable.delete(component.name.toLowerCase());

      for (const [key, label] of targets) {
        for (const owner of owners.get(key) ?? []) {
          if (owner.addons.length === 0) {
            issues.add(`${context}: ${label} is defined in ${owner.file.relativePath}, which has no CfgPatches declaration.`);
          } else if (!owner.addons.some((addon) => reachable.has(addon.name.toLowerCase()))) {
            issues.add(`${context}: ${label} has no dependency path to its owner ${owner.addons.map((addon) => addon.name).join(" / ")} (${owner.file.relativePath}).`);
          }
        }
      }
    }
  }
  return [...issues].sort();
}
