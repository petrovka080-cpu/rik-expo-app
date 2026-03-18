// src/lib/catalog_api.ts
import { supabase } from "./supabaseClient";
import { translateRikCodeSync, translateDescription } from "./translation_helper";

const parseErr = (e: any): string =>
  e?.message ||
  e?.error_description ||
  (typeof e === 'string'
    ? e
    : (() => {
      try { return JSON.stringify(e); } catch { return String(e); }
    })());

import {
  proposalCreate as rpcProposalCreate,
  proposalAddItems as rpcProposalAddItems,
  proposalSubmit as rpcProposalSubmit,
  proposalSnapshotItems as rpcProposalSnapshotItems,
  batchResolveRequestLabels as rpcBatchResolveRequestLabels,
  requestCreateDraft as rpcRequestCreateDraft,
} from "./rik_api";

export {
  ensureRequestSmart,
  requestCreateDraft,
  requestSubmit,
  // exportRequestPdf,            // ← ВАЖНО: Больше не ре-экспортируем
  addRequestItemFromRik,
  clearCachedDraftRequestId,
} from "./rik_api";

export {
  listBuyerInbox,
  proposalCreate,
  proposalAddItems,
  proposalSubmit,
  exportProposalPdf,
  buildProposalPdfHtml,
  exportPaymentOrderPdf,
  proposalItems,
  proposalSnapshotItems,
  proposalSetItemsMeta,
  uploadProposalAttachment,
  proposalSendToAccountant,
  batchResolveRequestLabels,
  resolveProposalPrettyTitle,
  buildProposalPdfHtmlPretty,
  listDirectorProposalsPending,
  listAccountantInbox,
  listAccountantPaymentsHistory,
  accountantAddPayment,
  accountantReturnToBuyer,
  notifList,
  notifMarkRead,
  subscribeToNotifications,
  ensureMyProfile,
  getMyRole,
} from "./rik_api";
export type { BuyerInboxRow, AccountantInboxRow } from "./rik_api";

/** ========= Типы ========= */
export type CatalogItem = {
  code: string;
  name: string;
  uom?: string | null;
  sector_code?: string | null;
  spec?: string | null;
  kind?: string | null;
  group_code?: string | null;
};

export type CatalogGroup = {
  code: string;
  name: string;
  parent_code?: string | null;
};

export type UomRef = { id?: string; code: string; name: string };

export type IncomingItem = {
  incoming_id: string;
  incoming_item_id: string;
  purchase_item_id: string | null;
  code: string | null;
  name: string | null;
  uom: string | null;
  qty_expected: number;
  qty_received: number;
};

export type RequestHeader = {
  id: string;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type RequestItem = {
  id?: string;
  request_id: string;
  line_no?: number | null;
  code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty?: number | null;
  note?: string | null;
};

export type ReqItemRow = {
  id: string;
  request_id: string;
  name_human: string;
  qty: number;
  uom?: string | null;
  status?: string | null;
  supplier_hint?: string | null;
  app_code?: string | null;
  note?: string | null;
  rik_code?: string | null;
  line_no?: number | null;
};

export type ForemanRequestSummary = {
  id: string;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
  need_by?: string | null;
  object_name_ru?: string | null;
  level_name_ru?: string | null;
  system_name_ru?: string | null;
  zone_name_ru?: string | null;
  has_rejected?: boolean | null; // ← есть ли отклонённые позиции в заявке
};

export type RequestDetails = {
  id: string;
  status?: string | null;
  display_no?: string | null;
  year?: number | null;
  seq?: number | null;
  created_at?: string | null;
  need_by?: string | null;
  comment?: string | null;
  foreman_name?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  object_name_ru?: string | null;
  level_name_ru?: string | null;
  system_name_ru?: string | null;
  zone_name_ru?: string | null;
};

export type Supplier = {
  id: string;
  name: string;
  inn?: string | null;
  bank_account?: string | null;
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  contact_name?: string | null;
  notes?: string | null;
};

/** ========= helpers ========= */
const norm = (s?: string | null) => String(s ?? "").trim();
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const chunk = <T,>(arr: T[], size: number): T[][] => {
  if (size <= 0) return [arr.slice()];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};
const SUPPLIER_NONE_LABEL = "— без поставщика —";

const pickRefName = (ref: any) => {
  const name = norm(ref?.name_ru) ||
    norm(ref?.name_human_ru) ||
    norm(ref?.display_name) ||
    norm(ref?.alias_ru) ||
    norm(ref?.name) ||
    norm(ref?.code) ||
    null;

  return translateRikCodeSync(name) || translateDescription(name || '') || name;
};

const pickFirstString = (...values: any[]): string | null => {
  for (const value of values) {
    const s = norm(value);
    if (s) return s;
  }
  return null;
};

const isObjectLike = (val: any): val is Record<string, any> =>
  typeof val === "object" && val !== null;

const parseNumberValue = (...values: any[]): number | null => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value != null) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const buildRefShape = (row: any, keys: string[], code?: string | null) => {
  const shape: Record<string, any> = {};
  shape.name_ru = pickFirstString(
    ...keys.map((key) => row?.[`${key}_name_ru`]),
    ...keys.map((key) => row?.[`${key}NameRu`])
  );
  shape.name_human_ru = pickFirstString(
    ...keys.map((key) => row?.[`${key}_name_human_ru`]),
    ...keys.map((key) => row?.[`${key}NameHumanRu`])
  );
  shape.display_name = pickFirstString(
    ...keys.map((key) => row?.[`${key}_display_name`]),
    ...keys.map((key) => row?.[`${key}DisplayName`]),
    ...keys.map((key) => row?.[`${key}_label`]),
    ...keys.map((key) => row?.[`${key}Label`])
  );
  shape.alias_ru = pickFirstString(
    ...keys.map((key) => row?.[`${key}_alias_ru`]),
    ...keys.map((key) => row?.[`${key}AliasRu`])
  );
  shape.name = pickFirstString(
    ...keys.map((key) => row?.[`${key}_name`]),
    ...keys.map((key) => row?.[`${key}Name`]),
    ...keys.map((key) => row?.[key])
  );
  shape.code =
    code ||
    pickFirstString(
      ...keys.map((key) => row?.[`${key}_code`]),
      ...keys.map((key) => row?.[`${key}Code`]),
      ...keys.map((key) => row?.[key])
    );
  return shape;
};

const readRefName = (row: any, keys: string[], code?: string | null): string | null => {
  for (const key of keys) {
    const val = row?.[key];
    if (isObjectLike(val)) return pickRefName(val);
  }
  return pickRefName(buildRefShape(row, keys, code));
};

