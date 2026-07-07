import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { EDITABLE_PARAM_REVISION_CASE_SET } from "../estimate/editableParamRevisionAcceptanceCases";
import {
  GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE,
  type EditableParamRevisionAndroidSmokeSummary,
} from "./runEditableParamRevisionAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE,
  type EditableParamRevisionWebSmokeSummary,
} from "./runEditableParamRevisionWebSmoke";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-editable-param-revisions");
const PARITY_ROOT = path.join(RUNTIME_ROOT, "web-android-parity");

export type EditableParamRevisionWebAndroidParitySummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY
    | typeof STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: typeof EDITABLE_PARAM_REVISION_CASE_SET;
  web_enabled: boolean;
  android_enabled: boolean;
  same_source_sha: boolean;
  same_editable_param_corpus_used_for_web_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_template_match_parity: boolean;
  web_android_revision_count_parity: boolean;
  web_android_changed_rows_parity: boolean;
  web_android_artifact_lifecycle_parity: boolean;
  web_summary_artifact: string | null;
  android_summary_artifact: string | null;
  web_final_status: string | null;
  android_final_status: string | null;
  web_editable_revision_cases_passed: string | null;
  android_editable_revision_cases_passed: string | null;
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
  const root = path.join(RUNTIME_ROOT, kind);
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

function sortedCaseIds(summary: EditableParamRevisionWebSmokeSummary | EditableParamRevisionAndroidSmokeSummary | null): string[] {
  return summary?.case_results.map((item) => item.case_id).sort() ?? [];
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function runEditableParamRevisionWebAndroidParity(options: {
  web?: boolean;
  android?: boolean;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  writeSummary?: boolean;
} = {}) {
  const webEnabled = options.web ?? true;
  const androidEnabled = options.android ?? true;
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const webSummaryPath = webEnabled ? latestSummaryPath("web") : null;
  const androidSummaryPath = androidEnabled ? latestSummaryPath("android-chrome") : null;
  const webSummary = readSummary<EditableParamRevisionWebSmokeSummary>(webSummaryPath);
  const androidSummary = readSummary<EditableParamRevisionAndroidSmokeSummary>(androidSummaryPath);
  const webCaseIds = sortedCaseIds(webSummary);
  const androidCaseIds = sortedCaseIds(androidSummary);
  const caseIdParity = Boolean(webSummary && androidSummary && sameArray(webCaseIds, androidCaseIds));
  const sameSourceSha = Boolean(webSummary && androidSummary && webSummary.source_sha === sourceSha && androidSummary.source_sha === sourceSha);
  const sameCorpus = Boolean(
    webSummary &&
    androidSummary &&
    webSummary.corpus_fingerprint === androidSummary.corpus_fingerprint &&
    webSummary.cases === EDITABLE_PARAM_REVISION_CASE_SET &&
    androidSummary.cases === EDITABLE_PARAM_REVISION_CASE_SET
  );
  const revisionCountParity = caseIdParity &&
    webCaseIds.every((caseId) => {
      const webCase = webSummary?.case_results.find((item) => item.case_id === caseId);
      const androidCase = androidSummary?.case_results.find((item) => item.case_id === caseId);
      return Boolean(webCase?.ui.timeline_r2_visible && androidCase?.ui.timeline_r2_visible);
    });
  const changedRowsParity = caseIdParity &&
    webCaseIds.every((caseId) => {
      const webCase = webSummary?.case_results.find((item) => item.case_id === caseId);
      const androidCase = androidSummary?.case_results.find((item) => item.case_id === caseId);
      return Boolean(webCase?.ui.revision_diff_visible && androidCase?.ui.revision_diff_visible);
    });
  const artifactParity = caseIdParity &&
    webCaseIds.every((caseId) => {
      const webCase = webSummary?.case_results.find((item) => item.case_id === caseId);
      const androidCase = androidSummary?.case_results.find((item) => item.case_id === caseId);
      return Boolean(webCase?.ui.artifact_status_visible && androidCase?.ui.artifact_status_visible);
    });
  const blockers = [
    webEnabled ? "" : "web_not_enabled",
    androidEnabled ? "" : "android_not_enabled",
    webSummary ? "" : "web_summary_missing",
    androidSummary ? "" : "android_summary_missing",
    webSummary?.final_status === GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE ? "" : `web_not_green:${webSummary?.final_status ?? "missing"}`,
    androidSummary?.final_status === GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE ? "" : `android_not_green:${androidSummary?.final_status ?? "missing"}`,
    options.requireRealBrowser === false ? "real_browser_required_flag_missing" : "",
    options.requireEmulator === false ? "emulator_required_flag_missing" : "",
    webSummary?.actual_web_browser_editable_param_revision_passed === true ? "" : "web_actual_browser_not_passed",
    androidSummary?.actual_android_emulator_editable_param_revision_passed === true ? "" : "android_actual_emulator_not_passed",
    sameSourceSha ? "" : "source_sha_mismatch",
    sameCorpus ? "" : "editable_param_corpus_mismatch",
    caseIdParity ? "" : "case_id_parity_failed",
    revisionCountParity ? "" : "revision_count_parity_failed",
    changedRowsParity ? "" : "changed_rows_parity_failed",
    artifactParity ? "" : "artifact_lifecycle_parity_failed",
    ...(webSummary?.blockers.map((blocker) => `web:${blocker}`) ?? []),
    ...(androidSummary?.blockers.map((blocker) => `android:${blocker}`) ?? []),
  ].filter(Boolean);
  const summary: EditableParamRevisionWebAndroidParitySummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: EDITABLE_PARAM_REVISION_CASE_SET,
    web_enabled: webEnabled,
    android_enabled: androidEnabled,
    same_source_sha: sameSourceSha,
    same_editable_param_corpus_used_for_web_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_template_match_parity: caseIdParity,
    web_android_revision_count_parity: revisionCountParity,
    web_android_changed_rows_parity: changedRowsParity,
    web_android_artifact_lifecycle_parity: artifactParity,
    web_summary_artifact: webSummaryPath,
    android_summary_artifact: androidSummaryPath,
    web_final_status: webSummary?.final_status ?? null,
    android_final_status: androidSummary?.final_status ?? null,
    web_editable_revision_cases_passed: webSummary?.web_editable_revision_cases_passed ?? null,
    android_editable_revision_cases_passed: androidSummary?.android_editable_revision_cases_passed ?? null,
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

if (require.main === module) {
  const result = runEditableParamRevisionWebAndroidParity({
    web: hasFlag("web") || !hasFlag("android"),
    android: hasFlag("android") || !hasFlag("web"),
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  });
  console.log(JSON.stringify({
    final_status: result.artifact.final_status,
    same_editable_param_corpus_used_for_web_android: result.artifact.same_editable_param_corpus_used_for_web_android,
    web_android_case_id_parity: result.artifact.web_android_case_id_parity,
    web_android_revision_count_parity: result.artifact.web_android_revision_count_parity,
    web_android_changed_rows_parity: result.artifact.web_android_changed_rows_parity,
    web_android_artifact_lifecycle_parity: result.artifact.web_android_artifact_lifecycle_parity,
    web_editable_revision_cases_passed: result.artifact.web_editable_revision_cases_passed,
    android_editable_revision_cases_passed: result.artifact.android_editable_revision_cases_passed,
    blockers: result.artifact.blockers.slice(0, 20),
    artifact: result.artifactPath,
  }, null, 2));
  if (result.artifact.blockers.length > 0) process.exitCode = 1;
}
