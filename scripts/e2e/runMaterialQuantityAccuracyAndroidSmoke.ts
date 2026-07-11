import { mkdirSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  isSupportedMaterialQuantityCaseSet,
  MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET,
  MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES,
  MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
  runMaterialQuantityRuntimeCaseDomainProof,
  type MaterialQuantityRuntimeDomainProof,
} from "../estimate/materialQuantityCriticalCases";
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

export const GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE_FAILED" as const;

const ANDROID_ROOT = path.join(".release-runtime", "ai-estimate-material-quantity-accuracy", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8101";

type CompactAndroidHealth = Pick<
  ReturnType<typeof checkAndroidEmulatorHealth>["artifact"],
  "android_lab_healthy" | "blocking_reasons" | "sys_boot_completed_value" | "cmd_activity_available"
>;

export type MaterialQuantityAndroidCaseProof = {
  case_id: string;
  prompt: string;
  expected_family_id: string;
  matched_family_id: string | null;
  passed: boolean;
  target_url: string;
  page_url: string;
  material_quantity_panel_visible: boolean;
  material_waste_packaging_panel_visible: boolean;
  material_formula_drawer_visible: boolean;
  pdf_button_visible_after_confirm: boolean;
  raw_dump_visible: boolean;
  scrolling_worked: boolean;
  console_error_count: number;
  body_text_sample: string;
  domain: MaterialQuantityRuntimeDomainProof;
  android_health_before_case: CompactAndroidHealth;
  android_health_after_case: CompactAndroidHealth;
  blockers: string[];
};

export type MaterialQuantityAndroidSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE
    | typeof STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE_FAILED
    | typeof STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "android-chrome";
  cases: typeof MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET;
  base_url: string;
  require_real_browser: boolean;
  require_emulator: boolean;
  browser_automation_started: boolean;
  web_server_started_by_runner: boolean;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_device_id: string | null;
  actual_android_emulator_material_quantity_accuracy_smoke_passed: boolean;
  material_quantity_accuracy_android_smoke_passed: boolean;
  android_material_quantity_accuracy_cases_passed: string;
  android_material_quantity_accuracy_cases_total: number;
  android_cases_total: number;
  android_cases_passed_count: number;
  android_cases_failed_count: number;
  android_material_quantity_panel_missing_count: number;
  android_material_quantity_validation_failed_count: number;
  android_raw_dump_ui_count: number;
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
    material_quantity_accuracy_summary: string;
  };
  blockers: string[];
  case_results: MaterialQuantityAndroidCaseProof[];
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

function materialCaseBlockers(proof: Omit<MaterialQuantityAndroidCaseProof, "passed" | "blockers">): string[] {
  return [
    proof.android_health_before_case.android_lab_healthy ? "" : `android_health_before_case_failed:${proof.android_health_before_case.blocking_reasons.join("|")}`,
    proof.android_health_after_case.android_lab_healthy ? "" : `android_health_after_case_failed:${proof.android_health_after_case.blocking_reasons.join("|")}`,
    proof.material_quantity_panel_visible ? "" : "android_material_quantity_panel_missing",
    proof.material_waste_packaging_panel_visible ? "" : "android_material_waste_packaging_panel_missing",
    proof.material_formula_drawer_visible ? "" : "android_material_formula_drawer_missing",
    proof.pdf_button_visible_after_confirm ? "" : "android_pdf_button_missing_after_confirm",
    !proof.raw_dump_visible ? "" : "android_raw_dump_visible",
    proof.scrolling_worked ? "" : "android_scrolling_not_verified",
    proof.console_error_count === 0 ? "" : `android_console_errors:${proof.console_error_count}`,
    proof.domain.passed ? "" : "domain_material_quantity_failed",
    proof.domain.material_quantity_lines_count > 0 ? "" : "domain_material_quantity_lines_missing",
    proof.domain.procurement_quantity_less_than_gross_count === 0 ? "" : "domain_procurement_quantity_less_than_gross",
    proof.domain.gross_less_than_net_count === 0 ? "" : "domain_gross_less_than_net",
    ...proof.domain.blocking_reasons.map((reason) => `domain:${reason}`),
  ].filter(Boolean);
}

