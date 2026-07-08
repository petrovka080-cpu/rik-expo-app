import type { ConsumerRepairDraftBundle, ConsumerRepairStatus } from "./consumerRequestTypes";
import { safeJsonParseValue, safeJsonStringify } from "../format";
import {
  bindConsumerRepairEstimateRevisionHistory,
  ensureConsumerRepairBundleEditableEstimateSnapshot,
  ensureConsumerRepairBundleEstimateRevisionState,
} from "./consumerRequestEditableEstimateSnapshot";

const store = {
  bundles: new Map<string, ConsumerRepairDraftBundle>(),
};

const DURABLE_STORE_KEY = "rik.consumer_repair.request_bundles.v1";
let durableHydrated = false;

export type ConsumerRepairHistoryPageOptions = {
  cursorCreatedAt?: string | null;
  limit?: number;
  statuses?: ConsumerRepairStatus[];
};

export function cloneConsumerRepairValue<T>(value: T): T {
  return safeJsonParseValue<T>(safeJsonStringify(value), value);
}

function getWebDurableStorage(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    return null;
  }
  return null;
}

function hydrateConsumerRepairRequestStore(): void {
  if (durableHydrated) return;
  durableHydrated = true;
  const storage = getWebDurableStorage();
  let persisted: ConsumerRepairDraftBundle[] = [];
  try {
    persisted = safeJsonParseValue<ConsumerRepairDraftBundle[]>(
      storage?.getItem(DURABLE_STORE_KEY),
      [],
    );
  } catch {
    persisted = [];
  }
  for (const bundle of persisted) {
    if (bundle?.draft?.id) store.bundles.set(bundle.draft.id, bundle);
  }
}

function persistConsumerRepairRequestStore(): void {
  const storage = getWebDurableStorage();
  if (!storage) return;
  try {
    storage.setItem(DURABLE_STORE_KEY, safeJsonStringify(Array.from(store.bundles.values()), "[]"));
  } catch {
    // Persistence is best-effort for web reload recovery; in-memory flow remains authoritative this session.
  }
}

export function saveConsumerRepairBundle(bundle: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
  hydrateConsumerRepairRequestStore();
  const normalized = ensureConsumerRepairBundleEstimateRevisionState(
    ensureConsumerRepairBundleEditableEstimateSnapshot(bundle),
  );
  store.bundles.set(bundle.draft.id, cloneConsumerRepairValue(normalized));
  persistConsumerRepairRequestStore();
  return cloneConsumerRepairValue(normalized);
}

export function getConsumerRepairBundle(requestDraftId: string): ConsumerRepairDraftBundle {
  hydrateConsumerRepairRequestStore();
  const bundle = store.bundles.get(requestDraftId);
  if (!bundle) throw new Error("Consumer repair request draft not found.");
  return cloneConsumerRepairValue(bundle);
}

export function deleteConsumerRepairBundle(requestDraftId: string): ConsumerRepairDraftBundle {
  hydrateConsumerRepairRequestStore();
  const bundle = store.bundles.get(requestDraftId);
  if (!bundle) throw new Error("Consumer repair request draft not found.");
  const deletedAt = new Date().toISOString();
  const deleted: ConsumerRepairDraftBundle = {
    ...bundle,
    draft: {
      ...bundle.draft,
      status: "deleted_by_user",
      updatedAt: deletedAt,
      deletedAt,
    },
  };
  store.bundles.set(requestDraftId, cloneConsumerRepairValue(deleted));
  persistConsumerRepairRequestStore();
  return cloneConsumerRepairValue(deleted);
}

export function listConsumerRepairBundlesForUser(
  consumerUserId: string,
  options: ConsumerRepairHistoryPageOptions = {},
): ConsumerRepairDraftBundle[] {
  hydrateConsumerRepairRequestStore();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 20);
  const allowedStatuses = options.statuses?.length ? new Set(options.statuses) : null;
  return Array.from(store.bundles.values())
    .filter((bundle) => bundle.draft.consumerUserId === consumerUserId)
    .filter((bundle) => bundle.draft.status !== "deleted_by_user")
    .filter((bundle) => !allowedStatuses || allowedStatuses.has(bundle.draft.status))
    .filter((bundle) => !options.cursorCreatedAt || bundle.draft.createdAt < options.cursorCreatedAt)
    .sort((a, b) => b.draft.createdAt.localeCompare(a.draft.createdAt))
    .slice(0, limit)
    .map((bundle) => cloneConsumerRepairValue(bindConsumerRepairEstimateRevisionHistory({
      bundle,
      history_entry_id: `consumer_repair_history:${bundle.draft.id}`,
    })));
}

export function countConsumerRepairBundlesForUser(
  consumerUserId: string,
  options: Pick<ConsumerRepairHistoryPageOptions, "statuses"> = {},
): number {
  hydrateConsumerRepairRequestStore();
  const allowedStatuses = options.statuses?.length ? new Set(options.statuses) : null;
  return Array.from(store.bundles.values())
    .filter((bundle) => bundle.draft.consumerUserId === consumerUserId)
    .filter((bundle) => bundle.draft.status !== "deleted_by_user")
    .filter((bundle) => !allowedStatuses || allowedStatuses.has(bundle.draft.status))
    .length;
}

export function resetConsumerRepairRequestStoreForTests(): void {
  store.bundles.clear();
  durableHydrated = true;
  try {
    getWebDurableStorage()?.removeItem(DURABLE_STORE_KEY);
  } catch {
    // Test cleanup should not fail when web storage is unavailable.
  }
}

export function simulateConsumerRepairRequestStoreReloadForTests(): void {
  store.bundles.clear();
  durableHydrated = false;
}
