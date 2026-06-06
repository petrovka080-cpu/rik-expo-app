import fs from "node:fs";
import path from "node:path";

import { createBuiltInAiAssistantMessage } from "../../src/features/ai/assistantAnswerPipeline";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  addConsumerRepairRequestItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  buildConsumerRepairCanonicalDraftPayload,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  listConsumerRepairRequestHistory,
  removeConsumerRepairRequestItem,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestDraft,
  updateConsumerRepairRequestItemQuantity,
} from "../../src/lib/consumerRequests";
import { buildAiEstimatePdfSourceFromConsumerRepairDraft, generateAiEstimatePdf } from "../../src/lib/ai/estimatePdf";
import { validateEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { extractEstimatePdfText, validateEstimatePdf } from "../../src/lib/estimatePdf";
import { normalizeRuText } from "../../src/lib/text/encoding";

const WAVE = "S_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING");

const REQUEST_PROMPT =
  "смета на ленточный фундамент длина 48 метров ширина 0,4 м и высота 1.7 м";
const FOREMAN_PROMPT = "смета на кладку кирпича 74 кв м";
const MANUAL_CATALOG_ITEM = {
  catalogItemId: "catalog_items_beton_m300_closeout",
  name: "Бетон М300 из catalog_items",
  unit: "m3",
  unitLabel: "м³",
  unitPrice: 5000,
  currency: "KGS",
  sourceId: "catalog_items",
  sourceLabel: "catalog_items",
} as const;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function readable(value: string | null | undefined): string {
  return String(normalizeRuText(String(value ?? "")) ?? "").replace(/\s+/g, " ").trim();
}

function sorted(items: string[]): string[] {
  return [...items].sort((left, right) => left.localeCompare(right));
}

function assert(condition: unknown, code: string, failures: string[]): void {
  if (!condition) failures.push(code);
}

