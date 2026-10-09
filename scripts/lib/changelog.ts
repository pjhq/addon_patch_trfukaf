import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseConfig } from "./arma-config.ts";
import type { PatchTargets } from "./config-comparison.ts";

export interface InventoryClass {
  registry: string;
  className: string;
  addons: string[];
}

export interface ClassHistory {
  schemaVersion: 2;
  versions: { version: string; inventory: InventoryClass[] }[];
}

const historyFile = "docs/history/patch.json";
const key = (item: InventoryClass): string => `${item.registry}.${item.className}`.toLowerCase();

export function inventoryFromConfigs(files: { addon: string; content: string }[]): InventoryClass[] {
  const inventory = new Map<string, InventoryClass>();
  for (const file of files) {
    for (const registry of parseConfig(file.content)) {
      if (!registry.name.toLowerCase().startsWith("cfg")) continue;
      for (const configClass of registry.classes) {
        if (!configClass.declared) continue;
        const item = { registry: registry.name, className: configClass.name, addons: [file.addon] };
        const existing = inventory.get(key(item));
        if (existing) {
          if (!existing.addons.includes(file.addon)) existing.addons.push(file.addon);
        } else {
          inventory.set(key(item), item);
        }
      }
    }
  }
  for (const item of inventory.values()) item.addons.sort();
  return [...inventory.values()].sort((left, right) => key(left).localeCompare(key(right)));
}

export function refreshHistory(previous: ClassHistory | undefined, inventory: InventoryClass[], version: string): ClassHistory {
  const versions = [...(previous?.versions ?? [])];
  const latest = versions.at(-1);
  if (latest?.version === version) versions[versions.length - 1] = { version, inventory };
  else {
    if (versions.some((entry) => entry.version === version)) throw new Error(`Cannot refresh historical patch version ${version}`);
    versions.push({ version, inventory });
  }
  return { schemaVersion: 2, versions };
}

export async function readPatchVersion(root: string): Promise<string> {
  const project = Bun.TOML.parse(await readFile(path.join(root, ".hemtt/project.toml"), "utf8")) as Record<string, unknown>;
  const version = project.version as Record<string, unknown> | undefined;
  const parts = [version?.major, version?.minor, version?.patch];
  if (!parts.every((part) => typeof part === "number" && Number.isInteger(part) && part >= 0)) {
    throw new Error("Expected numeric major, minor and patch in .hemtt/project.toml [version]");
  }
  return parts.join(".");
}

function isInventory(value: unknown): value is InventoryClass[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof item.registry === "string" &&
        typeof item.className === "string" &&
        Array.isArray(item.addons) &&
        item.addons.every((addon: unknown) => typeof addon === "string")
    )
  );
}

export async function readHistory(root: string): Promise<ClassHistory | undefined> {
  let text: string;
  try {
    text = await readFile(path.join(root, historyFile), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const value = JSON.parse(text);
  // Migrate the existing observation-based baseline without inventing releases.
  if (value?.schemaVersion === 1 && isInventory(value.inventory) && isInventory(value.baselineInventory) && Array.isArray(value.entries) && value.entries.length === 0) {
    return { schemaVersion: 2, versions: [{ version: await readPatchVersion(root), inventory: value.inventory }] };
  }
  if (
    !value ||
    value.schemaVersion !== 2 ||
    !Array.isArray(value.versions) ||
    value.versions.length === 0 ||
    !value.versions.every(
      (entry: ClassHistory["versions"][number]) => entry && typeof entry.version === "string" && /^\d+\.\d+\.\d+$/.test(entry.version) && isInventory(entry.inventory)
    ) ||
    new Set(value.versions.map((entry: ClassHistory["versions"][number]) => entry.version)).size !== value.versions.length
  ) {
    throw new Error(`Invalid classname history: ${historyFile}`);
  }
  return value;
}

export function patchedInventory(source: InventoryClass[], targets: PatchTargets[]): InventoryClass[] {
  const patchedKeys = new Set(
    targets.flatMap((addon) => [
      ...[...addon.helmet, ...addon.vest].map((className) => `cfgweapons.${className.toLowerCase()}`),
      ...addon.hidden.map((className) => `cfgvehicles.${className.toLowerCase()}`)
    ])
  );
  const inventory = source.filter((item) => patchedKeys.has(key(item)));
  const foundKeys = new Set(inventory.map(key));
  const missing = [...patchedKeys].filter((item) => !foundKeys.has(item));
  if (missing.length > 0) throw new Error(`Patched classes not found in extracted PBOs: ${missing.join(", ")}`);
  return inventory;
}

export async function prepareHistory(root: string, refresh: boolean, targets: PatchTargets[]): Promise<ClassHistory | undefined> {
  const previous = await readHistory(root);
  if (!refresh) return previous;
  const sourceRoot = path.join(root, "source_addons", "trf_ukaf");
  const files = (await Array.fromAsync(new Bun.Glob("**/*.cpp").scan({ cwd: sourceRoot, absolute: true, onlyFiles: true }))).sort();
  if (files.length === 0) throw new Error("No extracted CPP files found. Run: bun run extract");
  const configs = await Promise.all(
    files.map(async (file) => ({
      addon: path.relative(sourceRoot, file).split(path.sep)[0]!,
      content: await readFile(file, "utf8")
    }))
  );
  const sourceInventory = inventoryFromConfigs(configs);
  if (sourceInventory.length === 0) throw new Error("No upstream classes found; refusing to replace classname history");
  const inventory = patchedInventory(sourceInventory, targets);
  return refreshHistory(previous, inventory, await readPatchVersion(root));
}

export async function saveHistory(root: string, history: ClassHistory): Promise<void> {
  const file = path.join(root, historyFile);
  const text = `${JSON.stringify(history, null, 2)}\n`;
  const existing = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  });
  if (existing === text) return;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, "utf8");
}

export function renderChangelog(history: ClassHistory | undefined): string {
  const lines: string[] = [];
  if (!history) return lines.join("\n");
  const current = history.versions.at(-1);
  if (!current) return lines.join("\n");
  const previous = history.versions.at(-2);
  const oldKeys = new Set(previous?.inventory.map(key));
  const added = previous ? current.inventory.filter((item) => !oldKeys.has(key(item))) : [];
  lines.push(`## ${current.version}`, "");
  const groups = new Map<string, Set<string>>();
  for (const item of added) {
    for (const addon of item.addons) {
      const classes = groups.get(addon) ?? new Set<string>();
      classes.add(item.className);
      groups.set(addon, classes);
    }
  }
  for (const addon of [...groups.keys()].sort()) {
    lines.push(`### ${addon}.pbo`, "", ...[...groups.get(addon)!].sort().map((className) => `- \`${className}\``), "");
  }
  return lines.join("\n");
}
