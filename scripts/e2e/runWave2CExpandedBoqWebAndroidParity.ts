import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { WAVE2C_EXPANDED_CASE_SET, WAVE2C_EXPANDED_CRITICAL_CASES } from "../estimate/wave2CExpandedBoqCases";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_WEB_BROWSER_SMOKE } from "./runWave2CExpandedBoqWebSmoke";
import { GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_ANDROID_CHROME_SMOKE } from "./runWave2CExpandedBoqAndroidSmoke";

export const GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_REAL_BOQ_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_WAVE2C_EXPANDED_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_WAVE2C_EXPANDED_REAL_BOQ_WEB_ANDROID_PARITY_FAILED" as const;

const PARITY_ROOT = path.join(".release-runtime", "ai-estimate-wave2c-expanded-1610", "web-android-parity");
const WEB_ROOT = path.join(".release-runtime", "ai-estimate-wave2c-expanded-1610", "web");
const ANDROID_ROOT = path.join(".release-runtime", "ai-estimate-wave2c-expanded-1610", "android-chrome");

type CaseResult = {
  case_id: string;
  passed: boolean;
  expected_family_id: string;
  matched_family_id: string | null;
  domain?: {
    pdf_generated_from_snapshot?: boolean;
    pdf_rows_equal_snapshot_rows?: boolean;
    buyer_handoff_created?: boolean;
    buyer_handoff_procurement_subset_valid?: boolean;
    no_refusal?: boolean;
    no_drawings_required_stop?: boolean;
    no_raw_dump?: boolean;
  };
};

type SmokeArtifact = {
  final_status?: string;
  cases?: string;
  web_cases_total?: number;
  android_cases_total?: number;
  actual_web_browser_wave2c_expanded_smoke_passed?: boolean;
  actual_android_emulator_wave2c_expanded_smoke_passed?: boolean;
  route_equivalent_not_reported_as_real_browser?: boolean;
  route_equivalent_smoke_passed?: boolean;
  env_browser_green_rejected?: boolean;
  case_results?: CaseResult[];
};

export type Wave2CWebAndroidParitySummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_WEB_ANDROID_PARITY
    | typeof STOP_AI_ESTIMATE_WAVE2C_EXPANDED_WEB_ANDROID_PARITY_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: typeof WAVE2C_EXPANDED_CASE_SET;
  require_real_browser: boolean;
  require_emulator: boolean;
  web_artifact: string | null;
  android_artifact: string | null;
  wave2c_web_android_parity_runner_created: true;
  same_wave2c_corpus_used_for_web_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_result_parity: boolean;
  web_android_pdf_buyer_parity: boolean;
  web_actual_browser_green: boolean;
  android_actual_emulator_green: boolean;
  route_equivalent_not_reported_as_real_browser: true;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
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

