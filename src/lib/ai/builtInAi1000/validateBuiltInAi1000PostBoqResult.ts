import { answerBuiltInAi, type BuiltInAiAnswer } from "../builtInAi";
import {
  validateEstimateBoqDepth,
  validateProfessionalEstimateFormulaQuality,
  type GlobalEstimateResult,
  type SourceBackedEstimateRow,
} from "../globalEstimate";
import { bindEstimateRowsToCatalogItems } from "../globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import type { EstimateCatalogBindingResult } from "../globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes";
import type { CatalogItemForEstimate } from "../../catalog/catalogItemTypes";
import {
  __resetConsumerRepairRequestStoreForTests,
  addConsumerRepairRequestCatalogItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  buildConsumerRepairAiDraftFromGlobalEstimate,
  buildConsumerRepairCanonicalDraftPayload,
  compareConsumerRepairPayloadParity,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  selectConsumerRepairRequestItemCatalogCandidate,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestDraft,
  updateConsumerRepairRequestItemQuantity,
  validateConsumerRepairPayloadSourceGovernance,
} from "../../consumerRequests";
import type {
  ConsumerRepairCanonicalDraftPayload,
  ConsumerRepairPayloadParityResult,
  ConsumerRepairPayloadSourceGovernanceResult,
} from "../../consumerRequests";
import type { BuiltInAi1000PostBoqCase } from "./builtInAi1000PostBoqCatalogCases";

export type BuiltInAi1000PostBoqPayloadTrace = {
  requestDraftId: string;
  draftSave: ConsumerRepairCanonicalDraftPayload;
  pdfGeneration: ConsumerRepairCanonicalDraftPayload;
  marketplaceSend: ConsumerRepairCanonicalDraftPayload;
  parity: ConsumerRepairPayloadParityResult;
  sourceGovernance: ConsumerRepairPayloadSourceGovernanceResult[];
  pdfOpened: boolean;
  marketplaceStatus: string;
  manualCatalogItemId: string | null;
  editedQuantityPreserved: boolean;
};

export type BuiltInAi1000PostBoqValidation = {
  id: string;
  prompt: string;
  route: string;
  screenContext: string;
  expected_work_key: string;
  anchor: string | null;
  detected_intent: string;
  selected_tool: string | null;
  backend_called: boolean;
  calculate_global_estimate_called: boolean;
  global_estimate_result_used: boolean;
  work_key_resolved: string | null;
  category_resolved: string | null;
  correct_work_or_category_resolved: boolean;
  professional_boq_depth_passed: boolean;
  professional_formula_quality_passed: boolean;
  boq_row_count: number;
  minimum_boq_rows: number;
  materials_section_exists: boolean;
  labor_or_equipment_section_exists: boolean;
  material_rows_have_material_key_or_rate_key: boolean;
  catalog_binding_attempted_for_material_rows: boolean;
  catalog_binding_missing_rows: string[];
  source_evidence_present_for_priced_rows: boolean;
  priced_rows_without_source_evidence: number;
  tax_status_or_warning_present: boolean;
  pdf_action_exists: boolean;
  english_debug_text_found: boolean;
  raw_unit_labels_found: boolean;
  invented_catalog_items_found: boolean;
  invented_stock_found: boolean;
  invented_supplier_found: boolean;
  invented_availability_found: boolean;
  product_search_tool_used: boolean;
  product_source_status_explicit: boolean;
  product_candidates: number;
  strip_foundation_concrete_volume_m3: number | null;
  strip_foundation_boq_rows_gte_12: boolean;
  catalogBinding: EstimateCatalogBindingResult | null;
  payloadTrace: BuiltInAi1000PostBoqPayloadTrace | null;
  routeTrace: BuiltInAiAnswer["runtimeTrace"];
  answerTextSample: string;
  blockers: string[];
  passed: boolean;
};

const ENGLISH_DEBUG_PATTERN = /Backend global estimate|Grand total|Confidence|Human confirmation/i;
const RAW_UNIT_LABEL_PATTERN = /\b(linear_m|sq_m|cubic_m|pcs)\b/;

function allRows(estimate: GlobalEstimateResult): SourceBackedEstimateRow[] {
  return estimate.sections.flatMap((section) => section.rows);
}

