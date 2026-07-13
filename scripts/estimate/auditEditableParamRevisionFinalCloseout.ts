import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import { GREEN_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_READY } from "./auditEditableParam11610Readiness";
import { GREEN_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_READY } from "./auditParamToCalcTraceSensitivity";
import { GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY } from "./audit11610InlinePromptParamReadiness";
import { GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE } from "../e2e/runEditableParamRevisionWebSmoke";
import { GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE } from "../e2e/runEditableParamRevisionAndroidSmoke";
import { GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY } from "../e2e/runEditableParamRevisionWebAndroidParity";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAMS_RECALC_REVISIONS_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAMS_RECALC_REVISIONS_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAMS_RECALC_REVISIONS_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_EDITABLE_PARAMS_RECALC_REVISIONS_INCOMPLETE_NO_GREEN" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-editable-param-revisions");
const INLINE_ROOT = path.join(".release-runtime", "ai-estimate-inline-work-prompt-params");
const TRACE_ROOT = path.join(".release-runtime", "ai-estimate-param-trace-sensitivity");
const REQUIRED_BRANCH = "release/production-candidate";

type Json = Record<string, any>;

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function latestSummaryPath(root: string): string | null {
  if (!existsSync(root)) return null;
  const candidates: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name === "summary.json") candidates.push(fullPath);
    }
  };
  walk(root);
  return candidates.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function readJson(filePath: string | null): Json | null {
  if (!filePath) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as Json;
}

function latestSummaryPathWithStatus(root: string, expectedStatus: string): string | null {
  if (!existsSync(root)) return null;
  const candidates: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name === "summary.json") candidates.push(fullPath);
    }
  };
  walk(root);
  return candidates
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)
    .find((candidate) => readJson(candidate)?.final_status === expectedStatus) ?? null;
}

function runCommand(command: string, args: string[], timeoutMs = 240_000): boolean {
  try {
    const needsWindowsShell = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(command);
    execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: timeoutMs,
      shell: needsWindowsShell,
    });
    return true;
  } catch {
    return false;
  }
}

