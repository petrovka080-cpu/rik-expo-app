import type { ConsumerRepairDraftBundle } from "./consumerRequestTypes";
import { safeJsonParseValue, safeJsonStringify } from "../format";

const store = {
  bundles: new Map<string, ConsumerRepairDraftBundle>(),
};

export type ConsumerRepairHistoryPageOptions = {
  cursorCreatedAt?: string | null;
  limit?: number;
};

export function cloneConsumerRepairValue<T>(value: T): T {
  return safeJsonParseValue<T>(safeJsonStringify(value), value);
}

export function saveConsumerRepairBundle(bundle: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
  store.bundles.set(bundle.draft.id, cloneConsumerRepairValue(bundle));
  return cloneConsumerRepairValue(bundle);
}

export function getConsumerRepairBundle(requestDraftId: string): ConsumerRepairDraftBundle {
  const bundle = store.bundles.get(requestDraftId);
  if (!bundle) throw new Error("Consumer repair request draft not found.");
  return cloneConsumerRepairValue(bundle);
}

export function deleteConsumerRepairBundle(requestDraftId: string): void {
  store.bundles.delete(requestDraftId);
}

export function listConsumerRepairBundlesForUser(
  consumerUserId: string,
  options: ConsumerRepairHistoryPageOptions = {},
): ConsumerRepairDraftBundle[] {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 20);
  return Array.from(store.bundles.values())
    .filter((bundle) => bundle.draft.consumerUserId === consumerUserId)
    .filter((bundle) => !options.cursorCreatedAt || bundle.draft.createdAt < options.cursorCreatedAt)
    .sort((a, b) => b.draft.createdAt.localeCompare(a.draft.createdAt))
    .slice(0, limit)
    .map(cloneConsumerRepairValue);
}

export function resetConsumerRepairRequestStoreForTests(): void {
  store.bundles.clear();
}
