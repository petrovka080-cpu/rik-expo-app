import type { BuiltInAiAnswer } from "../builtInAi";
import type { GlobalEstimateResult, SourceBackedEstimateRow } from "./globalEstimateTypes";
import type { UnfinishedAiEstimateCase } from "./unfinishedAiEstimateCases";

export type AiEstimateCoreValidationFailure = {
  code: string;
  message: string;
  caseId?: string;
  route?: string;
  prompt?: string;
};

export type AiEstimateCoreValidationResult = {
  passed: boolean;
  failures: AiEstimateCoreValidationFailure[];
};

const FALLBACK_PHRASES = [
  "Строительные работы",
  "Основной материал: Строительные работы",
  "Подготовка: Строительные работы",
  "Материалы: Строительные работы",
  "Работы: Строительные работы",
  "Ремонтные работы после согласования",
  "Осмотр и уточнение объёма работ",
];

function lower(value: string): string {
  return value.toLocaleLowerCase("ru-RU");
}

function allRows(estimate: GlobalEstimateResult): SourceBackedEstimateRow[] {
  return estimate.sections.flatMap((section) => section.rows);
}

function addFailure(
  failures: AiEstimateCoreValidationFailure[],
  testCase: UnfinishedAiEstimateCase,
  code: string,
  message: string,
  route: string,
): void {
  failures.push({ code, message, caseId: testCase.id, route, prompt: testCase.promptRu });
}

function hasSection(estimate: GlobalEstimateResult, types: string[]): boolean {
  return estimate.sections.some((section) => types.includes(section.type) && section.rows.length > 0);
}

function validateSourceEvidence(
  failures: AiEstimateCoreValidationFailure[],
  testCase: UnfinishedAiEstimateCase,
  estimate: GlobalEstimateResult,
  route: string,
): void {
  const sourceIds = new Set(estimate.sources.map((source) => source.id));
  for (const row of allRows(estimate)) {
    if (row.priceStatus !== "priced") continue;
    if (!row.sourceId) {
      addFailure(failures, testCase, "PRICE_WITHOUT_SOURCE_ID", `Priced row has no sourceId: ${row.name}`, route);
    }
    if (row.sourceId && !sourceIds.has(row.sourceId)) {
      addFailure(failures, testCase, "SOURCE_ID_NOT_RESOLVED", `sourceId does not resolve to estimate.sources: ${row.sourceId}`, route);
    }
    if (row.unitPrice == null || Number.isNaN(row.unitPrice)) {
      addFailure(failures, testCase, "PRICE_INVALID", `Priced row has invalid unitPrice: ${row.name}`, route);
    }
    if (!row.sourceEvidence.some((evidence) => evidence.sourceId && evidence.label && evidence.checkedAt && evidence.confidence)) {
      addFailure(failures, testCase, "SOURCE_EVIDENCE_MISSING", `Priced row lacks complete source evidence: ${row.name}`, route);
    }
  }
}

function validateTax(
  failures: AiEstimateCoreValidationFailure[],
  testCase: UnfinishedAiEstimateCase,
  estimate: GlobalEstimateResult,
  route: string,
): void {
  const hasTaxStatus = Boolean(estimate.tax.taxLabel || estimate.tax.taxType);
  const hasWarning = Boolean(estimate.tax.warning || estimate.locale.addressPrecision === "unknown");
  if (!hasTaxStatus && !hasWarning) {
    addFailure(failures, testCase, "TAX_RULE_OR_WARNING_MISSING", "Tax status is missing without a location warning", route);
  }
  if (estimate.tax.taxType === "unknown" && !hasWarning) {
    addFailure(failures, testCase, "UNKNOWN_TAX_WITHOUT_WARNING", "Unknown tax type must be surfaced as warning", route);
  }
}

