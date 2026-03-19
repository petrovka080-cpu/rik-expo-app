import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import {
  clearLocalDraftId,
  listRequestItems,
  requestCreateDraft,
  requestItemCancel,
  requestItemUpdateQty,
  requestSubmit,
  setLocalDraftId,
  updateRequestMeta,
  type ReqItemRow,
} from "../../lib/catalog_api";
import { supabase } from "../../lib/supabaseClient";
import { requestItemAddOrIncAndPatchMeta } from "./foreman.helpers";
import type { RequestDraftMeta } from "./foreman.types";

const LOCAL_DRAFT_STORAGE_KEY = "foreman_materials_local_draft_v1";

export const FOREMAN_LOCAL_ONLY_REQUEST_ID = "__foreman_local_draft__";

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
};

const emptyHeader = (): ForemanLocalDraftHeader => ({
  foreman: "",
  comment: "",
  objectType: "",
  level: "",
  system: "",
  zone: "",
});

const draftStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") return localStorage.getItem(LOCAL_DRAFT_STORAGE_KEY);
      } catch {}
      return null;
    }
    try {
      return await AsyncStorage.getItem(LOCAL_DRAFT_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  async set(value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") localStorage.setItem(LOCAL_DRAFT_STORAGE_KEY, value);
      } catch {}
      return;
    }
    try {
      await AsyncStorage.setItem(LOCAL_DRAFT_STORAGE_KEY, value);
    } catch {}
  },
  async clear(): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") localStorage.removeItem(LOCAL_DRAFT_STORAGE_KEY);
      } catch {}
      return;
    }
    try {
      await AsyncStorage.removeItem(LOCAL_DRAFT_STORAGE_KEY);
    } catch {}
  },
};

