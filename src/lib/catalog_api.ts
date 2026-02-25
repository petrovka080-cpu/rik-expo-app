// src/lib/catalog_api.ts
import { supabase } from "./supabaseClient";
import {
  proposalCreate as rpcProposalCreate,
  proposalAddItems as rpcProposalAddItems,
  proposalSubmit as rpcProposalSubmit,
  proposalSnapshotItems as rpcProposalSnapshotItems,
  batchResolveRequestLabels as rpcBatchResolveRequestLabels,
  requestCreateDraft as rpcRequestCreateDraft,
} from "./rik_api";

import { exportRequestPdf as exportRequestPdfProd } from "./rik_api";


export {
  ensureRequestSmart,
  requestCreateDraft,
  requestSubmit,
  directorReturnToBuyer,
  addRequestItemFromRik,
  clearCachedDraftRequestId,
} from "./rik_api";

export {
  listBuyerInbox,
  proposalCreate,
  proposalAddItems,
  proposalSubmit,
  exportProposalPdf,
  // @ts-ignore
  buildProposalPdfHtml,
  exportPaymentOrderPdf,
  proposalItems,
  proposalSnapshotItems,
  proposalSetItemsMeta,
  uploadProposalAttachment,
  proposalSendToAccountant,
  batchResolveRequestLabels,
  listDirectorProposalsPending,   // ← ДОБАВЬ ЭТУ СТРОКУ
} from "./rik_api";
export type { BuyerInboxRow } from "./rik_api";

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

const sanitizePostgrestOrTerm = (value: string): string =>
  norm(value)
    .replace(/[,%()]/g, " ")
    .replace(/[.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const pickRefName = (ref: any) =>
  norm(ref?.name_ru) ||
  norm(ref?.name_human_ru) ||
  norm(ref?.display_name) ||
  norm(ref?.alias_ru) ||
  norm(ref?.name) ||
  norm(ref?.code) ||
  null;

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

  const nameHuman =
    norm(raw?.name_human_ru) ||
    norm(raw?.name_human) ||
    norm(raw?.name_ru) ||
    norm(raw?.name) ||
    norm(raw?.display_name) ||
    norm(raw?.alias_ru) ||
    norm(raw?.best_name_display) ||
    "";

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
export async function searchCatalogItems(
  q: string,
  limit = 50,
  apps?: string[]
): Promise<CatalogItem[]> {
  const pQuery = sanitizePostgrestOrTerm(q);
  const pLimit = clamp(limit || 50, 1, 200);

  // 1) твои RPC (если есть)
  for (const fn of ["rik_quick_search_typed", "rik_quick_ru", "rik_quick_search"]) {
    try {
      const { data, error } = await supabase.rpc(fn as any, {
        p_q: pQuery,
        p_limit: pLimit,
        p_apps: apps ?? null,
      } as any);
      if (!error && Array.isArray(data)) {
        return (data as any[]).slice(0, pLimit).map((r) => ({
          code: r.rik_code,
          name: r.name_human ?? r.rik_code,
          uom: r.uom ?? r.uom_code ?? null,
          sector_code: r.sector_code ?? null,
          spec: r.spec ?? null,
          kind: r.kind ?? null,
          group_code: r.group_code ?? null,
        }));
      }
    } catch { }
  }

  // 2) чистое представление
  const { data, error } = await supabase
    .from("catalog_items_clean")
    .select("code,name,uom,sector_code,spec,kind,group_code")
    .or(`code.ilike.%${pQuery}%,name.ilike.%${pQuery}%`)
    .order("code", { ascending: true })
    .limit(pLimit);

  if (error || !Array.isArray(data)) return [];
  return data as CatalogItem[];
}

/** ========= Группы ========= */
export async function listCatalogGroups(): Promise<CatalogGroup[]> {
  const { data, error } = await supabase
    .from("catalog_groups_clean")
    .select("code,name,parent_code")
    .order("code", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as CatalogGroup[];
}

/** ========= Единицы измерения ========= */
export async function listUoms(): Promise<UomRef[]> {
  const { data, error } = await supabase
    .from("ref_uoms_clean")
    .select("id,code,name")
    .order("code", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as UomRef[];
}

/** ========= Склад: позиции к приходу ========= */
export async function listIncomingItems(incomingId: string): Promise<IncomingItem[]> {
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
}

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

export function getLocalDraftId(): string | null { return storage.get(); }
export function setLocalDraftId(id: string) { storage.set(id); }
export function clearLocalDraftId() { storage.clear(); }

const draftStatusKeys = new Set(['draft', 'черновик']);
const isDraftStatusValue = (value?: string | null) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return draftStatusKeys.has(normalized);
};

/** Создаёт/возвращает черновик заявки */
export async function getOrCreateDraftRequestId(): Promise<string> {
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
  } catch (e) {
    console.warn("[catalog_api.getOrCreateDraftRequestId]", (e as any)?.message ?? e);
    throw e;
  }

  throw new Error("Не удалось создать черновик заявки");
}

async function isCachedDraftValid(id: string): Promise<boolean> {
  const rid = norm(id);
  if (!rid) return false;

  try {
    const { data, error } = await supabase
      .from('requests' as any)
      .select('id,status')
      .eq('id', rid)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) return false;
    return isDraftStatusValue(data.status);
  } catch (e: any) {
    const msg = String(e?.message ?? '').toLowerCase();
    if (!msg.includes('permission denied')) {
      console.warn('[catalog_api.getOrCreateDraftRequestId] draft check:', e?.message ?? e);
    }
    return false;
  }
}

/** Заголовок заявки (для шапки/номера), пробуем вью/таблицы по очереди */
export async function getRequestHeader(requestId: string): Promise<RequestHeader | null> {
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
      const { data, error } = await supabase
        .from(view.src as any)
        .select(view.cols)
        .eq("id", id)
        .maybeSingle();
      if (!error && data) return data as RequestHeader;
    } catch { }
  }

  return { id };
}

