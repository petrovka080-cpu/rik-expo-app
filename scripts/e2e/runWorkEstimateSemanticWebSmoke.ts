import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET,
  WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT,
  buildWorkEstimateSemanticCriticalCases,
  semanticCriticalCorpusFingerprint,
  validateWorkEstimateSemanticCriticalCases,
} from "../estimate/workEstimateSemanticCriticalCases";
import {
  ensureProductionGradeWebServer,
  runProductionGradeBrowserCase,
  type ProductionGradeWebCaseProof,
  type ProductionGradeWebServerHandle,
} from "./runProductionGradeEstimateWebSmoke";
import { resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";

export const GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE =
  "GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE" as const;
export const STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE_FAILED" as const;

const WEB_ROOT = path.join(WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT, "web");
const DEFAULT_BASE_URL = "http://localhost:8106";

export type WorkEstimateSemanticWebSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE
    | typeof STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "web";
  cases: typeof WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET;
  corpus_fingerprint: string;
  base_url: string;
  require_real_browser: boolean;
  browser_automation_started: boolean;
  web_server_started_by_runner: boolean;
  actual_web_browser_work_estimate_semantic_smoke_passed: boolean;
  web_semantic_cases_passed: string;
  web_cases_total: number;
  web_cases_passed_count: number;
  web_cases_failed_count: number;
  web_wrong_family_match_count: number;
  web_missing_required_rows_count: number;
  web_wrong_unit_count: number;
  web_empty_estimate_count: number;
  web_refusal_count: number;
  web_drawings_required_stop_count: number;
  web_raw_dump_ui_count: number;
  web_pdf_missing_count: number;
  web_buyer_handoff_missing_count: number;
  web_console_errors_count: number;
  web_page_errors_count: number;
  route_equivalent_not_reported_as_real_browser: true;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  fake_green_claimed: false;
  blockers: string[];
  case_results: ProductionGradeWebCaseProof[];
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

function missingRequiredRows(proof: ProductionGradeWebCaseProof): boolean {
  return !proof.domain.required_row_types_present ||
    !proof.work_rows_visible ||
    !proof.material_rows_visible ||
    (proof.domain.service_rows_count > 0 && !proof.service_rows_visible) ||
    (proof.domain.equipment_rows_count > 0 && !proof.equipment_rows_visible);
}

export async function runWorkEstimateSemanticWebSmoke(options: {
  target?: "web";
  cases?: string;
  requireRealBrowser?: boolean;
  baseUrl?: string;
  writeSummary?: boolean;
  caseId?: string;
} = {}) {
  if ((options.target ?? "web") !== "web") throw new Error(`UNSUPPORTED_WORK_ESTIMATE_SEMANTIC_WEB_TARGET:${options.target}`);
  if ((options.cases ?? WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET) !== WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET) {
    throw new Error(`UNSUPPORTED_WORK_ESTIMATE_SEMANTIC_CASES:${options.cases}`);
  }
  const allCases = buildWorkEstimateSemanticCriticalCases();
  const fixtureBlockers = validateWorkEstimateSemanticCriticalCases(allCases);
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["WORK_ESTIMATE_SEMANTIC_WEB_BASE_URL", "WORK_ESTIMATE_SEMANTIC_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(WEB_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  let server: ProductionGradeWebServerHandle | null = null;
  const caseResults: ProductionGradeWebCaseProof[] = [];
  let browserStarted = false;
  const casesToRun = options.caseId
    ? allCases.filter((testCase) => testCase.case_id === options.caseId)
    : allCases;
  if (options.caseId && casesToRun.length !== 1) throw new Error(`UNKNOWN_WORK_ESTIMATE_SEMANTIC_CASE_ID:${options.caseId}`);
  try {
    server = await ensureProductionGradeWebServer(baseUrl, outDir);
    const browser = await chromium.launch({ headless: true });
    browserStarted = true;
    try {
      for (const testCase of casesToRun) {
        const result = await runProductionGradeBrowserCase(browser, baseUrl, testCase);
        caseResults.push(result);
        console.info(JSON.stringify({
          case_id: result.case_id,
          passed: result.passed,
          blockers_count: result.blockers.length,
          cases_done: caseResults.length,
          cases_total: casesToRun.length,
        }));
      }
    } finally {
      await browser.close();
    }
  } finally {
    server?.stop();
  }
  const requireRealBrowser = options.requireRealBrowser === true;
  const failedCases = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === allCases.length;
  const blockers = [
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${allCases.length}`,
    ...fixtureBlockers.map((blocker) => `fixture:${blocker}`),
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const summary: WorkEstimateSemanticWebSmokeSummary = {
    final_status: blockers.length === 0 && browserStarted && allCasesExecuted
      ? GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE
      : STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "web",
    cases: WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET,
    corpus_fingerprint: semanticCriticalCorpusFingerprint(allCases),
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    browser_automation_started: browserStarted,
    web_server_started_by_runner: server?.started ?? false,
    actual_web_browser_work_estimate_semantic_smoke_passed: blockers.length === 0 && browserStarted && allCasesExecuted,
    web_semantic_cases_passed: `${caseResults.filter((item) => item.passed).length}/${allCases.length}`,
    web_cases_total: allCases.length,
    web_cases_passed_count: caseResults.filter((item) => item.passed).length,
    web_cases_failed_count: failedCases.length + (allCasesExecuted ? 0 : allCases.length - caseResults.length),
    web_wrong_family_match_count: caseResults.filter((item) => item.domain.actual_family !== item.domain.expected_family).length,
    web_missing_required_rows_count: caseResults.filter(missingRequiredRows).length,
    web_wrong_unit_count: caseResults.filter((item) => !item.domain.expected_units_present || !item.domain.forbidden_units_absent).length,
    web_empty_estimate_count: caseResults.filter((item) => item.domain.row_count === 0 || item.positions_empty_after_prompt).length,
    web_refusal_count: caseResults.filter((item) => item.refusal_visible || !item.domain.dangerous_work_not_refused).length,
    web_drawings_required_stop_count: caseResults.filter((item) => item.drawings_required_stop_visible || !item.domain.drawings_not_required_for_preliminary_boq).length,
    web_raw_dump_ui_count: caseResults.filter((item) => item.raw_dump_visible || !item.domain.no_raw_dump).length,
    web_pdf_missing_count: caseResults.filter((item) => !item.domain.pdf_generated_from_snapshot || !item.pdf_button_visible_after_confirm).length,
    web_buyer_handoff_missing_count: caseResults.filter((item) => !item.domain.buyer_handoff_created || !item.domain.buyer_handoff_procurement_subset_valid).length,
    web_console_errors_count: caseResults.reduce((sum, item) => sum + item.console_error_count, 0),
    web_page_errors_count: caseResults.reduce((sum, item) => sum + item.page_error_count, 0),
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers,
    case_results: caseResults,
  };
  const artifactPath = path.join(outDir, "summary.json");
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runWorkEstimateSemanticWebSmoke.ts")) {
  void runWorkEstimateSemanticWebSmoke({
    target: (argValue("target") ?? "web") as "web",
    cases: argValue("cases") ?? WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET,
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url") ?? undefined,
    caseId: argValue("case-id") ?? undefined,
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_web_browser_work_estimate_semantic_smoke_passed: result.artifact.actual_web_browser_work_estimate_semantic_smoke_passed,
        web_semantic_cases_passed: result.artifact.web_semantic_cases_passed,
        web_console_errors_count: result.artifact.web_console_errors_count,
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