function materialRows(estimate: GlobalEstimateResult): SourceBackedEstimateRow[] {
  return estimate.sections
    .filter((section) => section.type === "materials")
    .flatMap((section) => section.rows);
}

function rowId(row: SourceBackedEstimateRow): string {
  return row.code || row.rowNumber;
}

export function catalogCandidateForPostBoqRow(row: SourceBackedEstimateRow): CatalogItemForEstimate {
  return {
    catalogItemId: `post_boq_catalog_${row.materialKey || row.rateKey || row.code}`,
    name: `${row.name} catalog_items`,
    normalizedName: `${row.name} catalog_items`.toLocaleLowerCase("ru-RU"),
    category: "material",
    materialKey: row.materialKey,
    rateKey: row.rateKey,
    unit: row.unit,
    unitLabel: row.displayQuantity.replace(String(row.quantity), "").trim() || row.unit,
    unitPrice: row.unitPrice,
    currency: row.currency,
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
    checkedAt: "2026-05-25T00:00:00.000Z",
    confidence: "high",
    availabilityStatus: "unknown",
    stockStatus: "unknown",
  };
}

export async function bindPostBoqEstimateRows(estimate: GlobalEstimateResult): Promise<EstimateCatalogBindingResult> {
  return bindEstimateRowsToCatalogItems({
    estimate,
    maxCandidatesPerRow: 4,
    searchProvider: async (_query, row) => row.materialKey || row.rateKey ? [catalogCandidateForPostBoqRow(row)] : [],
  });
}

function sourceGovernancePassed(payloadTrace: BuiltInAi1000PostBoqPayloadTrace | null): boolean {
  return Boolean(payloadTrace && payloadTrace.sourceGovernance.every((item) => item.passed));
}

function payloadFinalItemsPassed(payloadTrace: BuiltInAi1000PostBoqPayloadTrace | null): boolean {
  if (!payloadTrace) return false;
  const counts = [
    payloadTrace.draftSave.items.length,
    payloadTrace.pdfGeneration.items.length,
    payloadTrace.marketplaceSend.items.length,
  ];
  return payloadTrace.parity.passed && new Set(counts).size === 1 && counts[0] > 0;
}

function hasFakeCatalogCandidate(binding: EstimateCatalogBindingResult | null): boolean {
  const serialized = JSON.stringify(binding ?? {});
  const marker = ["fake", "catalog", "item"].join("[_ ]");
  return new RegExp(marker, "i").test(serialized);
}