const trim = (value: unknown): string => String(value ?? "").trim();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const makeLocalItemId = () => `fld-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeDraftRowId = (value: string | number | null | undefined) => trim(value);

const snapshotItemRowId = (item: ForemanLocalDraftItem) => item.remote_item_id || item.local_id;

const normalizeHeader = (value?: Partial<ForemanLocalDraftHeader> | null): ForemanLocalDraftHeader => ({
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

const serializeSnapshot = (snapshot: ForemanLocalDraftSnapshot | null): string =>
  JSON.stringify(snapshot ?? null);

const normalizeSnapshotForCompare = (
  snapshot: ForemanLocalDraftSnapshot | null | undefined,
  options?: { ignoreUpdatedAt?: boolean; ignoreLastError?: boolean },
) => {
  if (!snapshot) return null;
  return {
    ...snapshot,
    updatedAt: options?.ignoreUpdatedAt ? "" : snapshot.updatedAt,
    lastError: options?.ignoreLastError ? null : snapshot.lastError,
  };
};

export const areForemanLocalDraftSnapshotsEqual = (
  left: ForemanLocalDraftSnapshot | null | undefined,
  right: ForemanLocalDraftSnapshot | null | undefined,
  options?: { ignoreUpdatedAt?: boolean; ignoreLastError?: boolean },
): boolean =>
  JSON.stringify(normalizeSnapshotForCompare(left, options)) ===
  JSON.stringify(normalizeSnapshotForCompare(right, options));

const patchRequestItemMetaBestEffort = async (itemId: string, item: ForemanLocalDraftItem) => {
  const update = {
    status: item.status ?? "Черновик",
    note: item.note ?? null,
    app_code: item.app_code ?? null,
    kind: item.kind ?? null,
    name_human: item.name_human,
    uom: item.uom ?? null,
  };
  try {
    await supabase.from("request_items").update(update).eq("id", itemId);
  } catch {}
};

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
  try {
    const raw = await draftStorage.get();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    const row = asRecord(parsed);
    if (!row) return null;

    const requestId = trim(row.requestId);
    const snapshot: ForemanLocalDraftSnapshot = {
      version: 1,
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
    };

    return hasForemanLocalDraftContent(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}

export async function saveForemanLocalDraftSnapshot(snapshot: ForemanLocalDraftSnapshot | null): Promise<void> {
  if (!snapshot || !hasForemanLocalDraftContent(snapshot)) {
    await draftStorage.clear();
    return;
  }
  await draftStorage.set(serializeSnapshot(snapshot));
}

export async function clearForemanLocalDraftSnapshot(): Promise<void> {
  await draftStorage.clear();
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
  requestId: string;
  displayNo?: string | null;
  status?: string | null;
  header: Partial<ForemanLocalDraftHeader>;
  items: ReqItemRow[];
  qtyDrafts: Record<string, string>;
}): ForemanLocalDraftSnapshot | null {
  const base = params.base ? clone(params.base) : null;
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
  };

  return hasForemanLocalDraftContent(next) ? next : null;
}

export function appendRowsToForemanLocalDraft(
  snapshot: ForemanLocalDraftSnapshot | null,
  rows: ForemanDraftAppendInput[],
): ForemanLocalDraftSnapshot {
  const base: ForemanLocalDraftSnapshot =
    snapshot != null
      ? clone(snapshot)
      : {
          version: 1,
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

  const next = clone(snapshot);
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

  const next = clone(snapshot);
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

export function markForemanLocalDraftSubmitRequested(
  snapshot: ForemanLocalDraftSnapshot | null,
): ForemanLocalDraftSnapshot | null {
  if (!snapshot) return snapshot;
  return {
    ...clone(snapshot),
    submitRequested: true,
    lastError: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function syncForemanLocalDraftSnapshot(params: {
  snapshot: ForemanLocalDraftSnapshot;
  headerMeta: RequestDraftMeta;
}): Promise<ForemanLocalDraftSyncResult> {
  const next = clone(params.snapshot);
  const localItems = next.items.filter((item) => Number.isFinite(item.qty) && item.qty > 0);

  if (!trim(next.requestId)) {
    if (!localItems.length && !next.submitRequested) {
      return { snapshot: next, rows: snapshotToReqItems(next), submitted: null };
    }
    const created = await requestCreateDraft(params.headerMeta);
    const requestId = trim(created?.id);
    if (!requestId) throw new Error("Failed to create remote draft");
    next.requestId = requestId;
    next.displayNo = trim(created?.display_no) || next.displayNo || null;
    next.status = trim(created?.status) || next.status || "draft";
    setLocalDraftId(requestId);
  }

  if (trim(next.requestId)) {
    await updateRequestMeta(next.requestId, params.headerMeta).catch(() => false);
  }

  const remoteRowsBefore = trim(next.requestId) ? await listRequestItems(next.requestId) : [];
  const remoteById = new Map<string, ReqItemRow>();
  const remoteByCode = new Map<string, ReqItemRow[]>();
  for (const row of remoteRowsBefore) {
    const rowId = trim(row.id);
    const rikCode = trim(row.rik_code);
    if (rowId) remoteById.set(rowId, row);
    if (rikCode) {
      const list = remoteByCode.get(rikCode) ?? [];
      list.push(row);
      remoteByCode.set(rikCode, list);
    }
  }

  for (const item of localItems) {
    let remoteItem = item.remote_item_id ? remoteById.get(item.remote_item_id) ?? null : null;
    if (!remoteItem && item.rik_code) {
      const codeRows = remoteByCode.get(item.rik_code) ?? [];
      remoteItem = codeRows.find((row) => !next.pendingDeletes.some((entry) => trim(entry.remote_item_id) === trim(row.id))) ?? null;
    }

    if (!remoteItem) {
      const remoteId = await requestItemAddOrIncAndPatchMeta(next.requestId, trim(item.rik_code), item.qty, {
        note: item.note,
        app_code: item.app_code,
        kind: item.kind,
        name_human: item.name_human,
        uom: item.uom,
      });
      item.remote_item_id = trim(remoteId) || null;
      continue;
    }

    item.remote_item_id = trim(remoteItem.id) || item.remote_item_id;
    if (Math.abs(Number(remoteItem.qty ?? 0) - item.qty) > 1e-9 && item.remote_item_id) {
      await requestItemUpdateQty(item.remote_item_id, item.qty, next.requestId);
    }
    if (item.remote_item_id) {
      await patchRequestItemMetaBestEffort(item.remote_item_id, item);
    }
  }

  for (const pendingDelete of next.pendingDeletes) {
    await requestItemCancel(pendingDelete.remote_item_id);
  }
  next.pendingDeletes = [];

  if (next.submitRequested) {
    const submitted = await requestSubmit(next.requestId);
    clearLocalDraftId();
    return {
      snapshot: null,
      rows: [],
      submitted,
    };
  }

  const remoteRowsAfter = await listRequestItems(next.requestId);
  next.items = remoteRowsAfter.map((row) => {
    const existing = localItems.find((item) => rowMatchesSnapshotItem(row, item)) ?? null;
    return reqRowToLocalItem(row, existing);
  });
  next.status = "draft";
  next.submitRequested = false;
  next.lastError = null;
  next.updatedAt = new Date().toISOString();

  return {
    snapshot: next,
    rows: remoteRowsAfter,
    submitted: null,
  };
}
