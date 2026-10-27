import type { BuiltInAiAnswer } from "../builtInAi";
import type { BuiltInAi50000Phase1Case, BuiltInAi50000RuntimeCaseResult } from "./builtInAi50000CaseTypes";

function failureCodesFor(testCase: BuiltInAi50000Phase1Case, answer: BuiltInAiAnswer): string[] {
  const failures: string[] = [];
  const estimate = answer.toolResult.estimate;
  const productSearch = answer.toolResult.productSearch;
  const rows = estimate?.sections.flatMap((section) => section.rows) ?? [];
  const materialRows = estimate?.sections.filter((section) => section.type === "materials").flatMap((section) => section.rows) ?? [];
  const laborRows = estimate?.sections.filter((section) => section.type === "labor" || section.type === "equipment").flatMap((section) => section.rows) ?? [];
  const pricedRows = rows.filter((row) => row.unitPrice != null);
  const pricedRowsWithoutEvidence = pricedRows.filter((row) => row.sourceEvidence.length === 0);
  const candidates = productSearch?.candidates ?? [];
  const selectedTool = answer.toolResult.toolName ?? null;
  const workKeyMatched =
    estimate?.work.workKey === testCase.workKey ||
    (testCase.workKey === "ceramic_tile_floor_laying" && estimate?.work.workKey === "ceramic_tile_laying");

  if (!answer.runtimeTrace.traceId) failures.push("RUNTIME_TRACE_MISSING");
  if (selectedTool !== testCase.expectedTool) failures.push(`EXPECTED_TOOL_MISMATCH:${selectedTool ?? "none"}`);
  if (answer.toolResult.backendCalled !== true) failures.push("BACKEND_NOT_CALLED");

  if (testCase.intent === "estimate") {
    if (answer.route.intent !== "estimate") failures.push(`INTENT_MISMATCH:${answer.route.intent}`);
    if (!estimate) failures.push("GLOBAL_ESTIMATE_RESULT_MISSING");
    if (estimate && !workKeyMatched && estimate.work.category !== testCase.category) {
      failures.push(`WORK_RESOLUTION_MISMATCH:${estimate.work.workKey}:${estimate.work.category}`);
    }
    if (materialRows.length === 0) failures.push("MATERIALS_SECTION_MISSING");
    if (laborRows.length === 0) failures.push("LABOR_OR_EQUIPMENT_SECTION_MISSING");
    if (!rows.every((row) => row.quantity > 0 && row.displayQuantity.length > 0)) failures.push("QUANTITIES_MISSING");
    if (typeof estimate?.totals.grandTotal !== "number") failures.push("TOTALS_MISSING");
    if (pricedRowsWithoutEvidence.length > 0) failures.push("SOURCE_EVIDENCE_MISSING");
    if (estimate?.outputContract.hasTaxStatus !== true) failures.push("TAX_STATUS_MISSING");
    if ((estimate?.costIncreaseFactors.length ?? 0) === 0) failures.push("COST_FACTORS_MISSING");
    if ((estimate?.clarifyingQuestions.length ?? 0) === 0) failures.push("CLARIFYING_QUESTIONS_MISSING");
    if (!answer.actions.some((action) => action.id === "make_pdf" && action.visible)) failures.push("PDF_ACTION_MISSING");
    if (testCase.dangerousWork && /step-by-step\s+diy|do\s+it\s+yourself\s+instructions/i.test(answer.answerTextRu)) {
      failures.push("DANGEROUS_DIY_INSTRUCTIONS_FOUND");
    }
  }

  if (testCase.intent === "product_search") {
    if (!["product_search", "marketplace_lookup", "procurement"].includes(answer.route.intent)) failures.push(`PRODUCT_INTENT_MISMATCH:${answer.route.intent}`);
    if (!productSearch) failures.push("PRODUCT_SEARCH_RESULT_MISSING");
    if (candidates.length === 0) failures.push("PRODUCT_CANDIDATES_MISSING");
    if (!candidates.every((candidate) => candidate.sourceEvidence.length > 0)) failures.push("PRODUCT_SOURCE_EVIDENCE_MISSING");
    if (candidates.some((candidate) => candidate.stockKnown)) failures.push("FAKE_STOCK_FOUND");
    if (candidates.some((candidate) => candidate.availabilityStatus !== "unknown")) failures.push("FAKE_AVAILABILITY_FOUND");
  }

  if (/generic_construction_work_row|plain_text_dump|markdown_table/i.test(answer.answerTextRu)) {
    failures.push("FORBIDDEN_FALLBACK_ROW_FOUND");
  }

  return failures;
}