const mapRequestItemRow = (raw: any, requestId: string): ReqItemRow | null => {
  const rawId = raw?.id ?? raw?.request_item_id ?? null;
  if (!rawId) return null;
  const qtyVal = Number(raw?.qty ?? raw?.quantity ?? raw?.total_qty ?? 0);
  const qty = Number.isFinite(qtyVal) ? qtyVal : 0;
  const lineNo =
    parseNumberValue(
      raw?.line_no,
      raw?.row_no,
      raw?.position_order,
      raw?.rowno,
      raw?.rowNo,
      raw?.positionOrder,
    ) ?? null;

  const nameHumanRaw =
    norm(raw?.name_human_ru) ||
    norm(raw?.name_human) ||
    norm(raw?.name_ru) ||
    norm(raw?.name) ||
    norm(raw?.display_name) ||
    norm(raw?.alias_ru) ||
    norm(raw?.best_name_display) ||
    "";

  const rikCode = raw?.rik_code ?? raw?.code ?? null;
  const nameHuman = translateRikCodeSync(rikCode) || translateDescription(nameHumanRaw) || nameHumanRaw;

  return {
    id: String(rawId),
    request_id: String(raw?.request_id ?? requestId),
    name_human: nameHuman || '—',
    qty,
    uom: raw?.uom ?? raw?.uom_code ?? null,
    status: raw?.status ?? null,
    supplier_hint: raw?.supplier_hint ?? raw?.supplier ?? null,
    app_code: raw?.app_code ?? null,
    note: raw?.note ?? raw?.comment ?? null,
    rik_code: raw?.rik_code ?? raw?.code ?? null,
    line_no: lineNo,
  };
};

const mapSupplierRow = (raw: any): Supplier | null => {
  const id = raw?.id;
  const name = norm(raw?.name);
  if (!id || !name) return null;
  return {
    id: String(id),
    name,
    inn: raw?.inn ?? null,
    bank_account: raw?.bank_account ?? null,
    specialization: raw?.specialization ?? null,
    phone: raw?.phone ?? null,
    email: raw?.email ?? null,
    website: raw?.website ?? null,
    address: raw?.address ?? null,
    contact_name: raw?.contact_name ?? null,
    notes: raw?.notes ?? null,
  };
};

/** ========= Каталог: быстрый поиск ========= */
// NOTE: оставляем функцию обычным модульным экспортом без каких-либо глобальных шин
export const searchCatalogItems = async (
  q: string,
  limit = 50,
  apps?: string[]
): Promise<CatalogItem[]> => {
  const pQuery = norm(q);
  const pLimit = clamp(limit || 50, 1, 200);

  // 1) RPC variants
  for (const fn of ["rik_quick_search_typed", "rik_quick_ru", "rik_quick_search"]) {
    try {
      const { data, error } = await supabase.rpc(fn as any, {
        p_q: pQuery,
        p_limit: pLimit,
        p_apps: apps ?? null,
      } as any);

      if (!error && Array.isArray(data)) {
        return (data as any[]).slice(0, pLimit).map((r) => {
          const code = r.rik_code;
          const rawName = r.name_human ?? r.rik_code;
          const translatedName = translateRikCodeSync(code) || translateDescription(rawName) || rawName;

          return {
            code: code,
            name: translatedName,
            uom: translateRikCodeSync(r.uom ?? r.uom_code) || r.uom || r.uom_code || null,
            sector_code: r.sector_code ?? null,
            spec: r.spec ?? null,
            kind: r.kind ?? null,
            group_code: r.group_code ?? null,
          };
        });
      }
    } catch {
      // Ignore RPC failure
    }
  }

  // 2) Fallback: direct query
  const { data, error } = await supabase
    .from("catalog_items")
    .select("code,name,uom,sector_code,spec,kind,group_code")
    .or(`code.ilike.%${pQuery}%,name.ilike.%${pQuery}%`)
    .order("code", { ascending: true })
    .limit(pLimit);

  if (error || !Array.isArray(data)) return [];
  return data as CatalogItem[];
};

/** ========= Группы ========= */
export const listCatalogGroups = async (): Promise<CatalogGroup[]> => {
  const { data, error } = await supabase
    .from("catalog_groups_clean")
    .select("code,name,parent_code")
    .order("code", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as CatalogGroup[];
};

/** ========= Единицы измерения ========= */
export const listUoms = async (): Promise<UomRef[]> => {
  const { data, error } = await supabase
    .from("ref_uoms_clean")
    .select("id,code,name")
    .order("code", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as UomRef[];
};

/** ========= Склад: позиции к приходу ========= */
export const listIncomingItems = async (incomingId: string): Promise<IncomingItem[]> => {
  const id = norm(incomingId);
  if (!id) return [];
  const { data, error } = await supabase
    .from("wh_incoming_items_clean")
    .select(
      "incoming_id,incoming_item_id,purchase_item_id,code,name,uom,qty_expected,qty_received"
    )
    .eq("incoming_id", id)
    .order("incoming_item_id", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as IncomingItem[];
};

/* ====================================================================== */
/*                           D R A F T   /   R E Q                        */
/* ====================================================================== */

const DRAFT_KEY = "foreman_draft_request_id";

// localStorage с мем-фолбэком
let memDraftId: string | null = null;
const storage = {
  get(): string | null {
    try { if (typeof localStorage !== "undefined") return localStorage.getItem(DRAFT_KEY); } catch { }
    return memDraftId;
  },
  set(v: string) {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(DRAFT_KEY, v); } catch { }
    memDraftId = v;
  },
  clear() {
    try { if (typeof localStorage !== "undefined") localStorage.removeItem(DRAFT_KEY); } catch { }
    memDraftId = null;
  },
};

export const getLocalDraftId = (): string | null => storage.get();
export const setLocalDraftId = (id: string): void => storage.set(id);
export const clearLocalDraftId = (): void => storage.clear();

const draftStatusKeys = new Set(['draft', 'черновик']);
const isDraftStatusValue = (value?: string | null) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return draftStatusKeys.has(normalized);
};

/** Создаёт/возвращает черновик заявки */
export const getOrCreateDraftRequestId = async (): Promise<string> => {
  const cached = getLocalDraftId();
  if (cached) {
    const valid = await isCachedDraftValid(cached);
    if (valid) return cached;
    clearLocalDraftId();
  }

  try {
    const created = await rpcRequestCreateDraft();
    if (created?.id) {
      const id = String(created.id);
      setLocalDraftId(id);
      return id;
    }
  } catch (e: any) {
    console.warn("[catalog_api.getOrCreateDraftRequestId]", e?.message ?? e);
    throw e;
  }

  throw new Error("Не удалось создать черновик заявки");
};

const isCachedDraftValid = async (id: string): Promise<boolean> => {
  const rid = norm(id);
  if (!rid) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await (supabase
      .from('requests' as any)
      .select('id,status,created_by,user_id')
      .eq('id', rid)
      .maybeSingle() as any);

    if (error) throw error;
    if (!data?.id) return false;

    if (!isDraftStatusValue(data.status)) return false;

    const owner = (data as any).created_by || (data as any).user_id;
    if (owner && owner !== user.id) {
      console.warn('[isCachedDraftValid] Draft owner mismatch. Mine:', user.id, 'Draft:', owner);
      return false;
    }

    return true;
  } catch (e: any) {
    const msg = String(e?.message ?? '').toLowerCase();
    if (msg.includes('column') && msg.includes('does not exist')) {
      console.warn('[isCachedDraftValid] Cannot verify owner (column missing?). invalidating.');
    } else if (!msg.includes('permission denied')) {
      console.warn('[catalog_api.getOrCreateDraftRequestId] draft check:', e?.message ?? e);
    }
    return false;
  }
};

