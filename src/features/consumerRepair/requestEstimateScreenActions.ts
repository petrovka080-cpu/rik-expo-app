import {
  addConsumerRepairRequestItem,
  updateConsumerRepairRequestDraft,
  type ConsumerRepairDraftBundle,
  type ConsumerRepairRequestItem,
  type ConsumerRepairSelectedWork,
} from "../../lib/consumerRequests";

export type ConsumerRepairDraftEditableFields = {
  problemText: string;
  repairType: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  selectedWork?: ConsumerRepairSelectedWork | null;
};

export const buildConsumerRepairDraftPatch = (fields: ConsumerRepairDraftEditableFields) => ({
  problemText: fields.problemText,
  repairType: fields.repairType,
  city: fields.city || null,
  addressText: fields.addressText || null,
  preferredTimeText: fields.preferredTimeText || null,
  contactPhone: fields.contactPhone || null,
  selectedWorkKey: fields.selectedWork?.selectedWorkKey ?? null,
  selectedWorkTitleRu: fields.selectedWork?.selectedWorkTitleRu ?? null,
  selectedWorkCategoryKey: fields.selectedWork?.selectedWorkCategoryKey ?? null,
  selectedWorkCategoryTitleRu: fields.selectedWork?.selectedWorkCategoryTitleRu ?? null,
  selectedWorkRawInput: fields.selectedWork?.selectedWorkRawInput ?? null,
  selectedWorkSource: fields.selectedWork?.selectedWorkSource ?? null,
  selectedWorkResolverReGuessed: fields.selectedWork?.selectedWorkResolverReGuessed ?? null,
});

export function syncConsumerRepairDraftFields(
  current: ConsumerRepairDraftBundle,
  fields: ConsumerRepairDraftEditableFields,
): ConsumerRepairDraftBundle {
  if (current.draft.status === "sent_to_marketplace") return current;
  return updateConsumerRepairRequestDraft({
    requestDraftId: current.draft.id,
    patch: buildConsumerRepairDraftPatch(fields),
  });
}

export function restoreConsumerRepairRequestItem(params: {
  current: ConsumerRepairDraftBundle;
  item: ConsumerRepairRequestItem;
}): ConsumerRepairDraftBundle {
  const { current, item } = params;
  return addConsumerRepairRequestItem({
    requestDraftId: current.draft.id,
    titleRu: item.titleRu,
    itemType: item.itemType,
    quantity: item.quantity ?? 1,
    unit: item.unit ?? undefined,
    unitLabel: item.unitLabel,
    unitPrice: item.unitPrice,
    currency: item.currency,
    source: item.source,
    catalogItemId: item.catalogItemId,
    selectedCatalogItemId: item.selectedCatalogItemId,
    materialKey: item.materialKey,
    rateKey: item.rateKey,
    catalogBindingStatus: item.catalogBindingStatus ?? undefined,
    catalogCandidates: item.catalogCandidates,
    category: item.category,
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    confidence: item.confidence,
    addedBy: item.addedBy,
  });
}

export function addConsumerRepairCustomNoteItem(current: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
  return addConsumerRepairRequestItem({
    requestDraftId: current.draft.id,
    titleRu: "Пользовательское примечание",
    itemType: "other",
    quantity: 1,
    unit: "set",
    unitLabel: "компл.",
    unitPrice: null,
    currency: "KGS",
    source: "custom",
    confidence: "low",
    addedBy: "user",
  });
}
