import type {
  ConsumerRepairCatalogCandidate,
  ConsumerRepairCatalogBindingStatus,
  ConsumerRepairRequestItem,
  ConsumerRepairItemSource,
  ConsumerRepairItemType,
} from "./consumerRequestTypes";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function createConsumerRepairRequestItem(input: {
  requestDraftId: string;
  itemType: ConsumerRepairItemType;
  titleRu: string;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  currency?: string;
  source?: ConsumerRepairItemSource;
  catalogItemId?: string | null;
  selectedCatalogItemId?: string | null;
  materialKey?: string | null;
  rateKey?: string | null;
  catalogBindingStatus?: ConsumerRepairCatalogBindingStatus | null;
  catalogCandidates?: ConsumerRepairCatalogCandidate[];
  category?: string | null;
  unitLabel?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  confidence?: "high" | "medium" | "low";
  addedBy?: "ai" | "user" | "system";
}): ConsumerRepairRequestItem {
  const quantity = input.quantity ?? null;
  const unitPrice = input.unitPrice ?? null;
  return {
    id: id("consumer_item"),
    requestDraftId: input.requestDraftId,
    itemType: input.itemType,
    titleRu: input.titleRu,
    quantity,
    unit: input.unit ?? null,
    unitPrice,
    totalPrice: quantity != null && unitPrice != null ? Math.round(quantity * unitPrice) : null,
    currency: input.currency ?? "KGS",
    source: input.source ?? "ai_suggested",
    catalogItemId: input.catalogItemId ?? null,
    selectedCatalogItemId: input.selectedCatalogItemId ?? input.catalogItemId ?? null,
    materialKey: input.materialKey ?? null,
    rateKey: input.rateKey ?? null,
    catalogBindingStatus: input.catalogBindingStatus ?? null,
    catalogCandidates: input.catalogCandidates ?? [],
    category: input.category ?? null,
    unitLabel: input.unitLabel ?? null,
    sourceId: input.sourceId ?? null,
    sourceLabel: input.sourceLabel ?? null,
    confidence: input.confidence,
    addedBy: input.addedBy,
    editableByConsumer: true,
    createdAt: new Date().toISOString(),
  };
}

export function selectConsumerRepairRequestItemCatalogCandidate(input: {
  item: ConsumerRepairRequestItem;
  candidate: ConsumerRepairCatalogCandidate;
}): ConsumerRepairRequestItem {
  const nextUnitPrice = input.candidate.unitPrice ?? input.item.unitPrice ?? null;
  const nextQuantity = input.item.quantity ?? 0;
  return {
    ...input.item,
    source: "catalog_item",
    catalogItemId: input.candidate.catalogItemId,
    selectedCatalogItemId: input.candidate.catalogItemId,
    titleRu: input.candidate.name,
    unit: input.candidate.unit,
    unitLabel: input.candidate.unitLabel,
    unitPrice: nextUnitPrice,
    totalPrice: nextUnitPrice != null ? Math.round(nextQuantity * nextUnitPrice) : input.item.totalPrice ?? null,
    currency: input.candidate.currency ?? input.item.currency,
    sourceId: input.candidate.sourceId ?? input.item.sourceId,
    sourceLabel: input.candidate.sourceLabel ?? input.item.sourceLabel,
    confidence: input.candidate.confidence,
    catalogBindingStatus: "matched",
    catalogCandidates: input.item.catalogCandidates?.some((candidate) => candidate.catalogItemId === input.candidate.catalogItemId)
      ? input.item.catalogCandidates
      : [...(input.item.catalogCandidates ?? []), input.candidate],
  };
}

export function updateConsumerRepairRequestItemQuantity(
  item: ConsumerRepairRequestItem,
  quantity: number,
): ConsumerRepairRequestItem {
  const nextQuantity = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
  return {
    ...item,
    quantity: nextQuantity,
    totalPrice: item.unitPrice != null ? Math.round(nextQuantity * item.unitPrice) : item.totalPrice ?? null,
  };
}
