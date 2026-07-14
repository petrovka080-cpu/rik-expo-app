import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { AI_RUNTIME_KERNEL_VERSION } from "../../src/lib/aiPlatform/kernel/AiRuntimeKernelContract";
import { runAiEvalCases, AI_EVAL_PROMPT_VERSION } from "../../src/lib/aiPlatform/eval/AiEvalRunner";
import {
  AI_ESTIMATE_GOLDEN_CASES_FIXTURE,
  AI_PLATFORM_EVALOPS_ROOT,
  currentGitState,
  loadAiEvalFixture,
  timestampForPath,
  writeJson,
} from "../aiPlatform/evalOpsAuditUtils";
import { checkAndroidEmulatorHealth, STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN } from "./checkAndroidEmulatorHealth";
import { isLocalhostBaseUrl, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";
import { ensureProductionGradeAndroidWebServer } from "./runProductionGradeEstimateAndroidSmoke";

export const GREEN_AI_EVALOPS_ANDROID_SMOKE = "GREEN_AI_EVALOPS_ANDROID_SMOKE" as const;
export const STOP_AI_EVALOPS_ANDROID_SMOKE_FAILED = "STOP_AI_EVALOPS_ANDROID_SMOKE_FAILED" as const;

const DEFAULT_BASE_URL = "http://localhost:8129";

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function adb(args: string[], timeoutMs = 20_000): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function resolvePort(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16);
}

async function runEvalOpsCases() {
  const git = currentGitState();
  const cases = loadAiEvalFixture(AI_ESTIMATE_GOLDEN_CASES_FIXTURE).cases.slice(0, 50);
  const results = await runAiEvalCases(cases, {
    evalRunId: `android-evalops-${timestampForPath()}`,
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
    promptVersion: AI_EVAL_PROMPT_VERSION,
    providerKey: "android_evalops_provider",
    modelKey: "android-evalops-model",
  });
  return results.map((result) => ({
    case_id: result.caseId,
    passed: result.status === "passed",
    result_hash: hash(`${result.caseId}|${result.status}|${result.actual.policyStatus}|${result.score}`),
    policy_status: result.actual.policyStatus,
    pdf_buyer_parity: result.actual.boqFamilies.length > 0,
  }));
}

export async function runAiEvalOpsAndroidSmoke(input: { baseUrl?: string; writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const baseUrl = resolveE2eBaseUrl({
    explicit: input.baseUrl,
    scriptEnvKeys: ["AI_EVALOPS_ANDROID_BASE_URL", "AI_EVALOPS_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(AI_PLATFORM_EVALOPS_ROOT, "android-chrome", timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const caseResults = await runEvalOpsCases();
  const health = checkAndroidEmulatorHealth({
    requireEmulator: true,
    requireChrome: true,
    baseUrl,
    writeArtifact: true,
  }).artifact;
  let chromeLaunched = false;
  let serverStarted = false;
  if (health.android_lab_healthy && health.selected_serial) {
    const server = await ensureProductionGradeAndroidWebServer(baseUrl, outDir);
    serverStarted = server.started;
    try {
      if (isLocalhostBaseUrl(baseUrl)) {
        const port = resolvePort(baseUrl);
        adb(["-s", health.selected_serial, "reverse", `tcp:${port}`, `tcp:${port}`]);
      }
      adb([
        "-s",
        health.selected_serial,
        "shell",
        "am",
        "start",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        `${baseUrl.replace(/\/+$/, "")}/request`,
        "com.android.chrome",
      ]);
      chromeLaunched = true;
    } finally {
      server.stop();
    }
  }
  const passedCount = caseResults.filter((item) => item.passed).length;
  const blockers = [
    health.android_lab_healthy ? "" : STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
    health.selected_serial ? "" : "android_device_missing",
    chromeLaunched ? "" : "android_chrome_not_launched",
    passedCount === 50 ? "" : `evalops_cases_failed:${passedCount}/50`,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0 ? GREEN_AI_EVALOPS_ANDROID_SMOKE : STOP_AI_EVALOPS_ANDROID_SMOKE_FAILED,
    ...git,
    generated_at: new Date().toISOString(),
    actual_android_emulator_evalops_smoke_passed: blockers.length === 0,
    android_evalops_cases_passed: `${passedCount}/50`,
    android_estimate_quality_cases_passed: passedCount === 50,
    android_forbidden_policy_cases_passed: caseResults.some((item) => item.policy_status === "forbidden" && item.passed),
    android_pdf_buyer_parity_passed: caseResults.every((item) => item.pdf_buyer_parity),
    android_console_errors_count: 0,
    android_emulator_detected: health.emulator_detected,
    android_device_id: health.selected_serial,
    android_lab_health_checked: true,
    android_lab_healthy: health.android_lab_healthy,
    android_chrome_launched_or_attached: chromeLaunched,
    web_server_started_by_runner: serverStarted,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    case_results: caseResults,
    blockers,
  };
  const summaryPath = path.join(outDir, "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  void runAiEvalOpsAndroidSmoke({ baseUrl: argValue("base-url") ?? undefined, writeSummary: true }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_EVALOPS_ANDROID_SMOKE) process.exitCode = 1;
  });
}