function latestSummary(root: string): string | null {
  if (!existsSync(root)) return null;
  const summaries: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) visit(fullPath);
      if (stat.isFile() && entry === "summary.json") summaries.push(fullPath);
    }
  };
  visit(root);
  return summaries
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function readArtifact(filePath: string | null): SmokeArtifact | null {
  if (!filePath || !existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as SmokeArtifact;
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

function allPdfBuyerValid(results: readonly CaseResult[]): boolean {
  return results.every((item) =>
    item.domain?.pdf_generated_from_snapshot === true &&
    item.domain?.pdf_rows_equal_snapshot_rows === true &&
    item.domain?.buyer_handoff_created === true &&
    item.domain?.buyer_handoff_procurement_subset_valid === true &&
    item.domain?.no_refusal === true &&
    item.domain?.no_drawings_required_stop === true &&
    item.domain?.no_raw_dump === true
  );
}

export function runWave2CExpandedBoqWebAndroidParity(options: {
  webArtifact?: string | null;
  androidArtifact?: string | null;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  writeSummary?: boolean;
} = {}) {
  const webArtifactPath = options.webArtifact ?? process.env.WAVE2C_WEB_SMOKE_ARTIFACT ?? latestSummary(WEB_ROOT);
  const androidArtifactPath = options.androidArtifact ?? process.env.WAVE2C_ANDROID_SMOKE_ARTIFACT ?? latestSummary(ANDROID_ROOT);
  const web = readArtifact(webArtifactPath);
  const android = readArtifact(androidArtifactPath);
  const webCases = web?.case_results ?? [];
  const androidCases = android?.case_results ?? [];
  const expectedIds = WAVE2C_EXPANDED_CRITICAL_CASES.map((item) => item.case_id);
  const webIds = ids(webCases);
  const androidIds = ids(androidCases);
  const webByCase = mapByCase(webCases);
  const androidByCase = mapByCase(androidCases);
  const sameCorpus =
    web?.cases === WAVE2C_EXPANDED_CASE_SET &&
    android?.cases === WAVE2C_EXPANDED_CASE_SET &&
    sameArray(webIds, expectedIds) &&
    sameArray(androidIds, expectedIds);
  const caseIdParity = sameArray(webIds, androidIds);
  const resultParity = caseIdParity && webIds.every((caseId) => {
    const webCase = webByCase.get(caseId);
    const androidCase = androidByCase.get(caseId);
    return Boolean(webCase && androidCase && webCase.passed === androidCase.passed && webCase.expected_family_id === androidCase.expected_family_id && webCase.matched_family_id === androidCase.matched_family_id);
  });
  const pdfBuyerParity = allPdfBuyerValid(webCases) && allPdfBuyerValid(androidCases);
  const webActualGreen =
    web?.final_status === GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_WEB_BROWSER_SMOKE &&
    web.actual_web_browser_wave2c_expanded_smoke_passed === true &&
    web.route_equivalent_not_reported_as_real_browser === true &&
    web.route_equivalent_smoke_passed === false &&
    web.env_browser_green_rejected === true;
  const androidActualGreen =
    android?.final_status === GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_ANDROID_CHROME_SMOKE &&
    android.actual_android_emulator_wave2c_expanded_smoke_passed === true &&
    android.route_equivalent_not_reported_as_real_browser === true &&
    android.route_equivalent_smoke_passed === false &&
    android.env_browser_green_rejected === true;
  const requireRealBrowser = options.requireRealBrowser === true;
  const requireEmulator = options.requireEmulator === true;
  const blockers = [
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    requireEmulator ? "" : "emulator_required_flag_missing",
    web ? "" : "web_artifact_missing",
    android ? "" : "android_artifact_missing",
    webActualGreen ? "" : "web_actual_browser_smoke_not_green",
    androidActualGreen ? "" : "android_actual_emulator_smoke_not_green",
    sameCorpus ? "" : "same_wave2c_corpus_not_proven",
    caseIdParity ? "" : "web_android_case_id_parity_failed",
    resultParity ? "" : "web_android_result_parity_failed",
    pdfBuyerParity ? "" : "web_android_pdf_buyer_parity_failed",
  ].filter(Boolean);
  const summary: Wave2CWebAndroidParitySummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_WAVE2C_EXPANDED_WEB_ANDROID_PARITY_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: WAVE2C_EXPANDED_CASE_SET,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    web_artifact: webArtifactPath,
    android_artifact: androidArtifactPath,
    wave2c_web_android_parity_runner_created: true,
    same_wave2c_corpus_used_for_web_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_result_parity: resultParity,
    web_android_pdf_buyer_parity: pdfBuyerParity,
    web_actual_browser_green: webActualGreen,
    android_actual_emulator_green: androidActualGreen,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    fake_green_claimed: false,
    blockers,
  };
  const outDir = path.join(PARITY_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runWave2CExpandedBoqWebAndroidParity.ts")) {
  void Promise.resolve(runWave2CExpandedBoqWebAndroidParity({
    webArtifact: argValue("web-artifact"),
    androidArtifact: argValue("android-artifact"),
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    writeSummary: hasFlag("write-summary") || true,
  }))
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        same_wave2c_corpus_used_for_web_android: result.artifact.same_wave2c_corpus_used_for_web_android,
        web_android_case_id_parity: result.artifact.web_android_case_id_parity,
        web_android_result_parity: result.artifact.web_android_result_parity,
        web_android_pdf_buyer_parity: result.artifact.web_android_pdf_buyer_parity,
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
