import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  MATERIAL_COMPLETENESS_CRITICAL_CASE_SET,
  MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED,
  isSupportedMaterialCompletenessCaseSet,
} from "../estimate/materialCompletenessCriticalCases";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE } from "./runMaterialCompletenessAndroidSmoke";
import { GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_SMOKE } from "./runMaterialCompletenessWebSmoke";

export const GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_ANDROID_PARITY_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-material-completeness");
const WEB_ROOT = path.join(RUNTIME_ROOT, "web");
const ANDROID_ROOT = path.join(RUNTIME_ROOT, "android-chrome");
const PARITY_ROOT = path.join(RUNTIME_ROOT, "web-android-parity");

type CaseResult = {
  case_id: string;
  passed: boolean;
  expected_family_id: string;
  matched_family_id: string | null;
  material_completeness_panel_visible?: boolean;
  material_missing_slots_panel_visible?: boolean;
  domain?: {
    passed?: boolean;
    calculator_rows_equal_snapshot_rows?: boolean;
    snapshot_rows_equal_detail_drawer_rows?: boolean;
    snapshot_rows_equal_pdf_rows?: boolean;
    buyer_handoff_procurement_subset_complete?: boolean;
    missing_required_material_slots_count?: number;
    generic_material_bucket_count?: number;
    fake_filler_material_count?: number;
    backend_row_cap_detected?: boolean;
    snapshot_truncation_detected?: boolean;
    detail_drawer_truncation_detected?: boolean;
    pdf_truncation_detected?: boolean;
    buyer_handoff_truncation_detected?: boolean;
  };
};

type MaterialSmokeArtifact = {
  final_status?: string;
  source_sha?: string;
  cases?: string;
  actual_web_browser_material_completeness_smoke_passed?: boolean;
  actual_android_emulator_material_completeness_smoke_passed?: boolean;
  material_completeness_web_smoke_passed?: boolean;
  material_completeness_android_smoke_passed?: boolean;
  web_material_completeness_cases_total?: number;
  android_material_completeness_cases_total?: number;
  web_material_completeness_cases_passed?: string;
  android_material_completeness_cases_passed?: string;
  web_material_panel_missing_count?: number;
  android_material_panel_missing_count?: number;
  web_missing_required_material_slots_count?: number;
  android_missing_required_material_slots_count?: number;
  web_truncation_detected_count?: number;
  android_truncation_detected_count?: number;
  web_generic_material_bucket_count?: number;
  android_generic_material_bucket_count?: number;
  web_fake_filler_material_count?: number;
  android_fake_filler_material_count?: number;
  web_raw_dump_ui_count?: number;
  android_raw_dump_ui_count?: number;
  route_equivalent_not_reported_as_real_browser?: boolean;
  route_equivalent_smoke_passed?: boolean;
  env_browser_green_rejected?: boolean;
  fake_green_claimed?: boolean;
  case_results?: CaseResult[];
};

export type MaterialCompletenessWebAndroidParitySummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_ANDROID_PARITY
    | typeof STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_ANDROID_PARITY_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: typeof MATERIAL_COMPLETENESS_CRITICAL_CASE_SET;
  require_real_browser: boolean;
  require_emulator: boolean;
  web_artifact: string | null;
  android_artifact: string | null;
  same_material_completeness_corpus_used_for_web_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_material_result_parity: boolean;
  web_android_result_parity: boolean;
  web_android_material_no_truncation_parity: boolean;
  web_actual_browser_green: boolean;
  android_actual_emulator_green: boolean;
  material_completeness_web_smoke_passed: boolean;
  material_completeness_android_smoke_passed: boolean;
  material_completeness_web_android_parity_passed: boolean;
  route_equivalent_not_reported_as_real_browser: true;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
  fake_green_claimed: false;
  exact_artifact_paths: {
    web_summary: string | null;
    android_summary: string | null;
    parity_summary: string;
  };
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

