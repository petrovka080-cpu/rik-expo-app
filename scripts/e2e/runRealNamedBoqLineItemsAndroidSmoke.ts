import { mkdirSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  isSupportedRealNamedBoqCaseSet,
  REAL_NAMED_BOQ_CRITICAL_CASE_SET,
  REAL_NAMED_BOQ_RUNTIME_CASES,
  REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
  runRealNamedBoqRuntimeCaseDomainProof,
} from "../estimate/realNamedBoqCriticalCases";
import {
  checkAndroidEmulatorHealth,
  STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
} from "./checkAndroidEmulatorHealth";
import {
  adbNoThrow,
  compactAndroidHealth,
  ensureWave2CAndroidWebServer,
  runWave2CAndroidBrowserCase,
  wave2CAndroidCaseBlockers,
  type Wave2CAndroidCaseProof,
  type Wave2CAndroidSmokeSummary,
} from "./runWave2CExpandedBoqAndroidSmoke";
import { argValue, hasFlag, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";

export const GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE_FAILED" as const;

const ANDROID_ROOT = path.join(".release-runtime", "ai-estimate-real-named-boq-line-items", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8095";

type RealNamedAndroidCaseProof = Wave2CAndroidCaseProof;

export type RealNamedAndroidSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE
    | typeof STOP_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE_FAILED
    | typeof STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "android-chrome";
  cases: typeof REAL_NAMED_BOQ_CRITICAL_CASE_SET;
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
  actual_android_emulator_real_named_boq_smoke_passed: boolean;
  actual_android_emulator_wave2c_expanded_smoke_passed: false;
  real_named_boq_line_items_android_smoke_passed: boolean;
  android_real_named_cases_passed: string;
  android_real_named_cases_total: number;
  android_cases_total: number;
  android_cases_passed_count: number;
  android_cases_failed_count: number;
  android_generic_line_names_count: number;
  android_template_only_line_names_count: number;
  android_raw_dump_ui_count: number;
  android_main_ui_ungrouped_rows_over_limit_count: number;
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
  exact_artifact_paths: {
    real_named_summary: string;
  };
  blockers: string[];
  case_results: RealNamedAndroidCaseProof[];
};

function stopSummary(input: {
  artifactPath: string;
  baseUrl: string;
  requireRealBrowser: boolean;
  requireEmulator: boolean;
  blocker: string;
  health?: ReturnType<typeof checkAndroidEmulatorHealth>["artifact"] | null;
}): RealNamedAndroidSmokeSummary {
  return {
    final_status: input.blocker === STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
      ? STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
      : STOP_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: REAL_NAMED_BOQ_CRITICAL_CASE_SET,
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
    actual_android_emulator_real_named_boq_smoke_passed: false,
    actual_android_emulator_wave2c_expanded_smoke_passed: false,
    real_named_boq_line_items_android_smoke_passed: false,
    android_real_named_cases_passed: `0/${REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED}`,
    android_real_named_cases_total: REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
    android_cases_total: REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
    android_cases_passed_count: 0,
    android_cases_failed_count: REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
    android_generic_line_names_count: 0,
    android_template_only_line_names_count: 0,
    android_raw_dump_ui_count: 0,
    android_main_ui_ungrouped_rows_over_limit_count: 0,
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
    exact_artifact_paths: {
      real_named_summary: input.artifactPath,
    },
    blockers: [input.blocker, ...(input.health?.blocking_reasons ?? [])],
    case_results: [],
  };
}

export async function runRealNamedBoqLineItemsAndroidSmoke(options: {
  target?: "android-chrome";
  cases?: string;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: RealNamedAndroidSmokeSummary }> {
  if ((options.target ?? "android-chrome") !== "android-chrome") {
    throw new Error(`UNSUPPORTED_REAL_NAMED_BOQ_ANDROID_TARGET:${options.target}`);
  }
  if (!isSupportedRealNamedBoqCaseSet(options.cases)) throw new Error(`UNSUPPORTED_REAL_NAMED_BOQ_CASES:${options.cases}`);
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["REAL_NAMED_BOQ_ANDROID_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ANDROID_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
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
    const artifact = stopSummary({ artifactPath, baseUrl, requireRealBrowser, requireEmulator, health: initialHealth, blocker: "real_browser_required_flag_missing" });
    if (options.writeSummary !== false) writeJson(artifactPath, artifact);
    return { artifactPath, artifact };
  }
  if (!initialHealth.android_lab_healthy || !initialHealth.selected_serial) {
    const artifact = stopSummary({ artifactPath, baseUrl, requireRealBrowser, requireEmulator, health: initialHealth, blocker: STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN });
    if (options.writeSummary !== false) writeJson(artifactPath, artifact);
    return { artifactPath, artifact };
  }

  let server: Awaited<ReturnType<typeof ensureWave2CAndroidWebServer>> | null = null;
  const caseResults: RealNamedAndroidCaseProof[] = [];
  let chromeAttached = false;
  const deviceId = initialHealth.selected_serial;
  let lastPeriodicHealth = initialHealth;
  try {
    server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
    for (const testCase of REAL_NAMED_BOQ_RUNTIME_CASES) {
      const domain = runRealNamedBoqRuntimeCaseDomainProof(testCase);
      const healthBefore = lastPeriodicHealth;
      let proof: Omit<RealNamedAndroidCaseProof, "passed" | "blockers">;
      try {
        if (!healthBefore.android_lab_healthy) throw new Error(`android_health_before_case_failed:${healthBefore.blocking_reasons.join("|")}`);
        proof = {
          ...(await runWave2CAndroidBrowserCase({
            deviceId,
            baseUrl,
            testCase: {
              case_id: testCase.case_id,
              prompt: testCase.prompt,
              family_id: testCase.family_id,
              category: testCase.category,
            },
            domain: domain as unknown as Wave2CAndroidSmokeSummary["case_results"][number]["domain"],
          })),
          android_health_before_case: compactAndroidHealth(healthBefore),
          android_health_after_case: compactAndroidHealth(healthBefore),
        };
        chromeAttached = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        proof = {
          case_id: testCase.case_id,
          prompt: testCase.prompt,
          expected_family_id: testCase.family_id,
          matched_family_id: domain.matched_family_id,
          target_url: `${baseUrl}/request`,
          page_url: `${baseUrl}/request`,
          summary_card_visible: false,
          grouped_boq_visible: false,
          details_drawer_visible: false,
          work_rows_visible: false,
          material_rows_visible: false,
          service_or_equipment_rows_visible: false,
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
          body_text_sample: `ERROR: ${errorMessage}`.slice(0, 5000),
          domain: domain as unknown as Wave2CAndroidSmokeSummary["case_results"][number]["domain"],
          android_health_before_case: compactAndroidHealth(healthBefore),
          android_health_after_case: compactAndroidHealth(healthBefore),
        };
      } finally {
        adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
      }
      const shouldCheckHealth = (caseResults.length + 1) % 10 === 0;
      const healthAfter = shouldCheckHealth
        ? checkAndroidEmulatorHealth({
          requireEmulator,
          requireChrome: true,
          serial: deviceId,
          baseUrl,
          writeArtifact: false,
        }).artifact
        : lastPeriodicHealth;
      if (shouldCheckHealth) lastPeriodicHealth = healthAfter;
      proof.android_health_after_case = compactAndroidHealth(healthAfter);
      const blockers = wave2CAndroidCaseBlockers(proof);
      caseResults.push({
        ...proof,
        passed: blockers.length === 0,
        blockers,
      });
      console.info(JSON.stringify({
        case_id: testCase.case_id,
        passed: blockers.length === 0,
        blockers_count: blockers.length,
        first_blockers: blockers.slice(0, 5),
        cases_done: caseResults.length,
        cases_total: REAL_NAMED_BOQ_RUNTIME_CASES.length,
      }));
      if (!healthAfter.android_lab_healthy) break;
    }
  } finally {
    server?.stop();
  }

  const failedCases = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED;
  const healthDegraded = caseResults.some((item) => !item.android_health_before_case.android_lab_healthy || !item.android_health_after_case.android_lab_healthy);
  const blockers = [
    requireEmulator ? "" : "emulator_required_flag_missing",
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED}`,
    chromeAttached ? "" : "android_chrome_not_launched_or_attached",
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const passed = blockers.length === 0 && allCasesExecuted && chromeAttached && !healthDegraded;
  const summary: RealNamedAndroidSmokeSummary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE
      : STOP_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_ANDROID_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: REAL_NAMED_BOQ_CRITICAL_CASE_SET,
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
    actual_android_emulator_real_named_boq_smoke_passed: passed,
    actual_android_emulator_wave2c_expanded_smoke_passed: false,
    real_named_boq_line_items_android_smoke_passed: passed,
    android_real_named_cases_passed: `${caseResults.filter((item) => item.passed).length}/${REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED}`,
    android_real_named_cases_total: REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
    android_cases_total: REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
    android_cases_passed_count: caseResults.filter((item) => item.passed).length,
    android_cases_failed_count: failedCases.length + (allCasesExecuted ? 0 : REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED - caseResults.length),
    android_generic_line_names_count: caseResults.reduce((sum, item) => sum + Number((item.domain as any).generic_line_names_count ?? 0), 0),
    android_template_only_line_names_count: caseResults.reduce((sum, item) => sum + Number((item.domain as any).template_only_line_names_count ?? 0), 0),
    android_raw_dump_ui_count: caseResults.filter((item) => item.raw_dump_visible || !item.domain.no_raw_dump).length,
    android_main_ui_ungrouped_rows_over_limit_count: caseResults.filter((item) => Boolean((item.domain as any).main_ui_ungrouped_rows_over_limit)).length,
    android_pdf_missing_count: caseResults.filter((item) => !item.domain.pdf_generated_from_snapshot || !item.domain.pdf_rows_equal_snapshot_rows || !item.pdf_button_visible_after_confirm).length,
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
    exact_artifact_paths: {
      real_named_summary: artifactPath,
    },
    blockers,
    case_results: caseResults,
  };
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runRealNamedBoqLineItemsAndroidSmoke.ts")) {
  void runRealNamedBoqLineItemsAndroidSmoke({
    target: (argValue("target") ?? "android-chrome") as "android-chrome",
    cases: argValue("cases") ?? undefined,
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url") ?? undefined,
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_android_emulator_real_named_boq_smoke_passed: result.artifact.actual_android_emulator_real_named_boq_smoke_passed,
        android_real_named_cases_passed: result.artifact.android_real_named_cases_passed,
        android_emulator_detected: result.artifact.android_emulator_detected,
        android_chrome_launched_or_attached: result.artifact.android_chrome_launched_or_attached,
        android_generic_line_names_count: result.artifact.android_generic_line_names_count,
        android_template_only_line_names_count: result.artifact.android_template_only_line_names_count,
        android_raw_dump_ui_count: result.artifact.android_raw_dump_ui_count,
        android_console_errors_count: result.artifact.android_console_errors_count,
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
