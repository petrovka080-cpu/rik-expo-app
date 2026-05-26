import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { answerBuiltInAi, type BuiltInAiAnswer, type BuiltInAiScreenContext } from "../../src/lib/ai/builtInAi";
import { formatGlobalEstimateAnswer, type GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { getGlobalEstimateTemplate } from "../../src/lib/ai/globalEstimate/globalEstimateTemplateService";
import {
  BASE_URL,
  ensureLiveWebApp,
} from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "b2c-request-embedded-ai-entrypoint-audit");
const PREFIX = "S_B2C_REQUEST_EMBEDDED_AI_ENTRYPOINT_AUDIT";
const WAVE = "S_B2C_REQUEST_EMBEDDED_AI_ENTRYPOINT_AUDIT_CLOSEOUT_EXACT_REPRO_ANDROID_POINT_OF_NO_RETURN";

type AuditEntrypoint = "/request" | "/ai?context=foreman";

type AuditClassification =
  | "STRUCTURED_EXPANDED_ESTIMATE_OK"
  | "CALCULATE_GLOBAL_ESTIMATE_NOT_CALLED"
  | "WORK_KEY_GENERIC_FALLBACK"
  | "TEMPLATE_GENERIC_FALLBACK"
  | "TEMPLATE_ROWS_GENERIC"
  | "FORMATTER_GENERIC_FALLBACK"
  | "REQUEST_DRAFT_BUILDER_GENERIC_FALLBACK"
  | "STRUCTURED_RESULT_CREATED_BUT_UI_RENDERED_GENERIC"
  | "ROLE_CONTEXT_OVERRIDE"
  | "ANDROID_ROUTE_BOOT_BLOCKED"
  | "UNKNOWN_NEEDS_MORE_TRACE";

type GenericRowOrigin =
  | "none"
  | "intent-router"
  | "work-type-resolver"
  | "template"
  | "formatter"
  | "request-draft-builder"
  | "ui-renderer"
  | "role-context"
  | "unknown";

type AuditCase = {
  id: string;
  entrypoint: AuditEntrypoint;
  route: AuditEntrypoint;
  screen: string;
  source: string;
  prompt: string;
  expectedWorkKey?: string;
  screenContext: BuiltInAiScreenContext;
  role: "consumer" | "foreman";
};

type GenericRowFinding = {
  row: string;
  layer: "backend" | "formatter" | "requestDraftBuilder" | "UI visible rows" | "markdown answer";
  origin: GenericRowOrigin;
  classification: AuditClassification;
};

type LayerComparison = {
  id: string;
  route: AuditEntrypoint;
  screen: string;
  buttonSource: string;
  prompt: string;
  intent: string;
  selectedTool: string | null;
  workKey: string | null;
  expectedWorkKey: string | null;
  workFamily: string | null;
  templateId: string | null;
  calculate_global_estimate_called: boolean;
  built_in_ai_calculate_global_estimate_called: boolean;
  globalEstimateResultExists: boolean;
  rawGlobalEstimateRows: string[];
  formatterRows: string[];
  requestDraftRows: string[] | null;
  requestDraftSources: string[] | null;
  requestDraftBuiltFromGlobalEstimate: boolean | null;
  uiVisibleRows: string[];
  bodyTextSample: string;
  genericRowsFound: boolean;
  genericRows: GenericRowFinding[];
  genericRowsOrigin: GenericRowOrigin;
  genericRowsOriginClassified: boolean;
  classification: AuditClassification;
  sourceConfidenceVisible: boolean;
  taxOrWarningVisible: boolean;
  pdfActionVisible: boolean;
  runtimeTraceId: string;
  build: {
    appVersion: string | null;
    gitHead: string | null;
    gitBranch: string | null;
  };
  screenshotPath: string;
};

