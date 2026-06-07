import type { ConsumerRepairDraftBundle, ConsumerRepairRequestItem } from "../../lib/consumerRequests";
import type {
  RequestEstimateDraft,
  RequestEstimateDraftItem,
  RequestEstimateDraftItemSource,
  RequestEstimateDraftParityResult,
  RequestEstimateDraftPayload,
  RequestEstimateSelectedWork,
  RequestEstimateDraftTotals,
  RequestEstimatePayloadKind,
} from "./requestEstimateDraftTypes";
import { requestEstimateDraftWithValidation } from "./validateRequestEstimateDraft";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeOptional(value: string | null | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function inferSource(item: ConsumerRepairRequestItem): RequestEstimateDraftItemSource {
  if (item.source === "catalog_item") return "catalog_item";
  if (item.source === "custom" || item.source === "user_added") return "custom";
  return "estimate";
}

function inferWorkKey(bundle: ConsumerRepairDraftBundle): string {
  if (bundle.draft.selectedWorkKey) return bundle.draft.selectedWorkKey;
  const fromMaterial = bundle.items.find((item) => item.materialKey || item.rateKey);
  const key = fromMaterial?.rateKey ?? fromMaterial?.materialKey ?? bundle.draft.repairType;
  return key.split("_").slice(0, 2).join("_") || "request_estimate";
}

function selectedWorkFromBundle(bundle: ConsumerRepairDraftBundle): RequestEstimateSelectedWork | undefined {
  if (!bundle.draft.selectedWorkKey || !bundle.draft.selectedWorkTitleRu) return undefined;
  return {
    selectedWorkKey: bundle.draft.selectedWorkKey,
    selectedTitleRu: bundle.draft.selectedWorkTitleRu,
    selectedCategoryKey: bundle.draft.selectedWorkCategoryKey ?? bundle.draft.repairType,
    selectedCategoryTitleRu: bundle.draft.selectedWorkCategoryTitleRu ?? bundle.draft.repairType,
    rawInput: bundle.draft.selectedWorkRawInput ?? bundle.draft.problemText ?? "",
    source: "user_selected",
    resolverReGuessed: false,
  };
}

function draftItemFromConsumerItem(item: ConsumerRepairRequestItem): RequestEstimateDraftItem {
  const source = inferSource(item);
  return {
    rowId: item.id,
    source,
    name: item.titleRu,
    quantity: item.quantity ?? 0,
    unit: item.unit ?? "pcs",
    unitLabel: item.unitLabel ?? item.unit ?? "pcs",
    materialKey: normalizeOptional(item.materialKey),
    rateKey: normalizeOptional(item.rateKey),
    catalogItemId: normalizeOptional(item.selectedCatalogItemId ?? item.catalogItemId),
    unitPrice: item.unitPrice ?? null,
    total: item.totalPrice ?? null,
    sourceId: normalizeOptional(item.sourceId),
    confidence: item.confidence ?? (source === "custom" ? "low" : "medium"),
    bindingStatus: normalizeOptional(item.catalogBindingStatus),
  };
}

function itemTotal(item: RequestEstimateDraftItem): number {
  if (item.total != null) return item.total;
  if (item.unitPrice != null) return roundMoney(item.unitPrice * item.quantity);
  return 0;
}

function looksLikeDeliveryOrEquipment(item: RequestEstimateDraftItem): boolean {
  const text = `${item.name} ${item.rateKey ?? ""}`.toLowerCase();
  return text.includes("delivery") || text.includes("equipment") || text.includes("pump") || text.includes("transport");
}

export function calculateRequestEstimateDraftTotals(items: RequestEstimateDraftItem[]): RequestEstimateDraftTotals {
  return items.reduce<RequestEstimateDraftTotals>(
    (totals, item) => {
      const total = itemTotal(item);
      if (looksLikeDeliveryOrEquipment(item)) {
        totals.equipmentTotal = roundMoney(totals.equipmentTotal + total);
      } else if (item.source === "catalog_item" || item.materialKey || item.catalogItemId) {
        totals.materialsTotal = roundMoney(totals.materialsTotal + total);
      } else if (item.rateKey) {
        totals.laborTotal = roundMoney(totals.laborTotal + total);
      } else {
        totals.deliveryTotal = roundMoney(totals.deliveryTotal + total);
      }
      totals.grandTotal = roundMoney(
        totals.materialsTotal + totals.laborTotal + totals.equipmentTotal + totals.deliveryTotal + totals.taxTotal,
      );
      return totals;
    },
    {
      materialsTotal: 0,
      laborTotal: 0,
      equipmentTotal: 0,
      deliveryTotal: 0,
      taxTotal: 0,
      grandTotal: 0,
    },
  );
}

export function buildRequestEstimateDraftFromConsumerBundle(
  bundle: ConsumerRepairDraftBundle,
  options: { estimateId?: string; workKey?: string; language?: string; selectedWork?: RequestEstimateSelectedWork } = {},
): RequestEstimateDraft {
  const items = bundle.items.map(draftItemFromConsumerItem);
  const selectedWork = options.selectedWork ?? selectedWorkFromBundle(bundle);
  const draft: RequestEstimateDraft = {
    draftId: bundle.draft.id,
    estimateId: options.estimateId ?? bundle.draft.id,
    workKey: selectedWork?.selectedWorkKey ?? options.workKey ?? inferWorkKey(bundle),
    selectedWork,
    title: bundle.draft.title ?? "Request estimate",
    description: bundle.draft.problemText ?? "",
    language: options.language ?? "ru",
    currency: bundle.items.find((item) => item.unitPrice != null)?.currency ?? "KGS",
    items,
    totals: calculateRequestEstimateDraftTotals(items),
    validation: { canSave: false, canSend: false, blockers: [], warnings: [] },
  };
  return requestEstimateDraftWithValidation(draft);
}

export function buildRequestEstimatePayload(
  draft: RequestEstimateDraft,
  payloadKind: RequestEstimatePayloadKind,
): RequestEstimateDraftPayload {
  const stableDraft = requestEstimateDraftWithValidation({
    ...draft,
    items: draft.items.map((item) => ({
      ...item,
      total: item.unitPrice != null ? roundMoney(item.unitPrice * item.quantity) : item.total ?? null,
    })),
  });
  return {
    payloadKind,
    draft: stableDraft,
    rowCount: stableDraft.items.length,
    catalogItemIds: stableDraft.items
      .map((item) => item.catalogItemId)
      .filter((catalogItemId): catalogItemId is string => Boolean(catalogItemId))
      .sort(),
    editedQuantityRows: stableDraft.items
      .filter((item) => item.quantity !== 1)
      .map((item) => ({ rowId: item.rowId, quantity: item.quantity }))
      .sort((left, right) => left.rowId.localeCompare(right.rowId)),
    runtimeTrace: {
      draftId: stableDraft.draftId,
      estimateId: stableDraft.estimateId,
      workKey: stableDraft.workKey,
      selectedWorkKey: stableDraft.selectedWork?.selectedWorkKey,
      selectedWorkSource: stableDraft.selectedWork?.source,
      payloadKind,
      itemRowIds: stableDraft.items.map((item) => item.rowId).sort(),
    },
  };
}

export function buildRequestEstimatePayloadSet(draft: RequestEstimateDraft): Record<RequestEstimatePayloadKind, RequestEstimateDraftPayload> {
  return {
    visible_ui: buildRequestEstimatePayload(draft, "visible_ui"),
    pdf_payload: buildRequestEstimatePayload(draft, "pdf_payload"),
    save_draft_payload: buildRequestEstimatePayload(draft, "save_draft_payload"),
    send_request_payload: buildRequestEstimatePayload(draft, "send_request_payload"),
    runtime_trace: buildRequestEstimatePayload(draft, "runtime_trace"),
    proof_artifact: buildRequestEstimatePayload(draft, "proof_artifact"),
  };
}

function comparableRows(payload: RequestEstimateDraftPayload): string {
  return JSON.stringify(
    payload.draft.items
      .map((item) => ({
        rowId: item.rowId,
        source: item.source,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        catalogItemId: item.catalogItemId ?? null,
        unitPrice: item.unitPrice ?? null,
        total: item.total ?? null,
        confidence: item.confidence,
      }))
      .sort((left, right) => left.rowId.localeCompare(right.rowId)),
  );
}

export function compareRequestEstimatePayloadParity(input: {
  visibleUi: RequestEstimateDraftPayload;
  pdfPayload: RequestEstimateDraftPayload;
  saveDraftPayload: RequestEstimateDraftPayload;
  sendRequestPayload: RequestEstimateDraftPayload;
  runtimeTracePayload: RequestEstimateDraftPayload;
  removedRowIds?: string[];
}): RequestEstimateDraftParityResult {
  const failures: string[] = [];
  const visibleRows = comparableRows(input.visibleUi);
  const visibleUiMatchesPdf = visibleRows === comparableRows(input.pdfPayload);
  const visibleUiMatchesSave = visibleRows === comparableRows(input.saveDraftPayload);
  const visibleUiMatchesSend = visibleRows === comparableRows(input.sendRequestPayload);
  const visibleUiMatchesRuntimeTrace =
    JSON.stringify(input.visibleUi.runtimeTrace.itemRowIds) === JSON.stringify(input.runtimeTracePayload.runtimeTrace.itemRowIds);
  const selectedWorkFingerprint = JSON.stringify(input.visibleUi.draft.selectedWork ?? null);
  const selectedWorkMatchesPayloads =
    selectedWorkFingerprint === JSON.stringify(input.pdfPayload.draft.selectedWork ?? null) &&
    selectedWorkFingerprint === JSON.stringify(input.saveDraftPayload.draft.selectedWork ?? null) &&
    selectedWorkFingerprint === JSON.stringify(input.sendRequestPayload.draft.selectedWork ?? null) &&
    (input.visibleUi.draft.selectedWork?.selectedWorkKey ?? undefined) === input.runtimeTracePayload.runtimeTrace.selectedWorkKey;
  const manualCatalogItemNotLost = input.visibleUi.draft.items
    .filter((item) => item.source === "catalog_item")
    .every((item) =>
      input.pdfPayload.draft.items.some((candidate) => candidate.rowId === item.rowId && candidate.catalogItemId === item.catalogItemId) &&
      input.saveDraftPayload.draft.items.some((candidate) => candidate.rowId === item.rowId && candidate.catalogItemId === item.catalogItemId) &&
      input.sendRequestPayload.draft.items.some((candidate) => candidate.rowId === item.rowId && candidate.catalogItemId === item.catalogItemId),
    );
  const editedQuantitiesNotLost = input.visibleUi.editedQuantityRows.every((row) =>
    input.pdfPayload.editedQuantityRows.some((candidate) => candidate.rowId === row.rowId && candidate.quantity === row.quantity) &&
    input.saveDraftPayload.editedQuantityRows.some((candidate) => candidate.rowId === row.rowId && candidate.quantity === row.quantity) &&
    input.sendRequestPayload.editedQuantityRows.some((candidate) => candidate.rowId === row.rowId && candidate.quantity === row.quantity),
  );
  const removedItemsNotSent = (input.removedRowIds ?? []).every((rowId) =>
    !input.sendRequestPayload.draft.items.some((item) => item.rowId === rowId),
  );
  const customItemsLowConfidence = input.visibleUi.draft.items
    .filter((item) => item.source === "custom")
    .every((item) => item.confidence === "low" && !item.catalogItemId);

  if (!visibleUiMatchesPdf) failures.push("VISIBLE_UI_PDF_PAYLOAD_MISMATCH");
  if (!visibleUiMatchesSave) failures.push("VISIBLE_UI_SAVE_PAYLOAD_MISMATCH");
  if (!visibleUiMatchesSend) failures.push("VISIBLE_UI_SEND_PAYLOAD_MISMATCH");
  if (!visibleUiMatchesRuntimeTrace) failures.push("VISIBLE_UI_RUNTIME_TRACE_MISMATCH");
  if (!selectedWorkMatchesPayloads) failures.push("SELECTED_WORK_PAYLOAD_MISMATCH");
  if (!manualCatalogItemNotLost) failures.push("MANUAL_CATALOG_ITEM_LOST");
  if (!editedQuantitiesNotLost) failures.push("EDITED_QUANTITY_LOST");
  if (!removedItemsNotSent) failures.push("REMOVED_ITEM_SENT");
  if (!customItemsLowConfidence) failures.push("CUSTOM_ITEM_NOT_LOW_CONFIDENCE");

  return {
    passed: failures.length === 0,
    visibleUiMatchesPdf,
    visibleUiMatchesSave,
    visibleUiMatchesSend,
    visibleUiMatchesRuntimeTrace,
    manualCatalogItemNotLost,
    editedQuantitiesNotLost,
    removedItemsNotSent,
    customItemsLowConfidence,
    selectedWorkMatchesPayloads,
    failures,
  };
}

export function buildRequestEstimateCustomItem(): RequestEstimateDraftItem {
  return {
    rowId: "custom_note_001",
    source: "custom",
    name: "Custom scope note",
    quantity: 1,
    unit: "set",
    unitLabel: "set",
    unitPrice: null,
    total: null,
    confidence: "low",
    bindingStatus: "custom_low_confidence",
  };
}

export function buildRequestEstimateManualCatalogItem(): RequestEstimateDraftItem {
  return {
    rowId: "manual_catalog_concrete_001",
    source: "catalog_item",
    name: "Manual catalog concrete M300",
    quantity: 2,
    unit: "m3",
    unitLabel: "m3",
    catalogItemId: "catalog_manual_concrete_m300",
    unitPrice: 5000,
    total: 10000,
    sourceId: "catalog_items",
    confidence: "high",
    bindingStatus: "selected_catalog_item",
  };
}
