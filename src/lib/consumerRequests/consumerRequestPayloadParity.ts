import { safeJsonStringify } from "../format";
import { validatePricedRateSourceEvidence } from "../ai/globalEstimate/sourceGovernance/validateRateSourceEvidence";
import type {
  ConsumerMarketplaceLink,
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestDraft,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestMedia,
  ConsumerRepairRequestPdf,
} from "./consumerRequestTypes";

export type ConsumerRepairPayloadKind = "draft_save" | "pdf_generation" | "marketplace_send";

export type ConsumerRepairCanonicalDraftPayload = {
  requestDraftId: string;
  payloadKind: ConsumerRepairPayloadKind;
  draft: Pick<
    ConsumerRepairRequestDraft,
    | "id"
    | "consumerUserId"
    | "title"
    | "problemText"
    | "repairType"
    | "city"
    | "addressText"
    | "preferredTimeText"
    | "contactPhone"
    | "status"
    | "aiSummaryRu"
    | "missingData"
  >;
  items: Pick<
    ConsumerRepairRequestItem,
    | "id"
    | "itemType"
    | "titleRu"
    | "quantity"
    | "unit"
    | "unitLabel"
    | "unitPrice"
    | "totalPrice"
    | "currency"
    | "source"
    | "catalogItemId"
    | "selectedCatalogItemId"
    | "materialKey"
    | "rateKey"
    | "catalogBindingStatus"
    | "catalogCandidates"
    | "category"
    | "sourceId"
    | "sourceLabel"
    | "confidence"
    | "addedBy"
    | "editableByConsumer"
  >[];
  media: Pick<ConsumerRepairRequestMedia, "id" | "mediaAssetId" | "mediaKind" | "purpose">[];
  pdfs: Pick<ConsumerRepairRequestPdf, "id" | "storageBucket" | "storageKey" | "titleRu" | "pdfStatus" | "contentType">[];
  marketplaceLink: Pick<ConsumerMarketplaceLink, "id" | "marketplaceDemandId" | "status" | "idempotencyKey">;
  totals: {
    pricedItems: number;
    grandTotal: number;
    currency: string;
  };
  parityFingerprint: string;
};

export type ConsumerRepairPayloadParityResult = {
  passed: boolean;
  itemCountEqual: boolean;
  catalogSelectionsEqual: boolean;
  totalsEqual: boolean;
  draftIdentityEqual: boolean;
  fingerprints: Record<ConsumerRepairPayloadKind, string>;
  failures: string[];
};

export type ConsumerRepairPayloadSourceGovernanceResult = {
  passed: boolean;
  priceWithoutSourceFound: boolean;
  fakeAvailabilityFound: boolean;
  fakeStockFound: boolean;
  fakeSupplierFound: boolean;
  failures: string[];
};

function canonicalNullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