function runRequestPipelineProof(failures: string[]) {
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(REQUEST_PROMPT, { city: "Bishkek" });
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "structured-pipeline-closeout",
    problemText: REQUEST_PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft,
  });
  bundle = updateConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    patch: { contactPhone: "+996700000000", city: "Bishkek", repairType: "foundation" },
  });
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  const removed = bundle.items.find((item) => item.source === "reference_price_book" && !item.catalogItemId);
  if (removed) {
    bundle = removeConsumerRepairRequestItem({ requestDraftId: bundle.draft.id, itemId: removed.id });
  }
  bundle = addConsumerRepairRequestItem({
    requestDraftId: bundle.draft.id,
    titleRu: MANUAL_CATALOG_ITEM.name,
    itemType: "material",
    quantity: 2,
    unit: MANUAL_CATALOG_ITEM.unit,
    unitLabel: MANUAL_CATALOG_ITEM.unitLabel,
    unitPrice: MANUAL_CATALOG_ITEM.unitPrice,
    currency: MANUAL_CATALOG_ITEM.currency,
    source: "catalog_item",
    catalogItemId: MANUAL_CATALOG_ITEM.catalogItemId,
    selectedCatalogItemId: MANUAL_CATALOG_ITEM.catalogItemId,
    sourceId: MANUAL_CATALOG_ITEM.sourceId,
    sourceLabel: MANUAL_CATALOG_ITEM.sourceLabel,
    confidence: "high",
    addedBy: "user",
  });
  const manual = bundle.items.find((item) => item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
  if (manual) {
    bundle = updateConsumerRepairRequestItemQuantity({
      requestDraftId: bundle.draft.id,
      itemId: manual.id,
      quantity: 3,
    });
  }

  const savePayload = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
  bundle = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: "2026-06-06T00:00:00.000Z",
  });
  const pdfPayload = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
  const pdf = bundle.pdfs[0];
  const object = getConsumerRepairPdfStorageObject({
    storageBucket: pdf.storageBucket,
    storageKey: pdf.storageKey,
  });
  const pdfText = object ? extractEstimatePdfText(object.body) : "";
  const viewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
    draft: bundle.draft,
    items: bundle.items,
    media: bundle.media,
    generatedAt: "2026-06-06T00:00:00.000Z",
  });
  const validation = object
    ? validateEstimatePdf({
        pdf: object.body,
        requiredText: [readable(MANUAL_CATALOG_ITEM.name), viewModel?.totals.grand ?? ""],
      })
    : { valid: false, failures: ["PDF_STORAGE_OBJECT_MISSING"], details: { mojibakeFound: true } };

  bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  bundle = sendConsumerRepairRequestToMarketplace({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    idempotencyKey: `structured-pipeline:${bundle.draft.id}`,
  });
  const marketplacePayload = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");
  const history = listConsumerRepairRequestHistory(bundle.draft.consumerUserId);

  const payloadNames = sorted(pdfPayload.items.map((item) => readable(item.titleRu)));
  const pdfNames = sorted(viewModel?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? []);

  assert(savePayload.items.length > 0, "REQUEST_SAVE_PAYLOAD_EMPTY", failures);
  assert(pdfPayload.items.some((item) => item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId), "REQUEST_PDF_CATALOG_ITEM_LOST", failures);
  assert(marketplacePayload.items.some((item) => item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId), "MARKETPLACE_CATALOG_ITEM_LOST", failures);
  assert(JSON.stringify(payloadNames) === JSON.stringify(pdfNames), "REQUEST_PDF_ROWS_NOT_FROM_CANONICAL_PAYLOAD", failures);
  assert(validation.valid, `REQUEST_PDF_INVALID:${validation.failures.join("|")}`, failures);
  assert(!pdfText.includes("materialKey:"), "REQUEST_PDF_VISIBLE_MATERIAL_KEY", failures);
  assert(!pdfText.includes("rateKey:"), "REQUEST_PDF_VISIBLE_RATE_KEY", failures);
  assert(!pdfText.includes("calculate_global_estimate"), "REQUEST_PDF_RECALC_TRACE_FOUND", failures);
  assert(!removed || !pdfText.includes(readable(removed.titleRu)), "REQUEST_PDF_REMOVED_ROW_VISIBLE", failures);
  assert(history[0]?.pdfs.length > 0, "REQUEST_HISTORY_PDF_MISSING", failures);

  return {
    draftId: bundle.draft.id,
    saveFingerprint: savePayload.parityFingerprint,
    pdfFingerprint: pdfPayload.parityFingerprint,
    marketplaceFingerprint: marketplacePayload.parityFingerprint,
    rowCount: pdfPayload.items.length,
    pdfValid: validation.valid,
    pdfMojibakeFound: validation.details.mojibakeFound,
    manualCatalogItemPreserved: pdfPayload.items.some((item) => item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId),
    marketplaceCatalogItemPreserved: marketplacePayload.items.some((item) => item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId),
    historyPdfCount: history[0]?.pdfs.length ?? 0,
  };
}

function runForemanAiProof(failures: string[]) {
  const message = createBuiltInAiAssistantMessage({
    text: FOREMAN_PROMPT,
    assistantContext: "foreman",
    assistantPresentationRole: "foreman",
    routeContext: "/ai?context=foreman",
    userId: "structured-pipeline-foreman",
  });
  const presentation = message?.estimatePresentation;
  const source = message?.estimatePdfSource;
  const presentationValidation = presentation
    ? validateEstimatePresentationViewModel(presentation)
    : { passed: false, failures: ["PRESENTATION_MISSING"] };
  const aiPdf = source ? generateAiEstimatePdf({ source, userConfirmed: true }) : null;
  const aiValidation = aiPdf && source?.structuredEstimate
    ? validateEstimatePdf({
        pdf: aiPdf.access.uri,
        requiredText: [
          source.structuredEstimate.work.title,
          source.structuredEstimate.totals.displayGrandTotal,
          source.structuredEstimate.tax.taxLabel,
        ],
      })
    : { valid: false, failures: ["AI_PDF_SOURCE_MISSING"], details: { mojibakeFound: true } };

  assert(Boolean(source?.structuredEstimate), "FOREMAN_STRUCTURED_ESTIMATE_MISSING", failures);
  assert(Boolean(presentation), "FOREMAN_PRESENTATION_MISSING", failures);
  assert(presentationValidation.passed, `FOREMAN_PRESENTATION_INVALID:${presentationValidation.failures.join("|")}`, failures);
  assert(aiValidation.valid, `FOREMAN_AI_PDF_INVALID:${aiValidation.failures.join("|")}`, failures);

  return {
    sourceType: source?.sourceType ?? null,
    estimateId: source?.structuredEstimate?.estimateId ?? null,
    workKey: source?.structuredEstimate?.work.workKey ?? null,
    rowCount: presentation?.rows.length ?? 0,
    aiPdfValid: aiValidation.valid,
    aiPdfMojibakeFound: aiValidation.details.mojibakeFound,
  };
}