function writeSummary(input: {
  artifactPath: string;
  summary: MaterialQuantityAndroidSmokeSummary;
  writeSummary?: boolean;
}): { artifactPath: string; artifact: MaterialQuantityAndroidSmokeSummary } {
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
}): { artifactPath: string; artifact: MaterialQuantityAndroidSmokeSummary } {
  return writeSummary({
    artifactPath: input.artifactPath,
    writeSummary: input.writeSummary,
    summary: {
      final_status: input.blocker === STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
        ? STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
        : STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE_FAILED,
      source_sha: gitOutput(["rev-parse", "HEAD"]),
      branch: gitOutput(["branch", "--show-current"]),
      upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
      generated_at: new Date().toISOString(),
      target: "android-chrome",
      cases: MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET,
      base_url: input.baseUrl,
      require_real_browser: input.requireRealBrowser,
      require_emulator: input.requireEmulator,
      browser_automation_started: false,
      web_server_started_by_runner: false,
      android_emulator_detected: input.health?.emulator_detected ?? false,
      android_chrome_launched_or_attached: false,
      android_device_id: input.health?.selected_serial ?? null,
      actual_android_emulator_material_quantity_accuracy_smoke_passed: false,
      material_quantity_accuracy_android_smoke_passed: false,
      android_material_quantity_accuracy_cases_passed: `0/${MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED}`,
      android_material_quantity_accuracy_cases_total: MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
      android_cases_total: MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
      android_cases_passed_count: 0,
      android_cases_failed_count: MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
      android_material_quantity_panel_missing_count: 0,
      android_material_quantity_validation_failed_count: 0,
      android_raw_dump_ui_count: 0,
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
        material_quantity_accuracy_summary: input.artifactPath,
      },
      blockers: [input.blocker, ...(input.health?.blocking_reasons ?? [])],
      case_results: [],
    },
  });
}