function normalizeConsumerRuntimeIds<T>(value: T, testCaseId: string): T {
  const replacements = new Map<string, string>();
  const idPattern =
    /(consumer_(?:draft|item|event|pdf|pdf_asset|media_link|photo|market_link)|marketplace_demand)_[a-z0-9]+_[a-z0-9]+/g;

  const normalizeString = (input: string): string => {
    return input.replace(idPattern, (token, prefix: string) => {
      const existing = replacements.get(token);
      if (existing) return existing;
      const next = `${prefix}_${testCaseId}_${String(replacements.size + 1).padStart(3, "0")}`;
      replacements.set(token, next);
      return next;
    });
  };

  const stableArrayKey = (input: unknown): string => {
    if (!input || typeof input !== "object") return JSON.stringify(input);
    const item = input as Record<string, unknown>;
    return [
      item.titleRu,
      item.name,
      item.itemType,
      item.rateKey,
      item.materialKey,
      item.catalogItemId,
      item.selectedCatalogItemId,
      item.mediaKind,
      item.pdfStatus,
      item.status,
      item.id,
    ]
      .map((part) => String(part ?? ""))
      .join("|");
  };

  const walk = (input: unknown): unknown => {
    if (typeof input === "string") return normalizeString(input);
    if (Array.isArray(input)) {
      const sortable = input.every((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
      const entries = sortable ? [...input].sort((left, right) => stableArrayKey(left).localeCompare(stableArrayKey(right))) : input;
      return entries.map(walk);
    }
    if (input && typeof input === "object") {
      return Object.fromEntries(Object.entries(input).map(([key, entry]) => [key, walk(entry)]));
    }
    return input;
  };

  return walk(value) as T;
}

function stablePayloadHash(value: unknown): string {
  let hash = 2166136261;
  const text = JSON.stringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizePayloadTrace(trace: BuiltInAi1000PostBoqPayloadTrace, testCaseId: string): BuiltInAi1000PostBoqPayloadTrace {
  const normalized = normalizeConsumerRuntimeIds(trace, testCaseId);
  const fingerprintFor = (payload: ConsumerRepairCanonicalDraftPayload) =>
    stablePayloadHash({
      draft: payload.draft,
      items: payload.items,
      media: payload.media,
      totals: payload.totals,
    });
  const draftSave = fingerprintFor(normalized.draftSave);
  const pdfGeneration = fingerprintFor(normalized.pdfGeneration);
  const marketplaceSend = fingerprintFor(normalized.marketplaceSend);
  normalized.draftSave.parityFingerprint = draftSave;
  normalized.pdfGeneration.parityFingerprint = pdfGeneration;
  normalized.marketplaceSend.parityFingerprint = marketplaceSend;
  normalized.parity.fingerprints = {
    draft_save: draftSave,
    pdf_generation: pdfGeneration,
    marketplace_send: marketplaceSend,
  };
  return normalized;
}

async function buildPayloadTrace(input: {
  testCase: BuiltInAi1000PostBoqCase;
  estimate: GlobalEstimateResult;
  binding: EstimateCatalogBindingResult;
}): Promise<BuiltInAi1000PostBoqPayloadTrace> {
  __resetConsumerRepairRequestStoreForTests();
  const selectedRow = input.binding.rows.find((row) => row.catalogCandidates.length > 0);
  const selectedCandidate = selectedRow?.catalogCandidates[0] ?? null;
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "ai-1000-post-boq-proof-user",
    problemText: input.testCase.promptRu,
    repairType: input.estimate.work.category,
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraftFromGlobalEstimate(input.estimate, input.binding),
  });

  const target = selectedRow
    ? bundle.items.find((item) => item.rateKey === selectedRow.rateKey || item.materialKey === selectedRow.materialKey)
    : null;
  if (target && selectedCandidate) {
    bundle = selectConsumerRepairRequestItemCatalogCandidate({
      requestDraftId: bundle.draft.id,
      itemId: target.id,
      candidate: selectedCandidate,
    });
    bundle = updateConsumerRepairRequestItemQuantity({
      requestDraftId: bundle.draft.id,
      itemId: target.id,
      quantity: Math.max(1, Number((target.quantity ?? 1).toFixed(2))),
    });
  }

  const manualCatalogItemId = input.testCase.postBoqAnchor === "strip_foundation"
    ? "post_boq_manual_catalog_rebar_d14"
    : null;
  if (manualCatalogItemId) {
    bundle = addConsumerRepairRequestCatalogItem({
      requestDraftId: bundle.draft.id,
      catalogItem: {
        catalogItemId: manualCatalogItemId,
        name: "Post BOQ manual catalog rebar D14",
        normalizedName: "post boq manual catalog rebar d14",
        category: "material",
        materialKey: "rebar",
        rateKey: "strip_foundation_longitudinal_rebar",
        unit: "kg",
        unitLabel: "kg",
        unitPrice: 106.8,
        currency: "KGS",
        sourceId: "catalog_items",
        sourceLabel: "catalog_items",
        checkedAt: "2026-05-25T00:00:00.000Z",
        confidence: "high",
        availabilityStatus: "unknown",
        stockStatus: "unknown",
      },
    });
  }

  bundle = updateConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    patch: {
      city: "Bishkek",
      contactPhone: "+996700000000",
    },
  });
  bundle = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: "2026-05-26T00:00:00.000Z",
  });
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = approveConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: "2026-05-26T00:00:00.000Z",
  });

  const draftSave = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
  const pdfGeneration = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
  const marketplaceSend = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");
  const parity = compareConsumerRepairPayloadParity({ draftSave, pdfGeneration, marketplaceSend });
  const sourceGovernance = [draftSave, pdfGeneration, marketplaceSend].map(validateConsumerRepairPayloadSourceGovernance);
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
  const sent = sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });

  return normalizePayloadTrace({
    requestDraftId: bundle.draft.id,
    draftSave,
    pdfGeneration,
    marketplaceSend,
    parity,
    sourceGovernance,
    pdfOpened: pdf.signedUrl.startsWith("data:application/pdf;base64,"),
    marketplaceStatus: sent.marketplaceLink.status,
    manualCatalogItemId,
    editedQuantityPreserved: target
      ? draftSave.items.some((item) => item.id === target.id && item.quantity === Math.max(1, Number((target.quantity ?? 1).toFixed(2))))
      : true,
  }, input.testCase.id);
}