export function validateAiEstimateCoreAnswer(params: {
  testCase: UnfinishedAiEstimateCase;
  answer: BuiltInAiAnswer;
  route: "chat" | "ai_foreman" | "request";
}): AiEstimateCoreValidationResult {
  const { answer, testCase, route } = params;
  const failures: AiEstimateCoreValidationFailure[] = [];
  const estimate = answer.toolResult.estimate;

  if (answer.route.intent !== testCase.expectedIntent) {
    addFailure(failures, testCase, "INTENT_MISMATCH", `Expected ${testCase.expectedIntent}, got ${answer.route.intent}`, route);
  }
  if (answer.toolResult.toolName !== testCase.expectedTool) {
    addFailure(failures, testCase, "TOOL_MISMATCH", `Expected ${testCase.expectedTool}, got ${answer.toolResult.toolName ?? "none"}`, route);
  }
  if (!answer.toolResult.backendCalled || answer.runtimeTrace.backendCalled !== true) {
    addFailure(failures, testCase, "BACKEND_NOT_CALLED", "calculate_global_estimate did not mark backendCalled", route);
  }
  if (answer.runtimeTrace.selectedTool !== testCase.expectedTool) {
    addFailure(failures, testCase, "RUNTIME_TRACE_TOOL_MISSING", `Runtime trace selectedTool is ${answer.runtimeTrace.selectedTool ?? "none"}`, route);
  }
  if (!estimate) {
    addFailure(failures, testCase, "GLOBAL_ESTIMATE_RESULT_MISSING", "GlobalEstimateResult is missing", route);
    return { passed: false, failures };
  }

  if (estimate.work.workKey !== testCase.expectedWorkKey) {
    addFailure(failures, testCase, "WORK_KEY_MISMATCH", `Expected ${testCase.expectedWorkKey}, got ${estimate.work.workKey}`, route);
  }
  if (!hasSection(estimate, ["materials"])) {
    addFailure(failures, testCase, "MATERIALS_SECTION_MISSING", "Materials section is missing", route);
  }
  if (!hasSection(estimate, ["labor", "equipment", "delivery"])) {
    addFailure(failures, testCase, "LABOR_OR_EQUIPMENT_SECTION_MISSING", "Labor/equipment section is missing", route);
  }
  if (!estimate.totals || estimate.totals.grandTotal == null || Number.isNaN(estimate.totals.grandTotal)) {
    addFailure(failures, testCase, "TOTALS_MISSING", "Totals are missing or invalid", route);
  }
  for (const row of allRows(estimate)) {
    if (!row.name || !row.quantity || !row.unit || !row.displayQuantity) {
      addFailure(failures, testCase, "ROW_QUANTITY_MISSING", `Row quantity/unit is missing: ${row.name}`, route);
    }
  }

  const rowText = lower(allRows(estimate).map((row) => row.name).join("\n"));
  for (const token of testCase.expectedRowsContain) {
    if (!rowText.includes(lower(token))) {
      addFailure(failures, testCase, "EXPECTED_ROW_MISSING", `Expected row token is missing: ${token}`, route);
    }
  }
  for (const row of allRows(estimate)) {
    const normalizedName = lower(row.name.trim());
    for (const forbidden of [...testCase.forbiddenRowsContain, ...FALLBACK_PHRASES]) {
      if (normalizedName === lower(forbidden) || normalizedName.includes(lower(forbidden))) {
        addFailure(failures, testCase, "GENERIC_CONSTRUCTION_ROW_FOUND", `Forbidden fallback row found: ${row.name}`, route);
      }
    }
  }

  if (/не найдено|not found/i.test(answer.answerTextRu) && testCase.expectedIntent === "estimate") {
    addFailure(failures, testCase, "KNOWN_WORK_NOT_FOUND_RESPONSE", "Known estimate prompt returned not-found language", route);
  }
  if (testCase.requiresPdfAction && !answer.actions.some((action) => action.id === "make_pdf" && action.visible)) {
    addFailure(failures, testCase, "PDF_ACTION_MISSING", "Сделать PDF action is missing", route);
  }
  if (!answer.actions.some((action) => action.id === "save_estimate" && action.visible)) {
    addFailure(failures, testCase, "SAVE_ACTION_MISSING", "Save estimate action is missing", route);
  }
  if (!answer.actions.some((action) => action.id === "create_request" && action.visible)) {
    addFailure(failures, testCase, "CREATE_REQUEST_ACTION_MISSING", "Create request action is missing", route);
  }
  if (testCase.requiresSourceEvidence) {
    validateSourceEvidence(failures, testCase, estimate, route);
  }
  if (testCase.requiresTaxStatusOrWarning) {
    validateTax(failures, testCase, estimate, route);
  }
  if (!estimate.assumptions.length) {
    addFailure(failures, testCase, "ASSUMPTIONS_MISSING", "Assumptions are missing", route);
  }
  if (!estimate.costIncreaseFactors.length) {
    addFailure(failures, testCase, "COST_FACTORS_MISSING", "Cost increase factors are missing", route);
  }
  if (!estimate.clarifyingQuestions.length) {
    addFailure(failures, testCase, "CLARIFYING_QUESTIONS_MISSING", "Clarifying questions are missing", route);
  }
  if (testCase.dangerousWorkSafetyRequired && !estimate.requiresReview) {
    addFailure(failures, testCase, "DANGEROUS_WORK_REVIEW_MISSING", "Dangerous work must require review and must not provide DIY flow", route);
  }
  if (estimate.locale.language !== "ru") {
    addFailure(failures, testCase, "LANGUAGE_NOT_PRESERVED", `Expected ru, got ${estimate.locale.language}`, route);
  }

  return { passed: failures.length === 0, failures };
}
