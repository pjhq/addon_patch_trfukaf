# Agent Guidelines for PJHQ Patch - TRF UKAF

## Build Commands

- **Build for development**: `hemtt dev`
- **Build for release**: `hemtt release`
- **Check for errors**: `hemtt check`

## Patch Tool Commands

Run these commands from the repository root. Install dependencies with `bun install`; Bun and HEMTT must be available on `PATH`.

| Command | What it does | When to use it |
| --- | --- | --- |
| `bun run start` | Runs `extract`, then `audit`, then `docs:refresh`, stopping if a step fails. | Initial setup or after updating the upstream TRF UKAF Workshop mod. |
| `bun run audit` | Compares extracted upstream CPP configs in `source_addons/trf_ukaf/` with patches in `addons/`; prints findings and writes `reports/missing-patches.md`. | After editing patches, or to identify missing coverage against the extracted upstream version. Review the report; this command does not fix patches. |
| `bun run docs` | Regenerates `README.md` and `WORKSHOP.md` from patch configs and the cached upstream baseline. Creates the baseline from extracted configs if it is missing. | After changing patch configs, to keep generated documentation current. Do not hand-edit these generated files. |
| `bun run docs:refresh` | Rebuilds `source_addons/config-baselines.json` from extracted upstream configs, then regenerates the documentation. | After extracting a new upstream version, or when the baseline needs rebuilding. |
| `bun run docs:check` | Checks whether `README.md` and `WORKSHOP.md` match generated content; exits nonzero if either is stale, without rewriting them. May create the baseline cache if missing. | Before submitting changes or in automated checks. |
| `bun run build` | Runs `audit` and `docs:refresh` using existing extracted sources; does not extract or build addon PBOs. | To refresh the report and documentation without re-extracting upstream sources. Use HEMTT commands above to build the addon. |

### Upstream Sources and Typical Workflow

- `bun run extract` unpacks the installed TRF UKAF Workshop PBOs into `source_addons/trf_ukaf/`, **deleting and replacing that directory first**. Do not store manual work there.
- Extraction expects Workshop item `3678757032` under `<STEAM_DIR>/workshop/content/107410/3678757032/addons`. `STEAM_DIR` defaults to `C:\Program Files (x86)\Steam\steamapps` and must point to the Steam library's **steamapps directory**, not its parent. For a different library in PowerShell:

  ```powershell
  $env:STEAM_DIR = 'D:\SteamLibrary\steamapps'
  bun run start
  ```

- First setup or upstream update: ensure the Workshop mod is installed and current, then run `bun run start` and review `reports/missing-patches.md`.
- Patch-only changes: reuse the extracted sources, run `bun run audit` and `bun run docs`, then validate with `bun run docs:check` and `hemtt check`.
- Refreshing docs baselines does not download or extract upstream updates; run `bun run start` for the full update workflow.