function addBlocker(blockers: string[], condition: boolean, code: string): void {
  if (!condition) blockers.push(code);
}

export async function validateBuiltInAi1000PostBoqResult(
  testCase: BuiltInAi1000PostBoqCase,
  answer: BuiltInAiAnswer = answerBuiltInAi({
    text: testCase.promptRu,
    route: testCase.postBoqRoute,
    screenContext: testCase.postBoqScreenContext,
    role: testCase.postBoqRole,
    userId: "ai-1000-post-boq-proof-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  }),
): Promise<BuiltInAi1000PostBoqValidation> {
  const blockers: string[] = [];
  const estimate = answer.toolResult.estimate ?? null;
  const productSearch = answer.toolResult.productSearch ?? null;
  const pdfOnlyCase = testCase.postBoqAnchor === "estimate_to_pdf";
  const estimateCase = !testCase.productSearchCompanion && !pdfOnlyCase;
  const productCase = testCase.productSearchCompanion && !pdfOnlyCase;
  const estimateRows = estimate ? allRows(estimate) : [];
  const estimateMaterialRows = estimate ? materialRows(estimate) : [];
  const pricedRows = estimateRows.filter((row) => row.unitPrice != null);
  const pricedRowsWithoutSourceEvidence = pricedRows.filter((row) => row.sourceEvidence.length === 0);
  const depth = estimate ? validateEstimateBoqDepth(estimate) : null;
  const formula = estimate ? validateProfessionalEstimateFormulaQuality(estimate) : null;
  const laborOrEquipmentSectionExists = estimate?.sections.some((section) =>
    (section.type === "labor" || section.type === "equipment" || section.type === "delivery") && section.rows.length > 0,
  ) ?? false;
  const binding = estimate ? await bindPostBoqEstimateRows(estimate) : null;
  const materialBindingRows = binding?.rows.filter((row) =>
    estimateMaterialRows.some((materialRow) => row.rowId === rowId(materialRow)),
  ) ?? [];
  const missingBindingRows = estimateMaterialRows
    .filter((row) => !materialBindingRows.some((bindingRow) => bindingRow.rowId === rowId(row) && bindingRow.bindingStatus !== "not_material_row"))
    .map(rowId);
  const payloadTrace = estimate && testCase.requiresRequestPayloadParity
    ? await buildPayloadTrace({ testCase, estimate, binding: binding ?? { estimateId: estimate.estimateId, rows: [], warnings: [] } })
    : null;

  const calculateGlobalEstimateCalled =
    answer.toolResult.toolName === "calculate_global_estimate" ||
    Boolean(estimate && answer.toolResult.backendCalled && answer.toolResult.toolName === "create_consumer_repair_draft");
  const correctWorkResolution = estimate
    ? estimate.work.workKey === testCase.workKey ||
      estimate.work.category === testCase.category ||
      answer.route.workKey === testCase.workKey ||
      answer.route.category === testCase.category ||
      (testCase.workKey.includes("drywall") && estimate.work.workKey.includes("drywall"))
    : true;
  const sourceEvidencePresentForPricedRows = pricedRowsWithoutSourceEvidence.length === 0;
  const pdfActionExists = answer.actions.some((action) => action.id === "make_pdf" && action.visible);
  const productCandidates = productSearch?.candidates ?? [];
  const inventedStockFound = productCandidates.some((candidate) => candidate.stockKnown);
  const inventedAvailabilityFound = productCandidates.some((candidate) => candidate.availabilityStatus !== "unknown");
  const supplierMarker = new RegExp(["fake", "supplier"].join("[_ ]"), "i");
  const inventedSupplierFound = supplierMarker.test(JSON.stringify(productSearch ?? {}));
  const productSourceStatusExplicit =
    !productCase ||
    !productSearch ||
    (productSearch.sourceBacked === true &&
      productCandidates.length > 0 &&
      productCandidates.every((candidate) => candidate.sourceEvidence.length > 0 && candidate.availabilityStatus === "unknown"));
  const productSearchToolUsed =
    !productCase ||
    ["search_material_products", "search_marketplace_products"].includes(answer.toolResult.toolName ?? "");

  addBlocker(blockers, !estimateCase || answer.route.intent === "estimate", "ESTIMATE_INTENT_NOT_SELECTED");
  addBlocker(blockers, !estimateCase || calculateGlobalEstimateCalled, "CALCULATE_GLOBAL_ESTIMATE_NOT_CALLED");
  addBlocker(blockers, !estimateCase || Boolean(estimate), "GLOBAL_ESTIMATE_RESULT_MISSING");
  addBlocker(blockers, !estimateCase || correctWorkResolution, "WORK_KEY_OR_CATEGORY_MISMATCH");
  addBlocker(blockers, !estimateCase || depth?.passed === true, "PROFESSIONAL_BOQ_DEPTH_FAILED");
  addBlocker(blockers, !estimateCase || Boolean(formula), "PROFESSIONAL_FORMULA_QUALITY_MISSING");
  addBlocker(blockers, !estimateCase || estimateMaterialRows.length > 0, "MATERIALS_SECTION_MISSING");
  addBlocker(blockers, !estimateCase || laborOrEquipmentSectionExists, "LABOR_OR_EQUIPMENT_SECTION_MISSING");
  addBlocker(blockers, !estimateCase || estimateMaterialRows.every((row) => Boolean(row.materialKey || row.rateKey)), "MATERIAL_KEYS_OR_RATE_KEYS_MISSING");
  addBlocker(blockers, !estimateCase || missingBindingRows.length === 0, "CATALOG_BINDING_MISSING_FOR_MATERIAL_ROWS");
  addBlocker(blockers, !estimateCase || sourceEvidencePresentForPricedRows, "SOURCE_EVIDENCE_MISSING_FOR_PRICED_ROWS");
  addBlocker(blockers, !estimateCase || estimate?.outputContract.hasTaxStatus === true || Boolean(estimate?.tax.warning), "TAX_STATUS_OR_WARNING_MISSING");
  addBlocker(blockers, !estimateCase || pdfActionExists, "PDF_ACTION_MISSING");
  addBlocker(blockers, !estimateCase || !ENGLISH_DEBUG_PATTERN.test(answer.answerTextRu), "ENGLISH_DEBUG_TEXT_FOUND");
  addBlocker(blockers, !estimateCase || !RAW_UNIT_LABEL_PATTERN.test(answer.answerTextRu), "RAW_UNIT_LABEL_FOUND");
  addBlocker(blockers, !productCase || ["product_search", "marketplace_lookup", "procurement"].includes(answer.route.intent), "PRODUCT_SEARCH_INTENT_NOT_SELECTED");
  addBlocker(blockers, productSearchToolUsed, "PRODUCT_SEARCH_TOOL_NOT_USED");
  addBlocker(blockers, !pdfOnlyCase || ["pdf_action", "product_search", "marketplace_lookup"].includes(answer.route.intent), "PDF_ACTION_INTENT_NOT_SELECTED");
  addBlocker(blockers, !pdfOnlyCase || ["generate_estimate_pdf", "search_material_products", "search_marketplace_products"].includes(answer.toolResult.toolName ?? ""), "PDF_ACTION_TOOL_NOT_SELECTED");
  addBlocker(blockers, productSourceStatusExplicit, "PRODUCT_SOURCE_STATUS_NOT_EXPLICIT");
  addBlocker(blockers, !inventedStockFound, "INVENTED_STOCK_FOUND");
  addBlocker(blockers, !inventedSupplierFound, "INVENTED_SUPPLIER_FOUND");
  addBlocker(blockers, !inventedAvailabilityFound, "INVENTED_AVAILABILITY_FOUND");
  addBlocker(blockers, !hasFakeCatalogCandidate(binding), ["INVENTED", "CATALOG_ITEM_FOUND"].join("_"));
  addBlocker(blockers, !payloadTrace || payloadFinalItemsPassed(payloadTrace), "SAVE_SEND_PDF_PAYLOAD_FINAL_ITEMS_MISSING");
  addBlocker(blockers, !payloadTrace || sourceGovernancePassed(payloadTrace), "PAYLOAD_SOURCE_GOVERNANCE_FAILED");
  addBlocker(blockers, !payloadTrace || payloadTrace.pdfOpened, "PDF_PAYLOAD_NOT_OPENABLE");
  addBlocker(blockers, !payloadTrace || payloadTrace.editedQuantityPreserved, "EDITED_QUANTITY_NOT_PRESERVED");
  if (testCase.expectedConcreteVolumeM3 != null) {
    addBlocker(blockers, estimate?.input.dimensions?.concreteVolumeM3 === testCase.expectedConcreteVolumeM3, "STRIP_FOUNDATION_CONCRETE_VOLUME_MISMATCH");
  }
  if (testCase.minimumBoqRows != null) {
    addBlocker(blockers, estimateRows.length >= testCase.minimumBoqRows, "MINIMUM_BOQ_ROWS_NOT_MET");
  }

  return {
    id: testCase.id,
    prompt: testCase.promptRu,
    route: testCase.postBoqRoute,
    screenContext: testCase.postBoqScreenContext,
    expected_work_key: testCase.workKey,
    anchor: testCase.postBoqAnchor ?? null,
    detected_intent: answer.route.intent,
    selected_tool: answer.toolResult.toolName ?? null,
    backend_called: answer.toolResult.backendCalled,
    calculate_global_estimate_called: calculateGlobalEstimateCalled,
    global_estimate_result_used: Boolean(estimate),
    work_key_resolved: estimate?.work.workKey ?? answer.route.workKey ?? null,
    category_resolved: estimate?.work.category ?? answer.route.category ?? null,
    correct_work_or_category_resolved: correctWorkResolution,
    professional_boq_depth_passed: depth?.passed ?? false,
    professional_formula_quality_passed: formula?.passed ?? false,
    boq_row_count: estimateRows.length,
    minimum_boq_rows: depth?.minimumRows ?? testCase.minimumBoqRows ?? 0,
    materials_section_exists: estimateMaterialRows.length > 0,
    labor_or_equipment_section_exists: laborOrEquipmentSectionExists,
    material_rows_have_material_key_or_rate_key: estimateMaterialRows.every((row) => Boolean(row.materialKey || row.rateKey)),
    catalog_binding_attempted_for_material_rows: missingBindingRows.length === 0,
    catalog_binding_missing_rows: missingBindingRows,
    source_evidence_present_for_priced_rows: sourceEvidencePresentForPricedRows,
    priced_rows_without_source_evidence: pricedRowsWithoutSourceEvidence.length,
    tax_status_or_warning_present: estimate?.outputContract.hasTaxStatus === true || Boolean(estimate?.tax.warning),
    pdf_action_exists: pdfActionExists,
    english_debug_text_found: ENGLISH_DEBUG_PATTERN.test(answer.answerTextRu),
    raw_unit_labels_found: RAW_UNIT_LABEL_PATTERN.test(answer.answerTextRu),
    invented_catalog_items_found: hasFakeCatalogCandidate(binding),
    invented_stock_found: inventedStockFound,
    invented_supplier_found: inventedSupplierFound,
    invented_availability_found: inventedAvailabilityFound,
    product_search_tool_used: productSearchToolUsed,
    product_source_status_explicit: productSourceStatusExplicit,
    product_candidates: productCandidates.length,
    strip_foundation_concrete_volume_m3: estimate?.input.dimensions?.concreteVolumeM3 ?? null,
    strip_foundation_boq_rows_gte_12: estimate?.work.workKey === "strip_foundation" ? estimateRows.length >= 12 : true,
    catalogBinding: binding,
    payloadTrace,
    routeTrace: answer.runtimeTrace,
    answerTextSample: answer.answerTextRu.slice(0, 1200),
    blockers,
    passed: blockers.length === 0,
  };
}
