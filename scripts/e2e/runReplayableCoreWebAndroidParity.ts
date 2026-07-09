import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { currentBranch, currentSourceSha, currentUpstreamSync, hasFlag, writeRuntimeJson } from "./renderStagingAcceptanceCore";
import { GREEN_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE } from "./runReplayableCoreAndroidSmoke";
import { GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE } from "./runReplayableCoreWebSmoke";

const ROOT = path.join(".release-runtime", "ai-estimate-replayable-core");
const WEB_ROOT = path.join(ROOT, "web");
const ANDROID_ROOT = path.join(ROOT, "android-chrome");
const PARITY_ROOT = path.join(ROOT, "web-android-parity");

export const GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_REPLAYABLE_CORE_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_REPLAYABLE_CORE_WEB_ANDROID_PARITY_FAILED" as const;

type ReplayableSmokeSummary = {
  final_status?: string;
  source_sha?: string;
  corpus_fingerprint?: string;
  aggregate_boq_hash?: string;
  aggregate_material_quantity_hash?: string;
  aggregate_costing_hash?: string;
  aggregate_pdf_package_hash?: string;
  aggregate_buyer_handoff_hash?: string;
  actual_web_browser_replay_guard_passed?: boolean;
  actual_android_emulator_replay_guard_passed?: boolean;
  fake_green_claimed?: boolean;
  case_results?: {
    case_id: string;
    boq_hash: string;
    material_quantity_hash: string;
    costing_hash: string;
    pdf_package_hash: string;
    buyer_handoff_hash: string;
  }[];
};

function latestSummary(root: string): string | null {
  if (!existsSync(root)) return null;
  const candidates: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) walk(fullPath);
      if (stats.isFile() && entry === "summary.json") candidates.push(fullPath);
    }
  };
  walk(root);
  return candidates.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function readSummary(filePath: string | null): ReplayableSmokeSummary | null {
  if (!filePath) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as ReplayableSmokeSummary;
}

function ids(summary: ReplayableSmokeSummary | null): string[] {
  return summary?.case_results?.map((item) => item.case_id) ?? [];
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function runReplayableCoreWebAndroidParity(options: {
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  webArtifact?: string | null;
  androidArtifact?: string | null;
} = {}) {
  const sourceSha = currentSourceSha();
  const webPath = options.webArtifact ?? latestSummary(WEB_ROOT);
  const androidPath = options.androidArtifact ?? latestSummary(ANDROID_ROOT);
  const web = readSummary(webPath);
  const android = readSummary(androidPath);
  const sameCorpus = Boolean(web?.corpus_fingerprint && web.corpus_fingerprint === android?.corpus_fingerprint);
  const caseIdParity = sameArray(ids(web), ids(android));
  const boqParity = Boolean(web?.aggregate_boq_hash && web.aggregate_boq_hash === android?.aggregate_boq_hash);
  const materialParity = Boolean(web?.aggregate_material_quantity_hash && web.aggregate_material_quantity_hash === android?.aggregate_material_quantity_hash);
  const costingParity = Boolean(web?.aggregate_costing_hash && web.aggregate_costing_hash === android?.aggregate_costing_hash);
  const pdfParity = Boolean(web?.aggregate_pdf_package_hash && web.aggregate_pdf_package_hash === android?.aggregate_pdf_package_hash);
  const buyerParity = Boolean(web?.aggregate_buyer_handoff_hash && web.aggregate_buyer_handoff_hash === android?.aggregate_buyer_handoff_hash);
  const webGreen =
    web?.source_sha === sourceSha &&
    web.final_status === GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE &&
    web.actual_web_browser_replay_guard_passed === true &&
    web.fake_green_claimed === false;
  const androidGreen =
    android?.source_sha === sourceSha &&
    android.final_status === GREEN_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE &&
    android.actual_android_emulator_replay_guard_passed === true &&
    android.fake_green_claimed === false;
  const blockers = [
    options.requireRealBrowser === true ? "" : "real_browser_required_flag_missing",
    options.requireEmulator === true ? "" : "emulator_required_flag_missing",
    web ? "" : "web_artifact_missing",
    android ? "" : "android_artifact_missing",
    webGreen ? "" : "web_replay_smoke_not_green_or_stale",
    androidGreen ? "" : "android_replay_smoke_not_green_or_stale",
    sameCorpus ? "" : "same_replay_corpus_not_used",
    caseIdParity ? "" : "web_android_case_id_parity_failed",
    boqParity ? "" : "web_android_boq_hash_parity_failed",
    materialParity ? "" : "web_android_material_quantity_hash_parity_failed",
    costingParity ? "" : "web_android_costing_hash_parity_failed",
    pdfParity ? "" : "web_android_pdf_package_hash_parity_failed",
    buyerParity ? "" : "web_android_buyer_handoff_hash_parity_failed",
  ].filter(Boolean);
  const green = blockers.length === 0;
  const summary = {
    final_status: green
      ? GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_REPLAYABLE_CORE_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    summary_generated_by: "ai-estimate-replayable-core-web-android-parity",
    require_real_browser: options.requireRealBrowser === true,
    require_emulator: options.requireEmulator === true,
    web_artifact: webPath,
    android_artifact: androidPath,
    same_replay_corpus_used_for_web_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_boq_hash_parity: boqParity,
    web_android_material_quantity_hash_parity: materialParity,
    web_android_costing_hash_parity: costingParity,
    web_android_pdf_package_hash_parity: pdfParity,
    web_android_buyer_handoff_hash_parity: buyerParity,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    blockers,
    fake_green_claimed: false,
  };
  const result = writeRuntimeJson(PARITY_ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runReplayableCoreWebAndroidParity.ts")) {
  const result = runReplayableCoreWebAndroidParity({
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
  });
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blockers: result.artifact.blockers,
  }, null, 2));
  if (result.artifact.blockers.length > 0) process.exitCode = 1;
}
