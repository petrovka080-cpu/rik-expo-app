import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  PRODUCTION_GRADE_CRITICAL_CASE_SET,
  loadProductionGradeCriticalCases,
} from "../estimate/productionGradeLayerSealCore";
import {
  GREEN_AI_ESTIMATE_PRODUCTION_GRADE_ANDROID_CHROME_SMOKE,
  runProductionGradeEstimateAndroidSmoke,
  type ProductionGradeAndroidSmokeSummary,
} from "./runProductionGradeEstimateAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_PRODUCTION_GRADE_WEB_BROWSER_SMOKE,
  runProductionGradeEstimateWebSmoke,
  type ProductionGradeWebSmokeSummary,
} from "./runProductionGradeEstimateWebSmoke";

export const GREEN_AI_ESTIMATE_PRODUCTION_GRADE_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_PRODUCTION_GRADE_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_PRODUCTION_GRADE_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_PRODUCTION_GRADE_WEB_ANDROID_PARITY_FAILED" as const;

const PARITY_ROOT = path.join(".release-runtime", "ai-estimate-production-grade-layer-seal", "web-android-parity");

export type ProductionGradeWebAndroidParallelSealSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_PRODUCTION_GRADE_WEB_ANDROID_PARITY
    | typeof STOP_AI_ESTIMATE_PRODUCTION_GRADE_WEB_ANDROID_PARITY_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: typeof PRODUCTION_GRADE_CRITICAL_CASE_SET;
  web_enabled: boolean;
  android_enabled: boolean;
  same_source_sha: boolean;
  same_corpus_used_for_web_and_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_result_parity: boolean;
  web_android_pdf_buyer_parity: boolean;
  web_summary_artifact: string | null;
  android_summary_artifact: string | null;
  web_final_status: string | null;
  android_final_status: string | null;
  web_cases_passed: string | null;
  android_cases_passed: string | null;
  web_route_equivalent_used: false;
  android_env_only_green_used: false;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  fake_green_claimed: false;
  blockers: string[];
};

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function corpusFingerprint() {
  return loadProductionGradeCriticalCases().map((testCase) =>
    `${testCase.case_id}:${testCase.source}:${testCase.coverage_group}:${testCase.expected_family}:${testCase.prompt}`
  ).join("\n");
}

function caseIdsFromWeb(summary: ProductionGradeWebSmokeSummary | null): string[] {
  return summary?.case_results.map((item) => item.case_id).sort() ?? [];
}

function caseIdsFromAndroid(summary: ProductionGradeAndroidSmokeSummary | null): string[] {
  return summary?.case_results.map((item) => item.case_id).sort() ?? [];
}

