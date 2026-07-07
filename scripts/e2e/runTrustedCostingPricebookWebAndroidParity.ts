import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { argValue, hasFlag } from "./renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE,
} from "./runTrustedCostingPricebookAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE,
  isSupportedTrustedCostingCaseSet,
  TRUSTED_COSTING_CASES_REQUIRED,
  TRUSTED_COSTING_CRITICAL_CASE_SET,
  type TrustedCostingSmokeCaseProof,
} from "./runTrustedCostingPricebookWebSmoke";

export const GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_ANDROID_PARITY_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook");
const WEB_ROOT = path.join(ROOT, "web");
const ANDROID_ROOT = path.join(ROOT, "android-chrome");
const PARITY_ROOT = path.join(ROOT, "web-android-parity");

type SmokeArtifact = {
  final_status?: string;
  source_sha?: string;
  cases?: string;
  web_trusted_costing_cases_passed?: string;
  android_trusted_costing_cases_passed?: string;
  actual_web_browser_trusted_costing_smoke_passed?: boolean;
  actual_android_emulator_trusted_costing_smoke_passed?: boolean;
  fake_green_claimed?: boolean;
  case_results?: TrustedCostingSmokeCaseProof[];
};

function latestSummary(root: string): string | null {
  if (!existsSync(root)) return null;
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) visit(full);
      else if (entry === "summary.json") files.push(full);
    }
  };
  visit(root);
  return files.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function readArtifact(filePath: string | null): SmokeArtifact | null {
  return filePath && existsSync(filePath)
    ? JSON.parse(readFileSync(filePath, "utf8")) as SmokeArtifact
    : null;
}

function ids(rows: readonly TrustedCostingSmokeCaseProof[]): string[] {
  return rows.map((row) => row.case_id);
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function runTrustedCostingPricebookWebAndroidParity(input: {
  cases?: string | null;
  webArtifact?: string | null;
  androidArtifact?: string | null;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  writeSummary?: boolean;
} = {}) {
  if (!isSupportedTrustedCostingCaseSet(input.cases)) throw new Error(`UNSUPPORTED_TRUSTED_COSTING_CASES:${input.cases}`);
  const outDir = path.join(PARITY_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  const webPath = input.webArtifact ?? latestSummary(WEB_ROOT);
  const androidPath = input.androidArtifact ?? latestSummary(ANDROID_ROOT);
  const web = readArtifact(webPath);
  const android = readArtifact(androidPath);
  const webCases = web?.case_results ?? [];
  const androidCases = android?.case_results ?? [];
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const caseIdParity = sameArray(ids(webCases), ids(androidCases));
  const costSummaryParity = caseIdParity && webCases.every((webCase, index) => {
    const androidCase = androidCases[index];
    return Boolean(androidCase) &&
      webCase.cost_summary_visible === androidCase.cost_summary_visible &&
      webCase.price_state_badges_visible === androidCase.price_state_badges_visible &&
      webCase.contract_total_forbidden === androidCase.contract_total_forbidden;
  });
  const pdfBuyerParity = caseIdParity && webCases.every((webCase, index) => {
    const androidCase = androidCases[index];
    return Boolean(androidCase) &&
      webCase.pdf_cost_section_valid === androidCase.pdf_cost_section_valid &&
      webCase.buyer_cost_trace_valid === androidCase.buyer_cost_trace_valid;
  });
  const sameCorpus =
    web?.cases === TRUSTED_COSTING_CRITICAL_CASE_SET &&
    android?.cases === TRUSTED_COSTING_CRITICAL_CASE_SET &&
    webCases.length === TRUSTED_COSTING_CASES_REQUIRED &&
    androidCases.length === TRUSTED_COSTING_CASES_REQUIRED;
  const webActualGreen =
    web?.source_sha === sourceSha &&
    web.final_status === GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE &&
    web.actual_web_browser_trusted_costing_smoke_passed === true &&
    web.fake_green_claimed === false;
  const androidActualGreen =
    android?.source_sha === sourceSha &&
    android.final_status === GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE &&
    android.actual_android_emulator_trusted_costing_smoke_passed === true &&
    android.fake_green_claimed === false;
  const blockers = [
    input.requireRealBrowser === true ? "" : "real_browser_required_flag_missing",
    input.requireEmulator === true ? "" : "emulator_required_flag_missing",
    web ? "" : "web_artifact_missing",
    android ? "" : "android_artifact_missing",
    webActualGreen ? "" : "web_actual_browser_smoke_not_green",
    androidActualGreen ? "" : "android_actual_emulator_smoke_not_green",
    sameCorpus ? "" : "same_trusted_costing_corpus_not_proven",
    caseIdParity ? "" : "web_android_case_id_parity_failed",
    costSummaryParity ? "" : "web_android_cost_summary_parity_failed",
    costSummaryParity ? "" : "web_android_price_state_parity_failed",
    pdfBuyerParity ? "" : "web_android_pdf_buyer_cost_parity_failed",
  ].filter(Boolean);
  const green = blockers.length === 0;
  const summary = {
    final_status: green
      ? GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: TRUSTED_COSTING_CRITICAL_CASE_SET,
    require_real_browser: input.requireRealBrowser === true,
    require_emulator: input.requireEmulator === true,
    web_artifact: webPath,
    android_artifact: androidPath,
    same_trusted_costing_corpus_used_for_web_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_cost_summary_parity: costSummaryParity,
    web_android_price_state_parity: costSummaryParity,
    web_android_pdf_buyer_cost_parity: pdfBuyerParity,
    fake_green_claimed: false,
    blockers,
  };
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runTrustedCostingPricebookWebAndroidParity.ts")) {
  try {
    const result = runTrustedCostingPricebookWebAndroidParity({
      cases: argValue("cases"),
      webArtifact: argValue("web-artifact"),
      androidArtifact: argValue("android-artifact"),
      requireRealBrowser: hasFlag("require-real-browser"),
      requireEmulator: hasFlag("require-emulator"),
      writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
    });
    console.log(JSON.stringify({
      final_status: result.artifact.final_status,
      same_trusted_costing_corpus_used_for_web_android: result.artifact.same_trusted_costing_corpus_used_for_web_android,
      web_android_case_id_parity: result.artifact.web_android_case_id_parity,
      web_android_cost_summary_parity: result.artifact.web_android_cost_summary_parity,
      web_android_pdf_buyer_cost_parity: result.artifact.web_android_pdf_buyer_cost_parity,
      blockers: result.artifact.blockers,
      artifact: result.artifactPath,
    }, null, 2));
    if (result.artifact.blockers.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
