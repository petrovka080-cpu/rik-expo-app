import { mkdirSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET,
  WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT,
  buildWorkEstimateSemanticCriticalCases,
  semanticCriticalCorpusFingerprint,
  validateWorkEstimateSemanticCriticalCases,
} from "../estimate/workEstimateSemanticCriticalCases";
import { runProductionGradeEstimateCase } from "../estimate/productionGradeLayerSealCore";
import {
  checkAndroidEmulatorHealth,
  STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
  type AndroidEmulatorHealthResult,
} from "./checkAndroidEmulatorHealth";
import { resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";
import {
  compactAndroidHealth,
  ensureProductionGradeAndroidWebServer,
  productionGradeAndroidCaseBlockers,
  runProductionGradeAndroidBrowserCase,
  type ProductionGradeAndroidCaseProof,
  type ProductionGradeAndroidServerHandle,
} from "./runProductionGradeEstimateAndroidSmoke";

export const GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE =
  "GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE" as const;
export const STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE_FAILED" as const;
export const STOP_WORK_ESTIMATE_SEMANTIC_ANDROID_EMULATOR_EVIDENCE_MISSING_NO_GREEN =
  "STOP_WORK_ESTIMATE_SEMANTIC_ANDROID_EMULATOR_EVIDENCE_MISSING_NO_GREEN" as const;

const ANDROID_ROOT = path.join(WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT, "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8107";

export type WorkEstimateSemanticAndroidSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE
    | typeof STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE_FAILED
    | typeof STOP_WORK_ESTIMATE_SEMANTIC_ANDROID_EMULATOR_EVIDENCE_MISSING_NO_GREEN
    | typeof STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "android-chrome";
  cases: typeof WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET;
  corpus_fingerprint: string;
  base_url: string;
  require_real_browser: boolean;
  require_emulator: boolean;
  browser_automation_started: boolean;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_device_id: string | null;
  android_lab_health_checked: boolean;
  android_lab_healthy: boolean;
  android_health_blocking_reasons: string[];
  actual_android_emulator_work_estimate_semantic_smoke_passed: boolean;
  android_semantic_cases_passed: string;
  android_cases_total: number;
  android_cases_passed_count: number;
  android_cases_failed_count: number;
  android_wrong_family_match_count: number;
  android_missing_required_rows_count: number;
  android_wrong_unit_count: number;
  android_empty_estimate_count: number;
  android_refusal_count: number;
  android_drawings_required_stop_count: number;
  android_raw_dump_ui_count: number;
  android_pdf_missing_count: number;
  android_buyer_handoff_missing_count: number;
  android_console_errors_count: number;
  android_emulator_health_degraded: boolean;
  route_equivalent_not_reported_as_real_browser: true;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  fake_green_claimed: false;
  blockers: string[];
  case_results: ProductionGradeAndroidCaseProof[];
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

function missingRequiredRows(proof: ProductionGradeAndroidCaseProof): boolean {
  return !proof.domain.required_row_types_present ||
    !proof.work_rows_visible ||
    !proof.material_rows_visible ||
    (proof.domain.service_rows_count > 0 && !proof.service_rows_visible) ||
    (proof.domain.equipment_rows_count > 0 && !proof.equipment_rows_visible);
}

function writeStopArtifact(input: {
  outDir: string;
  baseUrl: string;
  allCasesCount: number;
  corpusFingerprint: string;
  requireRealBrowser: boolean;
  requireEmulator: boolean;
  health: AndroidEmulatorHealthResult | null;
  blocker: string;
}) {
  const summary: WorkEstimateSemanticAndroidSmokeSummary = {
    final_status: input.blocker === STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
      ? STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
      : STOP_WORK_ESTIMATE_SEMANTIC_ANDROID_EMULATOR_EVIDENCE_MISSING_NO_GREEN,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET,
    corpus_fingerprint: input.corpusFingerprint,
    base_url: input.baseUrl,
    require_real_browser: input.requireRealBrowser,
    require_emulator: input.requireEmulator,
    browser_automation_started: false,
    android_emulator_detected: input.health?.emulator_detected ?? false,
    android_chrome_launched_or_attached: false,
    android_device_id: input.health?.selected_serial ?? null,
    android_lab_health_checked: Boolean(input.health),
    android_lab_healthy: input.health?.android_lab_healthy ?? false,
    android_health_blocking_reasons: input.health?.blocking_reasons ?? [input.blocker],
    actual_android_emulator_work_estimate_semantic_smoke_passed: false,
    android_semantic_cases_passed: `0/${input.allCasesCount}`,
    android_cases_total: input.allCasesCount,
    android_cases_passed_count: 0,
    android_cases_failed_count: input.allCasesCount,
    android_wrong_family_match_count: 0,
    android_missing_required_rows_count: 0,
    android_wrong_unit_count: 0,
    android_empty_estimate_count: 0,
    android_refusal_count: 0,
    android_drawings_required_stop_count: 0,
    android_raw_dump_ui_count: 0,
    android_pdf_missing_count: 0,
    android_buyer_handoff_missing_count: 0,
    android_console_errors_count: 0,
    android_emulator_health_degraded: true,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers: [input.blocker, ...(input.health?.blocking_reasons ?? [])],
    case_results: [],
  };
  const artifactPath = path.join(input.outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

export async function runWorkEstimateSemanticAndroidSmoke(options: {
  target?: "android-chrome";
  cases?: string;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string;
  writeSummary?: boolean;
  caseId?: string;
} = {}) {
  if ((options.target ?? "android-chrome") !== "android-chrome") {
    throw new Error(`UNSUPPORTED_WORK_ESTIMATE_SEMANTIC_ANDROID_TARGET:${options.target}`);
  }
  if ((options.cases ?? WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET) !== WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET) {
    throw new Error(`UNSUPPORTED_WORK_ESTIMATE_SEMANTIC_CASES:${options.cases}`);
  }
  const allCases = buildWorkEstimateSemanticCriticalCases();
  const fixtureBlockers = validateWorkEstimateSemanticCriticalCases(allCases);
  const corpusFingerprint = semanticCriticalCorpusFingerprint(allCases);
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["WORK_ESTIMATE_SEMANTIC_ANDROID_BASE_URL", "WORK_ESTIMATE_SEMANTIC_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ANDROID_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = options.requireRealBrowser === true;
  const requireEmulator = options.requireEmulator === true;
  const initialHealth = checkAndroidEmulatorHealth({
    requireEmulator,
    requireChrome: true,
    baseUrl,
    writeArtifact: true,
  }).artifact;
  if (!requireRealBrowser) {
    return writeStopArtifact({
      outDir,
      baseUrl,
      allCasesCount: allCases.length,
      corpusFingerprint,
      requireRealBrowser,
      requireEmulator,
      health: initialHealth,
      blocker: "real_browser_required_flag_missing",
    });
  }
  if (!initialHealth.android_lab_healthy || !initialHealth.selected_serial) {
    return writeStopArtifact({
      outDir,
      baseUrl,
      allCasesCount: allCases.length,
      corpusFingerprint,
      requireRealBrowser,
      requireEmulator,
      health: initialHealth,
      blocker: STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
    });
  }

  let server: ProductionGradeAndroidServerHandle | null = null;
  const caseResults: ProductionGradeAndroidCaseProof[] = [];
  let chromeAttached = false;
  const casesToRun = options.caseId
    ? allCases.filter((testCase) => testCase.case_id === options.caseId)
    : allCases;
  if (options.caseId && casesToRun.length !== 1) throw new Error(`UNKNOWN_WORK_ESTIMATE_SEMANTIC_CASE_ID:${options.caseId}`);
  try {
    server = await ensureProductionGradeAndroidWebServer(baseUrl, outDir);
    const deviceId = initialHealth.selected_serial;
    for (const testCase of casesToRun) {
      const domain = runProductionGradeEstimateCase(testCase);
      const healthBefore = checkAndroidEmulatorHealth({
        requireEmulator,
        requireChrome: true,
        serial: deviceId,
        baseUrl,
        writeArtifact: false,
      }).artifact;
      let proof: Omit<ProductionGradeAndroidCaseProof, "passed" | "blockers">;
      try {
        if (!healthBefore.android_lab_healthy) throw new Error(`android_health_before_case_failed:${healthBefore.blocking_reasons.join("|")}`);
        proof = {
          ...(await runProductionGradeAndroidBrowserCase({ deviceId, baseUrl, testCase, domain })),
          android_health_before_case: compactAndroidHealth(healthBefore),
          android_health_after_case: compactAndroidHealth(healthBefore),
        };
        chromeAttached = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        proof = {
          case_id: testCase.case_id,
          prompt: testCase.prompt,
          target_url: `${baseUrl}/request`,
          page_url: `${baseUrl}/request`,
          summary_card_visible: false,
          grouped_boq_visible: false,
          details_drawer_visible: false,
          work_rows_visible: false,
          material_rows_visible: false,
          service_rows_visible: false,
          equipment_rows_visible: false,
          assumptions_visible: false,
          quantity_inputs: 0,
          remove_buttons: 0,
          pdf_button_visible_after_confirm: false,
          positions_empty_after_prompt: false,
          refusal_visible: false,
          drawings_required_stop_visible: false,
          raw_dump_visible: false,
          route_marker_only: false,
          runtime_marker_only: false,
          scrolling_worked: false,
          console_error_count: 0,
          console_error_messages: [],
          body_text_sample: `ERROR: ${errorMessage}`.slice(0, 5000),
          domain,
          android_health_before_case: compactAndroidHealth(healthBefore),
          android_health_after_case: compactAndroidHealth(healthBefore),
        };
      }
      const healthAfter = checkAndroidEmulatorHealth({
        requireEmulator,
        requireChrome: true,
        serial: deviceId,
        baseUrl,
        writeArtifact: false,
      }).artifact;
      proof.android_health_after_case = compactAndroidHealth(healthAfter);
      const blockers = productionGradeAndroidCaseBlockers(proof);
      caseResults.push({
        ...proof,
        passed: blockers.length === 0,
        blockers,
      });
      console.info(JSON.stringify({
        case_id: testCase.case_id,
        passed: blockers.length === 0,
        blockers_count: blockers.length,
        first_blockers: blockers.slice(0, 8),
        cases_done: caseResults.length,
        cases_total: casesToRun.length,
      }));
      if (!healthAfter.android_lab_healthy) break;
    }
  } finally {
    server?.stop();
  }

  const failedCases = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === allCases.length;
  const healthDegraded = caseResults.some((item) =>
    !item.android_health_before_case.android_lab_healthy ||
    !item.android_health_after_case.android_lab_healthy
  );
  const blockers = [
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${allCases.length}`,
    chromeAttached ? "" : "android_chrome_not_launched_or_attached",
    ...fixtureBlockers.map((blocker) => `fixture:${blocker}`),
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const summary: WorkEstimateSemanticAndroidSmokeSummary = {
    final_status: blockers.length === 0 && allCasesExecuted && chromeAttached && !healthDegraded
      ? GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE
      : STOP_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET,
    corpus_fingerprint: corpusFingerprint,
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    browser_automation_started: chromeAttached,
    android_emulator_detected: initialHealth.emulator_detected,
    android_chrome_launched_or_attached: chromeAttached,
    android_device_id: initialHealth.selected_serial,
    android_lab_health_checked: true,
    android_lab_healthy: initialHealth.android_lab_healthy && !healthDegraded,
    android_health_blocking_reasons: [
      ...initialHealth.blocking_reasons,
      ...caseResults.flatMap((item) => item.android_health_after_case.blocking_reasons),
    ],
    actual_android_emulator_work_estimate_semantic_smoke_passed: blockers.length === 0 && allCasesExecuted && chromeAttached && !healthDegraded,
    android_semantic_cases_passed: `${caseResults.filter((item) => item.passed).length}/${allCases.length}`,
    android_cases_total: allCases.length,
    android_cases_passed_count: caseResults.filter((item) => item.passed).length,
    android_cases_failed_count: failedCases.length + (allCasesExecuted ? 0 : allCases.length - caseResults.length),
    android_wrong_family_match_count: caseResults.filter((item) => item.domain.actual_family !== item.domain.expected_family).length,
    android_missing_required_rows_count: caseResults.filter(missingRequiredRows).length,
    android_wrong_unit_count: caseResults.filter((item) => !item.domain.expected_units_present || !item.domain.forbidden_units_absent).length,
    android_empty_estimate_count: caseResults.filter((item) => item.domain.row_count === 0 || item.positions_empty_after_prompt).length,
    android_refusal_count: caseResults.filter((item) => item.refusal_visible || !item.domain.dangerous_work_not_refused).length,
    android_drawings_required_stop_count: caseResults.filter((item) => item.drawings_required_stop_visible || !item.domain.drawings_not_required_for_preliminary_boq).length,
    android_raw_dump_ui_count: caseResults.filter((item) => item.raw_dump_visible || !item.domain.no_raw_dump).length,
    android_pdf_missing_count: caseResults.filter((item) => !item.domain.pdf_generated_from_snapshot || !item.pdf_button_visible_after_confirm).length,
    android_buyer_handoff_missing_count: caseResults.filter((item) => !item.domain.buyer_handoff_created || !item.domain.buyer_handoff_procurement_subset_valid).length,
    android_console_errors_count: caseResults.reduce((sum, item) => sum + item.console_error_count, 0),
    android_emulator_health_degraded: healthDegraded,
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

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runWorkEstimateSemanticAndroidSmoke.ts")) {
  void runWorkEstimateSemanticAndroidSmoke({
    target: (argValue("target") ?? "android-chrome") as "android-chrome",
    cases: argValue("cases") ?? WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET,
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url") ?? undefined,
    caseId: argValue("case-id") ?? undefined,
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_android_emulator_work_estimate_semantic_smoke_passed: result.artifact.actual_android_emulator_work_estimate_semantic_smoke_passed,
        android_semantic_cases_passed: result.artifact.android_semantic_cases_passed,
        android_emulator_detected: result.artifact.android_emulator_detected,
        android_chrome_launched_or_attached: result.artifact.android_chrome_launched_or_attached,
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