function stableHash(value: unknown): string {
  let hash = 2166136261;
  const text = safeJsonStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeItem(item: ConsumerRepairRequestItem): ConsumerRepairCanonicalDraftPayload["items"][number] {
  return {
    id: item.id,
    itemType: item.itemType,
    titleRu: item.titleRu,
    quantity: canonicalNullable(item.quantity),
    unit: canonicalNullable(item.unit),
    unitLabel: canonicalNullable(item.unitLabel),
    unitPrice: canonicalNullable(item.unitPrice),
    totalPrice: canonicalNullable(item.totalPrice),
    currency: item.currency,
    source: item.source,
    catalogItemId: canonicalNullable(item.catalogItemId),
    selectedCatalogItemId: canonicalNullable(item.selectedCatalogItemId),
    materialKey: canonicalNullable(item.materialKey),
    rateKey: canonicalNullable(item.rateKey),
    catalogBindingStatus: canonicalNullable(item.catalogBindingStatus),
    catalogCandidates: [...(item.catalogCandidates ?? [])].sort((a, b) => a.catalogItemId.localeCompare(b.catalogItemId)),
    category: canonicalNullable(item.category),
    sourceId: canonicalNullable(item.sourceId),
    sourceLabel: canonicalNullable(item.sourceLabel),
    confidence: item.confidence,
    addedBy: item.addedBy,
    editableByConsumer: item.editableByConsumer,
  };
}

function buildFingerprintBasis(payload: Omit<ConsumerRepairCanonicalDraftPayload, "payloadKind" | "parityFingerprint">) {
  return {
    draft: payload.draft,
    items: payload.items,
    media: payload.media,
    totals: payload.totals,
  };
}

export function buildConsumerRepairCanonicalDraftPayload(
  bundle: ConsumerRepairDraftBundle,
  payloadKind: ConsumerRepairPayloadKind,
): ConsumerRepairCanonicalDraftPayload {
  const items = bundle.items.map(normalizeItem).sort((a, b) => a.id.localeCompare(b.id));
  const pricedItems = items.filter((item) => item.unitPrice != null && item.totalPrice != null);
  const totalCurrency = pricedItems[0]?.currency ?? items[0]?.currency ?? "KGS";
  const base = {
    requestDraftId: bundle.draft.id,
    draft: {
      id: bundle.draft.id,
      consumerUserId: bundle.draft.consumerUserId,
      title: canonicalNullable(bundle.draft.title),
      problemText: canonicalNullable(bundle.draft.problemText),
      repairType: bundle.draft.repairType,
      city: canonicalNullable(bundle.draft.city),
      addressText: canonicalNullable(bundle.draft.addressText),
      preferredTimeText: canonicalNullable(bundle.draft.preferredTimeText),
      contactPhone: canonicalNullable(bundle.draft.contactPhone),
      status: bundle.draft.status,
      aiSummaryRu: canonicalNullable(bundle.draft.aiSummaryRu),
      missingData: [...bundle.draft.missingData],
    },
    items,
    media: bundle.media
      .map((item) => ({
        id: item.id,
        mediaAssetId: item.mediaAssetId,
        mediaKind: item.mediaKind,
        purpose: item.purpose,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pdfs: bundle.pdfs
      .map((pdf) => ({
        id: pdf.id,
        storageBucket: pdf.storageBucket,
        storageKey: pdf.storageKey,
        titleRu: pdf.titleRu,
        pdfStatus: pdf.pdfStatus,
        contentType: pdf.contentType,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    marketplaceLink: {
      id: bundle.marketplaceLink.id,
      marketplaceDemandId: canonicalNullable(bundle.marketplaceLink.marketplaceDemandId),
      status: bundle.marketplaceLink.status,
      idempotencyKey: canonicalNullable(bundle.marketplaceLink.idempotencyKey),
    },
    totals: {
      pricedItems: pricedItems.length,
      grandTotal: pricedItems.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0),
      currency: totalCurrency,
    },
  };
  return {
    ...base,
    payloadKind,
    parityFingerprint: stableHash(buildFingerprintBasis(base)),
  };
}

export function compareConsumerRepairPayloadParity(input: {
  draftSave: ConsumerRepairCanonicalDraftPayload;
  pdfGeneration: ConsumerRepairCanonicalDraftPayload;
  marketplaceSend: ConsumerRepairCanonicalDraftPayload;
}): ConsumerRepairPayloadParityResult {
  const payloads = [input.draftSave, input.pdfGeneration, input.marketplaceSend];
  const itemCounts = new Set(payloads.map((payload) => payload.items.length));
  const totals = new Set(payloads.map((payload) => `${payload.totals.currency}:${payload.totals.grandTotal}`));
  const draftIds = new Set(payloads.map((payload) => payload.requestDraftId));
  const catalogSelections = new Set(payloads.map((payload) =>
    safeJsonStringify(payload.items.map((item) => ({
      id: item.id,
      catalogItemId: item.catalogItemId,
      selectedCatalogItemId: item.selectedCatalogItemId,
      catalogBindingStatus: item.catalogBindingStatus,
    }))),
  ));
  const failures: string[] = [];
  if (itemCounts.size !== 1) failures.push("ITEM_COUNT_MISMATCH");
  if (catalogSelections.size !== 1) failures.push("CATALOG_SELECTION_MISMATCH");
  if (totals.size !== 1) failures.push("TOTALS_MISMATCH");
  if (draftIds.size !== 1) failures.push("DRAFT_ID_MISMATCH");
  return {
    passed: failures.length === 0,
    itemCountEqual: itemCounts.size === 1,
    catalogSelectionsEqual: catalogSelections.size === 1,
    totalsEqual: totals.size === 1,
    draftIdentityEqual: draftIds.size === 1,
    fingerprints: {
      draft_save: input.draftSave.parityFingerprint,
      pdf_generation: input.pdfGeneration.parityFingerprint,
      marketplace_send: input.marketplaceSend.parityFingerprint,
    },
    failures,
  };
}

export function validateConsumerRepairPayloadSourceGovernance(
  payload: ConsumerRepairCanonicalDraftPayload,
): ConsumerRepairPayloadSourceGovernanceResult {
  const failures: string[] = [];
  let priceWithoutSourceFound = false;
  let fakeAvailabilityFound = false;
  let fakeStockFound = false;
  let fakeSupplierFound = false;

  for (const item of payload.items) {
    const itemValidation = validatePricedRateSourceEvidence({
      path: `${payload.payloadKind}.items.${item.id}`,
      unitPrice: item.unitPrice,
      sourceId: item.sourceId,
      sourceLabel: item.sourceLabel,
      sourceType: item.source === "catalog_item" ? "catalog_item" : "configured_reference",
      confidence: item.confidence ?? "low",
      availabilityStatus: "unknown",
      stockStatus: "unknown",
      catalogItemId: item.catalogItemId ?? item.selectedCatalogItemId,
    });
    priceWithoutSourceFound ||= itemValidation.priceWithoutSourceFound;
    fakeAvailabilityFound ||= itemValidation.fakeAvailabilityFound;
    fakeStockFound ||= itemValidation.fakeStockFound;
    fakeSupplierFound ||= itemValidation.fakeSupplierFound;
    failures.push(...itemValidation.failures.map((failure) => `${failure.code}:${failure.path}`));

    for (const candidate of item.catalogCandidates ?? []) {
      const candidateValidation = validatePricedRateSourceEvidence({
        path: `${payload.payloadKind}.items.${item.id}.catalogCandidates.${candidate.catalogItemId}`,
        unitPrice: candidate.unitPrice,
        sourceId: candidate.sourceId,
        sourceLabel: candidate.sourceLabel,
        sourceType: "catalog_item",
        confidence: candidate.confidence,
        availabilityStatus: candidate.availabilityStatus,
        stockStatus: candidate.stockStatus,
        catalogItemId: candidate.catalogItemId,
      });
      priceWithoutSourceFound ||= candidateValidation.priceWithoutSourceFound;
      fakeAvailabilityFound ||= candidateValidation.fakeAvailabilityFound;
      fakeStockFound ||= candidateValidation.fakeStockFound;
      fakeSupplierFound ||= candidateValidation.fakeSupplierFound;
      failures.push(...candidateValidation.failures.map((failure) => `${failure.code}:${failure.path}`));
    }
  }

  return {
    passed: failures.length === 0,
    priceWithoutSourceFound,
    fakeAvailabilityFound,
    fakeStockFound,
    fakeSupplierFound,
    failures,
  };
}