export function validateBuiltInAi50000RuntimeResult(
  testCase: BuiltInAi50000Phase1Case,
  answer: BuiltInAiAnswer,
): BuiltInAi50000RuntimeCaseResult {
  const estimate = answer.toolResult.estimate;
  const productSearch = answer.toolResult.productSearch;
  const rows = estimate?.sections.flatMap((section) => section.rows) ?? [];
  const materialRows = estimate?.sections.filter((section) => section.type === "materials").flatMap((section) => section.rows) ?? [];
  const laborRows = estimate?.sections.filter((section) => section.type === "labor" || section.type === "equipment").flatMap((section) => section.rows) ?? [];
  const pricedRows = rows.filter((row) => row.unitPrice != null);
  const pricedRowsWithoutEvidence = pricedRows.filter((row) => row.sourceEvidence.length === 0);
  const candidates = productSearch?.candidates ?? [];
  const failureCodes = failureCodesFor(testCase, answer);
  const workKeyMatched =
    estimate?.work.workKey === testCase.workKey ||
    (testCase.workKey === "ceramic_tile_floor_laying" && estimate?.work.workKey === "ceramic_tile_laying");
  return {
    id: testCase.id,
    shardId: testCase.shardId,
    macroDomainId: testCase.macroDomainId,
    intent: testCase.intent,
    expectedTool: testCase.expectedTool,
    selectedTool: answer.toolResult.toolName ?? null,
    detectedIntent: answer.route.intent,
    backendCalled: answer.toolResult.backendCalled,
    runtimeTraceCaptured: Boolean(answer.runtimeTrace.traceId),
    workKeyResolved: estimate?.work.workKey ?? answer.route.workKey ?? null,
    categoryResolved: estimate?.work.category ?? answer.route.category ?? null,
    workKeyOrCategoryMatched: Boolean(estimate && (workKeyMatched || estimate.work.category === testCase.category)),
    globalEstimateResultUsed: Boolean(estimate),
    materialsSectionPresent: materialRows.length > 0,
    laborOrEquipmentSectionPresent: laborRows.length > 0,
    quantitiesPresent: rows.every((row) => row.quantity > 0 && row.displayQuantity.length > 0),
    totalsPresent: typeof estimate?.totals.grandTotal === "number",
    sourceEvidencePresentAllPricedRows: pricedRowsWithoutEvidence.length === 0,
    costFactorsPresent: (estimate?.costIncreaseFactors.length ?? 0) > 0,
    clarifyingQuestionsPresent: (estimate?.clarifyingQuestions.length ?? 0) > 0,
    taxStatusOrWarningPresent: estimate?.outputContract.hasTaxStatus === true,
    pdfActionPresent: answer.actions.some((action) => action.id === "make_pdf" && action.visible),
    productSourceEvidencePresent: candidates.length > 0 && candidates.every((candidate) => candidate.sourceEvidence.length > 0),
    fakeStockFound: candidates.some((candidate) => candidate.stockKnown),
    fakeSupplierFound: false,
    fakeAvailabilityFound: candidates.some((candidate) => candidate.availabilityStatus !== "unknown"),
    forbiddenFallbackRowsFound: failureCodes.includes("FORBIDDEN_FALLBACK_ROW_FOUND"),
    dangerousDiyInstructionsFound: failureCodes.includes("DANGEROUS_DIY_INSTRUCTIONS_FOUND"),
    passed: failureCodes.length === 0,
    failureCodes,
  };
}
