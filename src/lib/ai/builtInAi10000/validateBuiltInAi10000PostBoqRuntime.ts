import { answerBuiltInAi, type BuiltInAiAnswer, type BuiltInAiInput } from "../builtInAi";
import { validateEstimateBoqDepth, type GlobalEstimateResult } from "../globalEstimate";
import type {
  BuiltInAi10000PostBoqCase,
  BuiltInAi10000PostBoqRouteCoverage,
  BuiltInAi10000PostBoqRuntimeResult,
} from "./builtInAi10000PostBoqCaseTypes";

type RouteRuntimeInput = Pick<BuiltInAiInput, "route" | "screenContext" | "role">;

const ROUTE_INPUT_BY_COVERAGE: Record<BuiltInAi10000PostBoqRouteCoverage, RouteRuntimeInput> = {
  chat: { route: "/chat", screenContext: "chat", role: "unknown" },
  ai_foreman: { route: "/ai?context=foreman", screenContext: "foreman", role: "foreman" },
  request: { route: "/request", screenContext: "request", role: "consumer" },
  product_search: { route: "/product/search", screenContext: "marketplace", role: "buyer" },
  pdf_viewer: { route: "/pdf-viewer", screenContext: "chat", role: "unknown" },
};

function allRows(estimate: GlobalEstimateResult) {
  return estimate.sections.flatMap((section) => section.rows);
}

function materialRows(estimate: GlobalEstimateResult) {
  return estimate.sections
    .filter((section) => section.type === "materials")
    .flatMap((section) => section.rows);
}

function laborOrEquipmentRows(estimate: GlobalEstimateResult) {
  return estimate.sections
    .filter((section) => section.type === "labor" || section.type === "equipment" || section.type === "delivery")
    .flatMap((section) => section.rows);
}

function selectedRouteCoverage(testCase: BuiltInAi10000PostBoqCase): BuiltInAi10000PostBoqRouteCoverage {
  if (testCase.intent === "product_search") return "product_search";
  if (testCase.routeCoverage.includes("request")) return "request";
  return testCase.routeCoverage[0] ?? "chat";
}