export async function fetchRequestDisplayNo(requestId: string): Promise<string | null> {
  const id = norm(requestId);
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from("requests" as any)
      .select("id,display_no")
      .eq("id", id)
      .maybeSingle();
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
      const { data, error } = await supabase.rpc(fn as any, { p_request_id: id } as any);
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
      const { data, error } = await supabase
        .from(src as any)
        .select(`id,${col}`)
        .eq("id", id)
        .maybeSingle();
      if (!error && data && data[col] != null) return String(data[col]);
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        console.warn(`[catalog_api.fetchRequestDisplayNo] ${src}:`, e?.message ?? e);
      }
    }
  }

  return null;
}

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

export async function fetchRequestDetails(requestId: string): Promise<RequestDetails | null> {
  const id = norm(requestId);
  if (!id) return null;

  try {
    const { data, error } = await supabase
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
      .maybeSingle();
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
      const { data, error } = await supabase
        .from(view as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
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
}

export type RequestMetaPatch = {
  need_by?: string | null;
  comment?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  foreman_name?: string | null;
};

export async function updateRequestMeta(
  requestId: string,
  patch: RequestMetaPatch
): Promise<boolean> {
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
    const { error } = await supabase
      .from('requests' as any)
      .update(payload)
      .eq('id', id);

    if (error) {
      console.warn('[catalog_api.updateRequestMeta] table requests:', error.message);
      // ВАЖНО: не роняем поток, просто сообщаем, что не смогли обновить
      return false;
    }

    return true;
  } catch (e: any) {
    console.warn('[catalog_api.updateRequestMeta] table requests:', e?.message ?? e);
    // Тоже не роняем — пусть остальной код продолжит работать
    return false;
  }
}


/** Позиции заявки: простое чтение из таблицы request_items */
export async function listRequestItems(requestId: string): Promise<ReqItemRow[]> {
  const id = norm(requestId);
  if (!id) return [];

  try {
    const { data, error } = await supabase
      .from('request_items' as any)
      .select(
        'id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order',
      )
      .eq('request_id', id)
      .order('row_no', { ascending: true })
      .order('position_order', { ascending: true })
      .order('id', { ascending: true });

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
}
// ==============================
// PDF REQUEST (PROD SHIM)
// ==============================
export async function exportRequestPdf(
  requestId: string,
  mode: "preview" | "share" = "preview",
): Promise<string> {
  // mode оставляем только для совместимости: preview/share делает pdfRunner/runPdfTop
  return await exportRequestPdfProd(requestId);
}

export async function requestItemUpdateQty(
  requestItemId: string,
  qty: number,
  requestIdHint?: string,
): Promise<ReqItemRow | null> {
  const id = norm(requestItemId);
  if (!id) throw new Error('Не найден идентификатор позиции');

  const numericQty = Number(qty);
  if (!Number.isFinite(numericQty) || numericQty <= 0) {
    throw new Error('Количество должно быть больше нуля');
  }

  const rid = requestIdHint ? norm(requestIdHint) : '';
  let lastErr: any = null;

  try {
    const { data, error } = await supabase.rpc('request_item_update_qty' as any, {
      p_request_item_id: id,
      p_qty: numericQty,
    } as any);
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
    const { data, error } = await supabase
      .from('request_items' as any)
      .update({ qty: numericQty })
      .eq('id', id)
      .select(
        'id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order',
      )
      .maybeSingle();
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
}

export async function listForemanRequests(
  foremanName: string,
  limit = 50,
): Promise<ForemanRequestSummary[]> {
  const name = norm(foremanName);
  if (!name) return [];

  const take = clamp(limit, 1, 200);

  const { data, error } = await supabase
    .from("requests" as any)
    .select(
      `id,status,created_at,need_by,display_no,
       object_type_code,level_code,system_code,zone_code,
       object:ref_object_types(*),
       level:ref_levels(*),
       system:ref_systems(*),
       zone:ref_zones(*)`,
    )
    .ilike("foreman_name", name)
    .not("display_no", "is", null)
    .order("created_at", { ascending: false })
    .limit(take);

  if (error || !Array.isArray(data)) {
    if (error) console.warn("[listForemanRequests]", error.message);
    return [];
  }

  // 1) маппим как раньше
  const mapped = (data as any[])
    .map((row) => mapSummaryFromRow(row))
    .filter((row): row is ForemanRequestSummary => !!row);

  const ids = mapped.map((r) => r.id).filter(Boolean);
  if (!ids.length) return mapped;

  // 2) тянем статусы позиций одной пачкой (нужно и для has_rejected, и для итогового статуса)
  const { data: itemRows, error: itemErr } = await supabase
    .from("request_items" as any)
    .select("request_id,status")
    .in("request_id", ids as any);

  if (itemErr || !Array.isArray(itemRows)) {
    return mapped; // не ломаем историю
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
}
export async function listSuppliers(search?: string): Promise<Supplier[]> {
  const q = sanitizePostgrestOrTerm(search || "");

  try {
    const { data, error } = await supabase.rpc("suppliers_list" as any, {
      p_search: q || null,
    } as any);
    if (!error && Array.isArray(data)) {
      const mapped = (data as any[])
        .map(mapSupplierRow)
        .filter((row): row is Supplier => !!row)
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
      if (mapped.length) return mapped;
    } else if (error) {
      const msg = String(error.message || "");
      if (!msg.includes("does not exist")) {
        console.warn("[catalog_api.listSuppliers] rpc suppliers_list:", error.message);
      }
    }
  } catch (e: any) {
    if (!String(e?.message ?? "").includes("does not exist")) {
      console.warn("[catalog_api.listSuppliers] rpc suppliers_list:", e?.message ?? e);
    }
  }

  try {
    let query = supabase
      .from("suppliers")
      .select(
        "id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes"
      )
      .order("name", { ascending: true });
    if (q) {
      query = query.or(`name.ilike.%${q}%,inn.ilike.%${q}%,specialization.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (Array.isArray(data)) {
      return (data as any[])
        .map(mapSupplierRow)
        .filter((row): row is Supplier => !!row)
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
    }
  } catch (e: any) {
    console.warn("[catalog_api.listSuppliers] table suppliers:", e?.message ?? e);
  }

  return [];
}

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
    proposal_no: string | null; // ✅ добавили
    supplier: string;
    request_item_ids: string[];
  }>;
};

export async function createProposalsBySupplier(
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions = {}
): Promise<CreateProposalsResult> {
  const proposals: CreateProposalsResult["proposals"] = [];
  const shouldSubmit = opts.submit !== false;
  const statusAfter = opts.requestItemStatus ?? null;

  for (const bucket of buckets) {
    const ids = (bucket?.request_item_ids ?? []).map((id) => String(id)).filter(Boolean);
    if (!ids.length) continue;

    let proposalId: string;
    let proposalNo: string | null = null;

    try {
      const created = await rpcProposalCreate();
      proposalId = String(created);

      // ✅ proposal_no уже поставил BEFORE INSERT trigger (trg_proposals_set_no)
      const q = await supabase
        .from("proposals")
        .select("proposal_no,id_short,display_no")
        .eq("id", proposalId)
        .maybeSingle();

      proposalNo =
        (q.data as any)?.proposal_no ??
        (q.data as any)?.display_no ??
        ((q.data as any)?.id_short != null ? `PR-${String((q.data as any).id_short)}` : null);

    } catch (e: any) {
      console.warn("[catalog_api.createProposalsBySupplier] proposalCreate:", e?.message ?? e);
      throw e;
    }


    const supplierDisplay = bucket?.supplier ? norm(bucket.supplier) : "";
    const supplierLabel = supplierDisplay || SUPPLIER_NONE_LABEL;

    // ✅ В БД: только реальный поставщик или null
    const supplierDb: string | null = supplierDisplay ? supplierDisplay : null;


    if (opts.buyerFio) {
      try {
        await supabase.from("proposals").update({ buyer_fio: opts.buyerFio }).eq("id", proposalId);
      } catch (e: any) {
        console.warn("[catalog_api.createProposalsBySupplier] set buyer_fio:", e?.message ?? e);
      }
    }

    if (supplierDisplay) {
      try {
        await supabase
          .from("proposals")
          .update({ supplier: supplierDisplay }) // ✅ именно реальное имя
          .eq("id", proposalId);
      } catch (e: any) {
        console.warn("[catalog_api.createProposalsBySupplier] set supplier:", e?.message ?? e);
      }
    }


    let added = 0;
    try {
      added = await rpcProposalAddItems(proposalId, ids);
    } catch (e: any) {
      console.warn("[catalog_api.createProposalsBySupplier] proposalAddItems:", e?.message ?? e);
    }

    if (!added) {
      for (const pack of chunk(ids, 50)) {
        try {
          const rows = pack.map((request_item_id) => ({
            proposal_id: proposalId,
            request_item_id,
          }));
          const { error } = await supabase.from("proposal_items").insert(rows);
          if (error) throw error;
        } catch (e: any) {
          console.warn(
            "[catalog_api.createProposalsBySupplier] proposal_items insert:",
            e?.message ?? e
          );
          throw e;
        }
      }
    }

    const metaRows = (bucket.meta ?? ids.map((request_item_id) => ({ request_item_id }))).map((row) => ({
      request_item_id: String(row.request_item_id),
      // @ts-ignore
      price: row.price ?? null,

      // ✅ В БД supplier только реальный или NULL (никаких "— без поставщика —")
      supplier: supplierDb,

      // @ts-ignore
      note: row.note ?? null,
    }));

    if (metaRows.length) {
      try {
        await rpcProposalSnapshotItems(proposalId, metaRows);
      } catch (e: any) {
        console.warn(
          "[catalog_api.createProposalsBySupplier] proposalSnapshotItems:",
          e?.message ?? e
        );
      }
    }

    if (shouldSubmit) {
      try {
        await rpcProposalSubmit(proposalId);
      } catch (e: any) {
        console.warn(
          "[catalog_api.createProposalsBySupplier] proposalSubmit:",
          e?.message ?? e
        );
      }
    }

    if (statusAfter) {
      try {
        const { error } = await supabase.rpc("request_items_set_status" as any, {
          p_request_item_ids: ids,
          p_status: statusAfter,
        } as any);
        if (error) throw error;
      } catch (e: any) {
        try {
          await supabase.from("request_items").update({ status: statusAfter }).in("id", ids);
        } catch (e2: any) {
          console.warn(
            "[catalog_api.createProposalsBySupplier] request_items status:",
            e2?.message ?? e2
          );
        }
      }
    }

    proposals.push({
      proposal_id: proposalId,
      proposal_no: proposalNo, // ✅ добавили
      supplier: supplierLabel,
      request_item_ids: ids,
    });

  }

  return { proposals };
}


// ✅ PROD: единый умный поиск (любой ввод: черна / нерж / плит 60х60)
export async function rikQuickSearch(q: string, limit = 60) {
  const text = (q ?? '').trim();
  if (text.length < 2) return [];

  const { data, error } = await supabase.rpc('catalog_search_prod_v2', {
    q: text,
    p_limit: Math.min(limit, 100),
    p_kind: 'material',
    p_uom_code: null,
  });

  if (error) {
    console.error('[rikQuickSearch][catalog_search_prod_v2]', error);
    return [];
  }

  if (!Array.isArray(data)) return [];

  return data.map((r: any) => ({
    rik_code: r.rik_code,
    name_human: r.name_human,
    name_human_ru: r.name_human_ru ?? null,
    uom_code: r.uom_code ?? null,
    kind: r.kind ?? null,
    apps: null,
  }));
}
// ===============================
// CANCEL REQUEST ITEM
// ===============================
export async function requestItemCancel(requestItemId: string) {
  if (!requestItemId) {
    throw new Error('requestItemId is required');
  }

  const { error } = await supabase
    .from('request_items')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', requestItemId);

  if (error) {
    console.error('[requestItemCancel]', error);
    throw error;
  }

  return true;
}