function passedMap<T extends { case_id: string; passed: boolean }>(items: readonly T[]): Map<string, boolean> {
  return new Map(items.map((item) => [item.case_id, item.passed]));
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export async function runProductionGradeWebAndroidParallelSeal(options: {
  cases?: string;
  web?: boolean;
  android?: boolean;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  writeSummary?: boolean;
} = {}) {
  if ((options.cases ?? PRODUCTION_GRADE_CRITICAL_CASE_SET) !== PRODUCTION_GRADE_CRITICAL_CASE_SET) {
    throw new Error(`UNSUPPORTED_PRODUCTION_GRADE_CASES:${options.cases}`);
  }
  const webEnabled = options.web ?? true;
  const androidEnabled = options.android ?? true;
  const outDir = path.join(PARITY_ROOT, timestampForPath());
  const tasks: Promise<{ target: "web" | "android"; artifactPath: string; artifact: ProductionGradeWebSmokeSummary | ProductionGradeAndroidSmokeSummary }>[] = [];
  if (webEnabled) {
    tasks.push(runProductionGradeEstimateWebSmoke({
      cases: PRODUCTION_GRADE_CRITICAL_CASE_SET,
      requireRealBrowser: options.requireRealBrowser,
      writeSummary: true,
    }).then((result) => ({ target: "web" as const, ...result })));
  }
  if (androidEnabled) {
    tasks.push(runProductionGradeEstimateAndroidSmoke({
      cases: PRODUCTION_GRADE_CRITICAL_CASE_SET,
      requireRealBrowser: options.requireRealBrowser,
      requireEmulator: options.requireEmulator,
      writeSummary: true,
    }).then((result) => ({ target: "android" as const, ...result })));
  }
  const results = await Promise.all(tasks);
  const webResult = results.find((item) => item.target === "web");
  const androidResult = results.find((item) => item.target === "android");
  const webSummary = webResult?.artifact as ProductionGradeWebSmokeSummary | undefined;
  const androidSummary = androidResult?.artifact as ProductionGradeAndroidSmokeSummary | undefined;
  const sameSourceSha = Boolean(webSummary && androidSummary && webSummary.source_sha === androidSummary.source_sha);
  const sameCorpus = Boolean(webSummary && androidSummary && webSummary.corpus_fingerprint === androidSummary.corpus_fingerprint && webSummary.corpus_fingerprint === corpusFingerprint());
  const webCaseIds = caseIdsFromWeb(webSummary ?? null);
  const androidCaseIds = caseIdsFromAndroid(androidSummary ?? null);
  const caseIdParity = Boolean(webSummary && androidSummary && sameArray(webCaseIds, androidCaseIds));
  const webPassed = passedMap(webSummary?.case_results ?? []);
  const androidPassed = passedMap(androidSummary?.case_results ?? []);
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
  const blockers = [
    webEnabled ? "" : "web_not_enabled",
    androidEnabled ? "" : "android_not_enabled",
    webSummary?.final_status === GREEN_AI_ESTIMATE_PRODUCTION_GRADE_WEB_BROWSER_SMOKE ? "" : `web_not_green:${webSummary?.final_status ?? "missing"}`,
    androidSummary?.final_status === GREEN_AI_ESTIMATE_PRODUCTION_GRADE_ANDROID_CHROME_SMOKE ? "" : `android_not_green:${androidSummary?.final_status ?? "missing"}`,
    sameSourceSha ? "" : "source_sha_mismatch",
    sameCorpus ? "" : "corpus_mismatch",
    caseIdParity ? "" : "case_id_parity_failed",
    resultParity ? "" : "result_parity_failed",
    pdfBuyerParity ? "" : "pdf_buyer_parity_failed",
    ...(webSummary?.blockers.map((blocker) => `web:${blocker}`) ?? []),
    ...(androidSummary?.blockers.map((blocker) => `android:${blocker}`) ?? []),
  ].filter(Boolean);
  const summary: ProductionGradeWebAndroidParallelSealSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PRODUCTION_GRADE_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_PRODUCTION_GRADE_WEB_ANDROID_PARITY_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: PRODUCTION_GRADE_CRITICAL_CASE_SET,
    web_enabled: webEnabled,
    android_enabled: androidEnabled,
    same_source_sha: sameSourceSha,
    same_corpus_used_for_web_and_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_result_parity: resultParity,
    web_android_pdf_buyer_parity: pdfBuyerParity,
    web_summary_artifact: webResult?.artifactPath ?? null,
    android_summary_artifact: androidResult?.artifactPath ?? null,
    web_final_status: webSummary?.final_status ?? null,
    android_final_status: androidSummary?.final_status ?? null,
    web_cases_passed: webSummary?.web_production_grade_cases_passed ?? null,
    android_cases_passed: androidSummary?.android_production_grade_cases_passed ?? null,
    web_route_equivalent_used: false,
    android_env_only_green_used: false,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers,
  };
  const artifactPath = path.join(outDir, "summary.json");
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runProductionGradeWebAndroidParallelSeal.ts")) {
  void runProductionGradeWebAndroidParallelSeal({
    cases: argValue("cases") ?? PRODUCTION_GRADE_CRITICAL_CASE_SET,
    web: hasFlag("web") || !hasFlag("android"),
    android: hasFlag("android") || !hasFlag("web"),
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        same_source_sha: result.artifact.same_source_sha,
        same_corpus_used_for_web_and_android: result.artifact.same_corpus_used_for_web_and_android,
        web_cases_passed: result.artifact.web_cases_passed,
        android_cases_passed: result.artifact.android_cases_passed,
        blockers: result.artifact.blockers.slice(0, 20),
        artifact: result.artifactPath,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
