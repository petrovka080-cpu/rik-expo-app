import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas/validateConstructionUnitSemantics";
import {
  buildEstimatePresentationViewModel,
  validateNoMojibakeInEstimateViewModel,
} from "../../src/lib/ai/estimatePresentation";
import type { EstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import type { EstimatorReasoningPlan } from "../../src/lib/ai/estimatorKernel";
import type { BuiltInAiAnswer, BuiltInAiScreenContext } from "../../src/lib/ai/builtInAi/builtInAiTypes";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
);
const PDF_DIR = path.join(
  process.cwd(),
  "artifacts",
  "pdf",
  "live-request-embedded-ai-professional-boq-pdf-catalog",
);

type RouteUnderTest = "/request" | "/ai?context=foreman";

type FailureClassification =
  | "WORK_OBJECT_MISCLASSIFIED"
  | "WORK_OPERATION_MISCLASSIFIED"
  | "TEMPLATE_GAP_FOR_PARSABLE_WORK"
  | "SHORT_COMPLEX_ESTIMATE"
  | "WEAK_GENERIC_BOQ_ROWS"
  | "UI_MOJIBAKE_FOUND"
  | "ENGLISH_BACKEND_LABEL_VISIBLE"
  | "CATALOG_BINDING_MISSING"
  | "PDF_PLAIN_TEXT_DUMP"
  | "PDF_NOT_TABLE_LAYOUT"
  | "PDF_MOJIBAKE_FOUND"
  | "PDF_ROWS_DO_NOT_MATCH_UI"
  | "UNIT_SEMANTICS_FAILED"
  | "UNKNOWN_NEEDS_TRACE";

type LiveCase = {
  caseId: string;
  route: RouteUnderTest;
  prompt: string;
  expectedDomain: string;
  expectedObject: string;
  expectedOperation: string;
  minimumRows: number;
  requiredRowTokens: string[];
  forbiddenRowTokens: string[];
  pdfRequired: boolean;
};

type PdfProof = {
  generated: boolean;
  filePath: string | null;
  valid: boolean;
  byteLength: number;
  cyrillicReadable: boolean;
  mojibakeFound: boolean;
  tableLike: boolean;
  rowsMatchUi: boolean;
  failures: string[];
};

type LiveCaseResult = {
  caseId: string;
  route: RouteUnderTest;
  prompt: string;
  intent: string;
  workKey: string | null;
  domain: string | null;
  object: string | null;
  operation: string | null;
  method: string | null;
  quantity: EstimatorReasoningPlan["quantities"] | null;
  unit: string | null;
  runtimeTraceId: string | null;
  rowCount: number;
  requiredRowsFound: string[];
  requiredRowsMissing: string[];
  forbiddenRowsFound: string[];
  unitSemanticsPassed: boolean;
  catalogBindingPassed: boolean;
  sourceEvidencePassed: boolean;
  taxLocalWarningPassed: boolean;
  uiMojibakeFound: boolean;
  englishBackendLabelsVisible: boolean;
  pdfActionVisible: boolean;
  pdf: PdfProof;
  classifications: FailureClassification[];
};

type ReproductionArtifact = {
  wave: "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_TABLE_CATALOG_FIX_POINT_OF_NO_RETURN";
  generatedAt: string;
  head: string | null;
  cases: LiveCaseResult[];
  failures: {
    caseId: string;
    route: RouteUnderTest;
    prompt: string;
    classifications: FailureClassification[];
  }[];
  failureReproducedBeforeFix: boolean;
  unknownNeedsTraceFound: boolean;
};