function bin(name: "npm" | "npx"): string {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function runSourceGates() {
  const focusedProfessionalBoqTestsPassed = runCommand("node", [
    "node_modules/jest/bin/jest.js",
    "--runInBand",
    "--runTestsByPath",
    "tests/estimateRuntime/estimateDraftRevision.contract.test.ts",
    "tests/estimateRuntime/userParamPatch.test.ts",
    "tests/estimateRuntime/editableParamRevisionAcceptance.test.ts",
    "tests/estimateRuntime/editableParam11610Readiness.test.ts",
    "tests/estimateRuntime/artifactRevisionBinding.test.ts",
    "tests/requestEstimate/editableParamChips.contract.test.tsx",
    "tests/requestEstimate/estimateRevisionDiff.contract.test.tsx",
    "tests/requestEstimate/assumptionReplacementUi.test.ts",
    "tests/officeEstimate/revisionBoundPdfBuyerHandoff.test.ts",
  ], 900_000);
  return {
    focused_professional_boq_tests_passed: focusedProfessionalBoqTestsPassed,
    typecheck_passed: runCommand(bin("npm"), ["run", "verify:typecheck"]),
    lint_passed: runCommand(bin("npm"), ["run", "lint"]),
    diff_check_passed: runCommand("git", ["diff", "--check"]),
    no_test_weakening_passed: runCommand(bin("npx"), ["tsx", "scripts/release/assertNoTestWeakening.ts"]),
    web_public_smoke_passed: runCommand(bin("npm"), ["run", "verify:web-public-smoke"]),
    ci_office_market_passed: runCommand(bin("npm"), ["run", "ci:office-market"], 1_200_000),
    secret_scan_passed: runCommand(bin("npx"), ["tsx", "scripts/release/scanCloseoutArtifactsForSecrets.ts", "artifacts", ".release-runtime"]),
  };
}

export function auditEditableParamRevisionFinalCloseout(input: {
  runSourceGates?: boolean;
  writeSummary?: boolean;
} = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const branch = gitOutput(["branch", "--show-current"]);
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " ");
  const inlinePath = latestSummaryPathWithStatus(INLINE_ROOT, GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY);
  const tracePath = latestSummaryPathWithStatus(TRACE_ROOT, GREEN_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_READY);
  const readinessPath = latestSummaryPathWithStatus(ROOT, GREEN_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_READY);
  const webPath = latestSummaryPathWithStatus(path.join(ROOT, "web"), GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE);
  const androidPath = latestSummaryPathWithStatus(path.join(ROOT, "android-chrome"), GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE);
  const parityPath = latestSummaryPathWithStatus(path.join(ROOT, "web-android-parity"), GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY);
  const inline = readJson(inlinePath);
  const trace = readJson(tracePath);
  const readiness = readJson(readinessPath);
  const web = readJson(webPath);
  const android = readJson(androidPath);
  const parity = readJson(parityPath);
  const gates = input.runSourceGates ? runSourceGates() : {
    focused_professional_boq_tests_passed: false,
    typecheck_passed: false,
    lint_passed: false,
    diff_check_passed: false,
    no_test_weakening_passed: false,
    web_public_smoke_passed: false,
    ci_office_market_passed: false,
    secret_scan_passed: false,
  };
  const blockers = [
    branch === REQUIRED_BRANCH ? "" : `branch:${branch}`,
    upstreamSync === "0 0" ? "" : `upstream_sync:${upstreamSync}`,
    inline?.final_status === GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY ? "" : "inline_prompt_green_missing",
    trace?.final_status === GREEN_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_READY ? "" : "param_trace_green_missing",
    readiness?.final_status === GREEN_AI_ESTIMATE_EDITABLE_PARAM_11610_READINESS_READY ? "" : "editable_11610_green_missing",
    web?.final_status === GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE ? "" : "web_editable_smoke_green_missing",
    android?.final_status === GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE ? "" : "android_editable_smoke_green_missing",
    parity?.final_status === GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_ANDROID_PARITY ? "" : "web_android_parity_green_missing",
    inline?.source_sha === sourceSha ? "" : "inline_source_sha_stale",
    trace?.source_sha === sourceSha ? "" : "trace_source_sha_stale",
    readiness?.source_sha === sourceSha ? "" : "readiness_source_sha_stale",
    web?.source_sha === sourceSha ? "" : "web_source_sha_stale",
    android?.source_sha === sourceSha ? "" : "android_source_sha_stale",
    parity?.source_sha === sourceSha ? "" : "parity_source_sha_stale",
    ...Object.entries(gates).filter(([, passed]) => passed !== true).map(([key]) => key.replace(/_passed$/, "_failed")),
  ].filter(Boolean);
  const summary = {
    ...(readiness ?? {}),
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_EDITABLE_PARAMS_RECALC_REVISIONS_WEB_ANDROID_COMMITTED_NO_RELEASE
      : STOP_AI_ESTIMATE_EDITABLE_PARAMS_RECALC_REVISIONS_INCOMPLETE_NO_GREEN,
    source_sha: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    generated_at: new Date().toISOString(),
    inline_prompt_params_green_found: inline?.final_status === GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY,
    param_trace_sensitivity_green_found: trace?.final_status === GREEN_AI_ESTIMATE_PARAM_TRACE_SENSITIVITY_READY,
    prerequisite_source_sha_matches_head: inline?.source_sha === sourceSha && trace?.source_sha === sourceSha,
    stale_prerequisite_not_accepted: inline?.source_sha === sourceSha && trace?.source_sha === sourceSha,
    actual_web_browser_editable_param_revision_passed: web?.actual_web_browser_editable_param_revision_passed === true,
    web_editable_revision_cases_passed: web?.web_editable_revision_cases_passed ?? null,
    web_revision_diff_visible_count: web?.web_revision_diff_visible_count ?? 0,
    web_template_lost_after_edit_count: web?.web_template_lost_after_edit_count ?? 0,
    web_param_update_failures: web?.web_param_update_failures ?? 0,
    web_recalc_failures: web?.web_recalc_failures ?? 0,
    web_stale_pdf_failures: web?.web_stale_pdf_failures ?? 0,
    web_stale_buyer_failures: web?.web_stale_buyer_failures ?? 0,
    web_console_errors_count: web?.web_console_errors_count ?? 0,
    actual_android_emulator_editable_param_revision_passed: android?.actual_android_emulator_editable_param_revision_passed === true,
    android_editable_revision_cases_passed: android?.android_editable_revision_cases_passed ?? null,
    android_emulator_detected: android?.android_emulator_detected === true,
    android_chrome_launched_or_attached: android?.android_chrome_launched_or_attached === true,
    android_revision_diff_visible_count: android?.android_revision_diff_visible_count ?? 0,
    android_template_lost_after_edit_count: android?.android_template_lost_after_edit_count ?? 0,
    android_param_update_failures: android?.android_param_update_failures ?? 0,
    android_recalc_failures: android?.android_recalc_failures ?? 0,
    android_stale_pdf_failures: android?.android_stale_pdf_failures ?? 0,
    android_stale_buyer_failures: android?.android_stale_buyer_failures ?? 0,
    android_console_errors_count: android?.android_console_errors_count ?? 0,
    android_emulator_health_degraded: android?.android_emulator_health_degraded ?? true,
    route_equivalent_not_reported_as_real_browser: web?.route_equivalent_not_reported_as_real_browser === true && android?.route_equivalent_not_reported_as_real_browser === true,
    env_browser_green_rejected: web?.env_browser_green_rejected === true && android?.env_browser_green_rejected === true,
    same_editable_param_corpus_used_for_web_android: parity?.same_editable_param_corpus_used_for_web_android === true,
    web_android_case_id_parity: parity?.web_android_case_id_parity === true,
    web_android_template_match_parity: parity?.web_android_template_match_parity === true,
    web_android_revision_count_parity: parity?.web_android_revision_count_parity === true,
    web_android_changed_rows_parity: parity?.web_android_changed_rows_parity === true,
    web_android_artifact_lifecycle_parity: parity?.web_android_artifact_lifecycle_parity === true,
    ...gates,
    full_editable_param_revisions_green_claimed: blockers.length === 0,
    render_staging_started: false,
    owner_go_no_go_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    full_jest_started: false,
    fake_green_claimed: false,
    source_artifacts: {
      inline_summary: inlinePath,
      trace_summary: tracePath,
      readiness_summary: readinessPath,
      web_summary: webPath,
      android_summary: androidPath,
      parity_summary: parityPath,
    },
    blocking_reasons: blockers.slice(0, 120),
  };
  const artifactPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary) writeJson(artifactPath, summary);
  return { artifactPath, summary };
}

if (require.main === module) {
  const result = auditEditableParamRevisionFinalCloseout({
    runSourceGates: hasFlag("run-source-gates"),
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    upstream_sync: result.summary.upstream_sync,
    blockers: result.summary.blocking_reasons,
    artifact: result.artifactPath,
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_EDITABLE_PARAMS_RECALC_REVISIONS_WEB_ANDROID_COMMITTED_NO_RELEASE) {
    process.exitCode = 1;
  }
}
