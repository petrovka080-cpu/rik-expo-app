import { create } from "zustand";

import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "../../lib/offline/offlineStorage";
import type { PlatformOfflineSyncStatus } from "../../lib/offline/platformOffline.model";

export type ContractorProgressSyncStatus = PlatformOfflineSyncStatus;

export type ContractorProgressFailureClass =
  | "none"
  | "offline_wait"
  | "retryable_sync_failure"
  | "failed_terminal";

export type ContractorProgressDraftMaterial = {
  id: string | null;
  materialId: string | null;
  matCode: string | null;
  name: string | null;
  uom: string | null;
  qty: number;
  qtyFact: number;
  price: number | null;
  available: number | null;
};

export type ContractorProgressDraftFields = {
  qtyDone: number | null;
  selectedStage: string | null;
  comment: string | null;
  location: string | null;
  selectedDate: string | null;
};

export type ContractorProgressDraftContext = {
  workUom: string | null;
  rowObjectName: string | null;
  jobObjectName: string | null;
  workName: string | null;
};

export type ContractorProgressDraftRecord = {
  progressId: string;
  fields: ContractorProgressDraftFields;
  materials: ContractorProgressDraftMaterial[];
  context: ContractorProgressDraftContext;
  pendingLogId: string | null;
  syncStatus: ContractorProgressSyncStatus;
  failureClass: ContractorProgressFailureClass;
  retryCount: number;
  pendingCount: number;
  lastSyncAt: number | null;
  lastErrorAt: number | null;
  lastErrorStage: string | null;
  lastError: string | null;
  updatedAt: number | null;
};

type ContractorProgressDraftStoreState = {
  hydrated: boolean;
  drafts: Record<string, ContractorProgressDraftRecord>;
};

type PersistedContractorProgressDraftStore = {
  version: 1;
  drafts: Record<string, ContractorProgressDraftRecord>;
};

export type ContractorProgressSyncUiStatus = {
  label: string;
  detail: string | null;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
};

const STORAGE_KEY = "contractor_progress_draft_store_v1";

const initialState: ContractorProgressDraftStoreState = {
  hydrated: false,
  drafts: {},
};

let storageAdapter: OfflineStorageAdapter = createDefaultOfflineStorage();

export const useContractorProgressDraftStore = create<ContractorProgressDraftStoreState>(() => initialState);

const trim = (value: unknown) => String(value ?? "").trim();

const normalizeNullableNumber = (value: unknown): number | null => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const sanitizeMaterials = (materials: ContractorProgressDraftMaterial[]) =>
  materials
    .map((material) => ({
      id: trim(material.id) || null,
      materialId: trim(material.materialId) || null,
      matCode: trim(material.matCode) || null,
      name: trim(material.name) || null,
      uom: trim(material.uom) || null,
      qty: Number(material.qty),
      qtyFact: Number(material.qtyFact),
      price: normalizeNullableNumber(material.price),
      available: normalizeNullableNumber(material.available),
    }))
    .filter((material) => Number.isFinite(material.qtyFact) && material.qtyFact > 0)
    .sort((left, right) =>
      `${left.matCode ?? ""}:${left.name ?? ""}`.localeCompare(`${right.matCode ?? ""}:${right.name ?? ""}`),
    );

const emptyFields = (): ContractorProgressDraftFields => ({
  qtyDone: null,
  selectedStage: null,
  comment: null,
  location: null,
  selectedDate: null,
});

const emptyContext = (): ContractorProgressDraftContext => ({
  workUom: null,
  rowObjectName: null,
  jobObjectName: null,
  workName: null,
});

const hasMeaningfulFields = (fields: ContractorProgressDraftFields | null | undefined) =>
  fields?.qtyDone != null ||
  Boolean(trim(fields?.selectedStage)) ||
  Boolean(trim(fields?.comment)) ||
  Boolean(trim(fields?.location)) ||
  Boolean(trim(fields?.selectedDate));

const createBaseDraft = (progressId: string): ContractorProgressDraftRecord => ({
  progressId,
  fields: emptyFields(),
  materials: [],
  context: emptyContext(),
  pendingLogId: null,
  syncStatus: "idle",
  failureClass: "none",
  retryCount: 0,
  pendingCount: 0,
  lastSyncAt: null,
  lastErrorAt: null,
  lastErrorStage: null,
  lastError: null,
  updatedAt: null,
});

