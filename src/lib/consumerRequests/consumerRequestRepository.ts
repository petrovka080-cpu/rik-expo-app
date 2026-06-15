import type { ConsumerRepairDraftBundle } from "./consumerRequestTypes";
import { safeJsonParseValue, safeJsonStringify } from "../format";
import {
  bindConsumerRepairEstimateRevisionHistory,
  ensureConsumerRepairBundleEditableEstimateSnapshot,
  ensureConsumerRepairBundleEstimateRevisionState,
} from "./consumerRequestEditableEstimateSnapshot";

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
  const normalized = ensureConsumerRepairBundleEstimateRevisionState(
    ensureConsumerRepairBundleEditableEstimateSnapshot(bundle),
  );
  store.bundles.set(bundle.draft.id, cloneConsumerRepairValue(normalized));
  return cloneConsumerRepairValue(normalized);
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
    .map((bundle) => cloneConsumerRepairValue(bindConsumerRepairEstimateRevisionHistory({
      bundle,
      history_entry_id: `consumer_repair_history:${bundle.draft.id}`,
    })));
}

export function resetConsumerRepairRequestStoreForTests(): void {
  store.bundles.clear();
}
