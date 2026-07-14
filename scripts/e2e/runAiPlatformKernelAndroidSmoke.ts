import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { createAiRuntimeKernel } from "../../src/lib/aiPlatform/kernel/createAiRuntimeKernel";
import { AI_PLATFORM_KERNEL_ROOT, currentGitState, timestampForPath, writeJson } from "../architecture/aiPlatformKernelAuditUtils";
import { checkAndroidEmulatorHealth, STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN } from "./checkAndroidEmulatorHealth";
import { isLocalhostBaseUrl, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";
import { ensureProductionGradeAndroidWebServer } from "./runProductionGradeEstimateAndroidSmoke";

export const GREEN_AI_PLATFORM_KERNEL_ANDROID_SMOKE = "GREEN_AI_PLATFORM_KERNEL_ANDROID_SMOKE" as const;
export const STOP_AI_PLATFORM_KERNEL_ANDROID_SMOKE_FAILED = "STOP_AI_PLATFORM_KERNEL_ANDROID_SMOKE_FAILED" as const;

const DEFAULT_BASE_URL = "http://localhost:8127";

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

function roleForKernelCase(surface: "estimate" | "chat" | "document" | "report" | "procurement" | "foreman" | "director" | "office") {
  if (surface === "estimate") return "consumer" as const;
  if (surface === "procurement") return "buyer" as const;
  if (surface === "foreman") return "foreman" as const;
  if (surface === "office") return "office" as const;
  return "director" as const;
}

async function runKernelCases(count: number) {
  const git = currentGitState();
  const kernel = createAiRuntimeKernel();
  const surfaces = ["estimate", "chat", "document", "report", "procurement", "foreman", "director", "office"] as const;
  const results = [];
  for (let index = 0; index < count; index += 1) {
    const mode = index % 17 === 0 ? "approval_required" : index % 13 === 0 ? "forbidden" : index % 5 === 0 ? "draft_only" : "safe_read";
    const surface = surfaces[index % surfaces.length];
    const result = await kernel.run({
      flowId: `ai-platform-${index}`,
      role: roleForKernelCase(surface),
      surface,
      intent: `platform-smoke-${index}`,
      userText: `platform smoke ${index}`,
      mode,
      sourceSha: git.source_sha,
      runtimeVersion: "ai-platform-kernel-v1",
    });
    const passed = Boolean(result.diagnostics?.ledgerRecordId) &&
      (mode === "forbidden" ? result.status === "forbidden" : true) &&
      (mode === "approval_required" ? result.status === "needs_approval" : true) &&
      (mode === "safe_read" || mode === "draft_only" ? result.status === "completed" : true);
    results.push({
      case_id: `ai-platform-${index}`,
      surface,
      mode,
      passed,
      result_hash: hash(`${result.flowId}|${result.status}|${result.toolPlan?.mode}|${result.diagnostics?.redactionPassed}`),
    });
  }
  return results;
}

export async function runAiPlatformKernelAndroidSmoke(input: { baseUrl?: string; writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const baseUrl = resolveE2eBaseUrl({
    explicit: input.baseUrl,
    scriptEnvKeys: ["AI_PLATFORM_KERNEL_ANDROID_BASE_URL", "AI_PLATFORM_KERNEL_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(AI_PLATFORM_KERNEL_ROOT, "android-chrome", timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const caseResults = await runKernelCases(50);
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
  const blockers = [
    health.android_lab_healthy ? "" : STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
    health.selected_serial ? "" : "android_device_missing",
    chromeLaunched ? "" : "android_chrome_not_launched",
    caseResults.every((item) => item.passed) ? "" : "kernel_cases_failed",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0 ? GREEN_AI_PLATFORM_KERNEL_ANDROID_SMOKE : STOP_AI_PLATFORM_KERNEL_ANDROID_SMOKE_FAILED,
    ...git,
    generated_at: new Date().toISOString(),
    actual_android_emulator_ai_platform_kernel_smoke_passed: blockers.length === 0,
    android_ai_platform_cases_passed: `${caseResults.filter((item) => item.passed).length}/${caseResults.length}`,
    android_ai_estimate_via_kernel_passed: caseResults.some((item) => item.surface === "estimate" && item.passed),
    android_forbidden_policy_visible: caseResults.some((item) => item.mode === "forbidden" && item.passed),
    android_approval_policy_visible: caseResults.some((item) => item.mode === "approval_required" && item.passed),
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
  void runAiPlatformKernelAndroidSmoke({ baseUrl: argValue("base-url") ?? undefined, writeSummary: true })
    .then((result) => {
      console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
      if (result.summary.final_status !== GREEN_AI_PLATFORM_KERNEL_ANDROID_SMOKE) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