/** Заголовок заявки (для шапки/номера), пробуем вью/таблицы по очереди */
export const getRequestHeader = async (requestId: string): Promise<RequestHeader | null> => {
  const id = norm(requestId);
  if (!id) return null;

  const views = [
    { src: "request_display", cols: "id,display_no,status,created_at" },
    { src: "vi_requests_display", cols: "id,display_no,status,created_at" },
    { src: "vi_requests", cols: "id,display_no,status,created_at" },
    { src: "requests", cols: "id,display_no,status,created_at" },
  ] as const;

  for (const view of views) {
    try {
      const { data, error } = await (supabase
        .from(view.src as any)
        .select(view.cols)
        .eq("id", id)
        .maybeSingle() as any);
      if (!error && data) return data as RequestHeader;
    } catch {
      // Ignore
    }
  }

  return { id };
};

export const fetchRequestDisplayNo = async (requestId: string): Promise<string | null> => {
  const id = norm(requestId);
  if (!id) return null;

  try {
    const { data, error } = await (supabase
      .from("requests" as any)
      .select("id,display_no")
      .eq("id", id)
      .maybeSingle() as any);
    if (!error && data?.display_no) return String(data.display_no);
  } catch (e: any) {
    const msg = String(e?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
      console.warn(`[catalog_api.fetchRequestDisplayNo] requests:`, e?.message ?? e);
    }
  }

  const rpcVariants = ["request_display_no", "request_display", "request_label"] as const;
  for (const fn of rpcVariants) {
    try {
      const { data, error } = await (supabase.rpc(fn as any, { p_request_id: id } as any) as any);
      if (!error && data != null) {
        if (typeof data === "string" || typeof data === "number") return String(data);
        const obj = data as Record<string, any>;
        const val = obj.display_no ?? obj.display ?? obj.label ?? null;
        if (val != null) return String(val);
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (!msg.includes("function") && !msg.includes("does not exist")) {
        console.warn(`[catalog_api.fetchRequestDisplayNo] rpc ${fn}:`, e?.message ?? e);
      }
    }
  }

  const views = [
    { src: "request_display", col: "display_no" },
    { src: "vi_requests_display", col: "display_no" },
    { src: "v_requests_display", col: "display_no" },
    { src: "requests", col: "display_no" },
  ] as const;

  for (const { src, col } of views) {
    try {
      const { data, error } = await (supabase
        .from(src as any)
        .select(`id,${col}`)
        .eq("id", id)
        .maybeSingle() as any);
      if (!error && data && data[col] != null) return String(data[col]);
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        console.warn(`[catalog_api.fetchRequestDisplayNo] ${src}:`, e?.message ?? e);
      }
    }
  }

  return null;
};

const mapDetailsFromRow = (row: any): RequestDetails | null => {
  if (!row) return null;
  const id = pickFirstString(row?.id, row?.request_id);
  if (!id) return null;

  const objectCode = pickFirstString(
    row?.object_type_code,
    row?.objectTypeCode,
    row?.object_code,
    row?.objectCode,
    row?.objecttype_code,
    row?.objecttypeCode,
    row?.object
  );
  const levelCode = pickFirstString(row?.level_code, row?.levelCode, row?.level);
  const systemCode = pickFirstString(row?.system_code, row?.systemCode, row?.system);
  const zoneCode = pickFirstString(row?.zone_code, row?.zoneCode, row?.zone, row?.zone_area, row?.area);

  const commentRaw = row?.comment ?? row?.request_comment ?? null;
  const comment = typeof commentRaw === "string" ? commentRaw : norm(commentRaw);

  return {
    id,
    status: pickFirstString(row?.status, row?.request_status),
    display_no: pickFirstString(
      row?.display_no,
      row?.display,
      row?.label,
      row?.number,
      row?.request_no
    ),
    year: parseNumberValue(row?.year, row?.request_year, row?.requestYear),
    seq: parseNumberValue(row?.seq, row?.request_seq, row?.requestSeq),
    created_at: pickFirstString(row?.created_at, row?.created, row?.createdAt),
    need_by: pickFirstString(row?.need_by, row?.need_by_date, row?.needBy),
    comment: comment ?? null,
    foreman_name: pickFirstString(row?.foreman_name, row?.foreman, row?.foremanName),
    object_type_code: objectCode,
    level_code: levelCode,
    system_code: systemCode,
    zone_code: zoneCode,
    object_name_ru: readRefName(
      row,
      ["object", "object_type", "objecttype", "objectType", "object_ref"],
      objectCode,
    ),
    level_name_ru: readRefName(row, ["level", "level_ref", "levelRef"], levelCode),
    system_name_ru: readRefName(row, ["system", "system_type", "systemType", "system_ref"], systemCode),
    zone_name_ru: readRefName(row, ["zone", "zone_area", "area", "zoneRef", "zone_ref"], zoneCode),
  };
};

const mapSummaryFromRow = (row: any): ForemanRequestSummary | null => {
  const details = mapDetailsFromRow(row);
  if (!details) return null;

  const rawHas =
    row?.has_rejected ??
    row?.hasRejected ??
    row?.has_rej ??
    null;

  return {
    id: details.id,
    status: details.status ?? null,
    created_at: details.created_at ?? null,
    need_by: details.need_by ?? null,
    display_no: details.display_no ?? null,
    object_name_ru: details.object_name_ru ?? null,
    level_name_ru: details.level_name_ru ?? null,
    system_name_ru: details.system_name_ru ?? null,
    zone_name_ru: details.zone_name_ru ?? null,
    has_rejected:
      typeof rawHas === 'boolean'
        ? rawHas
        : rawHas == null
          ? null
          : Boolean(rawHas),
  };
};

export const fetchRequestDetails = async (requestId: string): Promise<RequestDetails | null> => {
  const id = norm(requestId);
  if (!id) return null;

  try {
    const { data, error } = await (supabase
      .from("requests" as any)
      .select(
        `id,status,display_no,year,seq,created_at,need_by,comment,foreman_name,
         object_type_code,level_code,system_code,zone_code,
         object:ref_object_types(*),
         level:ref_levels(*),
         system:ref_systems(*),
         zone:ref_zones(*)`
      )
      .eq("id", id)
      .maybeSingle() as any);

    if (!error && data) {
      const mapped = mapDetailsFromRow(data);
      if (mapped) return mapped;
    }

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        console.warn("[catalog_api.fetchRequestDetails] requests:", error.message);
      }
    }
  } catch (e: any) {
    const msg = String(e?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
      console.warn("[catalog_api.fetchRequestDetails] requests:", e?.message ?? e);
    }
  }

  const views = ["v_requests_display", "v_request_pdf_header"] as const;
  for (const view of views) {
    try {
      const { data, error } = await (supabase
        .from(view as any)
        .select("*")
        .eq("id", id)
        .maybeSingle() as any);
      if (!error && data) {
        const mapped = mapDetailsFromRow(data);
        if (mapped) return mapped;
      }
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
          console.warn(`[catalog_api.fetchRequestDetails] ${view}:`, error.message);
        }
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        console.warn(`[catalog_api.fetchRequestDetails] ${view}:`, e?.message ?? e);
      }
    }
  }

  return null;
};

