import { mkdirSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  isSupportedMaterialCompletenessCaseSet,
  MATERIAL_COMPLETENESS_CRITICAL_CASE_SET,
  MATERIAL_COMPLETENESS_RUNTIME_CASES,
  MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED,
  runMaterialCompletenessRuntimeCaseDomainProof,
  type MaterialCompletenessRuntimeDomainProof,
} from "../estimate/materialCompletenessCriticalCases";
import { argValue, hasFlag, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";
import {
  checkAndroidEmulatorHealth,
  STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
} from "./checkAndroidEmulatorHealth";
import {
  adbNoThrow,
  ensureWave2CAndroidWebServer,
  runWave2CAndroidBrowserCase,
} from "./runWave2CExpandedBoqAndroidSmoke";

export const GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE_FAILED" as const;

const ANDROID_ROOT = path.join(".release-runtime", "ai-estimate-material-completeness", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8099";

type CompactAndroidHealth = Pick<
  ReturnType<typeof checkAndroidEmulatorHealth>["artifact"],
  "android_lab_healthy" | "blocking_reasons" | "sys_boot_completed_value" | "cmd_activity_available"
>;

export type MaterialCompletenessAndroidCaseProof = {
  case_id: string;
  prompt: string;
  expected_family_id: string;
  matched_family_id: string | null;
  passed: boolean;
  target_url: string;
  page_url: string;
  summary_card_visible: boolean;
  grouped_boq_visible: boolean;
  details_drawer_visible: boolean;
  work_rows_visible: boolean;
  material_rows_visible: boolean;
  service_or_equipment_rows_visible: boolean;
  assumptions_visible: boolean;
  quantity_inputs: number;
  remove_buttons: number;
  pdf_button_visible_after_confirm: boolean;
  positions_empty_after_prompt: boolean;
  refusal_visible: boolean;
  drawings_required_stop_visible: boolean;
  raw_dump_visible: boolean;
  route_marker_only: boolean;
  runtime_marker_only: boolean;
  scrolling_worked: boolean;
  material_completeness_panel_visible: boolean;
  material_missing_slots_panel_visible: boolean;
  material_panel_passed_text_visible: boolean;
  required_missing_zero_visible: boolean;
  truncation_false_visible: boolean;
  console_error_count: number;
  body_text_sample: string;
  material_panel_text_sample: string;
  domain: MaterialCompletenessRuntimeDomainProof;
  android_health_before_case: CompactAndroidHealth;
  android_health_after_case: CompactAndroidHealth;
  blockers: string[];
};

export type MaterialCompletenessAndroidSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE
    | typeof STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE_FAILED
    | typeof STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "android-chrome";
  cases: typeof MATERIAL_COMPLETENESS_CRITICAL_CASE_SET;
  base_url: string;
  require_real_browser: boolean;
  require_emulator: boolean;
  browser_automation_started: boolean;
  web_server_started_by_runner: boolean;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_device_id: string | null;
  actual_android_emulator_material_completeness_smoke_passed: boolean;
  material_completeness_android_smoke_passed: boolean;
  android_material_completeness_cases_passed: string;
  android_material_completeness_cases_total: number;
  android_cases_total: number;
  android_cases_passed_count: number;
  android_cases_failed_count: number;
  android_material_panel_missing_count: number;
  android_missing_required_material_slots_count: number;
  android_truncation_detected_count: number;
  android_generic_material_bucket_count: number;
  android_fake_filler_material_count: number;
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
  exact_artifact_paths: {
    material_completeness_summary: string;
  };
  blockers: string[];
  case_results: MaterialCompletenessAndroidCaseProof[];
};

function compactAndroidHealth(health: ReturnType<typeof checkAndroidEmulatorHealth>["artifact"]): CompactAndroidHealth {
  return {
    android_lab_healthy: health.android_lab_healthy,
    blocking_reasons: health.blocking_reasons,
    sys_boot_completed_value: health.sys_boot_completed_value,
    cmd_activity_available: health.cmd_activity_available,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkInitialAndroidHealthWithRetry(input: {
  requireEmulator: boolean;
  attempts?: number;
}) {
  const attempts = input.attempts ?? 3;
  let last = checkAndroidEmulatorHealth({
    requireEmulator: input.requireEmulator,
    requireChrome: true,
    writeArtifact: true,
  }).artifact;
  for (let attempt = 1; attempt < attempts && !last.android_lab_healthy; attempt += 1) {
    await sleep(5_000);
    last = checkAndroidEmulatorHealth({
      requireEmulator: input.requireEmulator,
      requireChrome: true,
      writeArtifact: true,
    }).artifact;
  }
  return last;
}

function truncationDetected(domain: MaterialCompletenessRuntimeDomainProof): boolean {
  return domain.backend_row_cap_detected ||
    domain.snapshot_truncation_detected ||
    domain.detail_drawer_truncation_detected ||
    domain.pdf_truncation_detected ||
    domain.buyer_handoff_truncation_detected;
}

function materialCaseBlockers(proof: Omit<MaterialCompletenessAndroidCaseProof, "passed" | "blockers">): string[] {
  return [
    proof.android_health_before_case.android_lab_healthy ? "" : `android_health_before_case_failed:${proof.android_health_before_case.blocking_reasons.join("|")}`,
    proof.android_health_after_case.android_lab_healthy ? "" : `android_health_after_case_failed:${proof.android_health_after_case.blocking_reasons.join("|")}`,
    proof.summary_card_visible ? "" : "android_summary_card_missing",
    proof.grouped_boq_visible ? "" : "android_grouped_boq_missing",
    proof.details_drawer_visible ? "" : "android_details_drawer_missing",
    proof.work_rows_visible ? "" : "android_work_rows_not_visible",
    proof.material_rows_visible ? "" : "android_material_rows_not_visible",
    proof.domain.service_rows_count + proof.domain.equipment_rows_count + proof.domain.transport_rows_count === 0 || proof.service_or_equipment_rows_visible
      ? ""
      : "android_service_or_equipment_rows_not_visible",
    proof.assumptions_visible ? "" : "android_assumptions_missing",
    proof.quantity_inputs > 0 ? "" : "android_quantity_inputs_missing",
    proof.remove_buttons > 0 ? "" : "android_remove_buttons_missing",
    proof.pdf_button_visible_after_confirm ? "" : "android_pdf_button_missing_after_confirm",
    !proof.positions_empty_after_prompt ? "" : "android_positions_empty_after_prompt",
    !proof.refusal_visible ? "" : "android_refusal_visible",
    !proof.drawings_required_stop_visible ? "" : "android_drawings_required_stop_visible",
    !proof.raw_dump_visible ? "" : "android_raw_dump_visible",
    !proof.route_marker_only ? "" : "android_route_marker_only_smoke_rejected",
    !proof.runtime_marker_only ? "" : "android_runtime_marker_only_smoke_rejected",
    proof.scrolling_worked ? "" : "android_scrolling_not_verified",
    proof.material_completeness_panel_visible ? "" : "android_material_completeness_panel_missing",
    proof.material_missing_slots_panel_visible ? "" : "android_material_missing_slots_panel_missing",
    proof.material_panel_passed_text_visible ? "" : "android_material_panel_not_passed",
    proof.required_missing_zero_visible ? "" : "android_required_missing_zero_not_visible",
    proof.truncation_false_visible ? "" : "android_truncation_false_not_visible",
    proof.console_error_count === 0 ? "" : `android_console_errors:${proof.console_error_count}`,
    proof.domain.passed ? "" : "domain_material_completeness_failed",
    proof.domain.missing_required_material_slots_count === 0 ? "" : `domain_missing_required_slots:${proof.domain.missing_required_material_slots_count}`,
    !truncationDetected(proof.domain) ? "" : "domain_truncation_detected",
    proof.domain.generic_material_bucket_count === 0 ? "" : `domain_generic_material_bucket:${proof.domain.generic_material_bucket_count}`,
    proof.domain.fake_filler_material_count === 0 ? "" : `domain_fake_filler_material:${proof.domain.fake_filler_material_count}`,
    ...proof.domain.blocking_reasons.map((reason) => `domain:${reason}`),
  ].filter(Boolean);
}

function writeSummary(input: {
  artifactPath: string;
  summary: MaterialCompletenessAndroidSmokeSummary;
  writeSummary?: boolean;
}): { artifactPath: string; artifact: MaterialCompletenessAndroidSmokeSummary } {
  if (input.writeSummary !== false) writeJson(input.artifactPath, input.summary);
  return { artifactPath: input.artifactPath, artifact: input.summary };
}

function stopSummary(input: {
  artifactPath: string;
  baseUrl: string;
  requireRealBrowser: boolean;
  requireEmulator: boolean;
  blocker: string;
  health?: ReturnType<typeof checkAndroidEmulatorHealth>["artifact"] | null;
  writeSummary?: boolean;
}): { artifactPath: string; artifact: MaterialCompletenessAndroidSmokeSummary } {
  return writeSummary({
    artifactPath: input.artifactPath,
    writeSummary: input.writeSummary,
    summary: {
      final_status: input.blocker === STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
        ? STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
        : STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE_FAILED,
      source_sha: gitOutput(["rev-parse", "HEAD"]),
      branch: gitOutput(["branch", "--show-current"]),
      upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
      generated_at: new Date().toISOString(),
      target: "android-chrome",
      cases: MATERIAL_COMPLETENESS_CRITICAL_CASE_SET,
      base_url: input.baseUrl,
      require_real_browser: input.requireRealBrowser,
      require_emulator: input.requireEmulator,
      browser_automation_started: false,
      web_server_started_by_runner: false,
      android_emulator_detected: input.health?.emulator_detected ?? false,
      android_chrome_launched_or_attached: false,
      android_device_id: input.health?.selected_serial ?? null,
      actual_android_emulator_material_completeness_smoke_passed: false,
      material_completeness_android_smoke_passed: false,
      android_material_completeness_cases_passed: `0/${MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED}`,
      android_material_completeness_cases_total: MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED,
      android_cases_total: MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED,
      android_cases_passed_count: 0,
      android_cases_failed_count: MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED,
      android_material_panel_missing_count: 0,
      android_missing_required_material_slots_count: 0,
      android_truncation_detected_count: 0,
      android_generic_material_bucket_count: 0,
      android_fake_filler_material_count: 0,
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
      exact_artifact_paths: {
        material_completeness_summary: input.artifactPath,
      },
      blockers: [input.blocker, ...(input.health?.blocking_reasons ?? [])],
      case_results: [],
    },
  });
}

export async function runMaterialCompletenessAndroidSmoke(input: {
  target?: "android-chrome";
  cases?: string | null;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: MaterialCompletenessAndroidSmokeSummary }> {
  if ((input.target ?? "android-chrome") !== "android-chrome") {
    throw new Error(`UNSUPPORTED_MATERIAL_COMPLETENESS_ANDROID_TARGET:${input.target}`);
  }
  if (!isSupportedMaterialCompletenessCaseSet(input.cases)) throw new Error(`UNSUPPORTED_MATERIAL_COMPLETENESS_CASES:${input.cases}`);
  const baseUrl = resolveE2eBaseUrl({
    explicit: input.baseUrl,
    scriptEnvKeys: ["MATERIAL_COMPLETENESS_ANDROID_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ANDROID_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = input.requireRealBrowser === true;
  const requireEmulator = input.requireEmulator === true;
  const initialHealth = await checkInitialAndroidHealthWithRetry({ requireEmulator });
  if (!requireRealBrowser) {
    return stopSummary({ artifactPath, baseUrl, requireRealBrowser, requireEmulator, health: initialHealth, blocker: "real_browser_required_flag_missing", writeSummary: input.writeSummary });
  }
  if (!initialHealth.android_lab_healthy || !initialHealth.selected_serial) {
    return stopSummary({ artifactPath, baseUrl, requireRealBrowser, requireEmulator, health: initialHealth, blocker: STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN, writeSummary: input.writeSummary });
  }

  const deviceId = initialHealth.selected_serial;
  let server: Awaited<ReturnType<typeof ensureWave2CAndroidWebServer>> | null = null;
  const caseResults: MaterialCompletenessAndroidCaseProof[] = [];
  let chromeAttached = false;
  let lastPeriodicHealth = initialHealth;
  try {
    server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
    for (const testCase of MATERIAL_COMPLETENESS_RUNTIME_CASES) {
      const domain = runMaterialCompletenessRuntimeCaseDomainProof(testCase);
      const healthBeforeCase = lastPeriodicHealth;
      try {
        const androidProof = await runWave2CAndroidBrowserCase({
          deviceId,
          baseUrl,
          testCase: {
            case_id: testCase.case_id,
            prompt: testCase.prompt,
            family_id: testCase.family_id,
            category: testCase.category,
          },
          domain: domain as any,
        });
        chromeAttached = true;
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
        const panelText = androidProof.material_completeness_text ?? "";
        const proofWithoutPass: Omit<MaterialCompletenessAndroidCaseProof, "passed" | "blockers"> = {
          case_id: testCase.case_id,
          prompt: testCase.prompt,
          expected_family_id: testCase.family_id,
          matched_family_id: domain.matched_family_id,
          target_url: androidProof.target_url,
          page_url: androidProof.page_url,
          summary_card_visible: androidProof.summary_card_visible,
          grouped_boq_visible: androidProof.grouped_boq_visible,
          details_drawer_visible: androidProof.details_drawer_visible,
          work_rows_visible: androidProof.work_rows_visible,
          material_rows_visible: androidProof.material_rows_visible,
          service_or_equipment_rows_visible: androidProof.service_or_equipment_rows_visible,
          assumptions_visible: androidProof.assumptions_visible,
          quantity_inputs: androidProof.quantity_inputs,
          remove_buttons: androidProof.remove_buttons,
          pdf_button_visible_after_confirm: androidProof.pdf_button_visible_after_confirm,
          positions_empty_after_prompt: androidProof.positions_empty_after_prompt,
          refusal_visible: androidProof.refusal_visible,
          drawings_required_stop_visible: androidProof.drawings_required_stop_visible,
          raw_dump_visible: androidProof.raw_dump_visible,
          route_marker_only: androidProof.route_marker_only,
          runtime_marker_only: androidProof.runtime_marker_only,
          scrolling_worked: androidProof.scrolling_worked,
          material_completeness_panel_visible: androidProof.material_completeness_panel_visible === true,
          material_missing_slots_panel_visible: androidProof.material_missing_slots_panel_visible === true,
          material_panel_passed_text_visible: /Состав материалов полный/.test(panelText),
          required_missing_zero_visible: /missing=0/.test(panelText),
          truncation_false_visible: /truncation=false/.test(panelText),
          console_error_count: androidProof.console_error_count,
          body_text_sample: androidProof.body_text_sample,
          material_panel_text_sample: panelText.slice(0, 2000),
          domain,
          android_health_before_case: compactAndroidHealth(healthBeforeCase),
          android_health_after_case: compactAndroidHealth(healthAfter),
        };
        const blockers = materialCaseBlockers(proofWithoutPass);
        caseResults.push({
          ...proofWithoutPass,
          passed: blockers.length === 0,
          blockers,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const healthAfter = checkAndroidEmulatorHealth({
          requireEmulator,
          requireChrome: true,
          serial: deviceId,
          baseUrl,
          writeArtifact: false,
        }).artifact;
        lastPeriodicHealth = healthAfter;
        const proofWithoutPass: Omit<MaterialCompletenessAndroidCaseProof, "passed" | "blockers"> = {
          case_id: testCase.case_id,
          prompt: testCase.prompt,
          expected_family_id: testCase.family_id,
          matched_family_id: domain.matched_family_id,
          target_url: `${baseUrl.replace(/\/+$/, "")}/request`,
          page_url: `${baseUrl.replace(/\/+$/, "")}/request`,
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
          material_completeness_panel_visible: false,
          material_missing_slots_panel_visible: false,
          material_panel_passed_text_visible: false,
          required_missing_zero_visible: false,
          truncation_false_visible: false,
          console_error_count: 0,
          body_text_sample: `ERROR: ${errorMessage}`.slice(0, 5000),
          material_panel_text_sample: "",
          domain,
          android_health_before_case: compactAndroidHealth(healthBeforeCase),
          android_health_after_case: compactAndroidHealth(healthAfter),
        };
        caseResults.push({
          ...proofWithoutPass,
          passed: false,
          blockers: [
            `android_browser_flow_exception:${errorMessage.replace(/\s+/g, " ").slice(0, 240)}`,
            ...materialCaseBlockers(proofWithoutPass),
          ],
        });
      }
      adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
      console.info(JSON.stringify({
        case_id: testCase.case_id,
        passed: caseResults[caseResults.length - 1]?.passed ?? false,
        blockers_count: caseResults[caseResults.length - 1]?.blockers.length ?? 0,
        first_blockers: caseResults[caseResults.length - 1]?.blockers.slice(0, 5) ?? [],
        cases_done: caseResults.length,
        cases_total: MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED,
      }));
      if (!lastPeriodicHealth.android_lab_healthy) break;
    }
  } finally {
    server?.stop();
    adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
  }

  const failedCases = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED;
  const healthAfterRun = checkAndroidEmulatorHealth({
    requireEmulator,
    requireChrome: true,
    serial: deviceId,
    baseUrl,
    writeArtifact: false,
  }).artifact;
  const healthDegraded = !initialHealth.android_lab_healthy || !healthAfterRun.android_lab_healthy;
  const blockers = [
    requireEmulator ? "" : "emulator_required_flag_missing",
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED}`,
    chromeAttached ? "" : "android_chrome_not_launched_or_attached",
    healthDegraded ? `android_emulator_health_degraded:${healthAfterRun.blocking_reasons.join("|")}` : "",
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const passed = blockers.length === 0 && allCasesExecuted && chromeAttached && !healthDegraded;
  const summary: MaterialCompletenessAndroidSmokeSummary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE
      : STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: MATERIAL_COMPLETENESS_CRITICAL_CASE_SET,
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    browser_automation_started: chromeAttached,
    web_server_started_by_runner: server?.started ?? false,
    android_emulator_detected: initialHealth.emulator_detected,
    android_chrome_launched_or_attached: chromeAttached,
    android_device_id: deviceId,
    actual_android_emulator_material_completeness_smoke_passed: passed,
    material_completeness_android_smoke_passed: passed,
    android_material_completeness_cases_passed: `${caseResults.filter((item) => item.passed).length}/${MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED}`,
    android_material_completeness_cases_total: MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED,
    android_cases_total: MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED,
    android_cases_passed_count: caseResults.filter((item) => item.passed).length,
    android_cases_failed_count: failedCases.length + (allCasesExecuted ? 0 : MATERIAL_COMPLETENESS_RUNTIME_CASES_REQUIRED - caseResults.length),
    android_material_panel_missing_count: caseResults.filter((item) => !item.material_completeness_panel_visible || !item.material_missing_slots_panel_visible).length,
    android_missing_required_material_slots_count: caseResults.reduce((sum, item) => sum + item.domain.missing_required_material_slots_count, 0),
    android_truncation_detected_count: caseResults.filter((item) => truncationDetected(item.domain)).length,
    android_generic_material_bucket_count: caseResults.reduce((sum, item) => sum + item.domain.generic_material_bucket_count, 0),
    android_fake_filler_material_count: caseResults.reduce((sum, item) => sum + item.domain.fake_filler_material_count, 0),
    android_raw_dump_ui_count: caseResults.filter((item) => item.raw_dump_visible).length,
    android_pdf_missing_count: caseResults.filter((item) => !item.domain.snapshot_rows_equal_pdf_rows || !item.pdf_button_visible_after_confirm).length,
    android_buyer_handoff_missing_count: caseResults.filter((item) => !item.domain.buyer_handoff_procurement_subset_complete).length,
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
      material_completeness_summary: artifactPath,
    },
    blockers,
    case_results: caseResults,
  };
  return writeSummary({ artifactPath, summary, writeSummary: input.writeSummary });
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runMaterialCompletenessAndroidSmoke.ts")) {
  void runMaterialCompletenessAndroidSmoke({
    target: (argValue("target") ?? "android-chrome") as "android-chrome",
    cases: argValue("cases") ?? undefined,
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url"),
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_android_emulator_material_completeness_smoke_passed: result.artifact.actual_android_emulator_material_completeness_smoke_passed,
        android_material_completeness_cases_passed: result.artifact.android_material_completeness_cases_passed,
        android_emulator_detected: result.artifact.android_emulator_detected,
        android_chrome_launched_or_attached: result.artifact.android_chrome_launched_or_attached,
        android_material_panel_missing_count: result.artifact.android_material_panel_missing_count,
        android_missing_required_material_slots_count: result.artifact.android_missing_required_material_slots_count,
        android_truncation_detected_count: result.artifact.android_truncation_detected_count,
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
