import {
  addConsumerRepairRequestItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestDraft,
  updateConsumerRepairRequestItemQuantity,
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairPdfSummary } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  calculateGlobalConstructionEstimateSync,
  findForbiddenRequestEstimateUserText,
  formatEstimateUnitLabel,
  formatRequestEstimateSummary,
  validateEstimateBoqDepth,
  type GlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import type { CatalogItemPickerItem } from "../../src/lib/catalog/catalog.facade";

export const FOUNDATION_PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

export const MANUAL_CATALOG_ITEM: CatalogItemPickerItem = {
  catalogItemId: "catalog_items_beton_m300",
  rikCode: "RIK-BETON-M300",
  name: "Бетон М300 из catalog_items",
  unit: "m3",
  kind: "material",
  sourceId: "catalog_items",
  sourceLabel: "catalog_items",
};

export function foundationEstimate(): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text: FOUNDATION_PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
}

export function allRows(result = foundationEstimate()) {
  return result.sections.flatMap((section) => section.rows);
}

export function foundationDraftBundle(): ConsumerRepairDraftBundle {
  __resetConsumerRepairRequestStoreForTests();
  return createConsumerRepairRequestDraft({
    consumerUserId: "request-estimate-test-user",
    problemText: FOUNDATION_PROMPT,
    repairType: "foundation",
    city: "Бишкек",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraft(FOUNDATION_PROMPT),
  });
}

export function addManualCatalogItem(bundle: ConsumerRepairDraftBundle, quantity = 2): ConsumerRepairDraftBundle {
  return addConsumerRepairRequestItem({
    requestDraftId: bundle.draft.id,
    titleRu: MANUAL_CATALOG_ITEM.name,
    itemType: "material",
    quantity,
    unit: MANUAL_CATALOG_ITEM.unit,
    unitLabel: formatEstimateUnitLabel(MANUAL_CATALOG_ITEM.unit),
    unitPrice: 5000,
    currency: "KGS",
    source: "catalog_item",
    catalogItemId: MANUAL_CATALOG_ITEM.catalogItemId,
    category: MANUAL_CATALOG_ITEM.kind,
    sourceId: MANUAL_CATALOG_ITEM.sourceId,
    sourceLabel: MANUAL_CATALOG_ITEM.sourceLabel,
    confidence: "high",
    addedBy: "user",
  });
}

export function foundationDraftWithManualCatalogItem(): ConsumerRepairDraftBundle {
  return addManualCatalogItem(foundationDraftBundle());
}

export function foundationPdfBundleWithManualCatalogItem(): ConsumerRepairDraftBundle {
  const bundle = foundationDraftWithManualCatalogItem();
  return generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
}

export function foundationSendBundleWithManualCatalogItem(): ConsumerRepairDraftBundle {
  let bundle = foundationDraftWithManualCatalogItem();
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = updateConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    patch: { contactPhone: "+996700000000", repairType: "foundation" },
  });
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  return sendConsumerRepairRequestToMarketplace({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    idempotencyKey: `test:${bundle.draft.id}`,
  });
}

export function foundationViewModel() {
  return buildRequestEstimateViewModel(foundationDraftWithManualCatalogItem());
}

export function foundationPdfSummary(): string {
  const bundle = foundationPdfBundleWithManualCatalogItem();
  return buildConsumerRepairPdfSummary({ draft: bundle.draft, items: bundle.items, media: bundle.media });
}

export function updateManualQuantity(bundle: ConsumerRepairDraftBundle, quantity: number): ConsumerRepairDraftBundle {
  const item = bundle.items.find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
  if (!item) throw new Error("manual catalog item missing");
  return updateConsumerRepairRequestItemQuantity({ requestDraftId: bundle.draft.id, itemId: item.id, quantity });
}

export function foundationSummaryText(): string {
  return formatRequestEstimateSummary(foundationEstimate());
}

export function localizationFailures(text: string): string[] {
  return findForbiddenRequestEstimateUserText(text);
}

export function foundationDepth() {
  return validateEstimateBoqDepth(foundationEstimate());
}

export function containsRawUnit(text: string): boolean {
  return /\b(linear_m|sq_m|cubic_m|pcs)\b/.test(text);
}