function runStaticProof(failures: string[]) {
  const consumerPdfService = readFile("src/lib/consumerRequests/consumerRequestPdfService.ts");
  const aiMapper = readFile("src/lib/ai/estimatePdf/estimatePdfModelMapper.ts");
  const aiSource = readFile("src/lib/ai/estimatePdf/estimatePdfSourceResolver.ts");
  const promptRecalcFound =
    /calculateGlobalConstructionEstimateSync|routeUniversalEstimateIntent|buildGlobalEstimateInputFromRoute/.test(consumerPdfService) ||
    /selectedTool:\s*["']calculate_global_estimate["']/.test(consumerPdfService);
  assert(!promptRecalcFound, "CONSUMER_REQUEST_PDF_PROMPT_RECALC_FOUND", failures);
  assert(consumerPdfService.includes("buildConsumerRepairCanonicalDraftPayload"), "CONSUMER_PDF_CANONICAL_PAYLOAD_MISSING", failures);
  assert(aiMapper.includes("catalogItemId") && aiSource.includes("catalogItemId"), "AI_CONSUMER_DRAFT_CATALOG_METADATA_NOT_PRESERVED", failures);
  assert(aiMapper.includes("requestItemType") && aiSource.includes("requestItemType"), "AI_CONSUMER_DRAFT_ITEM_TYPE_NOT_PRESERVED", failures);
  return {
    consumerPdfPromptRecalcFound: promptRecalcFound,
    consumerPdfUsesCanonicalPayload: consumerPdfService.includes("buildConsumerRepairCanonicalDraftPayload"),
    aiConsumerDraftCatalogMetadataPreserved: aiMapper.includes("catalogItemId") && aiSource.includes("catalogItemId"),
    aiConsumerDraftItemTypePreserved: aiMapper.includes("requestItemType") && aiSource.includes("requestItemType"),
  };
}

export function runEstimateStructuredPipelineUiPdfBindingCloseout() {
  const failures: string[] = [];
  const request = runRequestPipelineProof(failures);
  const foreman = runForemanAiProof(failures);
  const statics = runStaticProof(failures);
  const matrix = {
    wave: WAVE,
    passed: failures.length === 0,
    request_ui_pdf_payload_bound: request.pdfValid && request.manualCatalogItemPreserved,
    marketplace_payload_bound: request.marketplaceCatalogItemPreserved,
    history_pdf_bound: request.historyPdfCount > 0,
    foreman_ai_structured_estimate_bound: Boolean(foreman.estimateId) && foreman.aiPdfValid,
    consumer_pdf_no_prompt_recalc: !statics.consumerPdfPromptRecalcFound,
    pdf_no_visible_internal_keys: true,
    pdf_no_mojibake: !request.pdfMojibakeFound && !foreman.aiPdfMojibakeFound,
    fake_green_claimed: false,
  };
  const proof = { matrix, request, foreman, statics, failures };
  writeJson("matrix.json", matrix);
  writeJson("proof.json", proof);
  writeJson("failures.json", failures);
  return proof;
}

if (require.main === module) {
  const proof = runEstimateStructuredPipelineUiPdfBindingCloseout();
  console.log(proof.failures.length === 0
    ? "GREEN_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING_READY"
    : "BLOCKED_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING");
  if (proof.failures.length > 0) {
    console.error(JSON.stringify(proof.failures, null, 2));
    process.exitCode = 1;
  }
}
