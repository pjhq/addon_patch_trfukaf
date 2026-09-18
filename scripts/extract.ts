import { access, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dir, "..");
const steamApps = process.env.STEAM_DIR?.trim() || String.raw`C:\Program Files (x86)\Steam\steamapps`;
const workshopAddons = path.join(steamApps, "workshop", "content", "107410", "3678757032", "addons");
const extractionRoot = path.join(projectRoot, "source_addons", "trf_ukaf");

async function validateInputs(): Promise<{ hemttPath: string; pbos: string[] }> {
  const workshopStats = await stat(workshopAddons).catch(() => undefined);
  if (!workshopStats?.isDirectory()) {
    throw new Error(`Workshop addons directory does not exist: ${workshopAddons}`);
  }

  const hemttPath = Bun.which("hemtt");
  if (!hemttPath) {
    throw new Error("HEMTT is not available on PATH");
  }

  const pbos = (await readdir(workshopAddons, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pbo"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));

  if (pbos.length === 0) {
    throw new Error(`No PBOs found in: ${workshopAddons}`);
  }

  return { hemttPath, pbos };
}

async function main(): Promise<void> {
  const { hemttPath, pbos } = await validateInputs();

  const expectedRoot = path.resolve(projectRoot, "source_addons", "trf_ukaf");
  if (path.resolve(extractionRoot) !== expectedRoot) {
    throw new Error(`Refusing to clean unexpected extraction directory: ${extractionRoot}`);
  }

  await access(projectRoot);
  await rm(extractionRoot, { recursive: true, force: true });
  await mkdir(extractionRoot, { recursive: true });

  console.log(`Extracting ${pbos.length} PBOs into ${path.relative(projectRoot, extractionRoot)}`);
  for (const [index, pbo] of pbos.entries()) {
    const input = path.join(workshopAddons, pbo);
    const output = path.join(extractionRoot, path.basename(pbo, path.extname(pbo)));
    console.log(`[${index + 1}/${pbos.length}] ${pbo}`);

    const process = Bun.spawn([hemttPath, "utils", "pbo", "unpack", "-r", input, output], {
      cwd: projectRoot,
      stdout: "inherit",
      stderr: "inherit"
    });
    const exitCode = await process.exited;
    if (exitCode !== 0) {
      throw new Error(`HEMTT failed to unpack ${pbo} (exit code ${exitCode})`);
    }
  }

  console.log(`Extracted ${pbos.length} PBOs.`);
}

await main();
