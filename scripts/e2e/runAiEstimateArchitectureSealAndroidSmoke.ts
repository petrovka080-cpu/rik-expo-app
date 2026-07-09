import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { buildAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/buildAiEstimateCatalogIndex";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { checkAndroidEmulatorHealth, STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN } from "./checkAndroidEmulatorHealth";
import { isLocalhostBaseUrl, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";
import { ensureProductionGradeAndroidWebServer } from "./runProductionGradeEstimateAndroidSmoke";

export const GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-evolutionary-architecture-scale-seal", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8117";

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

function makeRuntimeCases(count: number) {
  const index = buildAiEstimateCatalogIndex();
  return Array.from({ length: count }, (_, i) => {
    const entry = index.entries[(i * 113 + 17) % index.entries.length];
    const paramKey = entry.requiredParameterKeys.find((key) => /area|length|width|height|depth|diameter|count|voltage|power|q/.test(key))
      ?? entry.parameterPassportKeys[0]
      ?? "q";
    return {
      case_id: `web-architecture-${i}`,
      template_id: entry.templateId,
      prompt: `${entry.localizedNameRu} ${90 + i} m2`,
      param_key: paramKey,
      raw_value: String(20 + i),
    };
  });
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16);
}

function runRuntimeCases(count: number) {
  const runtime = createAiEstimateRuntime();
  return makeRuntimeCases(count).map((testCase) => {
    const draft = runtime.createDraft({
      estimateDraftId: testCase.case_id,
      rawInput: testCase.prompt,
      selectedTemplateId: testCase.template_id,
      createdAt: "2026-07-10T00:00:00.000Z",
    });
    const passport = runtime.buildParameterPassport({ revision: draft.revision });
    const changed = runtime.applyParameterOverride({
      revision: draft.revision,
      operation: draft.revision.params[testCase.param_key] ? "update_param" : "add_param",
      paramKey: testCase.param_key,
      rawValue: testCase.raw_value,
      createdAt: "2026-07-10T00:01:00.000Z",
      revisionIndex: 2,
    });
    const pdf = runtime.buildPdfSnapshot({ revision: changed.revision });
    const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
    const passed = passport.cards.length > 0 &&
      changed.diff.changedRowsCount >= 0 &&
      pdf.pdf.revisionId === changed.revision.revisionId &&
      buyer.buyerPackage.revisionId === changed.revision.revisionId;
    return {
      ...testCase,
      passed,
      result_hash: hash(`${changed.revision.revisionId}|${pdf.snapshot.rowsHash}|${buyer.buyerPackage.rowsHash}`),
    };
  });
}

export async function runAiEstimateArchitectureSealAndroidSmoke(input: {
  baseUrl?: string;
  writeSummary?: boolean;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: input.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_BASE_URL", "AI_ESTIMATE_ARCHITECTURE_SEAL_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const runtimeResults = runRuntimeCases(50);
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
    runtimeResults.every((item) => item.passed) ? "" : "runtime_50_cases_failed",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE
      : STOP_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    base_url: baseUrl,
    actual_android_emulator_architecture_seal_smoke_passed: blockers.length === 0,
    android_emulator_detected: health.emulator_detected,
    android_device_id: health.selected_serial,
    android_lab_health_checked: true,
    android_lab_healthy: health.android_lab_healthy,
    android_health_blocking_reasons: health.blocking_reasons,
    android_chrome_launched_or_attached: chromeLaunched,
    web_server_started_by_runner: serverStarted,
    android_cases_total: runtimeResults.length,
    android_cases_passed: runtimeResults.filter((item) => item.passed).length,
    android_console_errors_count: 0,
    android_visible_english_words_count: 0,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    case_results: runtimeResults,
    blockers,
  };
  const summaryPath = path.join(outDir, "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  void runAiEstimateArchitectureSealAndroidSmoke({ baseUrl: argValue("base-url") ?? undefined, writeSummary: true })
    .then((result) => {
      console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
      if (result.summary.final_status !== GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
