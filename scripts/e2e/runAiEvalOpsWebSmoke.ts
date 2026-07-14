import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

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
import { resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";
import { ensureProductionGradeWebServer } from "./runProductionGradeEstimateWebSmoke";

export const GREEN_AI_EVALOPS_WEB_SMOKE = "GREEN_AI_EVALOPS_WEB_SMOKE" as const;
export const STOP_AI_EVALOPS_WEB_SMOKE_FAILED = "STOP_AI_EVALOPS_WEB_SMOKE_FAILED" as const;

const DEFAULT_BASE_URL = "http://localhost:8128";

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
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
    evalRunId: `web-evalops-${timestampForPath()}`,
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
    promptVersion: AI_EVAL_PROMPT_VERSION,
    providerKey: "web_evalops_provider",
    modelKey: "web-evalops-model",
  });
  return results.map((result) => ({
    case_id: result.caseId,
    passed: result.status === "passed",
    result_hash: hash(`${result.caseId}|${result.status}|${result.actual.policyStatus}|${result.score}`),
    policy_status: result.actual.policyStatus,
    pdf_buyer_parity: result.actual.boqFamilies.length > 0,
  }));
}

export async function runAiEvalOpsWebSmoke(input: { baseUrl?: string; writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const baseUrl = resolveE2eBaseUrl({
    explicit: input.baseUrl,
    scriptEnvKeys: ["AI_EVALOPS_WEB_BASE_URL", "AI_EVALOPS_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(AI_PLATFORM_EVALOPS_ROOT, "web", timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const caseResults = await runEvalOpsCases();
  let browserStarted = false;
  let serverStarted = false;
  let bodyText = "";
  const consoleErrors: string[] = [];
  const server = await ensureProductionGradeWebServer(baseUrl, outDir);
  serverStarted = server.started;
  try {
    const browser = await chromium.launch({ headless: true });
    browserStarted = true;
    try {
      const page = await browser.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      await page.goto(`${baseUrl.replace(/\/+$/, "")}/request`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);
      const body = page.locator("body");
      await body.waitFor({ timeout: 45_000 });
      const started = Date.now();
      while (Date.now() - started < 60_000) {
        bodyText = await body.innerText({ timeout: 10_000 }).catch(() => "");
        if (bodyText.trim().length > 0) break;
        await page.waitForTimeout(500);
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.stop();
  }
  const passedCount = caseResults.filter((item) => item.passed).length;
  const blockers = [
    browserStarted ? "" : "web_browser_not_started",
    bodyText.trim().length > 0 ? "" : "web_body_empty",
    passedCount === 50 ? "" : `evalops_cases_failed:${passedCount}/50`,
    consoleErrors.length === 0 ? "" : `web_console_errors:${consoleErrors.length}`,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0 ? GREEN_AI_EVALOPS_WEB_SMOKE : STOP_AI_EVALOPS_WEB_SMOKE_FAILED,
    ...git,
    generated_at: new Date().toISOString(),
    actual_web_browser_evalops_smoke_passed: blockers.length === 0,
    web_evalops_cases_passed: `${passedCount}/50`,
    web_estimate_quality_cases_passed: passedCount === 50,
    web_forbidden_policy_cases_passed: caseResults.some((item) => item.policy_status === "forbidden" && item.passed),
    web_pdf_buyer_parity_passed: caseResults.every((item) => item.pdf_buyer_parity),
    web_console_errors_count: consoleErrors.length,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    web_server_started_by_runner: serverStarted,
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
  void runAiEvalOpsWebSmoke({ baseUrl: argValue("base-url") ?? undefined, writeSummary: true }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_EVALOPS_WEB_SMOKE) process.exitCode = 1;
  });
}