function latestSummary(root: string): string | null {
  if (!existsSync(root)) return null;
  const summaries: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) visit(fullPath);
      else if (stat.isFile() && entry === "summary.json") summaries.push(fullPath);
    }
  };
  visit(root);
  return summaries.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function readArtifact(filePath: string | null): MaterialSmokeArtifact | null {
  if (!filePath || !existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as MaterialSmokeArtifact;
}

function ids(results: readonly CaseResult[]): string[] {
  return results.map((item) => item.case_id);
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function mapByCase(results: readonly CaseResult[]): Map<string, CaseResult> {
  return new Map(results.map((item) => [item.case_id, item]));
}

function noTruncationAndMaterialValid(results: readonly CaseResult[]): boolean {
  return results.length === MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED && results.every((item) =>
    item.passed === true &&
    item.material_completeness_panel_visible === true &&
    item.material_missing_slots_panel_visible === true &&
    item.domain?.passed === true &&
    item.domain.calculator_rows_equal_snapshot_rows === true &&
    item.domain.snapshot_rows_equal_detail_drawer_rows === true &&
    item.domain.snapshot_rows_equal_pdf_rows === true &&
    item.domain.buyer_handoff_procurement_subset_complete === true &&
    item.domain.missing_required_material_slots_count === 0 &&
    item.domain.generic_material_bucket_count === 0 &&
    item.domain.fake_filler_material_count === 0 &&
    item.domain.backend_row_cap_detected === false &&
    item.domain.snapshot_truncation_detected === false &&
    item.domain.detail_drawer_truncation_detected === false &&
    item.domain.pdf_truncation_detected === false &&
    item.domain.buyer_handoff_truncation_detected === false
  );
}

export function runMaterialCompletenessWebAndroidParity(options: {
  webArtifact?: string | null;
  androidArtifact?: string | null;
  cases?: string | null;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  writeSummary?: boolean;
} = {}): { artifactPath: string; artifact: MaterialCompletenessWebAndroidParitySummary } {
  if (!isSupportedMaterialCompletenessCaseSet(options.cases)) throw new Error(`UNSUPPORTED_MATERIAL_COMPLETENESS_CASES:${options.cases}`);
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const webArtifactPath = options.webArtifact ?? process.env.MATERIAL_COMPLETENESS_WEB_SMOKE_ARTIFACT ?? latestSummary(WEB_ROOT);
  const androidArtifactPath = options.androidArtifact ?? process.env.MATERIAL_COMPLETENESS_ANDROID_SMOKE_ARTIFACT ?? latestSummary(ANDROID_ROOT);
  const web = readArtifact(webArtifactPath);
  const android = readArtifact(androidArtifactPath);
  const webCases = web?.case_results ?? [];
  const androidCases = android?.case_results ?? [];
  const webIds = ids(webCases);
  const androidIds = ids(androidCases);
  const webByCase = mapByCase(webCases);
  const androidByCase = mapByCase(androidCases);
  const sameCorpus =
    web?.cases === MATERIAL_COMPLETENESS_CRITICAL_CASE_SET &&
    android?.cases === MATERIAL_COMPLETENESS_CRITICAL_CASE_SET &&
    web?.web_material_completeness_cases_total === MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED &&
    android?.android_material_completeness_cases_total === MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED &&
    webCases.length === MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED &&
    androidCases.length === MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED;
  const caseIdParity = sameArray(webIds, androidIds);
  const resultParity = caseIdParity && webIds.every((caseId) => {
    const webCase = webByCase.get(caseId);
    const androidCase = androidByCase.get(caseId);
    return Boolean(
      webCase &&
      androidCase &&
      webCase.passed === androidCase.passed &&
      webCase.expected_family_id === androidCase.expected_family_id &&
      webCase.matched_family_id === androidCase.matched_family_id
    );
  });
  const noTruncationParity = noTruncationAndMaterialValid(webCases) && noTruncationAndMaterialValid(androidCases);
  const webActualGreen =
    web?.source_sha === sourceSha &&
    web?.final_status === GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_SMOKE &&
    web.actual_web_browser_material_completeness_smoke_passed === true &&
    web.material_completeness_web_smoke_passed === true &&
    web.web_material_completeness_cases_passed === `${MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED}/${MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED}` &&
    web.web_material_panel_missing_count === 0 &&
    web.web_missing_required_material_slots_count === 0 &&
    web.web_truncation_detected_count === 0 &&
    web.web_generic_material_bucket_count === 0 &&
    web.web_fake_filler_material_count === 0 &&
    web.web_raw_dump_ui_count === 0 &&
    web.route_equivalent_not_reported_as_real_browser === true &&
    web.route_equivalent_smoke_passed === false &&
    web.env_browser_green_rejected === true &&
    web.fake_green_claimed === false;
  const androidActualGreen =
    android?.source_sha === sourceSha &&
    android?.final_status === GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE &&
    android.actual_android_emulator_material_completeness_smoke_passed === true &&
    android.material_completeness_android_smoke_passed === true &&
    android.android_material_completeness_cases_passed === `${MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED}/${MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED}` &&
    android.android_material_panel_missing_count === 0 &&
    android.android_missing_required_material_slots_count === 0 &&
    android.android_truncation_detected_count === 0 &&
    android.android_generic_material_bucket_count === 0 &&
    android.android_fake_filler_material_count === 0 &&
    android.android_raw_dump_ui_count === 0 &&
    android.route_equivalent_not_reported_as_real_browser === true &&
    android.route_equivalent_smoke_passed === false &&
    android.env_browser_green_rejected === true &&
    android.fake_green_claimed === false;
  const requireRealBrowser = options.requireRealBrowser === true;
  const requireEmulator = options.requireEmulator === true;
  const outDir = path.join(PARITY_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  const blockers = [
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    requireEmulator ? "" : "emulator_required_flag_missing",
    web ? "" : "web_artifact_missing",
    android ? "" : "android_artifact_missing",
    webActualGreen ? "" : "web_material_completeness_actual_browser_smoke_not_green",
    androidActualGreen ? "" : "android_material_completeness_actual_emulator_smoke_not_green",
    sameCorpus ? "" : "same_material_completeness_corpus_not_proven",
    caseIdParity ? "" : "web_android_case_id_parity_failed",
    resultParity ? "" : "web_android_material_result_parity_failed",
    noTruncationParity ? "" : "web_android_material_no_truncation_parity_failed",
  ].filter(Boolean);
  const parityGreen = blockers.length === 0;
  const summary: MaterialCompletenessWebAndroidParitySummary = {
    final_status: parityGreen
      ? GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: MATERIAL_COMPLETENESS_CRITICAL_CASE_SET,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    web_artifact: webArtifactPath,
    android_artifact: androidArtifactPath,
    same_material_completeness_corpus_used_for_web_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_material_result_parity: resultParity,
    web_android_result_parity: resultParity,
    web_android_material_no_truncation_parity: noTruncationParity,
    web_actual_browser_green: webActualGreen,
    android_actual_emulator_green: androidActualGreen,
    material_completeness_web_smoke_passed: webActualGreen,
    material_completeness_android_smoke_passed: androidActualGreen,
    material_completeness_web_android_parity_passed: parityGreen,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    fake_green_claimed: false,
    exact_artifact_paths: {
      web_summary: webArtifactPath,
      android_summary: androidArtifactPath,
      parity_summary: artifactPath,
    },
    blockers,
  };
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runMaterialCompletenessWebAndroidParity.ts")) {
  void Promise.resolve(runMaterialCompletenessWebAndroidParity({
    webArtifact: argValue("web-artifact"),
    androidArtifact: argValue("android-artifact"),
    cases: argValue("cases"),
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  }))
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        same_material_completeness_corpus_used_for_web_android: result.artifact.same_material_completeness_corpus_used_for_web_android,
        web_android_case_id_parity: result.artifact.web_android_case_id_parity,
        web_android_material_result_parity: result.artifact.web_android_material_result_parity,
        web_android_material_no_truncation_parity: result.artifact.web_android_material_no_truncation_parity,
        material_completeness_web_smoke_passed: result.artifact.material_completeness_web_smoke_passed,
        material_completeness_android_smoke_passed: result.artifact.material_completeness_android_smoke_passed,
        material_completeness_web_android_parity_passed: result.artifact.material_completeness_web_android_parity_passed,
        blockers: result.artifact.blockers,
        artifact: result.artifactPath,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