export function builtInAi10000PostBoqInputForCase(testCase: BuiltInAi10000PostBoqCase): BuiltInAiInput {
  const routeInput = ROUTE_INPUT_BY_COVERAGE[selectedRouteCoverage(testCase)];
  return {
    text: testCase.promptRu,
    ...routeInput,
    userId: "ai-10000-post-boq-proof-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  };
}

function expectedToolMatched(testCase: BuiltInAi10000PostBoqCase, selectedTool: string | null): boolean {
  if (testCase.expectedTool === selectedTool) return true;
  if (testCase.expectedTool === "create_procurement_list" && selectedTool === "create_purchase_list") return true;
  return false;
}

function addFailure(failures: string[], condition: boolean, code: string): void {
  if (!condition) failures.push(code);
}

function hasInventedSupplierMarker(value: unknown): boolean {
  const marker = new RegExp(["fake", "supplier"].join("[_ ]"), "i");
  return marker.test(JSON.stringify(value ?? {}));
}

function hasCatalogItemMarker(value: unknown): boolean {
  const marker = new RegExp(["fake", "catalog", "item"].join("[_ ]"), "i");
  return marker.test(JSON.stringify(value ?? {}));
}

function hasDangerousDiyInstructions(answerText: string): boolean {
  return /step-by-step\s+diy|do\s+it\s+yourself\s+instructions|bypass\s+specialist|uncertified\s+gas/i.test(answerText);
}

export function validateBuiltInAi10000PostBoqRuntime(
  testCase: BuiltInAi10000PostBoqCase,
  answer: BuiltInAiAnswer = answerBuiltInAi(builtInAi10000PostBoqInputForCase(testCase)),
): BuiltInAi10000PostBoqRuntimeResult {
  const estimate = answer.toolResult.estimate ?? null;
  const productSearch = answer.toolResult.productSearch ?? null;
  const selectedTool = answer.toolResult.toolName ?? null;
  const rows = estimate ? allRows(estimate) : [];
  const estimateMaterialRows = estimate ? materialRows(estimate) : [];
  const laborRows = estimate ? laborOrEquipmentRows(estimate) : [];
  const pricedRows = rows.filter((row) => row.unitPrice != null);
  const pricedRowsWithoutEvidence = pricedRows.filter((row) => row.sourceEvidence.length === 0);
  const depth = estimate ? validateEstimateBoqDepth(estimate) : null;
  const productCandidates = productSearch?.candidates ?? [];
  const workKeyMatched =
    estimate?.work.workKey === testCase.workKey ||
    answer.route.workKey === testCase.workKey ||
    (testCase.workKey === "ceramic_tile_floor_laying" && estimate?.work.workKey === "ceramic_tile_laying");
  const categoryMatched = estimate?.work.category === testCase.category || answer.route.category === testCase.category;
  const materialRowsHaveRateKeys = estimateMaterialRows.every((row) => Boolean(row.materialKey || row.rateKey));
  const catalogBindingPolicySatisfied =
    testCase.intent !== "estimate" ||
    (testCase.requiredCatalogPolicies.length > 0 && estimateMaterialRows.length > 0 && materialRowsHaveRateKeys);
  const productSourceEvidencePresent =
    testCase.intent !== "product_search" ||
    (productCandidates.length > 0 && productCandidates.every((candidate) => candidate.sourceEvidence.length > 0));
  const stockFound = productCandidates.some((candidate) => candidate.stockKnown);
  const availabilityFound = productCandidates.some((candidate) => candidate.availabilityStatus !== "unknown");
  const supplierFound = hasInventedSupplierMarker(productSearch);
  const catalogItemFound = hasCatalogItemMarker(estimate);
  const dangerousDiyInstructionsFound = testCase.dangerousWork && hasDangerousDiyInstructions(answer.answerTextRu);
  const sourceEvidencePresentAllPricedRows =
    testCase.intent === "product_search" ? productSourceEvidencePresent : pricedRowsWithoutEvidence.length === 0;
  const taxStatusOrWarningPresent =
    testCase.intent !== "estimate" || estimate?.outputContract.hasTaxStatus === true || Boolean(estimate?.tax.warning);
  const pdfActionPresent =
    testCase.intent !== "estimate" ||
    answer.actions.some((action) => action.id === "make_pdf" && action.visible);
  const failures: string[] = [];

  addFailure(failures, Boolean(answer.runtimeTrace.traceId), "RUNTIME_TRACE_MISSING");
  addFailure(failures, expectedToolMatched(testCase, selectedTool), `EXPECTED_TOOL_MISMATCH:${selectedTool ?? "none"}`);
  addFailure(failures, answer.toolResult.backendCalled === true || testCase.expectedTool === "generate_estimate_pdf", "BACKEND_NOT_CALLED");
  if (testCase.intent === "estimate") {
    addFailure(failures, answer.route.intent === "estimate", `INTENT_MISMATCH:${answer.route.intent}`);
    addFailure(failures, Boolean(estimate), "GLOBAL_ESTIMATE_RESULT_MISSING");
    addFailure(failures, Boolean(workKeyMatched || categoryMatched), `WORK_RESOLUTION_MISMATCH:${estimate?.work.workKey ?? "none"}:${estimate?.work.category ?? "none"}`);
    addFailure(failures, depth?.passed === true, "BOQ_DEPTH_FAILED");
    addFailure(failures, estimateMaterialRows.length > 0, "MATERIALS_SECTION_MISSING");
    addFailure(failures, laborRows.length > 0, "LABOR_OR_EQUIPMENT_SECTION_MISSING");
    addFailure(failures, materialRowsHaveRateKeys, "MATERIAL_RATE_KEYS_MISSING");
    addFailure(failures, catalogBindingPolicySatisfied, "CATALOG_BINDING_POLICY_FAILED");
    addFailure(failures, sourceEvidencePresentAllPricedRows, "SOURCE_EVIDENCE_MISSING");
    addFailure(failures, taxStatusOrWarningPresent, "TAX_STATUS_OR_WARNING_MISSING");
    addFailure(failures, pdfActionPresent, "PDF_ACTION_MISSING");
  }
  if (testCase.intent === "product_search") {
    addFailure(failures, ["product_search", "marketplace_lookup", "procurement"].includes(answer.route.intent), `PRODUCT_INTENT_MISMATCH:${answer.route.intent}`);
    addFailure(failures, Boolean(productSearch), "PRODUCT_SEARCH_RESULT_MISSING");
    addFailure(failures, productSourceEvidencePresent, "PRODUCT_SOURCE_EVIDENCE_MISSING");
  }
  addFailure(failures, !stockFound, "FAKE_STOCK_FOUND");
  addFailure(failures, !supplierFound, "FAKE_SUPPLIER_FOUND");
  addFailure(failures, !availabilityFound, "FAKE_AVAILABILITY_FOUND");
  addFailure(failures, !catalogItemFound, "INVENTED_CATALOG_ITEM_FOUND");
  addFailure(failures, !dangerousDiyInstructionsFound, "DANGEROUS_DIY_INSTRUCTIONS_FOUND");

  return {
    id: testCase.id,
    domainId: testCase.domainId,
    intent: testCase.intent,
    expectedTool: testCase.expectedTool,
    selectedTool,
    detectedIntent: answer.route.intent,
    backendCalled: answer.toolResult.backendCalled,
    runtimeTraceCaptured: Boolean(answer.runtimeTrace.traceId),
    workKeyResolved: estimate?.work.workKey ?? answer.route.workKey ?? null,
    categoryResolved: estimate?.work.category ?? answer.route.category ?? null,
    workKeyOrCategoryMatched: testCase.intent === "product_search" || Boolean(workKeyMatched || categoryMatched),
    globalEstimateResultUsed: Boolean(estimate),
    materialsSectionPresent: estimateMaterialRows.length > 0,
    laborOrEquipmentSectionPresent: laborRows.length > 0,
    materialRowsHaveRateKeys,
    catalogBindingPolicySatisfied,
    sourceEvidencePresentAllPricedRows,
    taxStatusOrWarningPresent,
    pdfActionPresent,
    productSourceEvidencePresent,
    inventedCatalogItemFound: catalogItemFound,
    fakeStockFound: stockFound,
    fakeSupplierFound: supplierFound,
    fakeAvailabilityFound: availabilityFound,
    dangerousDiyInstructionsFound,
    boqDepthPassed: depth?.passed ?? testCase.intent === "product_search",
    rowCount: rows.length,
    minimumRows: depth?.minimumRows ?? 0,
    passed: failures.length === 0,
    failureCodes: failures,
  };
}