const normalizeFields = (
  value: Partial<ContractorProgressDraftFields> | null | undefined,
): ContractorProgressDraftFields => ({
  qtyDone: normalizeNullableNumber(value?.qtyDone),
  selectedStage: trim(value?.selectedStage) || null,
  comment: trim(value?.comment) || null,
  location: trim(value?.location) || null,
  selectedDate: trim(value?.selectedDate) || null,
});

const normalizeContext = (
  value: Partial<ContractorProgressDraftContext> | null | undefined,
): ContractorProgressDraftContext => ({
  workUom: trim(value?.workUom) || null,
  rowObjectName: trim(value?.rowObjectName) || null,
  jobObjectName: trim(value?.jobObjectName) || null,
  workName: trim(value?.workName) || null,
});

const normalizeDraft = (
  progressId: string,
  value: Partial<ContractorProgressDraftRecord> | null | undefined,
): ContractorProgressDraftRecord => {
  const base = createBaseDraft(trim(progressId));
  const nextStatus = trim(value?.syncStatus) as ContractorProgressSyncStatus;
  const nextFailureClass = trim(value?.failureClass) as ContractorProgressFailureClass;

  return {
    ...base,
    progressId: trim(progressId),
    fields: normalizeFields(value?.fields),
    materials: sanitizeMaterials(
      Array.isArray(value?.materials) ? (value?.materials as ContractorProgressDraftMaterial[]) : [],
    ),
    context: normalizeContext(value?.context),
    pendingLogId: trim(value?.pendingLogId) || null,
    syncStatus:
      nextStatus === "dirty_local" ||
      nextStatus === "queued" ||
      nextStatus === "syncing" ||
      nextStatus === "synced" ||
      nextStatus === "retry_wait" ||
      nextStatus === "failed_terminal"
        ? nextStatus
        : "idle",
    failureClass:
      nextFailureClass === "offline_wait" ||
      nextFailureClass === "retryable_sync_failure" ||
      nextFailureClass === "failed_terminal"
        ? nextFailureClass
        : "none",
    retryCount: Number.isFinite(Number(value?.retryCount)) ? Number(value?.retryCount) : 0,
    pendingCount: Number.isFinite(Number(value?.pendingCount)) ? Number(value?.pendingCount) : 0,
    lastSyncAt: normalizeNullableNumber(value?.lastSyncAt),
    lastErrorAt: normalizeNullableNumber(value?.lastErrorAt),
    lastErrorStage: trim(value?.lastErrorStage) || null,
    lastError: trim(value?.lastError) || null,
    updatedAt: normalizeNullableNumber(value?.updatedAt),
  };
};

const persistState = async (state: ContractorProgressDraftStoreState) => {
  const payload: PersistedContractorProgressDraftStore = {
    version: 1,
    drafts: state.drafts,
  };

  if (!Object.keys(payload.drafts).length) {
    await storageAdapter.removeItem(STORAGE_KEY);
    return;
  }

  await writeJsonToStorage(storageAdapter, STORAGE_KEY, payload);
};

const setAndPersistState = async (next: ContractorProgressDraftStoreState) => {
  useContractorProgressDraftStore.setState(next);
  await persistState(next);
  return next;
};

const updateDrafts = async (
  updater: (previous: ContractorProgressDraftStoreState) => ContractorProgressDraftStoreState,
) => await setAndPersistState(updater(useContractorProgressDraftStore.getState()));

export const configureContractorProgressDraftStore = (options?: {
  storage?: OfflineStorageAdapter;
}) => {
  storageAdapter = options?.storage ?? createDefaultOfflineStorage();
};

export const hydrateContractorProgressDraftStore = async (): Promise<ContractorProgressDraftStoreState> => {
  const loaded = await readJsonFromStorage<Partial<PersistedContractorProgressDraftStore>>(
    storageAdapter,
    STORAGE_KEY,
  );
  const draftsRaw = loaded?.drafts ?? {};
  const drafts = Object.fromEntries(
    Object.entries(draftsRaw).map(([progressId, record]) => [
      trim(progressId),
      normalizeDraft(progressId, record ?? {}),
    ]),
  );

  const next: ContractorProgressDraftStoreState = {
    hydrated: true,
    drafts,
  };

  useContractorProgressDraftStore.setState(next);
  return next;
};

