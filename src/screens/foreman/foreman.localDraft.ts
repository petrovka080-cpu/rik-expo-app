import {
  clearLocalDraftId,
  fetchRequestDetails,
  listRequestItems,
  setLocalDraftId,
  type ReqItemRow,
  type RequestDetails,
} from "../../lib/catalog_api";
import { safeJsonParse, safeJsonStringify } from "../../lib/format";
import { createDefaultOfflineStorage } from "../../lib/offline/offlineStorage";
import { isDraftLikeStatus } from "./foreman.helpers";
import {
  syncForemanAtomicDraft,
  type ForemanDraftSyncMutationKind,
} from "./foreman.draftSync.repository";
import {
  clearForemanDurableDraftState,
  getForemanDurableDraftState,
  hydrateForemanDurableDraftStore,
  replaceForemanDurableDraftSnapshot,
} from "./foreman.durableDraft.store";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { FOREMAN_LOCAL_ONLY_REQUEST_ID } from "./foreman.localDraft.constants";
import type { RequestDraftMeta } from "./foreman.types";
import {
  resolveForemanDraftServerRevision,
} from "./foreman.localDraft.version";
export {
  areForemanLocalDraftSnapshotsEqual,
  buildForemanLocalDraftRevisionStamp,
  compareForemanLocalDraftSnapshotsByVersion,
} from "./foreman.localDraft.version";
export type {
  ForemanLocalDraftRevisionStamp,
  ForemanLocalDraftVersionCompareResult,
} from "./foreman.localDraft.version";

const LEGACY_LOCAL_DRAFT_STORAGE_KEY = "foreman_materials_local_draft_v1";
export { FOREMAN_LOCAL_ONLY_REQUEST_ID } from "./foreman.localDraft.constants";

export type ForemanLocalDraftHeader = {
  foreman: string;
  comment: string;
  objectType: string;
  level: string;
  system: string;
  zone: string;
};

export type ForemanLocalDraftItem = {
  local_id: string;
  remote_item_id: string | null;
  rik_code: string | null;
  name_human: string;
  qty: number;
  uom: string | null;
  status: string | null;
  note: string | null;
  app_code: string | null;
  kind: string | null;
  line_no: number | null;
};

export type ForemanLocalDraftDelete = {
  local_id: string;
  remote_item_id: string;
};

export type ForemanLocalDraftSnapshot = {
  version: 1;
  ownerId: string;
  requestId: string;
  displayNo: string | null;
  status: string | null;
  header: ForemanLocalDraftHeader;
  items: ForemanLocalDraftItem[];
  qtyDrafts: Record<string, string>;
  pendingDeletes: ForemanLocalDraftDelete[];
  submitRequested: boolean;
  lastError: string | null;
  updatedAt: string;
  baseServerRevision?: string | null;
};

export type ForemanDraftAppendInput = {
  rik_code: string;
  qty: number;
  meta?: {
    note?: string | null;
    app_code?: string | null;
    kind?: string | null;
    name_human?: string | null;
    uom?: string | null;
  };
};

export type ForemanLocalDraftSyncResult = {
  snapshot: ForemanLocalDraftSnapshot | null;
  rows: ReqItemRow[];
  submitted: unknown | null;
  branchMeta?: {
    sourcePath: "rpc_v2";
  };
};

export type ForemanDraftBootstrapResolution =
  | {
      kind: "snapshot";
      snapshot: ForemanLocalDraftSnapshot;
      restoreSource: "snapshot";
      restoreIdentity: string;
    }
  | {
      kind: "remoteDraft";
      requestId: string;
      details: RequestDetails;
      restoreSource: "remoteDraft";
      restoreIdentity: string;
    }
  | {
      kind: "none";
      restoreSource: "none";
      restoreIdentity: null;
    };

const emptyHeader = (): ForemanLocalDraftHeader => ({
  foreman: "",
  comment: "",
  objectType: "",
  level: "",
  system: "",
  zone: "",
});

const legacyDraftStorage = createDefaultOfflineStorage();

const trim = (value: unknown): string => String(value ?? "").trim();

const recordForemanLocalDraftFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) => {
  const details =
    error instanceof Error
      ? {
          errorClass: trim(error.name) || "Error",
          errorMessage: trim(error.message) || "foreman_local_draft_error",
        }
      : {
          errorClass: "UnknownError",
          errorMessage: trim(error) || "foreman_local_draft_error",
        };
  recordPlatformObservability({
    screen: "foreman",
    surface: "local_draft",
    category: "ui",
    event,
    result: "error",
    errorClass: details.errorClass,
    errorMessage: details.errorMessage,
    extra: {
      module: "foreman",
      action: event,
      owner: "local_draft",
      fallbackUsed: true,
      ...extra,
    },
  });
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const makeLocalItemId = () => `fld-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const makeDraftOwnerId = () => `fdo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const resolveDraftOwnerId = (value: unknown, requestId?: unknown): string => {
  const explicit = trim(value);
  if (explicit) return explicit;
  const requestKey = trim(requestId);
  if (requestKey) return `srv:${requestKey}`;
  return makeDraftOwnerId();
};

const normalizeDraftRowId = (value: string | number | null | undefined) => trim(value);

const snapshotItemRowId = (item: ForemanLocalDraftItem) => item.remote_item_id || item.local_id;

type ForemanLocalDraftHeaderInput = {
  [K in keyof ForemanLocalDraftHeader]?: ForemanLocalDraftHeader[K] | null | undefined;
};

const normalizeHeader = (value?: ForemanLocalDraftHeaderInput | null): ForemanLocalDraftHeader => ({
  foreman: trim(value?.foreman),
  comment: trim(value?.comment),
  objectType: trim(value?.objectType),
  level: trim(value?.level),
  system: trim(value?.system),
  zone: trim(value?.zone),
});

const normalizeLocalItem = (value: unknown): ForemanLocalDraftItem | null => {
  const row = asRecord(value);
  if (!row) return null;
  const localId = trim(row.local_id) || makeLocalItemId();
  const remoteItemId = trim(row.remote_item_id) || null;
  const qty = Number(row.qty ?? 0);
  const nameHuman = trim(row.name_human);
  if (!nameHuman || !Number.isFinite(qty) || qty <= 0) return null;

  return {
    local_id: localId,
    remote_item_id: remoteItemId,
    rik_code: trim(row.rik_code) || null,
    name_human: nameHuman,
    qty,
    uom: trim(row.uom) || null,
    status: trim(row.status) || "Черновик",
    note: trim(row.note) || null,
    app_code: trim(row.app_code) || null,
    kind: trim(row.kind) || null,
    line_no: Number.isFinite(Number(row.line_no)) ? Number(row.line_no) : null,
  };
};

const normalizePendingDelete = (value: unknown): ForemanLocalDraftDelete | null => {
  const row = asRecord(value);
  if (!row) return null;
  const remoteItemId = trim(row.remote_item_id);
  if (!remoteItemId) return null;
  return {
    local_id: trim(row.local_id) || makeLocalItemId(),
    remote_item_id: remoteItemId,
  };
};

const parseForemanLocalDraftSnapshotRecord = (
  parsed: Record<string, unknown> | null,
): ForemanLocalDraftSnapshot | null => {
  const row = asRecord(parsed);
  if (!row) return null;

  const requestId = trim(row.requestId);
  const snapshot: ForemanLocalDraftSnapshot = {
    version: 1,
    ownerId: resolveDraftOwnerId(row.ownerId, requestId),
    requestId,
    displayNo: trim(row.displayNo) || null,
    status: trim(row.status) || "draft",
    header: normalizeHeader(asRecord(row.header) ?? undefined),
    items: Array.isArray(row.items)
      ? row.items
          .map((item) => normalizeLocalItem(item))
          .filter((item): item is ForemanLocalDraftItem => Boolean(item))
      : [],
    qtyDrafts:
      row.qtyDrafts && typeof row.qtyDrafts === "object" && !Array.isArray(row.qtyDrafts)
        ? Object.fromEntries(
            Object.entries(row.qtyDrafts as Record<string, unknown>).map(([key, value]) => [key, trim(value)]),
          )
        : {},
    pendingDeletes: Array.isArray(row.pendingDeletes)
      ? row.pendingDeletes
          .map((item) => normalizePendingDelete(item))
          .filter((item): item is ForemanLocalDraftDelete => Boolean(item))
      : [],
    submitRequested: row.submitRequested === true,
    lastError: trim(row.lastError) || null,
    updatedAt: trim(row.updatedAt) || new Date().toISOString(),
    baseServerRevision: trim(row.baseServerRevision) || null,
  };

  return hasForemanLocalDraftContent(snapshot) ? snapshot : null;
};

const cloneForemanLocalDraftSnapshot = (
  snapshot: ForemanLocalDraftSnapshot,
  eventBase = "snapshot_clone",
): ForemanLocalDraftSnapshot => {
  const serialized = safeJsonStringify(snapshot, "");
  if (serialized) {
    const parsed = safeJsonParse<Record<string, unknown> | null>(serialized, null);
    if (parsed.ok) {
      return parseForemanLocalDraftSnapshotRecord(parsed.value) ?? snapshot;
    }
    recordForemanLocalDraftFallback(`${eventBase}_parse_failed`, parsed.error, {
      sourceKind: "local_snapshot_json",
    });
  } else {
    recordForemanLocalDraftFallback(
      `${eventBase}_serialize_failed`,
      new Error("foreman_local_draft_json_serialize_failed"),
      {
        sourceKind: "local_snapshot_json",
      },
    );
  }

  return parseForemanLocalDraftSnapshotRecord(asRecord(snapshot)) ?? snapshot;
};

const loadLegacyForemanLocalDraftSnapshot = async (): Promise<ForemanLocalDraftSnapshot | null> => {
  try {
    const raw = await legacyDraftStorage.getItem(LEGACY_LOCAL_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = safeJsonParse<Record<string, unknown> | null>(raw, null);
    if (parsed.ok === false) throw parsed.error;
    return parseForemanLocalDraftSnapshotRecord(parsed.value);
  } catch (error) {
    recordForemanLocalDraftFallback("legacy_snapshot_load_failed", error, {
      storageKey: LEGACY_LOCAL_DRAFT_STORAGE_KEY,
    });
    return null;
  }
};

const clearLegacyForemanLocalDraftSnapshot = async (): Promise<void> => {
  await legacyDraftStorage.removeItem(LEGACY_LOCAL_DRAFT_STORAGE_KEY);
};

export const buildForemanDraftRestoreId = (
  snapshot: ForemanLocalDraftSnapshot | null | undefined,
): string | null => {
  if (!snapshot) return null;
  const ownerKey = trim(snapshot.ownerId) || trim(snapshot.requestId) || FOREMAN_LOCAL_ONLY_REQUEST_ID;
  return `snapshot:${ownerKey}:${snapshot.updatedAt}`;
};

export const countForemanDraftSnapshotLines = (
  snapshot: ForemanLocalDraftSnapshot | null | undefined,
): number => {
  if (!snapshot) return 0;
  return snapshot.items.filter((item) => Number.isFinite(item.qty) && item.qty > 0).length;
};

export const buildForemanDraftRequestDetails = (
  snapshot: ForemanLocalDraftSnapshot,
  previous: RequestDetails | null,
): RequestDetails => ({
  ...(snapshot.requestId ? (previous ?? { id: snapshot.requestId }) : { id: FOREMAN_LOCAL_ONLY_REQUEST_ID }),
  id: snapshot.requestId || FOREMAN_LOCAL_ONLY_REQUEST_ID,
  status: snapshot.status ?? previous?.status ?? "draft",
  display_no: snapshot.displayNo ?? (snapshot.requestId ? previous?.display_no ?? null : null),
  foreman_name: snapshot.header.foreman || previous?.foreman_name || null,
  comment: snapshot.header.comment || previous?.comment || null,
  object_type_code: snapshot.header.objectType || previous?.object_type_code || null,
  level_code: snapshot.header.level || previous?.level_code || null,
  system_code: snapshot.header.system || previous?.system_code || null,
  zone_code: snapshot.header.zone || previous?.zone_code || null,
});

export async function resolveForemanDraftBootstrap(params: {
  localDraftId?: string | null;
  clearDraftCache: (options?: {
    snapshot?: ForemanLocalDraftSnapshot | null;
    requestId?: string | null;
  }) => void | Promise<void>;
  fetchDetails: (requestId: string) => Promise<RequestDetails | null>;
}): Promise<ForemanDraftBootstrapResolution> {
  const snapshot = await loadForemanLocalDraftSnapshot();
  if (snapshot && hasForemanLocalDraftContent(snapshot)) {
    const snapshotRequestId = trim(snapshot.requestId);
    if (snapshotRequestId) {
      try {
        const details = await params.fetchDetails(snapshotRequestId);
        if (details && !isDraftLikeStatus(details.status)) {
          await params.clearDraftCache({
            snapshot,
            requestId: snapshotRequestId,
          });
          if (__DEV__) {
            console.info("[foreman.bootstrap]", {
              draftId: snapshotRequestId,
              requestId: snapshotRequestId,
              remoteStatus: details.status ?? null,
              postSubmitAction: "entered_empty_state",
              runtimeResult: "cleared_terminal_local_snapshot",
            });
          }
          return {
            kind: "none",
            restoreSource: "none",
            restoreIdentity: null,
          };
        }
      } catch (error) {
        recordForemanLocalDraftFallback("bootstrap_remote_validation_failed", error, {
          requestId: snapshotRequestId,
          action: "validate_remote_snapshot",
        });
        // Keep the durable snapshot when remote validation is unavailable.
      }
    }

    return {
      kind: "snapshot",
      snapshot,
      restoreSource: "snapshot",
      restoreIdentity: buildForemanDraftRestoreId(snapshot) ?? "snapshot:unknown",
    };
  }

  const localId = trim(params.localDraftId);
  if (!localId) {
    return {
      kind: "none",
      restoreSource: "none",
      restoreIdentity: null,
    };
  }

  try {
    const details = await params.fetchDetails(localId);
    if (details && isDraftLikeStatus(details.status)) {
      return {
        kind: "remoteDraft",
        requestId: localId,
        details,
        restoreSource: "remoteDraft",
        restoreIdentity: `remote:${localId}`,
      };
    }
    await params.clearDraftCache({
      requestId: localId,
    });
  } catch (error) {
    recordForemanLocalDraftFallback("bootstrap_remote_fetch_failed", error, {
      requestId: localId,
      action: "fetch_remote_draft",
    });
    await params.clearDraftCache({
      requestId: localId,
    });
  }

  return {
    kind: "none",
    restoreSource: "none",
    restoreIdentity: null,
  };
}

const rowMatchesSnapshotItem = (row: ReqItemRow, item: ForemanLocalDraftItem) => {
  const remoteId = trim(row.id);
  if (item.remote_item_id && remoteId === item.remote_item_id) return true;
  if (trim(row.rik_code) && trim(item.rik_code) && trim(row.rik_code) === trim(item.rik_code)) return true;
  return false;
};

const reqRowToLocalItem = (
  row: ReqItemRow,
  existing?: ForemanLocalDraftItem | null,
): ForemanLocalDraftItem => ({
  local_id: existing?.local_id ?? makeLocalItemId(),
  remote_item_id: trim(row.id) || null,
  rik_code: trim(row.rik_code) || existing?.rik_code || null,
  name_human: trim(row.name_human),
  qty: Number(row.qty ?? 0) || 0,
  uom: trim(row.uom) || null,
  status: trim(row.status) || "Черновик",
  note: trim(row.note) || existing?.note || null,
  app_code: trim(row.app_code) || existing?.app_code || null,
  kind: existing?.kind ?? null,
  line_no: Number.isFinite(Number(row.line_no)) ? Number(row.line_no) : null,
});

export const hasForemanLocalDraftContent = (snapshot: ForemanLocalDraftSnapshot | null | undefined): boolean => {
  if (!snapshot) return false;
  if (snapshot.items.length > 0) return true;
  if (snapshot.pendingDeletes.length > 0) return true;
  if (snapshot.submitRequested) return true;
  return Boolean(
    trim(snapshot.requestId) ||
      trim(snapshot.header.foreman) ||
      trim(snapshot.header.comment) ||
      trim(snapshot.header.objectType) ||
      trim(snapshot.header.level) ||
      trim(snapshot.header.system) ||
      trim(snapshot.header.zone),
  );
};

export const hasForemanLocalDraftPendingSync = (snapshot: ForemanLocalDraftSnapshot | null | undefined): boolean => {
  if (!snapshot) return false;
  if (!trim(snapshot.requestId) && snapshot.items.length > 0) return true;
  if (snapshot.pendingDeletes.length > 0) return true;
  if (snapshot.submitRequested) return true;
  return snapshot.items.some((item) => !trim(item.remote_item_id));
};

export async function loadForemanLocalDraftSnapshot(): Promise<ForemanLocalDraftSnapshot | null> {
  const durable = getForemanDurableDraftState();
  const hydrated = durable.hydrated ? durable : await hydrateForemanDurableDraftStore();
  if (hydrated.snapshot) {
    return hasForemanLocalDraftContent(hydrated.snapshot) ? hydrated.snapshot : null;
  }

  const legacySnapshot = await loadLegacyForemanLocalDraftSnapshot();
    if (legacySnapshot) {
      await replaceForemanDurableDraftSnapshot(legacySnapshot, {
        syncStatus: "dirty_local",
        pendingOperationsCount: 0,
        lastError: legacySnapshot.lastError ?? null,
      });
    await clearLegacyForemanLocalDraftSnapshot();
    return legacySnapshot;
  }

  return null;
}

export async function loadForemanRemoteDraftSnapshot(params: {
  requestId: string;
  localSnapshot?: ForemanLocalDraftSnapshot | null;
}): Promise<{
  snapshot: ForemanLocalDraftSnapshot | null;
  details: RequestDetails | null;
  isTerminal: boolean;
}> {
  const requestId = trim(params.requestId);
  if (!requestId) {
    return {
      snapshot: null,
      details: null,
      isTerminal: false,
    };
  }

  const details = await fetchRequestDetails(requestId);
  if (!details) {
    return {
      snapshot: null,
      details: null,
      isTerminal: false,
    };
  }

  if (!isDraftLikeStatus(details.status)) {
    return {
      snapshot: null,
      details,
      isTerminal: true,
    };
  }

  const rows = await listRequestItems(requestId);
  const localSnapshot = params.localSnapshot ?? null;
  const items = rows.map((row) => {
    const existing = localSnapshot?.items.find((item) => rowMatchesSnapshotItem(row, item)) ?? null;
    return reqRowToLocalItem(row, existing);
  });
  const qtyDrafts = Object.fromEntries(
    items.map((item) => [item.remote_item_id || item.local_id, String(item.qty)]),
  );
  const baseServerRevision = resolveForemanDraftServerRevision({
    requestUpdatedAt: details.updated_at ?? details.created_at,
    itemUpdatedAts: rows.map((row) => row.updated_at),
  });

  return {
    snapshot: {
      version: 1,
      ownerId: resolveDraftOwnerId(null, requestId),
      requestId,
      displayNo: trim(details.display_no) || null,
      status: trim(details.status) || "draft",
      header: normalizeHeader({
        foreman: details.foreman_name,
        comment: details.comment,
        objectType: details.object_type_code,
        level: details.level_code,
        system: details.system_code,
        zone: details.zone_code,
      }),
      items,
      qtyDrafts,
      pendingDeletes: [],
      submitRequested: false,
      lastError: null,
      updatedAt: new Date().toISOString(),
      baseServerRevision,
    },
    details,
    isTerminal: false,
  };
}

export async function saveForemanLocalDraftSnapshot(snapshot: ForemanLocalDraftSnapshot | null): Promise<void> {
  if (!snapshot || !hasForemanLocalDraftContent(snapshot)) {
    await clearForemanDurableDraftState();
    await clearLegacyForemanLocalDraftSnapshot();
    return;
  }
  await replaceForemanDurableDraftSnapshot(
    cloneForemanLocalDraftSnapshot(snapshot, "snapshot_save_clone"),
  );
  await clearLegacyForemanLocalDraftSnapshot();
}

export async function clearForemanLocalDraftSnapshot(): Promise<void> {
  await clearForemanDurableDraftState();
  await clearLegacyForemanLocalDraftSnapshot();
}

export function snapshotToReqItems(snapshot: ForemanLocalDraftSnapshot | null | undefined): ReqItemRow[] {
  if (!snapshot) return [];
  const requestId = trim(snapshot.requestId) || FOREMAN_LOCAL_ONLY_REQUEST_ID;
  return snapshot.items
    .map((item, index) => ({
      id: snapshotItemRowId(item) || `${FOREMAN_LOCAL_ONLY_REQUEST_ID}:${index}`,
      request_id: requestId,
      rik_code: item.rik_code ?? null,
      name_human: item.name_human,
      qty: item.qty,
      uom: item.uom ?? null,
      status: item.status ?? "Черновик",
      note: item.note ?? null,
      app_code: item.app_code ?? null,
      supplier_hint: null,
      line_no: item.line_no ?? index + 1,
    }))
    .filter((row) => Number.isFinite(Number(row.qty)) && Number(row.qty) > 0);
}

export function buildForemanLocalDraftSnapshot(params: {
  base: ForemanLocalDraftSnapshot | null;
  ownerId?: string | null;
  requestId: string;
  displayNo?: string | null;
  status?: string | null;
  header: Partial<ForemanLocalDraftHeader>;
  items: ReqItemRow[];
  qtyDrafts: Record<string, string>;
}): ForemanLocalDraftSnapshot | null {
  const base = params.base ? cloneForemanLocalDraftSnapshot(params.base) : null;
  const requestId = trim(params.requestId);
  const nextItems = params.items.map((row) => {
    const existing =
      base?.items.find((item) => {
        const rowId = trim(row.id);
        return (
          (item.remote_item_id && rowId === item.remote_item_id) ||
          item.local_id === rowId ||
          (trim(item.rik_code) && trim(row.rik_code) && trim(item.rik_code) === trim(row.rik_code))
        );
      }) ?? null;
    return reqRowToLocalItem(row, existing);
  });

  const next: ForemanLocalDraftSnapshot = {
    version: 1,
    ownerId: resolveDraftOwnerId(base?.ownerId ?? params.ownerId, requestId),
    requestId,
    displayNo: trim(params.displayNo) || base?.displayNo || null,
    status: trim(params.status) || base?.status || "draft",
    header: normalizeHeader({
      ...base?.header,
      ...params.header,
    }),
    items: nextItems,
    qtyDrafts: { ...params.qtyDrafts },
    pendingDeletes: base?.pendingDeletes ?? [],
    submitRequested: base?.submitRequested ?? false,
    lastError: base?.lastError ?? null,
    updatedAt: new Date().toISOString(),
    baseServerRevision: base?.baseServerRevision ?? null,
  };

  return hasForemanLocalDraftContent(next) ? next : null;
}

export function buildFreshForemanLocalDraftSnapshot(params: {
  base: ForemanLocalDraftSnapshot | null;
  header: Partial<ForemanLocalDraftHeader>;
}): ForemanLocalDraftSnapshot {
  const base = params.base ? cloneForemanLocalDraftSnapshot(params.base) : null;
  return {
    version: 1,
    ownerId: makeDraftOwnerId(),
    requestId: "",
    displayNo: null,
    status: "draft",
    header: normalizeHeader({
      ...emptyHeader(),
      ...base?.header,
      ...params.header,
      comment: trim(params.header.comment),
    }),
    items: [],
    qtyDrafts: {},
    pendingDeletes: [],
    submitRequested: false,
    lastError: null,
    updatedAt: new Date().toISOString(),
    baseServerRevision: base?.baseServerRevision ?? null,
  };
}

export function appendRowsToForemanLocalDraft(
  snapshot: ForemanLocalDraftSnapshot | null,
  rows: ForemanDraftAppendInput[],
): ForemanLocalDraftSnapshot {
  const base: ForemanLocalDraftSnapshot =
    snapshot != null
      ? cloneForemanLocalDraftSnapshot(snapshot)
      : {
          version: 1,
          ownerId: makeDraftOwnerId(),
          requestId: "",
          displayNo: null,
          status: "draft",
          header: emptyHeader(),
          items: [],
          qtyDrafts: {},
          pendingDeletes: [],
          submitRequested: false,
          lastError: null,
          updatedAt: new Date().toISOString(),
          baseServerRevision: null,
        };

  for (const row of rows) {
    const qty = Number(row.qty ?? 0);
    const rikCode = trim(row.rik_code);
    if (!rikCode || !Number.isFinite(qty) || qty <= 0) continue;

    const existing = base.items.find((item) => trim(item.rik_code) === rikCode && trim(item.uom) === trim(row.meta?.uom));
    if (existing) {
      existing.qty += qty;
      if (row.meta?.note !== undefined) existing.note = row.meta.note ?? null;
      if (row.meta?.app_code !== undefined) existing.app_code = row.meta.app_code ?? null;
      if (row.meta?.kind !== undefined) existing.kind = row.meta.kind ?? null;
      if (row.meta?.name_human) existing.name_human = row.meta.name_human;
      if (row.meta?.uom !== undefined) existing.uom = row.meta.uom ?? null;
      existing.status = "Черновик";
      continue;
    }

    const nextItem: ForemanLocalDraftItem = {
      local_id: makeLocalItemId(),
      remote_item_id: null,
      rik_code: rikCode,
      name_human: trim(row.meta?.name_human) || rikCode,
      qty,
      uom: trim(row.meta?.uom) || null,
      status: "Черновик",
      note: trim(row.meta?.note) || null,
      app_code: trim(row.meta?.app_code) || null,
      kind: trim(row.meta?.kind) || null,
      line_no: base.items.length + 1,
    };
    base.items.push(nextItem);
  }

  base.lastError = null;
  base.updatedAt = new Date().toISOString();
  return base;
}

export function updateForemanLocalDraftItemQty(
  snapshot: ForemanLocalDraftSnapshot | null,
  rowId: string | number,
  qty: number,
): ForemanLocalDraftSnapshot | null {
  if (!snapshot) return snapshot;
  const normalizedRowId = normalizeDraftRowId(rowId);
  const normalizedQty = Number(qty ?? 0);
  if (!normalizedRowId || !Number.isFinite(normalizedQty) || normalizedQty <= 0) return snapshot;

  const next = cloneForemanLocalDraftSnapshot(snapshot);
  const item = next.items.find(
    (entry) => entry.local_id === normalizedRowId || trim(entry.remote_item_id) === normalizedRowId,
  );
  if (!item) return snapshot;
  item.qty = normalizedQty;
  next.qtyDrafts[item.remote_item_id || item.local_id] = String(normalizedQty);
  next.lastError = null;
  next.updatedAt = new Date().toISOString();
  return next;
}

export function removeForemanLocalDraftItem(
  snapshot: ForemanLocalDraftSnapshot | null,
  rowId: string | number,
): ForemanLocalDraftSnapshot | null {
  if (!snapshot) return snapshot;
  const normalizedRowId = normalizeDraftRowId(rowId);
  if (!normalizedRowId) return snapshot;

  const next = cloneForemanLocalDraftSnapshot(snapshot);
  const found = next.items.find(
    (entry) => entry.local_id === normalizedRowId || trim(entry.remote_item_id) === normalizedRowId,
  );
  if (!found) return snapshot;

  if (found.remote_item_id) {
    next.pendingDeletes.push({
      local_id: found.local_id,
      remote_item_id: found.remote_item_id,
    });
  }

  next.items = next.items.filter((entry) => entry.local_id !== found.local_id);
  delete next.qtyDrafts[found.local_id];
  if (found.remote_item_id) delete next.qtyDrafts[found.remote_item_id];
  next.lastError = null;
  next.updatedAt = new Date().toISOString();
  return next;
}

export function discardForemanLocalDraft(
  snapshot: ForemanLocalDraftSnapshot | null,
): ForemanLocalDraftSnapshot | null {
  if (!snapshot) return null;

  const next = cloneForemanLocalDraftSnapshot(snapshot);
  const requestId = trim(next.requestId);
  if (!requestId) return null;

  for (const item of next.items) {
    const remoteItemId = trim(item.remote_item_id);
    if (!remoteItemId) continue;
    if (next.pendingDeletes.some((entry) => trim(entry.remote_item_id) === remoteItemId)) continue;
    next.pendingDeletes.push({
      local_id: item.local_id,
      remote_item_id: remoteItemId,
    });
  }

  if (next.pendingDeletes.length === 0) {
    return null;
  }

  next.items = [];
  next.qtyDrafts = {};
  next.submitRequested = false;
  next.lastError = null;
  next.updatedAt = new Date().toISOString();
  return next;
}

export function markForemanLocalDraftSubmitRequested(
  snapshot: ForemanLocalDraftSnapshot | null,
): ForemanLocalDraftSnapshot | null {
  if (!snapshot) return snapshot;
  return {
    ...cloneForemanLocalDraftSnapshot(snapshot),
    submitRequested: true,
    lastError: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function syncForemanLocalDraftSnapshot(params: {
  snapshot: ForemanLocalDraftSnapshot;
  headerMeta: RequestDraftMeta;
  mutationKind?: ForemanDraftSyncMutationKind;
  localBeforeCount?: number | null;
  localAfterCount?: number | null;
}): Promise<ForemanLocalDraftSyncResult> {
  const next = cloneForemanLocalDraftSnapshot(params.snapshot);
  const localItems = next.items.filter((item) => Number.isFinite(item.qty) && item.qty > 0);

  if (!trim(next.requestId) && !localItems.length && !next.submitRequested) {
    return {
      snapshot: next,
      rows: snapshotToReqItems(next),
      submitted: null,
      branchMeta: {
        sourcePath: "rpc_v2",
      },
    };
  }

  const rpc = await syncForemanAtomicDraft({
    mutationKind: params.mutationKind ?? (next.submitRequested ? "submit" : "background_sync"),
    sourcePath: "foreman_materials",
    requestId: next.requestId,
    meta: params.headerMeta,
    submit: next.submitRequested,
    pendingDeleteIds: next.pendingDeletes.map((entry) => entry.remote_item_id),
    lines: localItems.map((item) => ({
      request_item_id: item.remote_item_id,
      rik_code: item.rik_code,
      qty: item.qty,
      note: item.note,
      app_code: item.app_code,
      kind: item.kind,
      name_human: item.name_human,
      uom: item.uom,
    })),
    beforeLineCount: params.localBeforeCount ?? null,
    afterLocalSnapshotLineCount: params.localAfterCount ?? localItems.length,
  });

  next.requestId = trim(rpc.request.id);
  next.displayNo = trim(rpc.request.display_no) || next.displayNo || null;
  next.status = trim(rpc.request.status) || next.status || "draft";

  if (next.requestId) {
    setLocalDraftId(next.requestId);
  }

  if (rpc.submitted) {
    clearLocalDraftId();
    return {
      snapshot: null,
      rows: [],
      submitted: rpc.request,
      branchMeta: {
        sourcePath: "rpc_v2",
      },
    };
  }

  next.items = rpc.items.map((row) => {
    const existing = localItems.find((item) => rowMatchesSnapshotItem(row, item)) ?? null;
    return reqRowToLocalItem(row, existing);
  });
  next.baseServerRevision = resolveForemanDraftServerRevision({
    requestUpdatedAt: rpc.request.updated_at ?? rpc.request.created_at,
    itemUpdatedAts: rpc.items.map((row) => row.updated_at),
  });
  next.pendingDeletes = [];
  next.submitRequested = false;
  next.lastError = null;
  next.updatedAt = new Date().toISOString();

  return {
    snapshot: next,
    rows: rpc.items,
    submitted: null,
    branchMeta: {
      sourcePath: "rpc_v2",
    },
  };
}