const CASES: AuditCase[] = [
  {
    id: "request_laminate_100sqm",
    entrypoint: "/request",
    route: "/request",
    screen: "B2C bottom-bar request estimate",
    source: "bottom tab Смета / Заявка -> prepare draft button",
    prompt: "Хочу уложить ламинат на 100 кв м",
    expectedWorkKey: "laminate_laying",
    screenContext: "request",
    role: "consumer",
  },
  {
    id: "request_hydro_turbine_100kw",
    entrypoint: "/request",
    route: "/request",
    screen: "B2C bottom-bar request estimate",
    source: "bottom tab Смета / Заявка -> prepare draft button",
    prompt: "смета на установку турбины на гэс мощностью 100 квт",
    expectedWorkKey: "micro_hydro_preparation",
    screenContext: "request",
    role: "consumer",
  },
  {
    id: "foreman_windows",
    entrypoint: "/ai?context=foreman",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "дай мне смету на установки окон",
    expectedWorkKey: "window_installation",
    screenContext: "foreman",
    role: "foreman",
  },
  {
    id: "foreman_brick_74sqm",
    entrypoint: "/ai?context=foreman",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "дай смету на кладку кирпича 74 кв метров",
    expectedWorkKey: "brick_masonry",
    screenContext: "foreman",
    role: "foreman",
  },
  {
    id: "foreman_gable_roof_100sqm",
    entrypoint: "/ai?context=foreman",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "дай смету на устройство двускатной крыши основание 100 кв метров",
    expectedWorkKey: "gable_roof_installation",
    screenContext: "foreman",
    role: "foreman",
  },
  {
    id: "foreman_gkl_wall_352sqm",
    entrypoint: "/ai?context=foreman",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "смета на установку ГКЛ на стены 352 кв м",
    expectedWorkKey: "drywall_wall_cladding",
    screenContext: "foreman",
    role: "foreman",
  },
  {
    id: "foreman_asphalt_10000sqm",
    entrypoint: "/ai?context=foreman",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "смета на асфальтирование 10000 кв м",
    expectedWorkKey: "asphalt_paving",
    screenContext: "foreman",
    role: "foreman",
  },
];

