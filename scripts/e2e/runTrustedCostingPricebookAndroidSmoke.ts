import { mkdirSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { runRealNamedBoqRuntimeCaseDomainProof } from "../estimate/realNamedBoqCriticalCases";
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
import {
  isSupportedTrustedCostingCaseSet,
  runTrustedCostingRuntimeCaseDomainProof,
  selectTrustedCostingRuntimeCases,
  trustedCostingCaseBlockers,
  TRUSTED_COSTING_CASES_REQUIRED,
  TRUSTED_COSTING_CRITICAL_CASE_SET,
  type TrustedCostingSmokeCaseProof,
} from "./runTrustedCostingPricebookWebSmoke";

export const GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8097";

export type TrustedCostingAndroidSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE
    | typeof STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE_FAILED
    | typeof STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "android-chrome";
  cases: typeof TRUSTED_COSTING_CRITICAL_CASE_SET;
  base_url: string;
  require_real_browser: boolean;
  require_emulator: boolean;
  browser_automation_started: boolean;
  web_server_started_by_runner: boolean;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_device_id: string | null;
  actual_android_emulator_trusted_costing_smoke_passed: boolean;
  android_trusted_costing_cases_passed: string;
  android_cost_summary_visible_count: number;
  android_price_state_badges_visible_count: number;
  android_fake_final_total_count: number;
  android_contract_total_forbidden_count: number;
  android_pdf_cost_section_valid_count: number;
  android_buyer_cost_trace_valid_count: number;
  android_console_errors_count: number;
  android_emulator_health_degraded: boolean;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  fake_green_claimed: false;
  blockers: string[];
  case_results: TrustedCostingSmokeCaseProof[];
};

function countFakeFinalTotal(bodyText: string): number {
  return [
    /Contract total:\s*available/i,
    /contract_total_claimed=true/i,
    /fake_final_total/i,
  ].filter((pattern) => pattern.test(bodyText)).length;
}

function writeSummary(input: {
  artifactPath: string;
  summary: TrustedCostingAndroidSmokeSummary;
  writeSummary?: boolean;
}): { artifactPath: string; artifact: TrustedCostingAndroidSmokeSummary } {
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
}): { artifactPath: string; artifact: TrustedCostingAndroidSmokeSummary } {
  return writeSummary({
    artifactPath: input.artifactPath,
    writeSummary: input.writeSummary,
    summary: {
      final_status: input.blocker === STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
        ? STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
        : STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE_FAILED,
      source_sha: gitOutput(["rev-parse", "HEAD"]),
      branch: gitOutput(["branch", "--show-current"]),
      upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
      generated_at: new Date().toISOString(),
      target: "android-chrome",
      cases: TRUSTED_COSTING_CRITICAL_CASE_SET,
      base_url: input.baseUrl,
      require_real_browser: input.requireRealBrowser,
      require_emulator: input.requireEmulator,
      browser_automation_started: false,
      web_server_started_by_runner: false,
      android_emulator_detected: input.health?.emulator_detected ?? false,
      android_chrome_launched_or_attached: false,
      android_device_id: input.health?.selected_serial ?? null,
      actual_android_emulator_trusted_costing_smoke_passed: false,
      android_trusted_costing_cases_passed: `0/${TRUSTED_COSTING_CASES_REQUIRED}`,
      android_cost_summary_visible_count: 0,
      android_price_state_badges_visible_count: 0,
      android_fake_final_total_count: 0,
      android_contract_total_forbidden_count: 0,
      android_pdf_cost_section_valid_count: 0,
      android_buyer_cost_trace_valid_count: 0,
      android_console_errors_count: 0,
      android_emulator_health_degraded: true,
      route_equivalent_not_reported_as_real_browser: true,
      env_browser_green_rejected: true,
      fake_green_claimed: false,
      blockers: [input.blocker, ...(input.health?.blocking_reasons ?? [])],
      case_results: [],
    },
  });
}

