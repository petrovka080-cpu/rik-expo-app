import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  AI_ESTIMATE_CORE_REAL_10000_ARTIFACT_DIR,
  AI_ESTIMATE_CORE_REAL_10000_GREEN,
  gitOutput,
  readWaveJson,
  sourceCodeHead,
  writeWaveJson,
  writeWaveText,
  type WaveJson,
} from "./aiEstimateCoreReal10000Hardening.shared";

type Artifact = WaveJson & {
  final_status?: string;
  source_code_head?: string;
  current_head_at_write_time?: string;
  fake_green_claimed?: boolean;
  failures?: unknown[];
};

function artifact(name: string): Artifact | null {
  return readWaveJson<Artifact>(name);
}

function passedStatus(value: Artifact | null, greenStatus: string): boolean {
  return value?.final_status === greenStatus && value.fake_green_claimed === false;
}

function failuresOf(value: Artifact | null): unknown[] {
  return Array.isArray(value?.failures) ? value.failures : [];
}

function runReleaseVerify(): Artifact {
  const result = spawnSync("npm", ["run", "release:verify"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30 * 60_000,
    shell: process.platform === "win32",
  });
  let readinessStatus: string | null = null;
  let blockers: unknown[] = [];
  const stdout = result.stdout ?? "";
  const readinessMatch = stdout.match(/"readiness"\s*:\s*\{[\s\S]*?"status"\s*:\s*"([^"]+)"/);
  if (readinessMatch) readinessStatus = readinessMatch[1];
  const blockersMatch = stdout.match(/"blockers"\s*:\s*(\[[\s\S]*?\])/);
  if (blockersMatch) {
    try {
      blockers = JSON.parse(blockersMatch[1]) as unknown[];
    } catch {
      blockers = ["BLOCKERS_PARSE_FAILED"];
    }
  }
  const release = {
    final_status: result.status === 0 && readinessStatus === "pass" && blockers.length === 0
      ? "GREEN_AI_ESTIMATE_CORE_REAL_10000_RELEASE_VERIFY_READY"
      : "BLOCKED_AI_ESTIMATE_CORE_REAL_10000_RELEASE_VERIFY",
    exit_code: result.status,
    readiness: { status: readinessStatus },
    blockers,
    stdout_tail: stdout.split(/\r?\n/).slice(-120),
    stderr_tail: (result.stderr ?? "").split(/\r?\n/).slice(-120),
    fake_green_claimed: false,
  };
  writeWaveJson("release_verify_results.json", release);
  return artifact("release_verify_results.json") ?? release;
}

function worktreeClean(): boolean {
  return gitOutput(["status", "--short"], "") === "";
}

function branchSynced(): boolean {
  const upstream = gitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  const counts = gitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "1 1");
  const [ahead = "1", behind = "1"] = counts.split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

function currentHeadMatchesArtifacts(artifacts: readonly (Artifact | null)[]): boolean {
  const head = sourceCodeHead();
  return artifacts
    .filter((item): item is Artifact => item !== null)
    .every((item) => item.source_code_head === head && item.current_head_at_write_time === head && item.fake_green_claimed === false);
}

function fullJestPassed(value: Artifact | null): boolean {
  return value?.success === true ||
    (value?.numFailedTestSuites === 0 && value?.numFailedTests === 0 && value.fake_green_claimed === false);
}