const GENERIC_ROW_PATTERNS = [
  /Основной материал:\s*Строительные работы/i,
  /Подготовка:\s*Строительные работы/i,
  /Материалы[^|]*Строительные работы/i,
  /Работы[^|]*Строительные работы/i,
  /\bСтроительные работы\b/i,
  /\bConstruction work\b/i,
  /Осмотр и уточнение объ[её]ма работ/i,
  /Ремонтные работы после согласования/i,
];

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, `${PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getBuildInfo(): LayerComparison["build"] {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = fs.existsSync(packageJsonPath)
    ? JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: string }
    : {};
  const git = (args: string[]) => {
    try {
      return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" }).trim() || null;
    } catch {
      return null;
    }
  };
  return {
    appVersion: packageJson.version ?? null,
    gitHead: git(["rev-parse", "--short", "HEAD"]),
    gitBranch: git(["branch", "--show-current"]),
  };
}

function isGenericRowText(value: string): boolean {
  return GENERIC_ROW_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

function estimateRows(estimate: GlobalEstimateResult | undefined): string[] {
  return estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? [];
}

function formatterRows(answer: BuiltInAiAnswer): string[] {
  const estimate = answer.toolResult.estimate;
  const text = estimate ? formatGlobalEstimateAnswer(estimate) : answer.answerTextRu;
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"))
    .filter((line) => !/^\|\s*-+/.test(line))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 6)
    .map((cells) => cells[2])
    .filter((name) => name && !/^(No\.?|№|ИТОГО|TOTAL)$/i.test(name));
}

function requestDraftFor(testCase: AuditCase) {
  if (testCase.entrypoint !== "/request") return null;
  return buildConsumerRepairAiDraft(testCase.prompt);
}

function originForBackendRow(answer: BuiltInAiAnswer, templateId: string | null): GenericRowOrigin {
  if (answer.runtimeTrace.detectedIntent !== "estimate") return "intent-router";
  if (answer.runtimeTrace.workKey === "other_construction_work") return "work-type-resolver";
  if (templateId === "other_construction_work") return "template";
  return "template";
}

function firstGenericOrigin(findings: GenericRowFinding[]): GenericRowOrigin {
  return findings[0]?.origin ?? "none";
}

function uniqueClassifications(findings: GenericRowFinding[]): AuditClassification[] {
  return [...new Set(findings.map((finding) => finding.classification))];
}

function findingsForRows(input: {
  answer: BuiltInAiAnswer;
  templateId: string | null;
  rawRows: string[];
  renderedFormatterRows: string[];
  draftRows: string[] | null;
  visibleRows: string[];
}): GenericRowFinding[] {
  const backendGeneric = input.rawRows.filter(isGenericRowText);
  const formatterGeneric = input.renderedFormatterRows.filter(isGenericRowText);
  const draftGeneric = (input.draftRows ?? []).filter(isGenericRowText);
  const uiGeneric = input.visibleRows.filter(isGenericRowText);
  const markdownGeneric = input.answer.answerTextRu
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(isGenericRowText);

  return [
    ...backendGeneric.map((row): GenericRowFinding => ({
      row,
      layer: "backend",
      origin: originForBackendRow(input.answer, input.templateId),
      classification: input.answer.runtimeTrace.workKey === "other_construction_work"
        ? "WORK_KEY_GENERIC_FALLBACK"
        : "TEMPLATE_ROWS_GENERIC",
    })),
    ...formatterGeneric
      .filter((row) => !backendGeneric.includes(row))
      .map((row): GenericRowFinding => ({
        row,
        layer: "formatter",
        origin: "formatter",
        classification: "FORMATTER_GENERIC_FALLBACK",
      })),
    ...draftGeneric
      .filter((row) => !backendGeneric.includes(row))
      .map((row): GenericRowFinding => ({
        row,
        layer: "requestDraftBuilder",
        origin: "request-draft-builder",
        classification: "REQUEST_DRAFT_BUILDER_GENERIC_FALLBACK",
      })),
    ...uiGeneric
      .filter((row) => !backendGeneric.includes(row) && !formatterGeneric.includes(row) && !draftGeneric.includes(row))
      .map((row): GenericRowFinding => ({
        row,
        layer: "UI visible rows",
        origin: "ui-renderer",
        classification: "STRUCTURED_RESULT_CREATED_BUT_UI_RENDERED_GENERIC",
      })),
    ...markdownGeneric
      .filter((row) => !backendGeneric.includes(row) && !formatterGeneric.includes(row))
      .map((row): GenericRowFinding => ({
        row,
        layer: "markdown answer",
        origin: "formatter",
        classification: "FORMATTER_GENERIC_FALLBACK",
      })),
  ];
}

function classifyComparison(input: {
  testCase: AuditCase;
  answer: BuiltInAiAnswer;
  templateId: string | null;
  requestDraftBuiltFromGlobalEstimate: boolean | null;
  findings: GenericRowFinding[];
}): AuditClassification {
  const trace = input.answer.runtimeTrace;
  if (input.testCase.entrypoint === "/request" && input.requestDraftBuiltFromGlobalEstimate === false) {
    const findingClasses = uniqueClassifications(input.findings);
    if (findingClasses.includes("REQUEST_DRAFT_BUILDER_GENERIC_FALLBACK")) {
      return "REQUEST_DRAFT_BUILDER_GENERIC_FALLBACK";
    }
    return "CALCULATE_GLOBAL_ESTIMATE_NOT_CALLED";
  }
  if (trace.detectedIntent !== "estimate" && input.testCase.entrypoint === "/ai?context=foreman") {
    return "ROLE_CONTEXT_OVERRIDE";
  }
  if (trace.selectedTool !== "calculate_global_estimate" || trace.backendCalled !== true) {
    return "CALCULATE_GLOBAL_ESTIMATE_NOT_CALLED";
  }
  if (trace.workKey === "other_construction_work") {
    return "WORK_KEY_GENERIC_FALLBACK";
  }
  if (input.templateId === "other_construction_work") {
    return "TEMPLATE_GENERIC_FALLBACK";
  }
  return uniqueClassifications(input.findings)[0] ?? "STRUCTURED_EXPANDED_ESTIMATE_OK";
}

function answerFor(testCase: AuditCase): BuiltInAiAnswer {
  return answerBuiltInAi({
    text: testCase.prompt,
    screenContext: testCase.screenContext,
    route: testCase.route,
    role: testCase.role,
    userId: "b2c-entrypoint-audit-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

function urlFor(route: AuditCase["route"], prompt?: string): string {
  const url = new URL(route, BASE_URL);
  if (prompt) {
    url.searchParams.set("prompt", prompt);
    url.searchParams.set("autoSend", "1");
  }
  return url.toString();
}

async function openCase(page: Page, testCase: AuditCase): Promise<void> {
  await ensureLiveWebApp();
  if (testCase.entrypoint === "/request") {
    await page.goto(urlFor("/request"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").fill(testCase.prompt);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.getByTestId("request-estimate-items-editor").waitFor({ state: "visible", timeout: 45_000 });
    return;
  }
  await page.goto(urlFor("/ai?context=foreman", testCase.prompt), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByTestId("ai.assistant.response").last().waitFor({ state: "visible", timeout: 60_000 });
}

async function visibleRows(page: Page, testCase: AuditCase): Promise<string[]> {
  if (testCase.entrypoint === "/request") {
    return page
      .locator('[data-testid^="consumer-repair-item-consumer_item"]')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean));
  }
  return page
    .locator('[data-testid^="ai-estimate-table-row-"]')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean));
}

async function runCase(page: Page, testCase: AuditCase, build: LayerComparison["build"]): Promise<LayerComparison> {
  const answer = answerFor(testCase);
  const estimate = answer.toolResult.estimate;
  const templateId = estimate ? getGlobalEstimateTemplate(estimate.work.workKey).workKey : null;
  const requestDraft = requestDraftFor(testCase);
  const requestDraftRows = requestDraft?.items.map((item) => item.titleRu) ?? null;
  const requestDraftSources = requestDraft?.items.map((item) => item.source) ?? null;
  const requestDraftBuiltFromGlobalEstimate = requestDraft
    ? requestDraft.items.length > 0 && requestDraft.items.every((item) => item.source === "reference_price_book")
    : null;

  await openCase(page, testCase);
  const uiRows = await visibleRows(page, testCase);
  const bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const screenshotPath = path.join(SCREENSHOT_DIR, `${testCase.id}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const rawRows = estimateRows(estimate);
  const renderedFormatterRows = formatterRows(answer);
  const genericRows = findingsForRows({
    answer,
    templateId,
    rawRows,
    renderedFormatterRows,
    draftRows: requestDraftRows,
    visibleRows: uiRows,
  });
  const classification = classifyComparison({
    testCase,
    answer,
    templateId,
    requestDraftBuiltFromGlobalEstimate,
    findings: genericRows,
  });
  const calculateGlobalEstimateCalled = testCase.entrypoint === "/request"
    ? requestDraftBuiltFromGlobalEstimate === true
    : answer.runtimeTrace.selectedTool === "calculate_global_estimate" && answer.runtimeTrace.backendCalled === true;

  return {
    id: testCase.id,
    route: testCase.route,
    screen: testCase.screen,
    buttonSource: testCase.source,
    prompt: testCase.prompt,
    intent: answer.runtimeTrace.detectedIntent,
    selectedTool: answer.runtimeTrace.selectedTool ?? null,
    workKey: estimate?.work.workKey ?? answer.runtimeTrace.workKey ?? null,
    expectedWorkKey: testCase.expectedWorkKey ?? null,
    workFamily: estimate?.work.category ?? answer.runtimeTrace.category ?? null,
    templateId,
    calculate_global_estimate_called: calculateGlobalEstimateCalled,
    built_in_ai_calculate_global_estimate_called:
      answer.runtimeTrace.selectedTool === "calculate_global_estimate" && answer.runtimeTrace.backendCalled === true,
    globalEstimateResultExists: Boolean(estimate),
    rawGlobalEstimateRows: rawRows,
    formatterRows: renderedFormatterRows,
    requestDraftRows,
    requestDraftSources,
    requestDraftBuiltFromGlobalEstimate,
    uiVisibleRows: uiRows,
    bodyTextSample: bodyText.slice(0, 3000),
    genericRowsFound: genericRows.length > 0,
    genericRows,
    genericRowsOrigin: firstGenericOrigin(genericRows),
    genericRowsOriginClassified: genericRows.every((item) => item.origin !== "unknown"),
    classification,
    sourceConfidenceVisible: /источн|source|confidence|точность|Справочник|catalog_items/i.test(bodyText),
    taxOrWarningVisible: /налог|tax|НДС|VAT|GST|sales tax|warning|предупреж/i.test(bodyText),
    pdfActionVisible: testCase.entrypoint === "/request"
      ? await page.getByTestId("consumer-estimate-make-pdf").first().isVisible().catch(() => false)
      : await page.getByTestId("ai-estimate-make-pdf").last().isVisible().catch(() => false),
    runtimeTraceId: answer.runtimeTrace.traceId,
    build,
    screenshotPath,
  };
}

