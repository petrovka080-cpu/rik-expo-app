import { create } from "zustand";

import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "../../lib/offline/offlineStorage";
import type { PlatformOfflineSyncStatus } from "../../lib/offline/platformOffline.model";

export type WarehouseReceiveSyncStatus = PlatformOfflineSyncStatus;

export type WarehouseReceiveDraftItem = {
  itemId: string;
  qty: number;
  localUpdatedAt: number;
};

export type WarehouseReceiveDraftRecord = {
  incomingId: string;
  items: WarehouseReceiveDraftItem[];
  status: WarehouseReceiveSyncStatus;
  lastSyncAt: number | null;
  retryCount: number;
  pendingCount: number;
  lastError: string | null;
  updatedAt: number | null;
};

type WarehouseReceiveDraftStoreState = {
  hydrated: boolean;
  drafts: Record<string, WarehouseReceiveDraftRecord>;
};

type PersistedWarehouseReceiveDraftStore = {
  version: 1;
  drafts: Record<string, WarehouseReceiveDraftRecord>;
};

export type WarehouseReceiveSyncUiStatus = {
  label: string;
  detail: string | null;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
};

const STORAGE_KEY = "warehouse_receive_draft_store_v1";

const initialState: WarehouseReceiveDraftStoreState = {
  hydrated: false,
  drafts: {},
};

let storageAdapter: OfflineStorageAdapter = createDefaultOfflineStorage();

export const useWarehouseReceiveDraftStore = create<WarehouseReceiveDraftStoreState>(() => initialState);

const trim = (value: unknown) => String(value ?? "").trim();

const sanitizeItems = (items: WarehouseReceiveDraftItem[]) =>
  items
    .map((item) => ({
      itemId: trim(item.itemId),
      qty: Number(item.qty),
      localUpdatedAt: Number.isFinite(Number(item.localUpdatedAt)) ? Number(item.localUpdatedAt) : Date.now(),
    }))
    .filter((item) => item.itemId && Number.isFinite(item.qty) && item.qty > 0)
    .sort((left, right) => left.itemId.localeCompare(right.itemId));

const normalizeDraft = (incomingId: string, value: Partial<WarehouseReceiveDraftRecord>): WarehouseReceiveDraftRecord => {
  const cleanIncomingId = trim(incomingId);
  return {
    incomingId: cleanIncomingId,
    items: sanitizeItems(Array.isArray(value.items) ? (value.items as WarehouseReceiveDraftItem[]) : []),
    status: (trim(value.status) as WarehouseReceiveSyncStatus) || "idle",
    lastSyncAt: Number.isFinite(Number(value.lastSyncAt)) ? Number(value.lastSyncAt) : null,
    retryCount: Number.isFinite(Number(value.retryCount)) ? Number(value.retryCount) : 0,
    pendingCount: Number.isFinite(Number(value.pendingCount)) ? Number(value.pendingCount) : 0,
    lastError: trim(value.lastError) || null,
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : null,
  };
};

const shouldPersistDraft = (draft: WarehouseReceiveDraftRecord): boolean => {
  if (draft.items.length > 0) return true;
  if (draft.pendingCount > 0) return true;
  if (draft.status === "dirty_local") return true;
  if (draft.status === "queued" || draft.status === "syncing" || draft.status === "retry_wait") return true;
  if (draft.status === "failed_terminal") return true;
  return false;
};

const pruneDraftsForPersistence = (
  drafts: Record<string, WarehouseReceiveDraftRecord>,
): Record<string, WarehouseReceiveDraftRecord> =>
  Object.fromEntries(
    Object.entries(drafts)
      .map(([incomingId, record]) => [trim(incomingId), normalizeDraft(incomingId, record)] as const)
      .filter(([incomingId, record]) => Boolean(incomingId) && shouldPersistDraft(record)),
  );

const persistState = async (state: WarehouseReceiveDraftStoreState) => {
  const drafts = pruneDraftsForPersistence(state.drafts);
  const payload: PersistedWarehouseReceiveDraftStore = {
    version: 1,
    drafts,
  };

  if (!Object.keys(payload.drafts).length) {
    await storageAdapter.removeItem(STORAGE_KEY);
    return;
  }

  await writeJsonToStorage(storageAdapter, STORAGE_KEY, payload);
};

const setAndPersistState = async (next: WarehouseReceiveDraftStoreState) => {
  useWarehouseReceiveDraftStore.setState(next);
  await persistState(next);
  return next;
};

const updateDrafts = async (
  updater: (previous: WarehouseReceiveDraftStoreState) => WarehouseReceiveDraftStoreState,
) => await setAndPersistState(updater(useWarehouseReceiveDraftStore.getState()));

export const configureWarehouseReceiveDraftStore = (options?: {
  storage?: OfflineStorageAdapter;
}) => {
  storageAdapter = options?.storage ?? createDefaultOfflineStorage();
};

export const hydrateWarehouseReceiveDraftStore = async (): Promise<WarehouseReceiveDraftStoreState> => {
  const loaded = await readJsonFromStorage<Partial<PersistedWarehouseReceiveDraftStore>>(storageAdapter, STORAGE_KEY);
  const draftsRaw = loaded?.drafts ?? {};
  const normalizedDrafts = Object.fromEntries(
    Object.entries(draftsRaw).map(([incomingId, record]) => [trim(incomingId), normalizeDraft(incomingId, record ?? {})]),
  );
  const drafts = pruneDraftsForPersistence(normalizedDrafts);

  const next: WarehouseReceiveDraftStoreState = {
    hydrated: true,
    drafts,
  };

  useWarehouseReceiveDraftStore.setState(next);
  if (Object.keys(normalizedDrafts).length !== Object.keys(drafts).length) {
    await persistState(next);
  }
  return next;
};