export type RequestMetaPatch = {
  need_by?: string | null;
  comment?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  foreman_name?: string | null;
};

export const updateRequestMeta = async (
  requestId: string,
  patch: RequestMetaPatch
): Promise<boolean> => {
  const id = norm(requestId);
  if (!id) return false;

  const payload: Record<string, any> = {};
  if (Object.prototype.hasOwnProperty.call(patch, "need_by"))
    payload.need_by = norm(patch.need_by) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "comment"))
    payload.comment = norm(patch.comment) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "object_type_code"))
    payload.object_type_code = patch.object_type_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "level_code"))
    payload.level_code = patch.level_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "system_code"))
    payload.system_code = patch.system_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "zone_code"))
    payload.zone_code = patch.zone_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "foreman_name"))
    payload.foreman_name = norm(patch.foreman_name) || null;

  if (!Object.keys(payload).length) return true;

  try {
    const { error } = await ((supabase
      .from('requests' as any) as any)
      .update(payload as any)
      .eq('id', id) as any);

    if (error) {
      console.warn('[catalog_api.updateRequestMeta] table requests:', error.message);
      return false;
    }

    return true;
  } catch (e: any) {
    console.warn('[catalog_api.updateRequestMeta] table requests:', e?.message ?? e);
    return false;
  }
};


/** Позиции заявки: простое чтение из таблицы request_items */
export const listRequestItems = async (requestId: string): Promise<ReqItemRow[]> => {
  const id = norm(requestId);
  if (!id) return [];

  try {
    const { data, error } = await (supabase
      .from('request_items' as any)
      .select(
        'id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order',
      )
      .eq('request_id', id)
      .order('row_no', { ascending: true })
      .order('position_order', { ascending: true })
      .order('id', { ascending: true }) as any);

    if (error) {
      console.warn('[catalog_api.listRequestItems] request_items:', error.message);
      return [];
    }

    if (!Array.isArray(data) || !data.length) return [];

    const mapped = (data as any[])
      .map((row) => mapRequestItemRow(row, id))
      .filter((row): row is ReqItemRow => !!row);

    return mapped.sort((a, b) => (a.line_no ?? 0) - (b.line_no ?? 0));
  } catch (e: any) {
    console.warn('[catalog_api.listRequestItems] request_items:', e?.message ?? e);
    return [];
  }
};

