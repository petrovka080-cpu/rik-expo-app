import path from "node:path";

import {
  PILOT_LAUNCH_ANDROID_ROOT,
  buildPilotCaseDomainProof,
  gitOutput,
  loadPilotLaunchCases,
  timestampForPath,
  writeJson,
} from "../estimate/buildPilotDefectBurndown";
import { runControlledPilotAndroidEmulatorSmoke } from "./runControlledPilotAndroidEmulatorSmoke";

export const GREEN_AI_ESTIMATE_PILOT_LAUNCH_ANDROID_CHROME_SMOKE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_PILOT_LAUNCH_ANDROID_CHROME_SMOKE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_PILOT_LAUNCH_ANDROID_CHROME_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PILOT_LAUNCH_ANDROID_CHROME_SMOKE_FAILED" as const;
export const STOP_ANDROID_EMULATOR_NOT_AVAILABLE_FOR_PILOT_LAUNCH_NO_GREEN =
  "STOP_ANDROID_EMULATOR_NOT_AVAILABLE_FOR_PILOT_LAUNCH_NO_GREEN" as const;

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `h${Math.abs(hash)}`;
}

function stopArtifact(input: {
  blocker: string;
  baseUrl?: string;
}) {
  const outDir = path.join(PILOT_LAUNCH_ANDROID_ROOT, timestampForPath());
  const summary = {
    final_status: input.blocker.includes("EMULATOR")
      ? STOP_ANDROID_EMULATOR_NOT_AVAILABLE_FOR_PILOT_LAUNCH_NO_GREEN
      : STOP_AI_ESTIMATE_PILOT_LAUNCH_ANDROID_CHROME_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    generated_at: new Date().toISOString(),
    target: "android-chrome" as const,
    baseUrl: input.baseUrl ?? null,
    cases_total: 0,
    cases_passed: 0,
    cases_failed: 0,
    failed_cases: [],
    actual_android_emulator_pilot_launch_smoke_passed: false,
    android_emulator_detected: false,
    android_chrome_launched_or_attached: false,
    android_smoke_requires_adb_or_cdp: true,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    browser_automation_started: false,
    native_build_started: false,
    eas_started: false,
    android_console_error_count: 0,
    pdf_snapshot_mismatch_count: 0,
    buyer_work_rows_count: 0,
    raw_dump_ui_count: 0,
    empty_positions_after_prompt_count: 0,
    fake_final_total_count: 0,
    procurement_package_passed: false,
    support_package_exported: false,
    telemetry_events_recorded: false,
    metrics: {
      android_pilot_cases_total: 0,
      android_pilot_cases_passed: 0,
      android_pilot_cases_failed: 0,
      emulator_unavailable_count: input.blocker.includes("EMULATOR") ? 1 : 0,
      android_console_error_count: 0,
    },
    blockers: [input.blocker],
    case_results: [],
    fake_green_claimed: false,
  };
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

export async function runPilotLaunchReadinessAndroidSmoke(options: {
  target?: "android-chrome";
  cases?: "pilot-launch";
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string;
} = {}) {
  if ((options.target ?? "android-chrome") !== "android-chrome") {
    throw new Error(`UNSUPPORTED_PILOT_LAUNCH_ANDROID_TARGET:${options.target}`);
  }
  if ((options.cases ?? "pilot-launch") !== "pilot-launch") {
    throw new Error(`UNSUPPORTED_PILOT_LAUNCH_CASES:${options.cases}`);
  }
  if (options.requireRealBrowser !== true && process.env.AI_ESTIMATE_PILOT_LAUNCH_ANDROID_GREEN === "true") {
    throw new Error("env_browser_green_rejected");
  }

  const pilotCases = loadPilotLaunchCases();
  const sourceIds = new Set(pilotCases.map((item) => item.source_controlled_pilot_case_id));
  const controlled = await runControlledPilotAndroidEmulatorSmoke({
    target: "android-chrome",
    cases: "pilot-critical",
    requireRealBrowser: true,
    requireEmulator: options.requireEmulator,
    baseUrl: options.baseUrl,
  });
  const controlledArtifact = controlled.artifact as Record<string, any>;
  const controlledBlockers = Array.isArray(controlledArtifact.blockers) ? controlledArtifact.blockers as string[] : [];
  if (controlledArtifact.final_status === "STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN") {
    return stopArtifact({
      blocker: STOP_ANDROID_EMULATOR_NOT_AVAILABLE_FOR_PILOT_LAUNCH_NO_GREEN,
      baseUrl: options.baseUrl,
    });
  }

  const controlledResults = Array.isArray(controlledArtifact.case_results)
    ? controlledArtifact.case_results as Array<Record<string, any>>
    : [];
  const caseResults = pilotCases.map((pilotCase) => {
    const source = controlledResults.find((item) => item.case_id === pilotCase.source_controlled_pilot_case_id);
    const pilotProof = buildPilotCaseDomainProof(pilotCase, "android-chrome");
    const sourcePassed = source?.passed === true;
    const domain = source?.domain as Record<string, any> | undefined;
    const browser = source?.browser as Record<string, any> | undefined;
    const blockers = [
      source ? "" : "source_controlled_case_not_executed",
      sourcePassed ? "" : "source_controlled_case_failed",
      source?.android_chrome_flow_executed === true ? "" : "android_pilot_flow_not_executed",
      browser?.summary_card_visible === true ? "" : "android_summary_card_missing",
      browser?.grouped_preview_visible === true ? "" : "android_grouped_preview_missing",
      browser?.pdf_button_visible_after_confirm === true ? "" : "android_pdf_not_generated",
      domain?.pdf_generated_from_snapshot === true && domain?.pdf_rows_equal_snapshot_rows === true
        ? ""
        : "android_pdf_snapshot_parity_failed",
      domain?.buyer_handoff_created === true && domain?.buyer_handoff_procurement_subset_valid === true
        ? ""
        : "android_buyer_handoff_not_verified",
      domain?.buyer_receives_work_rows !== true ? "" : "android_buyer_receives_work_rows",
      browser?.raw_dump_visible !== true ? "" : "android_raw_dump_visible",
      browser?.positions_empty_after_prompt !== true ? "" : "android_positions_empty_after_prompt",
      browser?.fake_final_total_visible !== true && domain?.final_total_shown_while_prices_missing !== true
        ? ""
        : "android_fake_final_total_visible",
      ...pilotProof.blockers,
    ].filter(Boolean);
    return {
      case_id: pilotCase.case_id,
      source_controlled_pilot_case_id: pilotCase.source_controlled_pilot_case_id,
      work_family_id: pilotCase.work_family_id,
      target: "android-chrome" as const,
      prompt_hash: stableHash(pilotCase.prompt),
      passed: blockers.length === 0,
      android_chrome_flow_executed: source?.android_chrome_flow_executed === true,
      browser,
      domain,
      pilot_proof: pilotProof,
      support_package_exported: pilotProof.support_package_exported,
      telemetry_events_recorded: pilotProof.telemetry_events_recorded,
      blockers,
    };
  });

  const failedCases = caseResults.filter((item) => !item.passed);
  const blockers = [
    ...controlledBlockers.map((blocker) => `controlled_android:${blocker}`),
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ];
  const androidConsoleErrorCount = Number(controlledArtifact.android_console_error_count ?? controlledArtifact.metrics?.android_console_error_count ?? 0);
  const pdfSnapshotMismatchCount = caseResults.filter((item) => item.domain?.pdf_rows_equal_snapshot_rows !== true).length;
  const buyerWorkRowsCount = caseResults.filter((item) => item.domain?.buyer_receives_work_rows === true).length;
  const rawDumpUiCount = caseResults.filter((item) => item.browser?.raw_dump_visible === true).length;
  const emptyPositionsAfterPromptCount = caseResults.filter((item) => item.browser?.positions_empty_after_prompt === true).length;
  const fakeFinalTotalCount = caseResults.filter((item) =>
    item.browser?.fake_final_total_visible === true || item.domain?.final_total_shown_while_prices_missing === true
  ).length;
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PILOT_LAUNCH_ANDROID_CHROME_SMOKE_NO_BUILDS
      : STOP_AI_ESTIMATE_PILOT_LAUNCH_ANDROID_CHROME_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    generated_at: new Date().toISOString(),
    target: "android-chrome" as const,
    baseUrl: controlledArtifact.baseUrl ?? options.baseUrl ?? null,
    controlled_android_artifact: controlled.artifactPath,
    cases_total: caseResults.length,
    cases_passed: caseResults.filter((item) => item.passed).length,
    cases_failed: failedCases.length,
    failed_cases: failedCases.map((item) => item.case_id),
    actual_android_emulator_pilot_launch_smoke_passed: blockers.length === 0,
    android_emulator_detected: controlledArtifact.android_emulator_detected === true,
    android_chrome_launched_or_attached: controlledArtifact.android_chrome_launched_or_attached === true,
    android_smoke_requires_adb_or_cdp: true,
    android_pilot_checks_prompt_to_grouped_draft: true,
    android_pilot_checks_trust_level: true,
    android_pilot_checks_estimate_level: true,
    android_pilot_checks_confirm_snapshot: true,
    android_pilot_checks_pdf_from_snapshot: true,
    android_pilot_checks_procurement_package: true,
    android_pilot_checks_support_package: true,
    android_pilot_checks_telemetry_events: true,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false as const,
    env_browser_green_rejected: true,
    browser_automation_started: true,
    native_build_started: false,
    eas_started: false,
    android_console_error_count: androidConsoleErrorCount,
    pdf_snapshot_mismatch_count: pdfSnapshotMismatchCount,
    buyer_work_rows_count: buyerWorkRowsCount,
    raw_dump_ui_count: rawDumpUiCount,
    empty_positions_after_prompt_count: emptyPositionsAfterPromptCount,
    fake_final_total_count: fakeFinalTotalCount,
    procurement_package_passed: caseResults.every((item) => item.domain?.buyer_handoff_procurement_subset_valid === true),
    support_package_exported: caseResults.every((item) => item.support_package_exported === true),
    telemetry_events_recorded: caseResults.every((item) => item.telemetry_events_recorded === true),
    metrics: {
      android_pilot_cases_total: caseResults.length,
      android_pilot_cases_passed: caseResults.filter((item) => item.passed).length,
      android_pilot_cases_failed: failedCases.length,
      android_console_error_count: androidConsoleErrorCount,
      pdf_snapshot_mismatch_count: pdfSnapshotMismatchCount,
      buyer_work_rows_count: buyerWorkRowsCount,
      raw_dump_ui_count: rawDumpUiCount,
      empty_positions_after_prompt_count: emptyPositionsAfterPromptCount,
      fake_final_total_count: fakeFinalTotalCount,
    },
    blockers,
    case_results: caseResults,
    fake_green_claimed: false,
  };
  const artifactPath = path.join(PILOT_LAUNCH_ANDROID_ROOT, timestampForPath(), "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runPilotLaunchReadinessAndroidSmoke.ts")) {
  void runPilotLaunchReadinessAndroidSmoke({
    target: (argValue("target") ?? "android-chrome") as "android-chrome",
    cases: (argValue("cases") ?? "pilot-launch") as "pilot-launch",
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url") ?? undefined,
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        cases_total: result.artifact.cases_total,
        cases_passed: result.artifact.cases_passed,
        cases_failed: result.artifact.cases_failed,
        failed_cases: result.artifact.failed_cases,
        android_console_error_count: result.artifact.android_console_error_count,
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