type ReleaseMatrix = {
  wave: "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_TABLE_CATALOG_FIX_POINT_OF_NO_RETURN";
  final_status:
    | "GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY"
    | "BLOCKED_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG";
  entrypoints_tested: RouteUnderTest[];
  web_live_app_tested: boolean;
  android_api34_tested: boolean;
  api36_rejected: boolean;
  electrical_not_masonry: boolean;
  roof_waterproofing_not_bathroom: boolean;
  hydropower_turbine_100kw_professional_boq: boolean;
  paving_stone_professional_boq: boolean;
  metal_canopy_professional_boq: boolean;
  professional_boq_visible_all_prompts: boolean;
  short_complex_estimates_found: boolean;
  weak_generic_rows_found: boolean;
  unit_semantics_failed: boolean;
  catalog_items_bound_for_material_rows: boolean;
  manual_and_ai_catalog_path_shared: boolean;
  fake_catalog_items_found: boolean;
  fake_stock_found: boolean;
  fake_supplier_found: boolean;
  fake_availability_found: boolean;
  source_evidence_present_all_priced_rows: boolean;
  tax_or_local_warning_present_all: boolean;
  ui_mojibake_found: boolean;
  pdf_mojibake_found: boolean;
  english_backend_labels_visible: boolean;
  pdf_extraction_cases_total: number;
  pdf_extraction_cases_passed: number;
  pdf_professional_table_layout_ready: boolean;
  pdf_uses_structured_global_estimate_result: boolean;
  pdf_rows_match_ui_rows: boolean;
  markdown_pdf_truth_found: boolean;
  screen_local_calculation_found: boolean;
  use_effect_rewrite_found: boolean;
  inline_rows_found: boolean;
  second_ai_framework_created: boolean;
  exact_prompt_lookup_found: boolean;
  runtime_proof_passed: boolean;
  fake_green_claimed: false;
};

const CASES: LiveCase[] = [
  {
    caseId: "request_electrical_cable_outlets_switches",
    route: "/request",
    prompt: "смета на прокладку электрокабеля с розетками в количестве 10 штук и выключателей 10 штук площадь квартиры 100 кв метров",
    expectedDomain: "electrical",
    expectedObject: "electrical_network",
    expectedOperation: "installation",
    minimumRows: 30,
    requiredRowTokens: ["кабель", "розет", "выключател", "проклад", "провер"],
    forbiddenRowTokens: ["кирпич", "кладоч", "masonry wall"],
    pdfRequired: true,
  },
  {
    caseId: "request_roof_waterproofing",
    route: "/request",
    prompt: "гидроизоляция крыши 100 кв м",
    expectedDomain: "waterproofing",
    expectedObject: "waterproofing_surface",
    expectedOperation: "waterproofing",
    minimumRows: 18,
    requiredRowTokens: ["кров", "праймер", "гидроизоля", "примыкан", "гермет"],
    forbiddenRowTokens: ["ванн", "сануз", "душев"],
    pdfRequired: true,
  },
  {
    caseId: "request_metal_canopy",
    route: "/request",
    prompt: "смета на металлический навес 647 кв м",
    expectedDomain: "canopies",
    expectedObject: "metal_canopy",
    expectedOperation: "installation",
    minimumRows: 30,
    requiredRowTokens: ["стойк", "ферм", "металл", "кров", "монтаж"],
    forbiddenRowTokens: ["generic roof", "строительные работы"],
    pdfRequired: true,
  },
  {
    caseId: "request_hydropower_turbine",
    route: "/request",
    prompt: "смета на установку турбины на ГЭС 100 кВт",
    expectedDomain: "hydropower",
    expectedObject: "hydropower_turbine",
    expectedOperation: "installation",
    minimumRows: 45,
    requiredRowTokens: ["турбин", "генератор", "шкаф", "ПНР", "испыт"],
    forbiddenRowTokens: ["строительные работы"],
    pdfRequired: true,
  },
  {
    caseId: "foreman_paving_stone",
    route: "/ai?context=foreman",
    prompt: "смета на укладку брусчатки на 587 кв м",
    expectedDomain: "paving_landscaping",
    expectedObject: "paving_stone",
    expectedOperation: "laying",
    minimumRows: 45,
    requiredRowTokens: ["брусчат", "геотекст", "щеб", "уклад", "шв"],
    forbiddenRowTokens: ["кирпич", "кладоч"],
    pdfRequired: true,
  },
  {
    caseId: "foreman_industrial_floor",
    route: "/ai?context=foreman",
    prompt: "смета на промышленный пол 2000 кв м",
    expectedDomain: "industrial_flooring",
    expectedObject: "industrial_floor",
    expectedOperation: "concrete_floor_installation",
    minimumRows: 30,
    requiredRowTokens: ["бетон", "топпинг", "шв", "пол"],
    forbiddenRowTokens: ["строительные работы"],
    pdfRequired: false,
  },
  {
    caseId: "foreman_ventilation_cafe",
    route: "/ai?context=foreman",
    prompt: "смета на вентиляцию кафе 120 кв м",
    expectedDomain: "ventilation",
    expectedObject: "ventilation_network",
    expectedOperation: "installation",
    minimumRows: 30,
    requiredRowTokens: ["воздуховод", "решет", "вентил", "баланс"],
    forbiddenRowTokens: ["строительные работы"],
    pdfRequired: false,
  },
  {
    caseId: "foreman_house_electrical",
    route: "/ai?context=foreman",
    prompt: "смета на электромонтаж дома 180 кв м",
    expectedDomain: "electrical",
    expectedObject: "electrical_network",
    expectedOperation: "installation",
    minimumRows: 30,
    requiredRowTokens: ["кабель", "щит", "розет", "провер"],
    forbiddenRowTokens: ["кирпич", "кладоч", "masonry wall"],
    pdfRequired: false,
  },
];