export const clearContractorProgressDraftStore = async (): Promise<ContractorProgressDraftStoreState> =>
  await setAndPersistState({
    hydrated: true,
    drafts: {},
  });

export const getContractorProgressDraft = (progressId: string): ContractorProgressDraftRecord | null => {
  const key = trim(progressId);
  if (!key) return null;
  return useContractorProgressDraftStore.getState().drafts[key] ?? null;
};

export const replaceContractorProgressDraft = async (
  progressId: string,
  patch: Partial<ContractorProgressDraftRecord>,
): Promise<ContractorProgressDraftRecord | null> => {
  const key = trim(progressId);
  if (!key) return null;

  const previous = getContractorProgressDraft(key);
  const next = normalizeDraft(key, {
    ...(previous ?? createBaseDraft(key)),
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

export const patchContractorProgressDraftContext = async (
  progressId: string,
  context: Partial<ContractorProgressDraftContext>,
): Promise<ContractorProgressDraftRecord | null> => {
  const previous = getContractorProgressDraft(progressId);
  const nextContext = {
    ...(previous?.context ?? emptyContext()),
    ...normalizeContext(context),
  };
  return await replaceContractorProgressDraft(progressId, {
    context: nextContext,
  });
};

const resolveDirtyStatus = (
  previous: ContractorProgressDraftRecord | null,
  hasLocalContent: boolean,
) => {
  const hasQueue = (previous?.pendingCount ?? 0) > 0;
  if (!hasLocalContent && !hasQueue) return "idle" as const;
  if (previous?.syncStatus === "syncing") return "syncing" as const;
  if (hasQueue) return "queued" as const;
  return "dirty_local" as const;
};

export const setContractorProgressDraftFields = async (
  progressId: string,
  fieldsPatch: Partial<ContractorProgressDraftFields>,
): Promise<ContractorProgressDraftRecord | null> => {
  const previous = getContractorProgressDraft(progressId);
  const nextFields = {
    ...(previous?.fields ?? emptyFields()),
    ...normalizeFields(fieldsPatch),
  };
  const hasLocalContent = hasMeaningfulFields(nextFields) || (previous?.materials.length ?? 0) > 0;

  return await replaceContractorProgressDraft(progressId, {
    fields: nextFields,
    pendingLogId: previous?.syncStatus === "syncing" ? previous.pendingLogId : null,
    syncStatus: resolveDirtyStatus(previous, hasLocalContent),
    failureClass:
      previous?.syncStatus === "syncing"
        ? previous.failureClass
        : hasLocalContent
          ? "none"
          : previous?.failureClass ?? "none",
    lastError: previous?.syncStatus === "syncing" ? previous.lastError : null,
  });
};

export const setContractorProgressDraftMaterials = async (
  progressId: string,
  materials: ContractorProgressDraftMaterial[],
): Promise<ContractorProgressDraftRecord | null> => {
  const previous = getContractorProgressDraft(progressId);
  const sanitized = sanitizeMaterials(materials);
  const hasLocalContent = sanitized.length > 0 || hasMeaningfulFields(previous?.fields ?? emptyFields());

  return await replaceContractorProgressDraft(progressId, {
    materials: sanitized,
    pendingLogId: previous?.syncStatus === "syncing" ? previous.pendingLogId : null,
    syncStatus: resolveDirtyStatus(previous, hasLocalContent),
    failureClass: previous?.syncStatus === "syncing" ? previous.failureClass : "none",
    lastError: previous?.syncStatus === "syncing" ? previous.lastError : null,
  });
};

export const setContractorProgressPendingLogId = async (
  progressId: string,
  pendingLogId: string | null,
): Promise<ContractorProgressDraftRecord | null> =>
  await replaceContractorProgressDraft(progressId, {
    pendingLogId: trim(pendingLogId) || null,
  });

export const markContractorProgressQueued = async (
  progressId: string,
  pendingCount: number,
): Promise<ContractorProgressDraftRecord | null> =>
  await replaceContractorProgressDraft(progressId, {
    syncStatus: pendingCount > 0 ? "queued" : "dirty_local",
    failureClass: "none",
    pendingCount,
    lastError: null,
    lastErrorAt: null,
    lastErrorStage: null,
  });

export const markContractorProgressSyncing = async (
  progressId: string,
  pendingCount: number,
): Promise<ContractorProgressDraftRecord | null> =>
  await replaceContractorProgressDraft(progressId, {
    syncStatus: pendingCount > 0 ? "syncing" : "idle",
    pendingCount,
  });

export const markContractorProgressSynced = async (
  progressId: string,
  options?: {
    pendingCount?: number;
    keepFields?: boolean;
    keepMaterials?: boolean;
  },
): Promise<ContractorProgressDraftRecord | null> => {
  const previous = getContractorProgressDraft(progressId);
  return await replaceContractorProgressDraft(progressId, {
    fields: options?.keepFields ? previous?.fields ?? emptyFields() : emptyFields(),
    materials: options?.keepMaterials ? previous?.materials ?? [] : [],
    pendingLogId: null,
    syncStatus: "synced",
    failureClass: "none",
    retryCount: 0,
    pendingCount: options?.pendingCount ?? 0,
    lastSyncAt: Date.now(),
    lastErrorAt: null,
    lastErrorStage: null,
    lastError: null,
  });
};

export const markContractorProgressRetryWait = async (
  progressId: string,
  params: {
    errorMessage: string;
    errorStage: string;
    pendingCount: number;
    failureClass: Extract<ContractorProgressFailureClass, "offline_wait" | "retryable_sync_failure">;
    pendingLogId?: string | null;
  },
): Promise<ContractorProgressDraftRecord | null> => {
  const previous = getContractorProgressDraft(progressId);
  return await replaceContractorProgressDraft(progressId, {
    pendingLogId:
      params.pendingLogId !== undefined ? trim(params.pendingLogId) || null : previous?.pendingLogId ?? null,
    syncStatus: "retry_wait",
    failureClass: params.failureClass,
    retryCount: (previous?.retryCount ?? 0) + 1,
    pendingCount: params.pendingCount,
    lastErrorAt: Date.now(),
    lastErrorStage: trim(params.errorStage) || null,
    lastError: trim(params.errorMessage) || null,
  });
};

export const markContractorProgressFailedTerminal = async (
  progressId: string,
  params: {
    errorMessage: string;
    errorStage: string;
    pendingLogId?: string | null;
  },
): Promise<ContractorProgressDraftRecord | null> =>
  await replaceContractorProgressDraft(progressId, {
    pendingLogId: params.pendingLogId !== undefined ? trim(params.pendingLogId) || null : null,
    syncStatus: "failed_terminal",
    failureClass: "failed_terminal",
    pendingCount: 0,
    lastErrorAt: Date.now(),
    lastErrorStage: trim(params.errorStage) || null,
    lastError: trim(params.errorMessage) || null,
  });

const formatSyncTime = (value: number | null) =>
  value ? new Date(value).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : null;

export const buildContractorProgressSyncUiStatus = (
  draft: ContractorProgressDraftRecord | null | undefined,
): ContractorProgressSyncUiStatus => {
  if (!draft) {
    return {
      label: "Готово к сохранению",
      detail: null,
      tone: "neutral",
    };
  }

  switch (draft.syncStatus) {
    case "dirty_local":
      return {
        label: "Сохранено локально",
        detail: draft.materials.length > 0 ? `${draft.materials.length} поз.` : "Есть несинхронизированные изменения",
        tone: "warning",
      };
    case "queued":
      return {
        label: "В очереди",
        detail: draft.pendingCount > 0 ? `${draft.pendingCount} в очереди` : null,
        tone: "warning",
      };
    case "syncing":
      return {
        label: "Синхронизация",
        detail: draft.pendingCount > 0 ? `${draft.pendingCount} в очереди` : null,
        tone: "info",
      };
    case "synced":
      return {
        label: "Сохранено",
        detail: formatSyncTime(draft.lastSyncAt),
        tone: "success",
      };
    case "retry_wait":
      return {
        label: draft.failureClass === "offline_wait" ? "Ждёт сеть" : "Повторите отправку",
        detail: draft.lastError || null,
        tone: "warning",
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
        label: "Готово к сохранению",
        detail: null,
        tone: "neutral",
      };
  }
};
