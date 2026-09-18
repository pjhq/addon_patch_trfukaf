import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { auditConfigs, auditFile, printAudit, renderMarkdown, type AuditFile } from "./lib/audit-analysis.ts";

const projectRoot = path.resolve(import.meta.dir, "..");
const sourceRoot = path.join(projectRoot, "source_addons", "trf_ukaf");
const patchRoot = path.join(projectRoot, "addons");
const reportPath = path.join(projectRoot, "reports", "missing-patches.md");

async function readCppFiles(root: string): Promise<AuditFile[]> {
  const rootStats = await stat(root).catch(() => undefined);
  if (!rootStats?.isDirectory()) {
    throw new Error(`Directory does not exist: ${root}`);
  }

  const paths = await Array.fromAsync(new Bun.Glob("**/*.cpp").scan({ cwd: root, absolute: true, onlyFiles: true }));
  paths.sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
  return Promise.all(paths.map(async (filePath) => auditFile(filePath, root, await Bun.file(filePath).text())));
}

async function main(): Promise<void> {
  const [sourceFiles, patchFiles] = await Promise.all([readCppFiles(sourceRoot), readCppFiles(patchRoot)]);
  if (sourceFiles.length === 0) {
    throw new Error(`No extracted CPP files found. Run: bun run extract`);
  }

  const result = auditConfigs(sourceFiles, patchFiles);
  const report = renderMarkdown(result);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report, "utf8");

  printAudit(result);
  console.log(`Report: ${path.relative(projectRoot, reportPath)}`);
}

await main();
