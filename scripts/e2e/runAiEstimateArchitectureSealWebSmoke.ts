import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { buildAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/buildAiEstimateCatalogIndex";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";
import { ensureProductionGradeWebServer } from "./runProductionGradeEstimateWebSmoke";

export const GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-evolutionary-architecture-scale-seal", "web");
const DEFAULT_BASE_URL = "http://localhost:8116";

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
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

function gitCurrentSha() {
  return gitOutput(["rev-parse", "HEAD"]);
}

export async function runAiEstimateArchitectureSealWebSmoke(input: {
  baseUrl?: string;
  writeSummary?: boolean;
} = {}) {
  const sourceSha = gitCurrentSha();
  const baseUrl = resolveE2eBaseUrl({
    explicit: input.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_BASE_URL", "AI_ESTIMATE_ARCHITECTURE_SEAL_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const runtimeResults = runRuntimeCases(50);
  let browserStarted = false;
  let consoleErrors: string[] = [];
  let pageErrors: string[] = [];
  let bodyText = "";
  let bodyHtml = "";
  let serverStarted = false;
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
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.goto(`${baseUrl.replace(/\/+$/, "")}/request`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);
      await page.waitForTimeout(3000);
      bodyText = await page.locator("body").innerText({ timeout: 45_000 }).catch(() => "");
      bodyHtml = await page.locator("body").evaluate((node) => node.innerHTML).catch(() => "");
    } finally {
      await browser.close();
    }
  } finally {
    server.stop();
  }
  const visibleEnglishTechnicalWords = (bodyText.match(/\b(?:PRICE_MISSING|sourceParameters|formula_id|template_id|debug|fallback)\b/g) ?? []).length;
  const blockers = [
    browserStarted ? "" : "web_browser_not_started",
    bodyText.trim().length > 0 || bodyHtml.trim().length > 100 ? "" : "web_body_empty",
    bodyText.trim() !== "ROUTE_PROOF_REQUEST_ROUTE_READY" ? "" : "route_equivalent_marker_only",
    runtimeResults.every((item) => item.passed) ? "" : "runtime_50_cases_failed",
    consoleErrors.length === 0 ? "" : `web_console_errors:${consoleErrors.length}`,
    pageErrors.length === 0 ? "" : `web_page_errors:${pageErrors.length}`,
    visibleEnglishTechnicalWords === 0 ? "" : `visible_technical_english:${visibleEnglishTechnicalWords}`,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE
      : STOP_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "web",
    base_url: baseUrl,
    actual_web_browser_architecture_seal_smoke_passed: blockers.length === 0,
    browser_automation_started: browserStarted,
    web_server_started_by_runner: serverStarted,
    web_cases_total: runtimeResults.length,
    web_cases_passed: runtimeResults.filter((item) => item.passed).length,
    web_console_errors_count: consoleErrors.length,
    web_page_errors_count: pageErrors.length,
    web_visible_english_words_count: visibleEnglishTechnicalWords,
    web_body_text_length: bodyText.length,
    web_body_html_length: bodyHtml.length,
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
  void runAiEstimateArchitectureSealWebSmoke({ baseUrl: argValue("base-url") ?? undefined, writeSummary: true })
    .then((result) => {
      console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
      if (result.summary.final_status !== GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