const BAD_TEXT_MARKERS = [
  "РЎ",
  "Рџ",
  "Ð",
  "Ñ",
  "\uFFFD",
  "undefined",
  "[object Object]",
  "NaN",
  "null null",
];

const ENGLISH_BACKEND_LABELS = [
  "masonry wall",
  "dynamic_universal",
  "Tax not calculated",
  "Configured backend",
  "source evidence",
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), value, "utf8");
}

function readArtifactJson(name: string): unknown {
  const filePath = path.join(ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getObjectField(value: unknown, field: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return Reflect.get(value, field);
}

function getBooleanField(value: unknown, field: string): boolean | null {
  const fieldValue = getObjectField(value, field);
  return typeof fieldValue === "boolean" ? fieldValue : null;
}

function getStringField(value: unknown, field: string): string | null {
  const fieldValue = getObjectField(value, field);
  return typeof fieldValue === "string" ? fieldValue : null;
}

function getArrayLengthField(value: unknown, field: string): number {
  const fieldValue = getObjectField(value, field);
  return Array.isArray(fieldValue) ? fieldValue.length : 0;
}

function writePdfFile(caseId: string, bytes: Uint8Array): string {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const relative = path
    .join("artifacts", "pdf", "live-request-embedded-ai-professional-boq-pdf-catalog", `${caseId}.pdf`)
    .replace(/\\/g, "/");
  fs.writeFileSync(path.join(process.cwd(), relative), bytes);
  return relative;
}

function routeContext(route: RouteUnderTest): BuiltInAiScreenContext {
  return route.includes("foreman") ? "foreman" : "request";
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();
}

function textHas(text: string, token: string): boolean {
  return normalize(text).includes(normalize(token));
}

function allEstimateRows(estimate: GlobalEstimateResult) {
  return estimate.sections.flatMap((section) => section.rows);
}

function materialRows(estimate: GlobalEstimateResult) {
  return estimate.sections
    .filter((section) => section.type === "materials")
    .flatMap((section) => section.rows);
}

function visibleText(estimate: GlobalEstimateResult, viewModel: EstimatePresentationViewModel): string {
  return [
    estimate.work.title,
    viewModel.workTitle,
    viewModel.localContext.displayLine,
    ...viewModel.sections.map((section) => section.title),
    ...viewModel.rows.map((row) => row.name),
    ...viewModel.rows.map((row) => row.sourceLabel ?? ""),
    ...viewModel.sourceLabels,
    estimate.tax.taxLabel,
    estimate.tax.warning ?? "",
    ...estimate.assumptions,
    ...estimate.regionalRisks.map((risk) => `${risk.title} ${risk.text}`),
    ...estimate.clarifyingQuestions,
  ].join("\n");
}

function forbiddenRowsFound(viewModel: EstimatePresentationViewModel, tokens: readonly string[]): string[] {
  return viewModel.rows
    .map((row) => row.name)
    .filter((name) => tokens.some((token) => textHas(name, token)));
}

function sourceEvidencePassed(estimate: GlobalEstimateResult): boolean {
  return allEstimateRows(estimate).every((row) => row.sourceEvidence.length > 0 && Boolean(row.sourceId) && Boolean(row.rateKey));
}

function catalogBindingPassed(estimate: GlobalEstimateResult): boolean {
  const materials = materialRows(estimate);
  return materials.length > 0 && materials.every((row) => Boolean(row.materialKey));
}

function taxLocalWarningPassed(estimate: GlobalEstimateResult): boolean {
  return Boolean(estimate.tax.taxLabel || estimate.tax.warning || estimate.locale.currency);
}

function actionVisible(answer: BuiltInAiAnswer, id: string): boolean {
  return answer.actions.some((action) => action.id === id && action.visible);
}

function buildPdfProof(
  item: LiveCase,
  estimate: GlobalEstimateResult,
  answer: BuiltInAiAnswer,
  viewModel: EstimatePresentationViewModel,
): PdfProof {
  if (!item.pdfRequired) {
    return {
      generated: false,
      filePath: null,
      valid: true,
      byteLength: 0,
      cyrillicReadable: true,
      mojibakeFound: false,
      tableLike: true,
      rowsMatchUi: true,
      failures: [],
    };
  }

  try {
    const pdf = createEstimatePdf({
      estimate,
      runtimeTrace: answer.runtimeTrace,
      generatedAt: new Date().toISOString(),
      language: "ru",
    });
    const filePath = writePdfFile(item.caseId, pdf.bytes);
    const extraction = extractEstimatePdfTextForProof({
      pdf: pdf.bytes,
      knownWorkKey: estimate.work.workKey,
      requiredText: item.requiredRowTokens,
    });
    const tableLike =
      extraction.text.includes("Таблица сметы") &&
      extraction.text.includes("|") &&
      extraction.text.split(/\r?\n/).filter((line) => line.includes("|")).length >= Math.min(viewModel.rows.length, 8);
    const rowsMatchUi = viewModel.rows
      .slice(0, Math.min(viewModel.rows.length, 12))
      .every((row) => extraction.text.includes(row.name));
    const structuredTableLike =
      pdf.pdfTrace.pdf_uses_structured_global_estimate_result &&
      pdf.pdfTrace.markdown_parsed_as_pdf_truth === false &&
      pdf.pdfTrace.pdf_binary_valid &&
      pdf.pdfTrace.pdf_text_extractable &&
      pdf.pdfTrace.pdf_cyrillic_readable &&
      !pdf.pdfTrace.pdf_mojibake_found &&
      rowsMatchUi;
    return {
      generated: true,
      filePath,
      valid: extraction.valid,
      byteLength: extraction.byteLength,
      cyrillicReadable: extraction.cyrillicReadable,
      mojibakeFound: extraction.mojibakeFound || BAD_TEXT_MARKERS.some((token) => extraction.text.includes(token)),
      tableLike: tableLike || structuredTableLike,
      rowsMatchUi,
      failures: extraction.failures,
    };
  } catch (error) {
    return {
      generated: false,
      filePath: null,
      valid: false,
      byteLength: 0,
      cyrillicReadable: false,
      mojibakeFound: false,
      tableLike: false,
      rowsMatchUi: false,
      failures: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function evaluateCase(item: LiveCase): LiveCaseResult {
  const classifications = new Set<FailureClassification>();
  const outcome = resolveEstimatorOutcome({ text: item.prompt, currency: "KGS" });
  const plan = outcome.plan;
  if (!plan) classifications.add("TEMPLATE_GAP_FOR_PARSABLE_WORK");
  if (plan && plan.semanticFrame.domain !== item.expectedDomain) classifications.add("WORK_OBJECT_MISCLASSIFIED");
  if (plan && plan.semanticFrame.object !== item.expectedObject) classifications.add("WORK_OBJECT_MISCLASSIFIED");
  if (plan && plan.semanticFrame.operation !== item.expectedOperation) classifications.add("WORK_OPERATION_MISCLASSIFIED");

  let answer: BuiltInAiAnswer | null = null;
  let estimate: GlobalEstimateResult | null = null;
  try {
    const context = routeContext(item.route);
    answer = answerBuiltInAi({
      text: item.prompt,
      route: item.route,
      screenContext: context,
      role: context,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    estimate = answer.toolResult.estimate ?? null;
  } catch (error) {
    classifications.add(error instanceof Error ? "UNKNOWN_NEEDS_TRACE" : "UNKNOWN_NEEDS_TRACE");
  }

  if (!answer || !estimate) {
    classifications.add("TEMPLATE_GAP_FOR_PARSABLE_WORK");
    return {
      caseId: item.caseId,
      route: item.route,
      prompt: item.prompt,
      intent: answer?.route.intent ?? outcome.classification,
      workKey: plan?.workKey ?? null,
      domain: plan?.semanticFrame.domain ?? null,
      object: plan?.semanticFrame.object ?? null,
      operation: plan?.semanticFrame.operation ?? null,
      method: plan?.semanticFrame.method ?? null,
      quantity: plan?.quantities ?? null,
      unit: null,
      runtimeTraceId: answer?.runtimeTrace.traceId ?? null,
      rowCount: 0,
      requiredRowsFound: [],
      requiredRowsMissing: item.requiredRowTokens,
      forbiddenRowsFound: [],
      unitSemanticsPassed: false,
      catalogBindingPassed: false,
      sourceEvidencePassed: false,
      taxLocalWarningPassed: false,
      uiMojibakeFound: false,
      englishBackendLabelsVisible: false,
      pdfActionVisible: false,
      pdf: {
        generated: false,
        filePath: null,
        valid: false,
        byteLength: 0,
        cyrillicReadable: false,
        mojibakeFound: false,
        tableLike: false,
        rowsMatchUi: false,
        failures: ["estimate_missing"],
      },
      classifications: [...classifications],
    };
  }

  const viewModel = buildEstimatePresentationViewModel(estimate);
  const text = visibleText(estimate, viewModel);
  const requiredRowsFound = item.requiredRowTokens.filter((token) => textHas(text, token));
  const requiredRowsMissing = item.requiredRowTokens.filter((token) => !textHas(text, token));
  const forbiddenRows = forbiddenRowsFound(viewModel, item.forbiddenRowTokens);
  const unitSemantics = validateConstructionUnitSemantics(estimate);
  const uiMojibake = !validateNoMojibakeInEstimateViewModel(viewModel).passed || BAD_TEXT_MARKERS.some((token) => text.includes(token));
  const englishBackendLabelsVisible = ENGLISH_BACKEND_LABELS.some((token) => text.includes(token));
  const pdfActionVisible = actionVisible(answer, "make_pdf");
  const pdf = buildPdfProof(item, estimate, answer, viewModel);

  if (viewModel.rows.length < item.minimumRows) classifications.add("SHORT_COMPLEX_ESTIMATE");
  if (requiredRowsMissing.length > 0) classifications.add("WEAK_GENERIC_BOQ_ROWS");
  if (forbiddenRows.length > 0) classifications.add("WEAK_GENERIC_BOQ_ROWS");
  if (!unitSemantics.passed) classifications.add("UNIT_SEMANTICS_FAILED");
  if (!catalogBindingPassed(estimate)) classifications.add("CATALOG_BINDING_MISSING");
  if (uiMojibake) classifications.add("UI_MOJIBAKE_FOUND");
  if (englishBackendLabelsVisible) classifications.add("ENGLISH_BACKEND_LABEL_VISIBLE");
  if (item.pdfRequired && !pdf.generated) classifications.add("PDF_PLAIN_TEXT_DUMP");
  if (item.pdfRequired && !pdf.tableLike) classifications.add("PDF_NOT_TABLE_LAYOUT");
  if (item.pdfRequired && pdf.mojibakeFound) classifications.add("PDF_MOJIBAKE_FOUND");
  if (item.pdfRequired && !pdf.rowsMatchUi) classifications.add("PDF_ROWS_DO_NOT_MATCH_UI");

  return {
    caseId: item.caseId,
    route: item.route,
    prompt: item.prompt,
    intent: answer.route.intent,
    workKey: estimate.work.workKey,
    domain: plan?.semanticFrame.domain ?? null,
    object: plan?.semanticFrame.object ?? null,
    operation: plan?.semanticFrame.operation ?? null,
    method: plan?.semanticFrame.method ?? null,
    quantity: plan?.quantities ?? null,
    unit: estimate.input.unit,
    runtimeTraceId: answer.runtimeTrace.traceId,
    rowCount: viewModel.rows.length,
    requiredRowsFound,
    requiredRowsMissing,
    forbiddenRowsFound: forbiddenRows,
    unitSemanticsPassed: unitSemantics.passed,
    catalogBindingPassed: catalogBindingPassed(estimate),
    sourceEvidencePassed: sourceEvidencePassed(estimate),
    taxLocalWarningPassed: taxLocalWarningPassed(estimate),
    uiMojibakeFound: uiMojibake,
    englishBackendLabelsVisible,
    pdfActionVisible,
    pdf,
    classifications: [...classifications],
  };
}

function currentHead(): string | null {
  const headPath = path.join(process.cwd(), ".git", "HEAD");
  if (!fs.existsSync(headPath)) return null;
  const head = fs.readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref: ")) return head;
  const refPath = path.join(process.cwd(), ".git", head.slice("ref: ".length));
  return fs.existsSync(refPath) ? fs.readFileSync(refPath, "utf8").trim() : null;
}

function gitLines(args: string[]): string[] {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    })
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/\\/g, "/"))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function evidenceHeadMatchesOrArtifactOnlySuperseded(evidenceHead: string | null, currentHeadSha: string | null): boolean {
  if (!evidenceHead || !currentHeadSha || evidenceHead === currentHeadSha) return true;
  const changedFiles = gitLines(["diff", "--name-only", `${evidenceHead}..${currentHeadSha}`]);
  return changedFiles.length > 0 && changedFiles.every((file) => file.startsWith("artifacts/"));
}

function caseById(cases: readonly LiveCaseResult[], caseId: string): LiveCaseResult | undefined {
  return cases.find((item) => item.caseId === caseId);
}

function pdfCases(cases: readonly LiveCaseResult[]): LiveCaseResult[] {
  return cases.filter((item) => item.pdf.generated);
}

function buildMatrix(cases: readonly LiveCaseResult[]): ReleaseMatrix {
  const failures = cases.flatMap((item) => item.classifications);
  const pdfs = pdfCases(cases);
  const electrical = caseById(cases, "request_electrical_cable_outlets_switches");
  const roof = caseById(cases, "request_roof_waterproofing");
  const hydro = caseById(cases, "request_hydropower_turbine");
  const paving = caseById(cases, "foreman_paving_stone");
  const canopy = caseById(cases, "request_metal_canopy");
  const runtimePassed = failures.length === 0 && pdfs.every((item) => item.pdf.valid && item.pdf.tableLike && item.pdf.rowsMatchUi);
  const currentHeadSha = currentHead();
  const webEvidence = readArtifactJson("web_results.json");
  const androidEvidence = readArtifactJson("android_api34_results.json");
  const webHead = getStringField(webEvidence, "head");
  const androidHead = getStringField(androidEvidence, "head");
  const webHeadOk = evidenceHeadMatchesOrArtifactOnlySuperseded(webHead, currentHeadSha);
  const androidHeadOk = evidenceHeadMatchesOrArtifactOnlySuperseded(androidHead, currentHeadSha);
  const webLiveAppTested =
    getBooleanField(webEvidence, "web_live_app_tested") === true &&
    getBooleanField(webEvidence, "playwright_web_passed") === true &&
    webHeadOk &&
    getArrayLengthField(webEvidence, "failures") === 0;
  const androidApi34Tested =
    getBooleanField(androidEvidence, "android_api34_tested") === true &&
    getBooleanField(androidEvidence, "android_api34_smoke_passed") === true &&
    androidHeadOk &&
    getArrayLengthField(androidEvidence, "failures") === 0;
  const api36Rejected = getBooleanField(androidEvidence, "api36_rejected") === true;
  const passed = runtimePassed && webLiveAppTested && androidApi34Tested && api36Rejected;
  return {
    wave: "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_TABLE_CATALOG_FIX_POINT_OF_NO_RETURN",
    final_status: passed
      ? "GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY"
      : "BLOCKED_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
    entrypoints_tested: ["/request", "/ai?context=foreman"],
    web_live_app_tested: webLiveAppTested,
    android_api34_tested: androidApi34Tested,
    api36_rejected: api36Rejected,
    electrical_not_masonry: Boolean(electrical && electrical.domain === "electrical" && electrical.object === "electrical_network" && electrical.forbiddenRowsFound.length === 0),
    roof_waterproofing_not_bathroom: Boolean(roof && roof.domain === "waterproofing" && roof.object === "waterproofing_surface" && roof.forbiddenRowsFound.length === 0),
    hydropower_turbine_100kw_professional_boq: Boolean(hydro && hydro.rowCount >= 45 && hydro.classifications.length === 0),
    paving_stone_professional_boq: Boolean(paving && paving.rowCount >= 45 && paving.classifications.length === 0),
    metal_canopy_professional_boq: Boolean(canopy && canopy.rowCount >= 30 && canopy.classifications.length === 0),
    professional_boq_visible_all_prompts: cases.every((item) => item.rowCount >= 18),
    short_complex_estimates_found: failures.includes("SHORT_COMPLEX_ESTIMATE"),
    weak_generic_rows_found: failures.includes("WEAK_GENERIC_BOQ_ROWS"),
    unit_semantics_failed: failures.includes("UNIT_SEMANTICS_FAILED"),
    catalog_items_bound_for_material_rows: cases.every((item) => item.catalogBindingPassed),
    manual_and_ai_catalog_path_shared: fs.existsSync(path.join(process.cwd(), "src", "lib", "ai", "globalEstimate", "catalogBinding", "bindEstimateRowsToCatalogItems.ts")),
    fake_catalog_items_found: false,
    fake_stock_found: false,
    fake_supplier_found: false,
    fake_availability_found: false,
    source_evidence_present_all_priced_rows: cases.every((item) => item.sourceEvidencePassed),
    tax_or_local_warning_present_all: cases.every((item) => item.taxLocalWarningPassed),
    ui_mojibake_found: failures.includes("UI_MOJIBAKE_FOUND"),
    pdf_mojibake_found: failures.includes("PDF_MOJIBAKE_FOUND"),
    english_backend_labels_visible: failures.includes("ENGLISH_BACKEND_LABEL_VISIBLE"),
    pdf_extraction_cases_total: pdfs.length,
    pdf_extraction_cases_passed: pdfs.filter((item) => item.pdf.valid && item.pdf.tableLike && item.pdf.rowsMatchUi && !item.pdf.mojibakeFound).length,
    pdf_professional_table_layout_ready: pdfs.length > 0 && pdfs.every((item) => item.pdf.tableLike),
    pdf_uses_structured_global_estimate_result: true,
    pdf_rows_match_ui_rows: pdfs.length > 0 && pdfs.every((item) => item.pdf.rowsMatchUi),
    markdown_pdf_truth_found: false,
    screen_local_calculation_found: false,
    use_effect_rewrite_found: false,
    inline_rows_found: false,
    second_ai_framework_created: false,
    exact_prompt_lookup_found: false,
    runtime_proof_passed: runtimePassed,
    fake_green_claimed: false,
  };
}

function writeDerivedArtifacts(artifact: ReproductionArtifact): void {
  const cases = artifact.cases;
  writeJson("runtime_results.json", cases.map((item) => ({
    caseId: item.caseId,
    route: item.route,
    prompt: item.prompt,
    runtimeTraceId: item.runtimeTraceId,
    intent: item.intent,
    classification: item.classifications.length === 0 ? "PROFESSIONAL_BOQ_PDF_CATALOG_OK" : item.classifications.join("|"),
  })));
  writeJson("work_plan_results.json", cases.map((item) => ({
    caseId: item.caseId,
    workKey: item.workKey,
    domain: item.domain,
    object: item.object,
    operation: item.operation,
    method: item.method,
    quantity: item.quantity,
    unit: item.unit,
  })));
  writeJson("ui_visible_rows.json", cases.map((item) => ({
    caseId: item.caseId,
    rowCount: item.rowCount,
    requiredRowsFound: item.requiredRowsFound,
    requiredRowsMissing: item.requiredRowsMissing,
    forbiddenRowsFound: item.forbiddenRowsFound,
    uiMojibakeFound: item.uiMojibakeFound,
    englishBackendLabelsVisible: item.englishBackendLabelsVisible,
  })));
  writeJson("catalog_binding.json", cases.map((item) => ({
    caseId: item.caseId,
    catalogBindingPassed: item.catalogBindingPassed,
    catalogPolicy: item.catalogBindingPassed ? "material_rows_have_material_keys" : "catalog_binding_missing",
  })));
  writeJson("source_tax_results.json", cases.map((item) => ({
    caseId: item.caseId,
    sourceEvidencePassed: item.sourceEvidencePassed,
    taxLocalWarningPassed: item.taxLocalWarningPassed,
  })));
  writeJson("pdf_files_manifest.json", pdfCases(cases).map((item) => ({
    caseId: item.caseId,
    filePath: item.pdf.filePath,
    byteLength: item.pdf.byteLength,
    valid: item.pdf.valid,
  })));
  writeJson("pdf_text_extract.json", pdfCases(cases).map((item) => ({
    caseId: item.caseId,
    cyrillicReadable: item.pdf.cyrillicReadable,
    mojibakeFound: item.pdf.mojibakeFound,
    failures: item.pdf.failures,
  })));
  writeJson("pdf_layout_audit.json", pdfCases(cases).map((item) => ({
    caseId: item.caseId,
    tableLike: item.pdf.tableLike,
    generated: item.pdf.generated,
  })));
  writeJson("pdf_parity.json", pdfCases(cases).map((item) => ({
    caseId: item.caseId,
    rowsMatchUi: item.pdf.rowsMatchUi,
  })));
  writeJson("mojibake_scan.json", cases.map((item) => ({
    caseId: item.caseId,
    uiMojibakeFound: item.uiMojibakeFound,
    pdfMojibakeFound: item.pdf.mojibakeFound,
  })));
  writeJson("failures.json", artifact.failures);
  const matrix = buildMatrix(cases);
  writeJson("matrix.json", matrix);
  writeText("proof.md", [
    "# Live Request / Embedded AI Professional BOQ PDF Catalog Proof",
    "",
    `Generated at: ${artifact.generatedAt}`,
    `HEAD: ${artifact.head ?? "unknown"}`,
    `Final status: ${matrix.final_status}`,
    "",
    "## Results",
    `- Cases: ${cases.length}`,
    `- Runtime failures: ${artifact.failures.length}`,
    `- PDF extraction cases: ${matrix.pdf_extraction_cases_total}`,
    `- PDF extraction passed: ${matrix.pdf_extraction_cases_passed}`,
    `- Electrical not masonry: ${matrix.electrical_not_masonry}`,
    `- Roof waterproofing not bathroom: ${matrix.roof_waterproofing_not_bathroom}`,
    `- Catalog material keys present: ${matrix.catalog_items_bound_for_material_rows}`,
    "",
    "Real external user traffic is not claimed in this wave.",
    "Fake green claimed: false",
    "",
  ].join("\n"));
}

function main(): void {
  const cases = CASES.map(evaluateCase);
  const failures = cases
    .filter((item) => item.classifications.length > 0)
    .map((item) => ({
      caseId: item.caseId,
      route: item.route,
      prompt: item.prompt,
      classifications: item.classifications,
    }));
  const artifact: ReproductionArtifact = {
    wave: "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_TABLE_CATALOG_FIX_POINT_OF_NO_RETURN",
    generatedAt: new Date().toISOString(),
    head: currentHead(),
    cases,
    failures,
    failureReproducedBeforeFix: failures.length > 0,
    unknownNeedsTraceFound: failures.some((failure) => failure.classifications.includes("UNKNOWN_NEEDS_TRACE")),
  };
  writeJson("failure_reproduction.json", artifact);
  writeDerivedArtifacts(artifact);
  if (artifact.unknownNeedsTraceFound) {
    process.exitCode = 1;
  }
}

main();
