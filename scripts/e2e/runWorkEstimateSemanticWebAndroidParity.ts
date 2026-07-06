import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET,
  WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT,
  buildWorkEstimateSemanticCriticalCases,
  semanticCriticalCorpusFingerprint,
} from "../estimate/workEstimateSemanticCriticalCases";
import {
  GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE,
  type WorkEstimateSemanticAndroidSmokeSummary,
} from "./runWorkEstimateSemanticAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE,
  type WorkEstimateSemanticWebSmokeSummary,
} from "./runWorkEstimateSemanticWebSmoke";

export const GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY_FAILED" as const;

const PARITY_ROOT = path.join(WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT, "web-android-parity");

export type WorkEstimateSemanticWebAndroidParitySummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY
    | typeof STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: typeof WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET;
  web_enabled: boolean;
  android_enabled: boolean;
  same_source_sha: boolean;
  same_semantic_corpus_used_for_web_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_result_parity: boolean;
  web_android_pdf_buyer_parity: boolean;
  web_summary_artifact: string | null;
  android_summary_artifact: string | null;
  web_final_status: string | null;
  android_final_status: string | null;
  web_semantic_cases_passed: string | null;
  android_semantic_cases_passed: string | null;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  fake_green_claimed: false;
  blockers: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function latestSummaryPath(kind: "web" | "android-chrome"): string | null {
  const root = path.join(WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT, kind);
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .filter((dir) => existsSync(path.join(dir, "summary.json")))
    .map((dir) => ({ dir, mtimeMs: statSync(dir).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  return dirs[0] ? path.join(dirs[0].dir, "summary.json") : null;
}

function readSummary<T>(summaryPath: string | null): T | null {
  if (!summaryPath) return null;
  return JSON.parse(readFileSync(summaryPath, "utf8")) as T;
}

function sortedCaseIds(summary: WorkEstimateSemanticWebSmokeSummary | WorkEstimateSemanticAndroidSmokeSummary | null): string[] {
  return summary?.case_results.map((item) => item.case_id).sort() ?? [];
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function passedMap(summary: WorkEstimateSemanticWebSmokeSummary | WorkEstimateSemanticAndroidSmokeSummary | null): Map<string, boolean> {
  return new Map(summary?.case_results.map((item) => [item.case_id, item.passed]) ?? []);
}

export function runWorkEstimateSemanticWebAndroidParity(options: {
  web?: boolean;
  android?: boolean;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  writeSummary?: boolean;
} = {}) {
  const webEnabled = options.web ?? true;
  const androidEnabled = options.android ?? true;
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const expectedFingerprint = semanticCriticalCorpusFingerprint(buildWorkEstimateSemanticCriticalCases());
  const webSummaryPath = webEnabled ? latestSummaryPath("web") : null;
  const androidSummaryPath = androidEnabled ? latestSummaryPath("android-chrome") : null;
  const webSummary = readSummary<WorkEstimateSemanticWebSmokeSummary>(webSummaryPath);
  const androidSummary = readSummary<WorkEstimateSemanticAndroidSmokeSummary>(androidSummaryPath);
  const webCaseIds = sortedCaseIds(webSummary);
  const androidCaseIds = sortedCaseIds(androidSummary);
  const caseIdParity = Boolean(webSummary && androidSummary && sameArray(webCaseIds, androidCaseIds));
  const webPassed = passedMap(webSummary);
  const androidPassed = passedMap(androidSummary);
  const resultParity = caseIdParity && webCaseIds.every((caseId) => webPassed.get(caseId) === androidPassed.get(caseId));
  const pdfBuyerParity = caseIdParity && webCaseIds.every((caseId) => {
    const webCase = webSummary?.case_results.find((item) => item.case_id === caseId);
    const androidCase = androidSummary?.case_results.find((item) => item.case_id === caseId);
    return Boolean(
      webCase?.domain.pdf_generated_from_snapshot &&
      androidCase?.domain.pdf_generated_from_snapshot &&
      webCase?.domain.buyer_handoff_procurement_subset_valid &&
      androidCase?.domain.buyer_handoff_procurement_subset_valid
    );
  });
  const sameSourceSha = Boolean(webSummary && androidSummary && webSummary.source_sha === sourceSha && androidSummary.source_sha === sourceSha);
  const sameCorpus = Boolean(
    webSummary &&
    androidSummary &&
    webSummary.corpus_fingerprint === expectedFingerprint &&
    androidSummary.corpus_fingerprint === expectedFingerprint
  );
  const blockers = [
    webEnabled ? "" : "web_not_enabled",
    androidEnabled ? "" : "android_not_enabled",
    webSummary ? "" : "web_summary_missing",
    androidSummary ? "" : "android_summary_missing",
    webSummary?.final_status === GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE ? "" : `web_not_green:${webSummary?.final_status ?? "missing"}`,
    androidSummary?.final_status === GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE ? "" : `android_not_green:${androidSummary?.final_status ?? "missing"}`,
    options.requireRealBrowser === false ? "real_browser_required_flag_missing" : "",
    options.requireEmulator === false ? "emulator_required_flag_missing" : "",
    webSummary?.actual_web_browser_work_estimate_semantic_smoke_passed === true ? "" : "web_actual_browser_not_passed",
    androidSummary?.actual_android_emulator_work_estimate_semantic_smoke_passed === true ? "" : "android_actual_emulator_not_passed",
    sameSourceSha ? "" : "source_sha_mismatch",
    sameCorpus ? "" : "semantic_corpus_mismatch",
    caseIdParity ? "" : "case_id_parity_failed",
    resultParity ? "" : "result_parity_failed",
    pdfBuyerParity ? "" : "pdf_buyer_parity_failed",
    ...(webSummary?.blockers.map((blocker) => `web:${blocker}`) ?? []),
    ...(androidSummary?.blockers.map((blocker) => `android:${blocker}`) ?? []),
  ].filter(Boolean);
  const summary: WorkEstimateSemanticWebAndroidParitySummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET,
    web_enabled: webEnabled,
    android_enabled: androidEnabled,
    same_source_sha: sameSourceSha,
    same_semantic_corpus_used_for_web_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_result_parity: resultParity,
    web_android_pdf_buyer_parity: pdfBuyerParity,
    web_summary_artifact: webSummaryPath,
    android_summary_artifact: androidSummaryPath,
    web_final_status: webSummary?.final_status ?? null,
    android_final_status: androidSummary?.final_status ?? null,
    web_semantic_cases_passed: webSummary?.web_semantic_cases_passed ?? null,
    android_semantic_cases_passed: androidSummary?.android_semantic_cases_passed ?? null,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers,
  };
  const artifactPath = path.join(PARITY_ROOT, timestampForPath(), "summary.json");
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runWorkEstimateSemanticWebAndroidParity.ts")) {
  const result = runWorkEstimateSemanticWebAndroidParity({
    web: hasFlag("web") || !hasFlag("android"),
    android: hasFlag("android") || !hasFlag("web"),
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  });
  console.log(JSON.stringify({
    final_status: result.artifact.final_status,
    same_semantic_corpus_used_for_web_android: result.artifact.same_semantic_corpus_used_for_web_android,
    web_android_case_id_parity: result.artifact.web_android_case_id_parity,
    web_android_result_parity: result.artifact.web_android_result_parity,
    web_android_pdf_buyer_parity: result.artifact.web_android_pdf_buyer_parity,
    web_semantic_cases_passed: result.artifact.web_semantic_cases_passed,
    android_semantic_cases_passed: result.artifact.android_semantic_cases_passed,
    blockers: result.artifact.blockers.slice(0, 20),
    artifact: result.artifactPath,
  }, null, 2));
  if (result.artifact.blockers.length > 0) process.exitCode = 1;
}