export const clearWarehouseReceiveDraftStore = async (): Promise<WarehouseReceiveDraftStoreState> =>
  await setAndPersistState({
    hydrated: true,
    drafts: {},
  });

export const getWarehouseReceiveDraft = (incomingId: string): WarehouseReceiveDraftRecord | null => {
  const key = trim(incomingId);
  if (!key) return null;
  return useWarehouseReceiveDraftStore.getState().drafts[key] ?? null;
};

export const replaceWarehouseReceiveDraft = async (
  incomingId: string,
  patch: Partial<WarehouseReceiveDraftRecord>,
): Promise<WarehouseReceiveDraftRecord | null> => {
  const key = trim(incomingId);
  if (!key) return null;

  const previous = getWarehouseReceiveDraft(key);
  const next = normalizeDraft(key, {
    ...(previous ?? {
      incomingId: key,
      items: [],
      status: "idle",
      lastSyncAt: null,
      retryCount: 0,
      pendingCount: 0,
      lastError: null,
      updatedAt: null,
    }),
    ...patch,
    updatedAt: Date.now(),
  });

  await updateDrafts((state) => ({
    ...state,
    hydrated: true,
    drafts: {
      ...state.drafts,
      [key]: next,
    },
  }));

  return next;
};

export const setWarehouseReceiveDraftItems = async (
  incomingId: string,
  items: WarehouseReceiveDraftItem[],
): Promise<WarehouseReceiveDraftRecord | null> => {
  const previous = getWarehouseReceiveDraft(incomingId);
  const sanitized = sanitizeItems(items);
  const hasQueue = (previous?.pendingCount ?? 0) > 0;
  const nextStatus: WarehouseReceiveSyncStatus =
    sanitized.length === 0
      ? hasQueue
        ? previous?.status ?? "queued"
        : "idle"
      : previous?.status === "syncing"
        ? "syncing"
        : hasQueue
          ? "queued"
          : "dirty_local";

  return await replaceWarehouseReceiveDraft(incomingId, {
    items: sanitized,
    status: nextStatus,
    lastError: nextStatus === "dirty_local" || nextStatus === "idle" ? null : previous?.lastError ?? null,
  });
};

export const markWarehouseReceiveDraftQueued = async (
  incomingId: string,
  pendingCount: number,
): Promise<WarehouseReceiveDraftRecord | null> =>
  await replaceWarehouseReceiveDraft(incomingId, {
    status: pendingCount > 0 ? "queued" : "dirty_local",
    pendingCount,
    lastError: null,
  });

export const markWarehouseReceiveDraftSyncing = async (
  incomingId: string,
  pendingCount: number,
): Promise<WarehouseReceiveDraftRecord | null> =>
  await replaceWarehouseReceiveDraft(incomingId, {
    status: pendingCount > 0 ? "syncing" : "idle",
    pendingCount,
  });

export const markWarehouseReceiveDraftSynced = async (
  incomingId: string,
  options?: {
    keepItems?: boolean;
    pendingCount?: number;
  },
): Promise<WarehouseReceiveDraftRecord | null> => {
  const previous = getWarehouseReceiveDraft(incomingId);
  return await replaceWarehouseReceiveDraft(incomingId, {
    items: options?.keepItems ? previous?.items ?? [] : [],
    status: options?.keepItems ? "dirty_local" : "synced",
    lastSyncAt: Date.now(),
    retryCount: 0,
    pendingCount: options?.pendingCount ?? 0,
    lastError: null,
  });
};

export const markWarehouseReceiveDraftRetryWait = async (
  incomingId: string,
  errorMessage: string,
  pendingCount: number,
): Promise<WarehouseReceiveDraftRecord | null> => {
  const previous = getWarehouseReceiveDraft(incomingId);
  return await replaceWarehouseReceiveDraft(incomingId, {
    status: "retry_wait",
    retryCount: (previous?.retryCount ?? 0) + 1,
    pendingCount,
    lastError: trim(errorMessage) || previous?.lastError || null,
  });
};

export const selectWarehouseReceiveQtyInputMap = (incomingId: string): Record<string, string> => {
  const draft = getWarehouseReceiveDraft(incomingId);
  if (!draft) return {};
  return Object.fromEntries(draft.items.map((item) => [item.itemId, String(item.qty)]));
};

export const buildWarehouseReceiveSyncUiStatus = (
  draft: WarehouseReceiveDraftRecord | null | undefined,
): WarehouseReceiveSyncUiStatus => {
  if (!draft) {
    return {
      label: "Черновик не создан",
      detail: null,
      tone: "neutral",
    };
  }

  switch (draft.status) {
    case "dirty_local":
      return {
        label: "Сохранено локально",
        detail: draft.items.length > 0 ? `${draft.items.length} поз.` : null,
        tone: "warning",
      };
    case "queued":
      return {
        label: "В очереди",
        detail: draft.pendingCount > 0 ? `${draft.pendingCount} pending` : null,
        tone: "warning",
      };
    case "syncing":
      return {
        label: "Синхронизация",
        detail: draft.pendingCount > 0 ? `${draft.pendingCount} pending` : null,
        tone: "info",
      };
    case "synced":
      return {
        label: "Синхронизировано",
        detail: draft.lastSyncAt ? new Date(draft.lastSyncAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : null,
        tone: "success",
      };
    case "retry_wait":
      return {
        label: "Ждёт повтор",
        detail: draft.lastError || null,
        tone: "danger",
      };
    case "failed_terminal":
      return {
        label: "Нужна проверка",
        detail: draft.lastError || null,
        tone: "danger",
      };
    case "idle":
    default:
      return {
        label: "Готово к вводу",
        detail: null,
        tone: "neutral",
      };
  }
};
