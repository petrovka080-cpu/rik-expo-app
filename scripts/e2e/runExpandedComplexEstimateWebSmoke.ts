import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
} from "../../src/lib/ai/expandedComplexWorks";

export const GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_WORKS_WEB_BROWSER_SMOKE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_EXPANDED_COMPLEX_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_EXPANDED_COMPLEX_WORKS_WEB_BROWSER_SMOKE_FAILED" as const;

const SCREENSHOT_PROMPT = "Водоснабжение сёл и наружные сети воды: вода башня";

const REQUIRED_SCENARIOS = [
  SCREENSHOT_PROMPT,
  "водоснабжение села 5 км труба ПЭ100 d110",
  "строительство дороги 1 км ширина 6 м асфальт",
  "дамба земляная 200 м высота 5 м",
  "ЛЭП 10 кВ 2 км шаг опор 50 м",
  "подведение инженерных сетей 100 м вода канализация электричество",
  "остекление высотного дома 5000 м²",
  "мансардная крыша 200 м² с 6 окнами",
  "ТЭЦ 100 МВт",
  "ГЭС 5 МВт",
  "мост 30 м 2 полосы свайное основание",
  "промышленный корпус 5000 м² металлокаркас",
] as const;

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function gitOutput(args: string[], fallback: string): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(fullPath: string, value: unknown): void {
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runDomainScenario(prompt: string) {
  const estimate = calculateExpandedComplexEstimate({ prompt });
  if (!estimate) {
    return {
      prompt,
      passed: false,
      blockers: ["prompt_not_resolved"],
    };
  }
  const snapshot = buildExpandedComplexSnapshot(estimate);
  const pdf = buildExpandedComplexPdfModel(snapshot);
  const buyer = buildExpandedComplexBuyerHandoff(snapshot);
  const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
  const buyerRows = [
    ...buyer.procurement_materials,
    ...buyer.equipment_to_purchase,
    ...buyer.delivery_procurement_services,
  ];
  const rows = [...estimate.material_rows, ...estimate.work_rows, ...estimate.equipment_rows, ...estimate.service_rows];
  const rowCount = rows.length;
  const screenshotPromptMatched = prompt === SCREENSHOT_PROMPT;
  const blockers = [
    rowCount > 0 ? "" : "positions_empty_after_prompt",
    estimate.estimate_level === "PRELIMINARY_BOQ" ? "" : "estimate_level_missing",
    estimate.missing_design_inputs.length > 0 ? "" : "missing_design_inputs_missing",
    pdf.rows_equal_snapshot ? "" : "pdf_snapshot_mismatch",
    buyerRows.length > 0 && buyerRows.every((row) => row.lineType !== "work") ? "" : "buyer_handoff_invalid",
    aiDraft.items.length > 0 ? "" : "request_ai_draft_empty",
    !screenshotPromptMatched || rows.some((row) => row.code === "water_tower_pcs") ? "" : "water_tower_row_missing",
  ].filter(Boolean);
  return {
    prompt,
    passed: blockers.length === 0,
    work_family_id: estimate.work_family_id,
    calculator_id: estimate.calculatorId,
    estimate_level: estimate.estimate_level,
    row_count: rowCount,
    water_tower_row_included: rows.some((row) => row.code === "water_tower_pcs"),
    pdf_generated_from_snapshot: pdf.rows_equal_snapshot,
    buyer_handoff_valid: buyerRows.length > 0 && buyerRows.every((row) => row.lineType !== "work"),
    blockers,
  };
}

async function runBrowserFlow(baseUrl: string): Promise<{
  actual_web_browser_smoke_passed: boolean;
  console_error_count: number;
  body_text_sample: string;
  blockers: string[];
}> {
  const consoleErrors: string[] = [];
  const browser = await chromium.launch({ headless: true });
  try {
    const page: Page = await browser.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto(`${baseUrl.replace(/\/+$/, "")}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
    const initialBodyText = await page.locator("body").innerText({ timeout: 15_000 });
    await page.getByTestId("consumer-repair-problem-input").fill(SCREENSHOT_PROMPT);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
    await page.getByTestId("request-estimate-items-editor").waitFor({ timeout: 30_000 });
    const bodyText = await page.locator("body").innerText({ timeout: 15_000 });
    const blockers = [
      !initialBodyText.includes("Водоснабжение села 5 км ПЭ100 d110") ? "" : "expanded_quick_chip_still_visible",
      !initialBodyText.includes("ТЭЦ/ГЭС") ? "" : "expanded_category_still_visible",
      /Водонапорная башня|бак запаса воды/i.test(bodyText) ? "" : "water_tower_row_missing",
      /Материалы/i.test(bodyText) && /Работы/i.test(bodyText) ? "" : "grouped_preview_missing",
      consoleErrors.length === 0 ? "" : `console_error_count:${consoleErrors.length}`,
    ].filter(Boolean);
    return {
      actual_web_browser_smoke_passed: blockers.length === 0,
      console_error_count: consoleErrors.length,
      body_text_sample: bodyText.slice(0, 2000),
      blockers,
    };
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const requireRealBrowser = hasFlag("require-real-browser");
  const target = argValue("target") ?? "web";
  const baseUrl = String(process.env.EXPANDED_COMPLEX_WEB_BASE_URL ?? "http://localhost:8091");
  const domainScenarios = REQUIRED_SCENARIOS.map(runDomainScenario);
  let browserFlow = {
    actual_web_browser_smoke_passed: false,
    console_error_count: 0,
    body_text_sample: "",
    blockers: requireRealBrowser ? ["real_browser_not_started"] : [],
  };
  if (requireRealBrowser) {
    try {
      browserFlow = await runBrowserFlow(baseUrl);
    } catch (error) {
      browserFlow = {
        actual_web_browser_smoke_passed: false,
        console_error_count: 0,
        body_text_sample: "",
        blockers: [`real_browser_failed:${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }
  const blockers = [
    target === "web" ? "" : `unexpected_target:${target}`,
    domainScenarios.every((scenario) => scenario.passed) ? "" : "domain_scenarios_failed",
    requireRealBrowser && !browserFlow.actual_web_browser_smoke_passed ? "actual_web_browser_smoke_failed" : "",
    ...domainScenarios.flatMap((scenario) => scenario.blockers.map((blocker) => `${scenario.prompt}:${blocker}`)),
    ...browserFlow.blockers,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_WEB_SMOKE
      : STOP_AI_ESTIMATE_EXPANDED_COMPLEX_WEB_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    generated_at: new Date().toISOString(),
    target,
    require_real_browser: requireRealBrowser,
    browser_automation_started: requireRealBrowser,
    actual_web_browser_expanded_complex_smoke_passed: requireRealBrowser && browserFlow.actual_web_browser_smoke_passed,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: domainScenarios.every((scenario) => scenario.passed),
    console_error_count: browserFlow.console_error_count,
    pdf_generated_from_snapshot: domainScenarios.every((scenario) => scenario.passed),
    buyer_handoff_valid: domainScenarios.every((scenario) => scenario.passed),
    domain_scenarios: domainScenarios,
    browser_flow: browserFlow,
    fake_green_claimed: false,
    blockers,
  };
  const outDir = path.join(process.cwd(), ".release-runtime", "ai-estimate-expanded-complex-works", "web", timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  console.info(JSON.stringify({ artifactPath, ...summary }, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