/** Delete request item from database */
export const deleteRequestItem = async (itemId: string): Promise<boolean> => {
  const id = norm(itemId);
  if (!id) {
    console.warn('[deleteRequestItem] No item ID provided');
    return false;
  }

  try {
    const { error } = await (supabase
      .from('request_items' as any)
      .delete()
      .eq('id', id) as any);

    if (error) {
      console.error('[deleteRequestItem] Failed to delete request item:', error.message);
      return false;
    }

    console.log('[deleteRequestItem] Successfully deleted item:', id);
    return true;
  } catch (e: any) {
    console.error('[deleteRequestItem] Exception:', e?.message ?? e);
    return false;
  }
};
// ========== PDF: простой HTML для заявки (без квадратиков) ==========
export const buildRequestPdfHtml = (
  details: RequestDetails,
  items: ReqItemRow[]
): string => {
  const safe = (v: any) =>
    (v === null || v === undefined ? "" : String(v)).trim();

  const reqNo = safe(details.display_no || details.id);
  const createdAt = safe(details.created_at);
  const createdAtRu = createdAt
    ? new Date(createdAt).toLocaleString("ru-RU")
    : "";

  const needBy = safe(details.need_by);
  const needByRu = needBy
    ? new Date(needBy).toLocaleDateString("ru-RU")
    : "";

  const objectName = safe(details.object_name_ru);
  const levelName = safe(details.level_name_ru);
  const systemName = safe(details.system_name_ru);
  const zoneName = safe(details.zone_name_ru);
  const foreman = safe(details.foreman_name);
  const status = safe(details.status || "Черновик");
  const comment = safe(details.comment);

  // Авто-текст примечания, который мы НЕ хотим дублировать в таблице
  const autoNoteParts: string[] = [];
  if (objectName) autoNoteParts.push(`Объект: ${objectName}`);
  if (levelName) autoNoteParts.push(`Этаж/уровень: ${levelName}`);
  if (systemName) autoNoteParts.push(`Система: ${systemName}`);
  if (zoneName) autoNoteParts.push(`Зона: ${zoneName}`);
  const autoNote = autoNoteParts.join("; ");
  const autoNoteNorm = autoNote
    ? autoNote.replace(/\s+/g, " ").trim()
    : "";

  const rowsHtml = (items || [])
    .map((row, idx) => {
      const name = safe(row.name_human || row.rik_code);
      const uom = safe(row.uom);
      const qty = safe(row.qty);
      const app = safe(row.app_code);
      const statusItem = safe(row.status);

      let note = safe(row.note);
      const normNote = note.replace(/\s+/g, " ").trim();

      // Если примечание = авто-шапка (Объект/Этаж/Система/Зона) → не показываем
      if (autoNoteNorm && normNote === autoNoteNorm) {
        note = "";
      }

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${name}</td>
          <td>${uom}</td>
          <td>${qty}</td>
          <td>${app}</td>
          <td>${statusItem || "—"}</td>
          <td>${note}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Заявка ${reqNo}</title>
  <style>
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                   "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    }

    body {
      margin: 24px;
      font-size: 12px;
      color: #0f172a;
      background: #ffffff;
    }

    .title {
      font-size: 22px;
      font-weight: 700;
      text-align: left;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 16px;
    }

    .header-block {
      margin-bottom: 18px;
      line-height: 1.5;
    }

    .header-row {
      display: flex;
      gap: 16px;
      margin-bottom: 4px;
    }

    .header-col {
      flex: 1;
    }

    .label {
      font-size: 11px;
      color: #6b7280;
    }

    .value {
      font-size: 12px;
      font-weight: 500;
    }

    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 16px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }

    thead tr {
      background: #f3f4f6;
    }

    th, td {
      border: 1px solid #e5e7eb;
      padding: 6px 8px;
      vertical-align: top;
    }

    th {
      font-weight: 600;
      font-size: 11px;
      text-align: left;
    }

    td {
      font-size: 11px;
    }

    .mt-8  { margin-top: 8px; }

    .comment-box {
      margin-top: 8px;
      padding: 8px 10px;
      border-radius: 6px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      white-space: pre-wrap;
    }

    .footer {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      gap: 32px;
      font-size: 12px;
    }

    .sign-col {
      flex: 1;
    }

    .sign-label {
      margin-bottom: 32px;
    }

    .sign-line {
      border-bottom: 1px solid #0f172a;
      height: 1px;
      margin-top: 4px;
    }
  </style>
</head>
<body>

  <!-- Заголовок -->
  <div class="title">Заявка ${reqNo}</div>
  <div class="subtitle">
    Сформировано: ${createdAtRu || "—"}
  </div>

  <!-- Шапка БЕЗ квадратиков: просто текстовые строки -->
  <div class="header-block">
    <div class="header-row">
      <div class="header-col">
        <div class="label">Объект</div>
        <div class="value">${objectName || "—"}</div>
      </div>
      <div class="header-col">
        <div class="label">Этаж / уровень</div>
        <div class="value">${levelName || "—"}</div>
      </div>
    </div>

    <div class="header-row">
      <div class="header-col">
        <div class="label">Зона / участок</div>
        <div class="value">${zoneName || "—"}</div>
      </div>
      <div class="header-col">
        <div class="label">Система / вид работ</div>
        <div class="value">${systemName || "—"}</div>
      </div>
    </div>

    <div class="header-row">
      <div class="header-col">
        <div class="label">ФИО прораба</div>
        <div class="value">${foreman || "—"}</div>
      </div>
      <div class="header-col">
        <div class="label">Нужно к</div>
        <div class="value">${needByRu || "—"}</div>
      </div>
    </div>

    <div class="header-row">
      <div class="header-col">
        <div class="label">Статус заявки</div>
        <div class="value">${status || "—"}</div>
      </div>
      <div class="header-col">
        <div class="label">ID заявки</div>
        <div class="value">${safe(details.id)}</div>
      </div>
    </div>

    ${comment
      ? `
    <div class="mt-8">
      <div class="label">Комментарий к заявке</div>
      <div class="comment-box">${comment}</div>
    </div>`
      : ""
    }
  </div>

  <div class="divider"></div>

  <!-- Таблица позиций -->
  <div class="label">Позиции заявки</div>
  <table>
    <thead>
      <tr>
        <th style="width: 32px;">№</th>
        <th>Позиция</th>
        <th style="width: 70px;">Ед. изм.</th>
        <th style="width: 70px;">Кол-во</th>
        <th style="width: 90px;">Применение</th>
        <th style="width: 90px;">Статус позиции</th>
        <th>Примечание</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="7">Позиции отсутствуют</td></tr>`}
    </tbody>
  </table>

  <!-- Подписи -->
  <div class="footer">
    <div class="sign-col">
      <div class="sign-label">Прораб</div>
      <div class="sign-line"></div>
      <div class="label">${foreman || "&nbsp;"}</div>
    </div>
    <div class="sign-col">
      <div class="sign-label">Директор</div>
      <div class="sign-line"></div>
      <div class="label">&nbsp;</div>
    </div>
  </div>

</body>
</html>
  `;
}
// Делает blob:URL для веба, чтобы foreman.tsx мог открыть window.open(url)
export const exportRequestPdf = async (requestId: string): Promise<string | null> => {
  const id = norm(requestId);
  if (!id) throw new Error("Не указан идентификатор заявки");

  const details = await fetchRequestDetails(id);
  if (!details) {
    throw new Error("Заявка не найдена");
  }

  const items = await listRequestItems(id);
  const html = buildRequestPdfHtml(details, items);

  // web: blob: URL (как у тебя на скрине)
  if (typeof window !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined") {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    return url;
  }

  // на native пока просто вернём html (там у тебя и так Alert если url нет)
  return html;
};


export const requestItemUpdateQty = async (
  requestItemId: string,
  qty: number,
  requestIdHint?: string,
): Promise<ReqItemRow | null> => {
  const id = norm(requestItemId);
  if (!id) throw new Error('Не найден идентификатор позиции');

  const numericQty = Number(qty);
  if (!Number.isFinite(numericQty) || numericQty <= 0) {
    throw new Error('Количество должно быть больше нуля');
  }

  const rid = requestIdHint ? norm(requestIdHint) : '';
  let lastErr: any = null;

  try {
    const { data, error } = await (supabase.rpc('request_item_update_qty' as any, {
      p_request_item_id: id,
      p_qty: numericQty,
    } as any) as any);
    if (!error && data) {
      const mapped = mapRequestItemRow(data, rid || '');
      if (mapped) return mapped;
    } else if (error) {
      lastErr = error;
    }
  } catch (e: any) {
    lastErr = e;
  }

  try {
    const { data, error } = await ((supabase
      .from('request_items' as any) as any)
      .update({ qty: numericQty } as any)
      .eq('id', id)
      .select(
        'id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order',
      )
      .maybeSingle() as any);
    if (error) throw error;
    if (data) {
      const mapped = mapRequestItemRow(data, rid || String((data as any)?.request_id ?? ''));
      if (mapped) return mapped;
    }
  } catch (e: any) {
    lastErr = e;
  }

  if (lastErr) throw lastErr;
  return null;
};

export const listForemanRequests = async (
  foremanName: string,
  companyId?: string | null,
  limit = 50,
): Promise<ForemanRequestSummary[]> => {
  const take = clamp(limit, 1, 200);

  // Build query with company filter
  let query = supabase
    .from("requests" as any)
    .select(
      `id,status,created_at,need_by,display_no,foreman_name,company_id,
       object_type_code,level_code,system_code,zone_code`
    );

  // Filter by company_id if provided
  if (companyId) {
    query = query.eq('company_id', companyId) as any;
  }

  const { data, error } = await (query
    .order("created_at", { ascending: false })
    .limit(take) as any);

  console.log('[listForemanRequests] query result:', { companyId, count: data?.length, error: error?.message });

  if (error || !Array.isArray(data)) {
    if (error) console.warn("[listForemanRequests]", error.message);
    return [];
  }

  // 1) маппим как раньше
  const ids = (data as any[]).map(r => r.id).filter(Boolean);
  if (!ids.length) return [];

  // 1.1) Fetch Ref Data manually to avoid relationship issues
  const objCodes = Array.from(new Set((data as any[]).map(r => r.object_type_code).filter(Boolean)));
  const lvlCodes = Array.from(new Set((data as any[]).map(r => r.level_code).filter(Boolean)));
  const sysCodes = Array.from(new Set((data as any[]).map(r => r.system_code).filter(Boolean)));
  const zoneCodes = Array.from(new Set((data as any[]).map(r => r.zone_code).filter(Boolean)));

  const [objRef, lvlRef, sysRef, zoneRef] = await Promise.all([
    objCodes.length ? supabase.from('ref_object_types').select('*').in('code', objCodes) : Promise.resolve({ data: [] }),
    lvlCodes.length ? supabase.from('ref_levels').select('*').in('code', lvlCodes) : Promise.resolve({ data: [] }),
    sysCodes.length ? supabase.from('ref_systems').select('*').in('code', sysCodes) : Promise.resolve({ data: [] }),
    zoneCodes.length ? supabase.from('ref_zones').select('*').in('code', zoneCodes) : Promise.resolve({ data: [] })
  ]);

  const objMap = new Map((objRef.data as any[])?.map((r: any) => [r.code, r]));
  const lvlMap = new Map((lvlRef.data as any[])?.map((r: any) => [r.code, r]));
  const sysMap = new Map((sysRef.data as any[])?.map((r: any) => [r.code, r]));
  const zoneMap = new Map((zoneRef.data as any[])?.map((r: any) => [r.code, r]));

  const mapped = (data as any[])
    .map((row) => {
      const enriched = {
        ...row,
        object: objMap.get(row.object_type_code),
        level: lvlMap.get(row.level_code),
        system: sysMap.get(row.system_code),
        zone: zoneMap.get(row.zone_code)
      };
      return mapSummaryFromRow(enriched);
    })
    .filter((row): row is ForemanRequestSummary => !!row);

  // 2) тянем статусы позиций одной пачкой
  const { data: itemRows, error: itemErr } = await (supabase
    .from("request_items" as any)
    .select("request_id,status")
    .in("request_id", ids as any) as any);

  if (itemErr || !Array.isArray(itemRows)) {
    return mapped;
  }

  const normSt = (s: any) => String(s ?? "").trim().toLowerCase();
  const isApproved = (s: string) =>
    s === "утверждено" || s === "утверждена" || s === "approved" || s === "к закупке";
  const isRejected = (s: string) =>
    s === "отклонено" || s === "отклонена" || s === "rejected";
  const isPending = (s: string) =>
    s === "на утверждении" || s === "pending";

  const agg = new Map<string, { total: number; ok: number; bad: number; pend: number }>();
  for (const row of itemRows as any[]) {
    const rid = String(row.request_id);
    const st = normSt(row.status);
    const cur = agg.get(rid) ?? { total: 0, ok: 0, bad: 0, pend: 0 };
    cur.total += 1;
    if (isApproved(st)) cur.ok += 1;
    else if (isRejected(st)) cur.bad += 1;
    else if (isPending(st)) cur.pend += 1;
    agg.set(rid, cur);
  }

  // 3) итоговая сборка для UI истории
  return mapped.map((req) => {
    const a = agg.get(String(req.id));
    if (!a || a.total === 0) return req;

    const hasRejected = a.bad > 0;

    // все отклонены
    if (a.bad === a.total) {
      return { ...req, status: "Отклонена", has_rejected: true };
    }

    // все утверждены
    if (a.ok === a.total) {
      return { ...req, status: "К закупке", has_rejected: false };
    }

    // частично: есть и ok, и отклонено
    if (a.ok > 0 && a.bad > 0) {
      return { ...req, status: "Частично утверждена", has_rejected: true };
    }

    // есть pending
    if (a.pend > 0) {
      if (hasRejected) return { ...req, status: "Частично утверждена", has_rejected: true };
      return { ...req, status: "На утверждении", has_rejected: false };
    }

    // fallback
    if (hasRejected) return { ...req, status: "Частично утверждена", has_rejected: true };
    return { ...req, has_rejected: false };
  });
};
export const listSuppliers = async (search?: string): Promise<Supplier[]> => {
  const q = norm(search);

  try {
    const { data, error } = await (supabase.rpc("suppliers_list" as any, {
      p_search: q || null,
    } as any) as any);

    if (!error && Array.isArray(data)) {
      return (data as any[])
        .map(mapSupplierRow)
        .filter((row): row is Supplier => !!row)
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
    }

    if (error) {
      const msg = String(error.message || "");
      if (!msg.includes("does not exist")) {
        console.warn("[catalog_api.listSuppliers] rpc suppliers_list:", error.message);
      }
    }
  } catch (e: any) {
    if (!String(e?.message ?? "").includes("does not exist")) {
      console.warn("[catalog_api.listSuppliers] rpc suppliers_list:", parseErr(e));
    }
  }

  try {
    let query = supabase
      .from("suppliers" as any)
      .select(
        "id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes"
      );

    if (q) {
      query = query.or(`name.ilike.%${q}%,inn.ilike.%${q}%,specialization.ilike.%${q}%`) as any;
    }

    const { data, error } = await (query.order("name", { ascending: true }).limit(100) as any);

    if (error) throw error;

    if (Array.isArray(data)) {
      return (data as any[])
        .map(mapSupplierRow)
        .filter((row): row is Supplier => !!row)
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
    }
  } catch (e: any) {
    console.warn("[catalog_api.listSuppliers] table suppliers:", parseErr(e));
  }

  return [];
};

export type ProposalBucketInput = {
  supplier?: string | null;
  request_item_ids: string[];
  meta?: Array<{
    request_item_id: string;
    price?: string | null;
    supplier?: string | null;
    note?: string | null;
  }>;
};

export type CreateProposalsOptions = {
  buyerFio?: string | null;
  submit?: boolean;
  requestItemStatus?: string | null;
};

export type CreateProposalsResult = {
  proposals: Array<{
    proposal_id: string;
    supplier: string;
    request_item_ids: string[];
  }>;
};


export const createProposalsBySupplier = async (
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions = {}
): Promise<CreateProposalsResult> => {
  const proposals: CreateProposalsResult["proposals"] = [];
  const shouldSubmit = opts.submit !== false;
  const statusAfter = opts.requestItemStatus ?? null;

  for (const bucket of buckets) {
    const ids = (bucket?.request_item_ids ?? []).map((id) => String(id)).filter(Boolean);
    if (!ids.length) continue;

    let proposalId: string;
    try {
      const created = await rpcProposalCreate();
      proposalId = String(created);
    } catch (e: any) {
      console.warn("[catalog_api.createProposalsBySupplier] proposalCreate:", parseErr(e));
      throw e;
    }

    const supplierDisplay = bucket?.supplier ? norm(bucket.supplier) : "";
    const supplierLabel = supplierDisplay || SUPPLIER_NONE_LABEL;

    if (opts.buyerFio) {
      try {
        await (supabase.from("proposals" as any).update({ buyer_fio: opts.buyerFio } as any).eq("id", proposalId) as any);
      } catch (e: any) {
        console.warn("[catalog_api.createProposalsBySupplier] set buyer_fio:", parseErr(e));
      }
    }

    if (supplierDisplay) {
      try {
        await (supabase
          .from("proposals" as any)
          .update({ supplier_name: supplierLabel, supplier: supplierLabel } as any)
          .eq("id", proposalId) as any);
      } catch (e: any) {
        console.warn("[catalog_api.createProposalsBySupplier] set supplier:", parseErr(e));
      }
    }

    let added = 0;
    try {
      added = await rpcProposalAddItems(proposalId, ids);
    } catch (e: any) {
      console.warn("[catalog_api.createProposalsBySupplier] proposalAddItems:", parseErr(e));
    }

    if (!added) {
      // Build a map of request_item_id -> meta for quick lookup
      const metaMap = new Map<string, { price?: string | null; supplier?: string | null; note?: string | null }>();
      for (const row of (bucket.meta || [])) {
        if (row.request_item_id) {
          metaMap.set(String(row.request_item_id), row);
        }
      }

      for (const pack of chunk(ids, 50)) {
        try {
          const rows = pack.map((request_item_id) => {
            const m = metaMap.get(request_item_id) || {};
            return {
              proposal_id: proposalId,
              request_item_id,
              price: m.price ? Number(String(m.price).replace(',', '.')) : null,
              supplier: m.supplier || (bucket.supplier ? norm(bucket.supplier) : null),
            };
          });
          const { error } = await ((supabase.from("proposal_items" as any) as any).insert(rows as any) as any);
          if (error) throw error;
        } catch (e: any) {
          console.warn(
            "[catalog_api.createProposalsBySupplier] proposal_items insert:",
            parseErr(e)
          );
          throw e;
        }
      }
    }

    const metaRows = (bucket.meta ?? ids.map((request_item_id) => ({ request_item_id }))).map((row: any) => ({
      request_item_id: row.request_item_id,
      price: row.price ?? null,
      supplier: row.supplier ?? (supplierDisplay ? supplierLabel : null),
      note: row.note ?? null,
    }));

    if (metaRows.length) {
      try {
        await rpcProposalSnapshotItems(proposalId, metaRows);
      } catch (e: any) {
        console.warn(
          "[catalog_api.createProposalsBySupplier] proposalSnapshotItems:",
          parseErr(e)
        );
      }
    }

    if (shouldSubmit) {
      try {
        await rpcProposalSubmit(proposalId);
      } catch (e: any) {
        console.warn(
          "[catalog_api.createProposalsBySupplier] proposalSubmit:",
          parseErr(e)
        );
      }
    }

    if (statusAfter) {
      try {
        const { error } = await (supabase.rpc("request_items_set_status" as any, {
          p_request_item_ids: ids,
          p_status: statusAfter,
        } as any) as any);
        if (error) throw error;
      } catch (e: any) {
        try {
          await ((supabase.from("request_items" as any) as any).update({ status: statusAfter } as any).in("id", ids) as any);
        } catch (e2: any) {
          console.warn(
            "[catalog_api.createProposalsBySupplier] request_items status:",
            parseErr(e2)
          );
        }
      }

      // ✅ НОВОЕ: Синхронизируем статус шапки заявки, чтобы она ушла из инбокса прораба/директора
      try {
        const { data: riData } = await (supabase.from('request_items' as any).select('request_id').in('id', ids) as any);
        const rIds = Array.from(new Set(((riData || []) as any[]).map(r => r.request_id).filter(Boolean)));
        if (rIds.length) {
          await (supabase.from('requests' as any).update({ status: 'В работе' } as any).in('id', rIds) as any);
        }
      } catch (e: any) {
        console.warn('[catalog_api.createProposalsBySupplier] parent requests status update failed:', parseErr(e));
      }
    }

    proposals.push({
      proposal_id: proposalId,
      supplier: supplierLabel,
      request_item_ids: ids,
    });
  }

  return { proposals };
};


// Russian keyword mapping for better search (user types Russian, DB has English codes)
const RU_KEYWORD_MAP: Record<string, string[]> = {
  'бетон': ['CONC', 'BETON', 'M200', 'M300', 'M400', 'M500'],
  'цемент': ['CEMENT', 'CEM'],
  'плитка': ['TILE', 'CERAMIC'],
  'кирпич': ['BRICK'],
  'арматура': ['REBAR', 'ARM'],
  'песок': ['SAND'],
  'щебень': ['GRAVEL', 'CRUSHED'],
  'гравий': ['GRAVEL'],
  'труба': ['PIPE', 'TUBE'],
  'кабель': ['CABLE', 'PWR'],
  'провод': ['WIRE'],
  'штукатурка': ['PLASTER', 'GYPSUM'],
  'краска': ['PAINT', 'COLOR', 'COATING'],
  'гипсокартон': ['GKLS', 'GKL', 'DRYWALL'],
  'утеплитель': ['INSULATION', 'ROCKWOOL'],
  'пенопласт': ['FOAM', 'EPS'],
  'металл': ['STEEL', 'METAL', 'IRON'],
  'доставка': ['SRV-DELIVERY', 'DELIVERY', 'TRANSPORT'],
  'аренда': ['SRV-RENT', 'RENT'],
  'насос': ['PUMP'],
  'кран': ['CRANE', 'TAP', 'FAUCET'],
  'леса': ['SCAFFOLDING'],
  'опалубка': ['FORMWORK'],
  'блок': ['BLOCK', 'GASBETON'],
  'раствор': ['MORTAR'],
  'окно': ['WINDOW', 'PVC'],
  'дверь': ['DOOR', 'WOOD'],
  'гвоздь': ['NAIL'],
  'саморез': ['SCREW', 'FASTENER'],
  'шуруп': ['SCREW'],
  'клей': ['GLUE', 'ADHESIVE'],
  'ламинат': ['LAMINATE', 'FLOOR'],
  'линолеум': ['LINOLEUM'],
  'грунтовка': ['PRIMER'],
  'шпаклевка': ['FILL', 'PUTTY', 'FINISH'],
  'шпатлевка': ['FILL', 'PUTTY'],
  'профиль': ['PROFILE', 'ALUMINUM'],
  'подвес': ['HANGER'],
  'уголок': ['CORNER', 'ANGLE'],
  'плинтус': ['BASEBOARD', 'PLINTH'],
  'порог': ['THRESHOLD'],
  'замок': ['LOCK'],
  'ручка': ['HANDLE'],
  'петля': ['HINGE'],
  'розетка': ['SOCKET', 'OUTLET'],
  'выключатель': ['SWITCH'],
  'счетчик': ['METER', 'WATER'],
  'автомат': ['BREAKER', 'SWITCH'],
  'щит': ['PANEL', 'BOARD', 'BOX'],
  'гофра': ['CONDUIT', 'CORRUGATED'],
  'муфта': ['COUPLING', 'SLEEVE'],
  'фитинг': ['FITTING', 'PVC'],
  'вентиль': ['VALVE'],
  'радиатор': ['RADIATOR', 'HEATER'],
  'котел': ['BOILER', 'GAS'],
  'кровля': ['ROOF'],
  'черепица': ['TILE', 'ROOF'],
  'шифер': ['SLATE'],
  'рубероид': ['ROOFING'],
  'стекло': ['GLASS'],
  'зеркало': ['MIRROR'],
  'сварка': ['WELD'],
  'дерево': ['WOOD', 'LUMBER'],
  'доска': ['BOARD', 'LUMBER'],
  'брус': ['BEAM'],
  'фанера': ['PLYWOOD'],
  'дсп': ['CHIPBOARD'],
  'мдф': ['MDF'],
  'вагонка': ['PANEL', 'WOOD'],
  'инструмент': ['TOOL'],
  'молоток': ['HAMMER'],
  'дрель': ['DRILL'],
  'перфоратор': ['HAMMER'],
  'болгарка': ['GRINDER'],
  'пила': ['SAW'],
  'услуги': ['SRV', 'SERVICE'],
  'работы': ['SRV', 'WORK'],
};

const expandSearchQuery = (query: string): string[] => {
  const q = query.toLowerCase();
  const expanded: string[] = [query];

  // Check if query matches any Russian keywords
  for (const [ruWord, enTerms] of Object.entries(RU_KEYWORD_MAP)) {
    if (q.includes(ruWord)) {
      expanded.push(...enTerms);
    }
  }

  // Extract numbers like M500, M300 etc.
  const numMatch = q.match(/[мm]\s*(\d{2,4})/i);
  if (numMatch) {
    const n = numMatch[1];
    expanded.push(`M${n}`);
    expanded.push(`B${n}`);
  }

  // Handle common suffixes/plurals (Russian)
  if (q.endsWith('и') || q.endsWith('ы')) {
    expanded.push(q.slice(0, -1));
  } else if (q.endsWith('а')) {
    expanded.push(q.slice(0, -1));
  }

  return [...new Set(expanded)];
};

export const rikQuickSearch = async (q: string, limit = 60, apps?: string[]) => {
  const pQuery = (q ?? '').trim();
  const pLimit = Math.max(1, Math.min(200, limit || 60));

  // Expand query with English equivalents
  const searchTerms = expandSearchQuery(pQuery);
  const primaryQuery = searchTerms[0];
  const altQueries = searchTerms.slice(1);

  // 1. Use catalog_search_v2 RPC for unified search (Russian full-text + transliteration)
  try {
    // Try V2 first (with full-text search)
    let rpcData: any = null;
    let rpcError: any = null;

    const { data: v2Data, error: v2Error } = await (supabase.rpc("catalog_search_v2" as any, {
      p_query: pQuery,
      p_kind: null,
      p_limit: pLimit,
    } as any) as any);

    if (!v2Error && Array.isArray(v2Data) && v2Data.length > 0) {
      rpcData = v2Data;
    } else {
      // Fallback to V1
      const { data: v1Data, error: v1Error } = await (supabase.rpc("catalog_search" as any, {
        p_query: primaryQuery,
        p_kind: null,
      } as any) as any);
      rpcData = v1Data;
      rpcError = v1Error;
    }

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return (rpcData as any[]).slice(0, pLimit).map(r => ({
        rik_code: r.rik_code,
        name_human: r.name_human_ru || r.name_human || r.rik_code,
        name_ru: r.name_human_ru || r.name_human || r.rik_code,
        uom_code: r.uom_code ?? null,
        kind: r.kind ?? null,
        apps: null as null | string[],
        qty_available: r.qty_available ?? 0,
      }));
    }

    if (rpcError) {
      console.warn("[rikQuickSearch] catalog_search error:", parseErr(rpcError));
    }
  } catch (e: any) {
    console.warn("[rikQuickSearch] catalog_search exception:", parseErr(e));
  }

  // 2. Fallback: search rik_items table directly (fuller catalog)
  if (pQuery) {
    try {
      // Build OR conditions for all search terms (primary + alternatives)
      const allTerms = [primaryQuery, ...altQueries].filter(Boolean);
      const orConditions = allTerms
        .flatMap(term => [`rik_code.ilike.%${term}%`, `name_human.ilike.%${term}%`])
        .join(',');

      const { data: rikData, error: rikErr } = await (supabase
        .from('rik_items' as any)
        .select('rik_code,name_human,uom_code,sector_code,spec,kind')
        .or(orConditions)
        .order('rik_code', { ascending: true })
        .limit(pLimit) as any);

      if (!rikErr && Array.isArray(rikData) && rikData.length > 0) {
        // Also search rik_aliases for Russian name matches
        let aliasMap: Record<string, string> = {};
        try {
          const allCodes = rikData.map((r: any) => r.rik_code).filter(Boolean);
          if (allCodes.length) {
            const { data: aliasData } = await (supabase
              .from('rik_aliases' as any)
              .select('rik_code,alias')
              .in('rik_code', allCodes) as any);

            if (Array.isArray(aliasData)) {
              for (const r of aliasData as any[]) {
                const a = (r.alias || '').trim();
                if (!a || !/[А-Яа-яЁё]/.test(a)) continue; // Only Russian aliases
                const code = String(r.rik_code);
                if (!aliasMap[code]) aliasMap[code] = a;
              }
            }
          }
        } catch {
          // Ignore alias fetch error
        }

        return (rikData as any[]).slice(0, pLimit).map(r => ({
          rik_code: r.rik_code,
          name_human: aliasMap[r.rik_code] || translateRikCodeSync(r.rik_code) || r.name_human || r.rik_code,
          name_ru: aliasMap[r.rik_code] || translateRikCodeSync(r.rik_code) || r.name_human || r.rik_code,
          uom_code: translateRikCodeSync(r.uom_code) || r.uom_code || null,
          kind: r.kind ?? null,
          apps: null as null | string[],
        }));
      }
    } catch (e: any) {
      console.warn("[rikQuickSearch] rik_items fallback error:", parseErr(e));
    }
  }

  // 3. Final fallback: catalog_items_clean via searchCatalogItems
  const rows = await searchCatalogItems(pQuery, pLimit, apps);
  return rows.map(r => ({
    rik_code: r.code,
    name_human: r.name,
    uom_code: r.uom ?? null,
    kind: r.kind ?? null,
    apps: null as null | string[],
  }));
};

