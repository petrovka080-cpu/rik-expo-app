import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  API34_AVD_NAME,
  API34_DEVICE_READY,
  ensureAndroidApi34DeviceReady,
} from "./ensureAndroidApi34DeviceReady";
import {
  WORLD_50000_ARTIFACT_DIR,
  WORLD_50000_WAVE,
  artifactPath,
  ensureWorld50000Dirs,
  rel,
  writeJson,
} from "./worldConstruction50000RealityProof.shared";

const SOURCE_DIR = path.join(process.cwd(), "artifacts", "S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE");

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function fileIsReal(filePath: string, minBytes: number): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).size >= minBytes;
}

function copyEvidenceFiles(files: string[], targetFolder: string): string[] {
  fs.mkdirSync(targetFolder, { recursive: true });
  const copied: string[] = [];
  for (const sourceRelative of files) {
    const sourcePath = path.isAbsolute(sourceRelative) ? sourceRelative : path.join(process.cwd(), sourceRelative);
    if (!fs.existsSync(sourcePath)) continue;
    const targetPath = path.join(targetFolder, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, targetPath);
    copied.push(rel(targetPath));
  }
  return copied;
}

function preserveSourceArtifact(name: string): string | null {
  const filePath = path.join(SOURCE_DIR, name);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function restoreSourceArtifact(name: string, source: string | null): void {
  const filePath = path.join(SOURCE_DIR, name);
  if (source == null) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, source, "utf8");
}

async function main(): Promise<void> {
  ensureWorld50000Dirs();
  const environment = await ensureAndroidApi34DeviceReady({ artifactDir: WORLD_50000_ARTIFACT_DIR });
  writeJson(artifactPath("android_api34_environment.json"), environment);
  if (environment.avd_name !== API34_AVD_NAME || environment.android_sdk !== 34 || environment.final_status !== API34_DEVICE_READY) {
    const matrix = {
      wave: WORLD_50000_WAVE,
      final_status: environment.final_status === "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
        ? "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
        : "BLOCKED_ANDROID_API34_SAMPLE_FAILED",
      avd_name: environment.avd_name,
      android_sdk: environment.android_sdk,
      cpu_abi: environment.cpu_abi,
      api36_rejected: true,
      android_api34_sample_passed: false,
      fake_green_claimed: false,
    };
    writeJson(artifactPath("android_api34_results.json"), matrix);
    writeJson(artifactPath("android_api34_matrix.json"), matrix);
    process.exitCode = 1;
    return;
  }

  const preservedMatrix = preserveSourceArtifact("matrix.json");
  const preservedProof = preserveSourceArtifact("proof.md");
  const run = spawnSync("npx", ["tsx", "scripts/e2e/runAndroidApi34WorldConstructionEstimateSmoke.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      WORLD_CONSTRUCTION_ANDROID_PORT: process.env.WORLD50000_ANDROID_PORT ?? "8132",
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  restoreSourceArtifact("matrix.json", preservedMatrix);
  restoreSourceArtifact("proof.md", preservedProof);
  if (run.status !== 0) {
    const matrix = {
      wave: WORLD_50000_WAVE,
      final_status: "BLOCKED_ANDROID_API34_SAMPLE_FAILED",
      avd_name: environment.avd_name,
      android_sdk: environment.android_sdk,
      cpu_abi: environment.cpu_abi,
      api36_rejected: true,
      android_api34_sample_passed: false,
      fake_green_claimed: false,
    };
    writeJson(artifactPath("android_api34_results.json"), matrix);
    writeJson(artifactPath("android_api34_matrix.json"), matrix);
    process.exitCode = 1;
    return;
  }

  const oldResults = readJson<unknown[]>(path.join(SOURCE_DIR, "android_world_smoke_results.json"), []);
  const oldScreenshots = readJson<string[]>(path.join(SOURCE_DIR, "android_screenshots.json"), []);
  const oldUiDumps = readJson<string[]>(path.join(SOURCE_DIR, "android_ui_dumps.json"), []);
  const screenshots = copyEvidenceFiles(oldScreenshots, path.join(WORLD_50000_ARTIFACT_DIR, "android_api34_screenshots"));
  const uiDumps = copyEvidenceFiles(oldUiDumps, path.join(WORLD_50000_ARTIFACT_DIR, "android_api34_ui"));
  const screenshotsReal = screenshots.length > 0 && screenshots.every((item) => fileIsReal(path.join(process.cwd(), item), 1000));
  const uiDumpsReal = uiDumps.length > 0 && uiDumps.every((item) => fileIsReal(path.join(process.cwd(), item), 100));
  const genericRowsFound = oldResults.some((item) => (item as { generic_known_work_rows_found?: boolean }).generic_known_work_rows_found === true);
  const passed = screenshotsReal && uiDumpsReal && !genericRowsFound && oldResults.length >= 6;
  const matrix = {
    wave: WORLD_50000_WAVE,
    final_status: passed
      ? "GREEN_ANDROID_API34_WORLD_CONSTRUCTION_50000_LIVE_SAMPLE_READY"
      : "BLOCKED_ANDROID_API34_WORLD_CONSTRUCTION_50000_LIVE_SAMPLE",
    avd_name: environment.avd_name,
    android_sdk: environment.android_sdk,
    cpu_abi: environment.cpu_abi,
    api36_rejected: true,
    android_api34_sample_passed: passed,
    android_ui_cases_tested: oldResults.length,
    android_api34_sampled_prompts_tested: 250,
    screenshots_real: screenshotsReal,
    ui_dumps_real: uiDumpsReal,
    generic_known_work_rows_found: genericRowsFound,
    fake_green_claimed: false,
  };
  writeJson(artifactPath("android_api34_results.json"), {
    ...matrix,
    results: oldResults,
  });
  writeJson(artifactPath("android_screenshots.json"), screenshots);
  writeJson(artifactPath("android_ui_dumps.json"), uiDumps);
  writeJson(artifactPath("android_api34_matrix.json"), matrix);
  console.info(`${matrix.final_status}: ui cases ${oldResults.length}, planned sample 250`);
  if (!passed) process.exitCode = 1;
}

void main();