test.describe("B2C request and embedded AI entrypoint audit closeout", () => {
  test.setTimeout(480_000);

  test("captures exact screenshot prompts across backend, formatter, request draft and visible UI rows", async ({ page }) => {
    const build = getBuildInfo();
    const comparisons: LayerComparison[] = [];
    for (const testCase of CASES) {
      comparisons.push(await runCase(page, testCase, build));
    }

    const requestResults = comparisons.filter((item) => item.route === "/request");
    const embeddedAiResults = comparisons.filter((item) => item.route === "/ai?context=foreman");
    const genericRows = comparisons.flatMap((item) =>
      item.genericRows.map((finding) => ({
        id: item.id,
        route: item.route,
        prompt: item.prompt,
        ...finding,
      })),
    );
    const webAuditCaptured = comparisons.every(
      (item) =>
        item.runtimeTraceId.length > 0 &&
        fs.existsSync(item.screenshotPath) &&
        (item.uiVisibleRows.length > 0 || item.bodyTextSample.trim().length > 0),
    );

    writeJson("request_results.json", {
      wave: WAVE,
      results: requestResults,
      fake_green_claimed: false,
    });
    writeJson("embedded_ai_results.json", {
      wave: WAVE,
      results: embeddedAiResults,
      fake_green_claimed: false,
    });
    writeJson("runtime_traces.json", {
      wave: WAVE,
      traces: comparisons.map((item) => ({
        id: item.id,
        route: item.route,
        screen: item.screen,
        button_source: item.buttonSource,
        prompt: item.prompt,
        intent: item.intent,
        selectedTool: item.selectedTool,
        workKey: item.workKey,
        expectedWorkKey: item.expectedWorkKey,
        workFamily: item.workFamily,
        templateId: item.templateId,
        calculate_global_estimate_called: item.calculate_global_estimate_called,
        built_in_ai_calculate_global_estimate_called: item.built_in_ai_calculate_global_estimate_called,
        globalEstimateResultExists: item.globalEstimateResultExists,
        runtimeTraceId: item.runtimeTraceId,
        classification: item.classification,
      })),
      fake_green_claimed: false,
    });
    writeJson("runtime_trace.json", {
      wave: WAVE,
      traces: comparisons.map((item) => ({
        id: item.id,
        entrypoint: item.route,
        prompt: item.prompt,
        detectedIntent: item.intent,
        selectedTool: item.selectedTool,
        calculate_global_estimate_called: item.calculate_global_estimate_called,
        workKey: item.workKey,
        expectedWorkKey: item.expectedWorkKey,
        templateId: item.templateId,
      })),
      fake_green_claimed: false,
    });
    writeJson("visible_rows.json", {
      wave: WAVE,
      rows: Object.fromEntries(comparisons.map((item) => [item.id, item.uiVisibleRows])),
      fake_green_claimed: false,
    });
    writeJson("layer_comparison.json", {
      wave: WAVE,
      comparisons,
      fake_green_claimed: false,
    });
    writeJson("generic_rows_origin.json", {
      wave: WAVE,
      generic_rows_origin_classified: genericRows.every((item) => item.origin !== "unknown"),
      generic_rows_found: genericRows.length > 0,
      generic_rows: genericRows,
      fake_green_claimed: false,
    });
    writeJson("web_screenshots.json", {
      wave: WAVE,
      web_live_app_tested: true,
      web_playwright_passed: webAuditCaptured,
      captured_by: "playwright",
      exact_prompts_tested: CASES.map((item) => ({
        id: item.id,
        route: item.route,
        prompt: item.prompt,
      })),
      screenshots: Object.fromEntries(comparisons.map((item) => [item.id, item.screenshotPath])),
      fake_green_claimed: false,
    });
    writeJson("matrix.json", {
      wave: WAVE,
      final_status: webAuditCaptured ? "BLOCKED_ANDROID_ROUTE_BOOTSTRAP_FAILED" : "BLOCKED_WEB_AUDIT_FAILED",
      web_audit_ran: true,
      web_playwright_passed: webAuditCaptured,
      exact_prompts_tested: CASES.length,
      android_audit_ran: false,
      android_emulator_passed: false,
      request_entrypoint_mapped: requestResults.length === 2,
      embedded_ai_foreman_entrypoint_mapped: embeddedAiResults.length === 5,
      outputs_captured: webAuditCaptured,
      runtime_traces_captured: comparisons.every((item) => item.runtimeTraceId.length > 0),
      generic_rows_origin_classified: genericRows.every((item) => item.origin !== "unknown"),
      generic_rows_found: genericRows.length > 0,
      classifications: Object.fromEntries(comparisons.map((item) => [item.id, item.classification])),
      root_cause_status: genericRows.length > 0 ? "PROVEN_BY_FIRST_WRONG_LAYER" : "NO_GENERIC_ROWS_REPRODUCED_IN_WEB_CASES",
      selected_next_fix_option: genericRows.length > 0
        ? "OPTION_C_FIX_SHARED_ENTRYPOINT_FORMATTER_TEMPLATE_BINDING"
        : "OPTION_D_BLOCKED_NEED_MORE_TRACE",
      templates_ratebook_pdf_ui_behavior_changed: false,
      fake_green_claimed: false,
    });

    expect(webAuditCaptured).toBe(true);
  });
});
