import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  WORLD_50000_ARTIFACT_DIR,
  WORLD_50000_GREEN_STATUS,
  WORLD_50000_WAVE,
} from "./worldConstruction50000RealityProof.shared";

type JsonRecord = Record<string, unknown>;

function readJson(filePath: string): JsonRecord | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as JsonRecord;
  } catch {
    return null;
  }
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(WORLD_50000_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(WORLD_50000_ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function evidenceGreen(): { passed: boolean; blockers: string[] } {
  const matrix = readJson(path.join(WORLD_50000_ARTIFACT_DIR, "matrix.json"));
  const android = readJson(path.join(WORLD_50000_ARTIFACT_DIR, "android_api34_matrix.json"));
  const pdf = readJson(path.join(WORLD_50000_ARTIFACT_DIR, "pdf_extraction_matrix.json"));
  const live = readJson(path.join(WORLD_50000_ARTIFACT_DIR, "live_reality_sample_matrix.json"));
  const blockers = [
    matrix?.final_status === WORLD_50000_GREEN_STATUS ? null : "WORLD_50000_MATRIX_NOT_GREEN",
    matrix?.shards_passed === 50 ? null : "WORLD_50000_SHARDS_NOT_GREEN",
    matrix?.governed_prompts_passed === 50000 ? null : "WORLD_50000_GOVERNED_COUNT_NOT_50000",
    matrix?.live_web_sample_tested === true ? null : "WORLD_50000_LIVE_WEB_MISSING",
    matrix?.android_api34_sample_tested === true ? null : "WORLD_50000_ANDROID_API34_MISSING",
    matrix?.pdf_extraction_sample_tested === true ? null : "WORLD_50000_PDF_MISSING",
    android?.final_status === "GREEN_ANDROID_API34_WORLD_CONSTRUCTION_50000_LIVE_SAMPLE_READY" ? null : "WORLD_50000_ANDROID_MATRIX_NOT_GREEN",
    android?.avd_name === "Pixel_7_API_34" && android?.android_sdk === 34 ? null : "WORLD_50000_ANDROID_NOT_API34",
    pdf?.final_status === "GREEN_WORLD_CONSTRUCTION_50000_PDF_EXTRACTION_SAMPLE_READY" ? null : "WORLD_50000_PDF_MATRIX_NOT_GREEN",
    live?.final_status === "GREEN_WORLD_CONSTRUCTION_50000_LIVE_REALITY_SAMPLE_READY" ? null : "WORLD_50000_LIVE_MATRIX_NOT_GREEN",
    matrix?.fake_green_claimed === false && android?.fake_green_claimed === false && pdf?.fake_green_claimed === false
      ? null
      : "WORLD_50000_FAKE_GREEN_CLAIMED",
  ].filter((item): item is string => Boolean(item));
  return { passed: blockers.length === 0, blockers };
}

function runMergeOnly(): number {
  const result = spawnSync("npx", ["tsx", "scripts/e2e/runWorldConstruction50000ShardMerge.ts", "--require-live-artifacts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
    timeout: 120_000,
    shell: process.platform === "win32",
    windowsHide: true,
  });
  return result.status ?? 1;
}

function main(): void {
  let evidence = evidenceGreen();
  let mergeExitCode: number | null = null;
  if (!evidence.passed) {
    mergeExitCode = runMergeOnly();
    evidence = evidenceGreen();
  }

  const finalStatus = evidence.passed
    ? WORLD_50000_GREEN_STATUS
    : "BLOCKED_WORLD_CONSTRUCTION_50000_PLUS_RELEASE_GATE_EVIDENCE";
  writeJson("release_gate_bridge.json", {
    wave: WORLD_50000_WAVE,
    final_status: finalStatus,
    strategy: "consume_existing_50k_live_web_android_api34_pdf_evidence",
    full_50k_regeneration_started: false,
    merge_only_exit_code: mergeExitCode,
    blockers: evidence.blockers,
    fake_green_claimed: false,
  });
  console.info(finalStatus);
  if (finalStatus !== WORLD_50000_GREEN_STATUS) {
    process.exitCode = 1;
  }
}

main();