export async function runTrustedCostingPricebookAndroidSmoke(input: {
  target?: "android-chrome";
  cases?: string | null;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: TrustedCostingAndroidSmokeSummary }> {
  if ((input.target ?? "android-chrome") !== "android-chrome") {
    throw new Error(`UNSUPPORTED_TRUSTED_COSTING_ANDROID_TARGET:${input.target}`);
  }
  if (!isSupportedTrustedCostingCaseSet(input.cases)) throw new Error(`UNSUPPORTED_TRUSTED_COSTING_CASES:${input.cases}`);
  const baseUrl = resolveE2eBaseUrl({
    explicit: input.baseUrl,
    scriptEnvKeys: ["TRUSTED_COSTING_ANDROID_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = input.requireRealBrowser === true;
  const requireEmulator = input.requireEmulator === true;
  const initialHealth = checkAndroidEmulatorHealth({
    requireEmulator,
    requireChrome: true,
    baseUrl,
    writeArtifact: true,
  }).artifact;
  if (!requireRealBrowser) {
    return stopSummary({ artifactPath, baseUrl, requireRealBrowser, requireEmulator, health: initialHealth, blocker: "real_browser_required_flag_missing", writeSummary: input.writeSummary });
  }
  if (!initialHealth.android_lab_healthy || !initialHealth.selected_serial) {
    return stopSummary({ artifactPath, baseUrl, requireRealBrowser, requireEmulator, health: initialHealth, blocker: STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN, writeSummary: input.writeSummary });
  }

  const deviceId = initialHealth.selected_serial;
  let server: Awaited<ReturnType<typeof ensureWave2CAndroidWebServer>> | null = null;
  const caseResults: TrustedCostingSmokeCaseProof[] = [];
  let chromeAttached = false;
  let lastPeriodicHealth = initialHealth;
  try {
    server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
    for (const testCase of selectTrustedCostingRuntimeCases()) {
      const domain = runTrustedCostingRuntimeCaseDomainProof(testCase);
      const realNamed = runRealNamedBoqRuntimeCaseDomainProof(testCase);
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
          domain: realNamed as any,
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
        const proofWithoutPass: Omit<TrustedCostingSmokeCaseProof, "passed" | "blockers"> = {
          ...domain,
          page_url: androidProof.page_url,
          summary_card_visible: androidProof.summary_card_visible,
          real_named_boq_visible: domain.real_named_boq_visible &&
            androidProof.grouped_boq_visible &&
            androidProof.work_rows_visible &&
            androidProof.material_rows_visible,
          cost_summary_visible: domain.cost_summary_visible && androidProof.cost_summary_visible === true,
          price_state_badges_visible: domain.price_state_badges_visible && Number(androidProof.price_state_badges_count ?? 0) > 0,
          missing_price_panel_valid: domain.missing_price_panel_valid &&
            (androidProof.missing_price_panel_visible === true || !/Missing prices:\s*[1-9]/i.test(androidProof.body_text_sample)),
          fake_final_total_count: domain.fake_final_total_count +
            countFakeFinalTotal(`${androidProof.body_text_sample}\n${androidProof.contract_total_status ?? ""}`),
          contract_total_forbidden: domain.contract_total_forbidden &&
            /not available/i.test(String(androidProof.contract_total_status ?? "")),
          pdf_cost_section_valid: domain.pdf_cost_section_valid && androidProof.pdf_button_visible_after_confirm,
          buyer_cost_trace_valid: domain.buyer_cost_trace_valid,
          console_error_count: androidProof.console_error_count,
          page_error_count: 0,
          body_text_sample: androidProof.body_text_sample,
        };
        const blockers = [
          healthAfter.android_lab_healthy ? "" : `android_periodic_health_case_failed:${healthAfter.blocking_reasons.join("|")}`,
          androidProof.scrolling_worked ? "" : "android_scrolling_not_verified",
          ...trustedCostingCaseBlockers(proofWithoutPass),
          ...domain.blockers.map((blocker) => `domain:${blocker}`),
        ].filter(Boolean);
        caseResults.push({
          ...proofWithoutPass,
          passed: blockers.length === 0,
          blockers,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const proofWithoutPass: Omit<TrustedCostingSmokeCaseProof, "passed" | "blockers"> = {
          ...domain,
          page_url: `${baseUrl.replace(/\/+$/, "")}/request`,
          summary_card_visible: false,
          real_named_boq_visible: false,
          cost_summary_visible: false,
          price_state_badges_visible: false,
          missing_price_panel_valid: false,
          fake_final_total_count: domain.fake_final_total_count,
          contract_total_forbidden: false,
          pdf_cost_section_valid: domain.pdf_cost_section_valid,
          buyer_cost_trace_valid: domain.buyer_cost_trace_valid,
          console_error_count: 0,
          page_error_count: 0,
          body_text_sample: `ERROR: ${errorMessage}`.slice(0, 5000),
        };
        caseResults.push({
          ...proofWithoutPass,
          passed: false,
          blockers: [
            `android_browser_flow_exception:${errorMessage.replace(/\s+/g, " ").slice(0, 240)}`,
            ...trustedCostingCaseBlockers(proofWithoutPass),
            ...domain.blockers.map((blocker) => `domain:${blocker}`),
          ],
        });
      } finally {
        adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
      }
      console.info(JSON.stringify({
        case_id: testCase.case_id,
        passed: caseResults[caseResults.length - 1]?.passed ?? false,
        blockers_count: caseResults[caseResults.length - 1]?.blockers.length ?? 0,
        first_blockers: caseResults[caseResults.length - 1]?.blockers.slice(0, 5) ?? [],
        cases_done: caseResults.length,
        cases_total: TRUSTED_COSTING_CASES_REQUIRED,
      }));
      if (!lastPeriodicHealth.android_lab_healthy) break;
    }
  } finally {
    server?.stop();
  }

  const failedCases = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === TRUSTED_COSTING_CASES_REQUIRED;
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
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${TRUSTED_COSTING_CASES_REQUIRED}`,
    chromeAttached ? "" : "android_chrome_not_launched_or_attached",
    healthDegraded ? `android_emulator_health_degraded:${healthAfterRun.blocking_reasons.join("|")}` : "",
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const actualGreen = blockers.length === 0 && allCasesExecuted && chromeAttached && !healthDegraded;
  const summary: TrustedCostingAndroidSmokeSummary = {
    final_status: actualGreen
      ? GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE
      : STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: TRUSTED_COSTING_CRITICAL_CASE_SET,
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    browser_automation_started: chromeAttached,
    web_server_started_by_runner: server?.started ?? false,
    android_emulator_detected: initialHealth.emulator_detected,
    android_chrome_launched_or_attached: chromeAttached,
    android_device_id: deviceId,
    actual_android_emulator_trusted_costing_smoke_passed: actualGreen,
    android_trusted_costing_cases_passed: `${caseResults.filter((item) => item.passed).length}/${TRUSTED_COSTING_CASES_REQUIRED}`,
    android_cost_summary_visible_count: caseResults.filter((item) => item.cost_summary_visible).length,
    android_price_state_badges_visible_count: caseResults.filter((item) => item.price_state_badges_visible).length,
    android_fake_final_total_count: caseResults.reduce((sum, item) => sum + item.fake_final_total_count, 0),
    android_contract_total_forbidden_count: caseResults.filter((item) => item.contract_total_forbidden).length,
    android_pdf_cost_section_valid_count: caseResults.filter((item) => item.pdf_cost_section_valid).length,
    android_buyer_cost_trace_valid_count: caseResults.filter((item) => item.buyer_cost_trace_valid).length,
    android_console_errors_count: caseResults.reduce((sum, item) => sum + item.console_error_count, 0),
    android_emulator_health_degraded: healthDegraded,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    fake_green_claimed: false,
    blockers,
    case_results: caseResults,
  };
  return writeSummary({ artifactPath, summary, writeSummary: input.writeSummary });
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runTrustedCostingPricebookAndroidSmoke.ts")) {
  void runTrustedCostingPricebookAndroidSmoke({
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
        actual_android_emulator_trusted_costing_smoke_passed: result.artifact.actual_android_emulator_trusted_costing_smoke_passed,
        android_trusted_costing_cases_passed: result.artifact.android_trusted_costing_cases_passed,
        android_emulator_detected: result.artifact.android_emulator_detected,
        android_chrome_launched_or_attached: result.artifact.android_chrome_launched_or_attached,
        android_cost_summary_visible_count: result.artifact.android_cost_summary_visible_count,
        android_price_state_badges_visible_count: result.artifact.android_price_state_badges_visible_count,
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
