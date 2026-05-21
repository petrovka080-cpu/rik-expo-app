import type { ConsumerRepairRequestItem, ConsumerRepairItemSource, ConsumerRepairItemType } from "./consumerRequestTypes";

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
    editableByConsumer: true,
    createdAt: new Date().toISOString(),
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