export async function runMaterialQuantityAccuracyAndroidSmoke(input: {
  target?: "android-chrome";
  cases?: string | null;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: MaterialQuantityAndroidSmokeSummary }> {
  if ((input.target ?? "android-chrome") !== "android-chrome") throw new Error(`UNSUPPORTED_MATERIAL_QUANTITY_ANDROID_TARGET:${input.target}`);
  if (!isSupportedMaterialQuantityCaseSet(input.cases)) throw new Error(`UNSUPPORTED_MATERIAL_QUANTITY_CASES:${input.cases}`);
  const baseUrl = resolveE2eBaseUrl({
    explicit: input.baseUrl ?? undefined,
    scriptEnvKeys: ["MATERIAL_QUANTITY_ANDROID_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ANDROID_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = input.requireRealBrowser === true;
  const requireEmulator = input.requireEmulator === true;
  const initialHealth = await checkInitialAndroidHealthWithRetry({ requireEmulator });
  if (!initialHealth.android_lab_healthy || !initialHealth.selected_serial) {
    return stopSummary({
      artifactPath,
      baseUrl,
      requireRealBrowser,
      requireEmulator,
      blocker: STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
      health: initialHealth,
      writeSummary: input.writeSummary,
    });
  }
  const deviceId = initialHealth.selected_serial;
  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  const caseResults: MaterialQuantityAndroidCaseProof[] = [];
  let chromeAttached = false;
  let lastPeriodicHealth = initialHealth;
  try {
    for (const testCase of MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES) {
      const domain = runMaterialQuantityRuntimeCaseDomainProof(testCase);
      const healthBeforeCase = lastPeriodicHealth;
      try {
        const runBrowserCase = (resetChrome: boolean) => runWave2CAndroidBrowserCase({
          deviceId,
          baseUrl,
          resetChrome,
          testCase: {
            case_id: testCase.case_id,
            prompt: testCase.prompt,
            family_id: testCase.family_id,
            category: testCase.category,
          },
          domain: domain as any,
        });
        const shouldResetChrome = caseResults.length === 0 || caseResults[caseResults.length - 1]?.passed === false;
        let androidProof;
        try {
          androidProof = await runBrowserCase(shouldResetChrome);
        } catch (firstError) {
          const firstMessage = firstError instanceof Error ? firstError.message : String(firstError);
          if (!/CDP_|WAIT_TIMEOUT|poll_timeout/i.test(firstMessage)) throw firstError;
          adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          androidProof = await runBrowserCase(true);
        }
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
        const body = androidProof.body_text_sample ?? "";
        const proofWithoutPass: Omit<MaterialQuantityAndroidCaseProof, "passed" | "blockers"> = {
          case_id: testCase.case_id,
          prompt: testCase.prompt,
          expected_family_id: testCase.family_id,
          matched_family_id: domain.matched_family_id,
          target_url: androidProof.target_url,
          page_url: androidProof.page_url,
          material_quantity_panel_visible: androidProof.material_quantity_panel_visible === true &&
            /rows=\d+/.test(androidProof.material_quantity_text ?? "") &&
            /buy=/.test(androidProof.material_quantity_text ?? ""),
          material_waste_packaging_panel_visible: androidProof.material_waste_packaging_panel_visible === true &&
            /rounded=\d+\/\d+/.test(androidProof.material_waste_packaging_text ?? "") &&
            /package=/.test(androidProof.material_waste_packaging_text ?? ""),
          material_formula_drawer_visible: androidProof.material_formula_drawer_visible === true &&
            /params=/.test(androidProof.material_formula_text ?? ""),
          pdf_button_visible_after_confirm: androidProof.pdf_button_visible_after_confirm,
          raw_dump_visible: androidProof.raw_dump_visible,
          scrolling_worked: androidProof.scrolling_worked,
          console_error_count: androidProof.console_error_count,
          body_text_sample: body,
          domain,
          android_health_before_case: compactAndroidHealth(healthBeforeCase),
          android_health_after_case: compactAndroidHealth(healthAfter),
        };
        const blockers = materialCaseBlockers(proofWithoutPass);
        caseResults.push({ ...proofWithoutPass, passed: blockers.length === 0, blockers });
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
        const proofWithoutPass: Omit<MaterialQuantityAndroidCaseProof, "passed" | "blockers"> = {
          case_id: testCase.case_id,
          prompt: testCase.prompt,
          expected_family_id: testCase.family_id,
          matched_family_id: domain.matched_family_id,
          target_url: `${baseUrl.replace(/\/+$/, "")}/request`,
          page_url: `${baseUrl.replace(/\/+$/, "")}/request`,
          material_quantity_panel_visible: false,
          material_waste_packaging_panel_visible: false,
          material_formula_drawer_visible: false,
          pdf_button_visible_after_confirm: false,
          raw_dump_visible: false,
          scrolling_worked: false,
          console_error_count: 0,
          body_text_sample: `ERROR: ${errorMessage}`.slice(0, 5000),
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
      if (caseResults[caseResults.length - 1]?.passed === false) {
        adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
      }
      console.info(JSON.stringify({
        case_id: testCase.case_id,
        passed: caseResults[caseResults.length - 1]?.passed ?? false,
        blockers_count: caseResults[caseResults.length - 1]?.blockers.length ?? 0,
        first_blockers: caseResults[caseResults.length - 1]?.blockers.slice(0, 5) ?? [],
        cases_done: caseResults.length,
        cases_total: MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
      }));
      if (!lastPeriodicHealth.android_lab_healthy) break;
    }
  } finally {
    server.stop();
    adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
  }

  const failedCases = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED;
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
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED}`,
    chromeAttached ? "" : "android_chrome_not_launched_or_attached",
    healthDegraded ? `android_emulator_health_degraded:${healthAfterRun.blocking_reasons.join("|")}` : "",
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const passed = blockers.length === 0 && allCasesExecuted && chromeAttached && !healthDegraded;
  const summary: MaterialQuantityAndroidSmokeSummary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE
      : STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET,
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    browser_automation_started: chromeAttached,
    web_server_started_by_runner: server.started,
    android_emulator_detected: initialHealth.emulator_detected,
    android_chrome_launched_or_attached: chromeAttached,
    android_device_id: deviceId,
    actual_android_emulator_material_quantity_accuracy_smoke_passed: passed,
    material_quantity_accuracy_android_smoke_passed: passed,
    android_material_quantity_accuracy_cases_passed: `${caseResults.filter((item) => item.passed).length}/${MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED}`,
    android_material_quantity_accuracy_cases_total: MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
    android_cases_total: MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
    android_cases_passed_count: caseResults.filter((item) => item.passed).length,
    android_cases_failed_count: failedCases.length + (allCasesExecuted ? 0 : MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED - caseResults.length),
    android_material_quantity_panel_missing_count: caseResults.filter((item) =>
      !item.material_quantity_panel_visible ||
      !item.material_waste_packaging_panel_visible ||
      !item.material_formula_drawer_visible
    ).length,
    android_material_quantity_validation_failed_count: caseResults.filter((item) => !item.domain.passed).length,
    android_raw_dump_ui_count: caseResults.filter((item) => item.raw_dump_visible).length,
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
      material_quantity_accuracy_summary: artifactPath,
    },
    blockers,
    case_results: caseResults,
  };
  return writeSummary({ artifactPath, summary, writeSummary: input.writeSummary });
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runMaterialQuantityAccuracyAndroidSmoke.ts")) {
  void runMaterialQuantityAccuracyAndroidSmoke({
    target: (argValue("target") ?? "android-chrome") as "android-chrome",
    cases: argValue("cases"),
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url"),
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_android_emulator_material_quantity_accuracy_smoke_passed: result.artifact.actual_android_emulator_material_quantity_accuracy_smoke_passed,
        android_material_quantity_accuracy_cases_passed: result.artifact.android_material_quantity_accuracy_cases_passed,
        android_emulator_detected: result.artifact.android_emulator_detected,
        android_chrome_launched_or_attached: result.artifact.android_chrome_launched_or_attached,
        android_material_quantity_panel_missing_count: result.artifact.android_material_quantity_panel_missing_count,
        android_material_quantity_validation_failed_count: result.artifact.android_material_quantity_validation_failed_count,
        android_raw_dump_ui_count: result.artifact.android_raw_dump_ui_count,
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