export function runAiEstimateCoreReal10000Closeout() {
  const backend = artifact("matrix.json");
  const selected1000 = artifact("acceptance_1000_results.json");
  const semantic500 = artifact("semantic_500_results.json");
  const compatibility10000 = artifact("compatibility_10000_results.json");
  const pdf = artifact("pdf_results.json");
  const webChromium = artifact("web_chromium_results.json");
  const webFirefox = artifact("web_firefox_results.json");
  const webWebkit = artifact("web_webkit_results.json");
  const responsiveMobile = artifact("responsive_mobile_results.json");
  const responsiveTablet = artifact("responsive_tablet_results.json");
  const android = artifact("android_api34_results.json");
  const ios = artifact("ios_protocol_readiness.json");
  const staticChecks = artifact("static_checks_results.json");
  const fullJest = artifact("full_jest_results.json");
  const release = runReleaseVerify();

  const artifacts = [
    backend,
    selected1000,
    semantic500,
    compatibility10000,
    pdf,
    webChromium,
    webFirefox,
    webWebkit,
    responsiveMobile,
    responsiveTablet,
    android,
    ios,
    staticChecks,
    fullJest,
    release,
  ];

  const blockers = [
    ...(passedStatus(selected1000, "GREEN_AI_ESTIMATE_CORE_SELECTED_WORK_1000_ACCEPTANCE_READY") ? [] : ["ACCEPTANCE_1000_NOT_GREEN"]),
    ...(passedStatus(semantic500, "GREEN_AI_ESTIMATE_CORE_REAL_500_SEMANTIC_SUBSET_READY") ? [] : ["SEMANTIC_500_NOT_GREEN"]),
    ...(passedStatus(compatibility10000, "GREEN_AI_ESTIMATE_CORE_REAL_10000_COMPATIBILITY_READY") ? [] : ["COMPATIBILITY_10000_NOT_GREEN"]),
    ...(passedStatus(pdf, "GREEN_AI_ESTIMATE_CORE_REAL_10000_PDF_PARITY_READY") ? [] : ["PDF_PROOF_NOT_GREEN"]),
    ...(passedStatus(webChromium, "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_CHROMIUM_READY") ? [] : ["WEB_CHROMIUM_NOT_GREEN"]),
    ...(passedStatus(webFirefox, "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_FIREFOX_READY") ? [] : ["WEB_FIREFOX_NOT_GREEN"]),
    ...(passedStatus(webWebkit, "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_WEBKIT_READY") ? [] : ["WEB_WEBKIT_NOT_GREEN"]),
    ...(passedStatus(responsiveMobile, "GREEN_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_MOBILE_READY") ? [] : ["RESPONSIVE_MOBILE_NOT_GREEN"]),
    ...(passedStatus(responsiveTablet, "GREEN_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_TABLET_READY") ? [] : ["RESPONSIVE_TABLET_NOT_GREEN"]),
    ...(android?.android_api34_tested === true && android.actual_api === 34 && android.api36_rejected === true && android.api36_used_as_substitute === false && failuresOf(android).length === 0 ? [] : ["ANDROID_API34_NOT_GREEN"]),
    ...(ios?.ios_build_started === false && ios.eas_build_started === false && ios.testflight_started === false && ios.estimate_core_protocol_covered === true ? [] : ["IOS_PROTOCOL_NOT_GREEN"]),
    ...(staticChecks?.typecheck_passed === true && staticChecks.lint_passed === true && staticChecks.diff_check_passed === true && staticChecks.cached_diff_check_passed === true ? [] : ["STATIC_CHECKS_NOT_GREEN"]),
    ...(fullJestPassed(fullJest) ? [] : ["FULL_JEST_NOT_GREEN"]),
    ...(release?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_RELEASE_VERIFY_READY" ? [] : ["RELEASE_VERIFY_NOT_GREEN"]),
    ...(worktreeClean() ? [] : ["WORKTREE_DIRTY"]),
    ...(branchSynced() ? [] : ["BRANCH_NOT_SYNCED_WITH_UPSTREAM"]),
    ...(currentHeadMatchesArtifacts(artifacts) ? [] : ["SOURCE_HEAD_MISMATCH"]),
  ];

  const finalMatrix = {
    final_status: blockers.length === 0 ? AI_ESTIMATE_CORE_REAL_10000_GREEN : "BLOCKED_AI_ESTIMATE_CORE_REAL_10000_WORK_READING_EXACT_BOQ",
    fake_green_claimed: false,
    source_code_head_matches: currentHeadMatchesArtifacts(artifacts),
    typecheck_passed: staticChecks?.typecheck_passed === true,
    lint_passed: staticChecks?.lint_passed === true,
    full_jest_passed: fullJestPassed(fullJest),
    release_verify_passed: release?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_RELEASE_VERIFY_READY",
    selected_work_source_of_truth_passed: backend?.selected_work_source_of_truth_passed === true,
    quantity_parser_passed: backend?.quantity_parser_passed === true,
    structured_payload_passed: backend?.structured_payload_passed === true,
    exact_boq_passed: backend?.exact_boq_passed === true,
    pdf_ui_parity_passed: pdf?.pdf_rows_match_ui_rows === true,
    catalog_binding_passed: backend?.catalog_binding_passed === true,
    acceptance_1000_passed: passedStatus(selected1000, "GREEN_AI_ESTIMATE_CORE_SELECTED_WORK_1000_ACCEPTANCE_READY"),
    semantic_500_passed: passedStatus(semantic500, "GREEN_AI_ESTIMATE_CORE_REAL_500_SEMANTIC_SUBSET_READY"),
    compatibility_10000_passed: passedStatus(compatibility10000, "GREEN_AI_ESTIMATE_CORE_REAL_10000_COMPATIBILITY_READY"),
    web_chromium_passed: passedStatus(webChromium, "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_CHROMIUM_READY"),
    web_firefox_passed: passedStatus(webFirefox, "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_FIREFOX_READY"),
    web_webkit_passed: passedStatus(webWebkit, "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_WEBKIT_READY"),
    android_api34_tested: android?.android_api34_tested === true,
    actual_api: android?.actual_api ?? null,
    api36_rejected: android?.api36_rejected === true,
    api36_used_as_substitute: android?.api36_used_as_substitute === true,
    ios_build_started: ios?.ios_build_started === true,
    eas_build_started: ios?.eas_build_started === true,
    testflight_started: ios?.testflight_started === true,
    ios_protocol_ready: ios?.estimate_core_protocol_covered === true,
    generic_rows_for_known_work: backend?.generic_rows_for_known_work ?? null,
    paid_control_rows: backend?.paid_control_rows ?? null,
    internal_keys_visible: backend?.internal_keys_visible ?? null,
    mojibake_found: backend?.mojibake_found ?? null,
    fake_prices_found: backend?.fake_prices_found ?? null,
    fake_suppliers_found: backend?.fake_suppliers_found ?? null,
    selected_work_key_lost: backend?.selected_work_key_lost ?? null,
    quantity_parser_failures: backend?.quantity_parser_failures ?? null,
    local_head: sourceCodeHead(),
    origin_head: gitOutput(["rev-parse", "@{u}"], ""),
    worktree_clean: worktreeClean(),
    branch_synced: branchSynced(),
    blockers,
  };

  writeWaveJson("matrix.json", finalMatrix);
  writeWaveText(
    "proof.md",
    [
      "# AI Estimate Core Real 10000 Closeout",
      "",
      `Status: ${finalMatrix.final_status}`,
      `Full Jest: ${String(finalMatrix.full_jest_passed)}`,
      `Release verify: ${String(finalMatrix.release_verify_passed)}`,
      `Android API: ${String(finalMatrix.actual_api)}`,
      `Blockers: ${blockers.join(", ") || "none"}`,
      "Fake green claimed: false",
      "",
    ].join("\n"),
  );

  const stdout = JSON.stringify(finalMatrix, null, 2);
  console.log(stdout);
  if (blockers.length > 0) process.exitCode = 1;
  return finalMatrix;
}

if (require.main === module) {
  runAiEstimateCoreReal10000Closeout();
}