// Direct insert helper to ensure fields like UOM are perfectly preserved
// bypassing potential RPC parameter filters
// NOTE: There's a DB trigger that clears UOM on INSERT, so we do INSERT + UPDATE
export const addRequestItemExact = async (
  requestId: string,
  rikCode: string,
  qty: number,
  opts: {
    name_human?: string;
    uom?: string | null;
    kind?: string | null;
    note?: string | null;
  } = {}
): Promise<void> => {
  const payload = {
    request_id: requestId,
    rik_code: rikCode,
    qty: qty,
    name_human: opts.name_human || null,
    uom: opts.uom || null,
    kind: opts.kind || 'Material',
    note: opts.note || null,
  };

  // DEBUG: Log exactly what we're inserting
  console.log('[addRequestItemExact] Inserting payload:', JSON.stringify(payload, null, 2));

  // Step 1: INSERT (trigger may clear uom)
  const { data, error } = await (supabase.from('request_items' as any).insert(payload as any).select('id, uom') as any);

  if (error) throw error;

  // Step 2: If uom was cleared by trigger, UPDATE to restore it
  if (data && data[0] && opts.uom && data[0].uom !== opts.uom) {
    console.log('[addRequestItemExact] Trigger cleared UOM, restoring via UPDATE:', opts.uom);
    const { data: updatedData, error: updateError } = await supabase
      .from('request_items' as any)
      .update({ uom: opts.uom, note: opts.note } as any)
      .eq('id', data[0].id)
      .select('id, uom, note');

    if (updateError) {
      console.warn('[addRequestItemExact] Failed to restore UOM:', updateError);
    } else {
      console.log('[addRequestItemExact] UPDATE returned:', JSON.stringify(updatedData, null, 2));
      // Check if trigger ALSO runs on UPDATE
      if (updatedData?.[0]?.uom !== opts.uom) {
        console.error('[addRequestItemExact] ⚠️ TRIGGER ALSO CLEARS UOM ON UPDATE!',
          'Expected:', opts.uom,
          'Got:', updatedData?.[0]?.uom
        );
      } else {
        console.log('[addRequestItemExact] UOM restored successfully:', opts.uom);
      }
    }
  }

  // DEBUG: Log final state
  console.log('[addRequestItemExact] INSERT complete, id:', data?.[0]?.id);
};


