// src/lib/catalog_api.ts
import { supabase } from "./supabaseClient";

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
  number?: string | null;
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

/** ========= helpers ========= */
const norm = (s?: string | null) => String(s ?? "").trim();
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** ========= Каталог: быстрый поиск ========= */
export async function searchCatalogItems(
  q: string,
  limit = 50,
  apps?: string[]
): Promise<CatalogItem[]> {
  const pQuery = norm(q);
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
    } catch {}
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
    try { if (typeof localStorage !== "undefined") return localStorage.getItem(DRAFT_KEY); } catch {}
    return memDraftId;
  },
  set(v: string) {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(DRAFT_KEY, v); } catch {}
    memDraftId = v;
  },
  clear() {
    try { if (typeof localStorage !== "undefined") localStorage.removeItem(DRAFT_KEY); } catch {}
    memDraftId = null;
  },
};

function getUuid(): string {
  // @ts-ignore
  if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getLocalDraftId(): string | null { return storage.get(); }
export function setLocalDraftId(id: string) { storage.set(id); }
export function clearLocalDraftId() { storage.clear(); }

/** Создаёт/возвращает черновик заявки */
export async function getOrCreateDraftRequestId(): Promise<string> {
  const cached = getLocalDraftId();
  if (cached) return cached;

  // 1) RPC варианты
  const rpcVariants = [
    "get_or_create_draft_request",
    "app_get_or_create_draft_request",
    "rk_get_or_create_draft_request",
  ];
  for (const fn of rpcVariants) {
    try {
      // @ts-ignore
      const { data, error } = await supabase.rpc(fn, {});
      if (!error && data) {
        const id =
          (data as any).id ??
          (data as any).request_id ??
          (Array.isArray(data) ? data[0]?.id ?? data[0]?.request_id : undefined);
        if (id) {
          const s = String(id);
          setLocalDraftId(s);
          return s;
        }
      }
    } catch {}
  }

  // 2) Прямая вставка
  const tableVariants = [
    { table: "requests", idCol: "id" },
    { table: "app_requests", idCol: "id" },
    { table: "rik_requests", idCol: "id" },
  ] as const;
  for (const { table, idCol } of tableVariants) {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert([{ status: "draft" }])
        .select(`${idCol}`)
        .single();
      if (!error && data?.[idCol]) {
        const id = String((data as any)[idCol]);
        setLocalDraftId(id);
        return id;
      }
    } catch {}
  }

  // 3) Фолбэк — локальный UUID, чтобы UI не падал
  const fallback = getUuid();
  setLocalDraftId(fallback);
  return fallback;
}

/** Заголовок заявки (для шапки/номера), пробуем вью/таблицы по очереди */
export async function getRequestHeader(requestId: string): Promise<RequestHeader | null> {
  const id = norm(requestId);
  if (!id) return null;

  const views = [
    { src: "vi_requests_display", cols: "id,number,status,created_at" },
    { src: "vi_requests", cols: "id,number,status,created_at" },
    { src: "requests", cols: "id,number,status,created_at" },
    { src: "app_requests", cols: "id,number,status,created_at" },
    { src: "rik_requests", cols: "id,number,status,created_at" },
  ] as const;

  for (const { src, cols } of views) {
    try {
      const { data, error } = await supabase.from(src).select(cols).eq("id", id).maybeSingle();
      if (!error && data) return data as RequestHeader;
    } catch {}
  }
  return { id };
}

/** Позиции заявки: читаем из вьюшек/таблиц, что найдутся */
export async function listRequestItems(requestId: string): Promise<RequestItem[]> {
  const id = norm(requestId);
  if (!id) return [];

  const sources = [
    { src: "vi_request_items_display", cols: "id,request_id,line_no,code,name,uom,qty,note" },
    { src: "vi_request_items", cols: "id,request_id,line_no,code,name,uom,qty,note" },
    { src: "request_items", cols: "id,request_id,line_no,code,name,uom,qty,note" },
    { src: "app_request_items", cols: "id,request_id,line_no,code,name,uom,qty,note" },
    { src: "rik_request_items", cols: "id,request_id,line_no,code,name,uom,qty,note" },
  ] as const;

  for (const { src, cols } of sources) {
    try {
      const { data, error } = await supabase
        .from(src)
        .select(cols)
        .eq("request_id", id)
        .order("line_no", { ascending: true });
      if (!error && Array.isArray(data)) return data as RequestItem[];
    } catch {}
  }
  return [];
}

export async function addRequestItemFromRik(
  requestId: string,
  rikCode: string,
  qty: number,
  opts: {
    note?: string;
    app_code?: string;
    kind?: string | null;
    name_human?: string;
    uom?: string | null;
  }
): Promise<boolean> {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) {
    return false;
  }

  const rid = norm(requestId);
  const code = norm(rikCode);
  if (!rid || !code) {
    return false;
  }

  const baseRow = {
    request_id: rid,
    rik_code: code,
    qty: q,
    note: opts?.note ?? null,
    app_code: opts?.app_code ?? null,
    kind: typeof opts?.kind === "undefined" ? null : opts.kind,
    name_human: opts?.name_human ?? null,
    uom: typeof opts?.uom === "undefined" ? null : opts.uom,
  } as const;

  const rpcPayload = {
    p_request_id: rid,
    p_rik_code: code,
    p_qty: q,
    p_note: opts?.note ?? null,
    p_app_code: opts?.app_code ?? null,
    p_kind: typeof opts?.kind === "undefined" ? null : opts.kind,
    p_name_human: opts?.name_human ?? null,
    p_uom: typeof opts?.uom === "undefined" ? null : opts.uom,
  } as const;

  let lastError: unknown = null;

  const rpcVariants = [
    "add_request_item_from_rik",
    "app_add_request_item_from_rik",
    "rk_add_request_item_from_rik",
  ];

  for (const fn of rpcVariants) {
    try {
      const { error } = await supabase.rpc(fn as any, rpcPayload as any);
      if (!error) {
        return true;
      }
      lastError = error;
    } catch (err) {
      lastError = err;
    }
  }

  const tableVariants = [
    "request_items",
    "app_request_items",
    "rik_request_items",
  ];

  for (const table of tableVariants) {
    try {
      const { error } = await supabase.from(table).insert([baseRow as any]);
      if (!error) {
        return true;
      }
      lastError = error;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    console.warn("[catalog_api.addRequestItemFromRik]", lastError);
  }
  return false;
}
export async function listSuppliers() {
  try {
    const q = await supabase.from('v_suppliers').select('id,name,inn,bank_account,phone,email').order('name');
    if (!q.error && q.data) return q.data as any[];
  } catch {}
  try {
    const q = await supabase.from('suppliers').select('id,name,inn,bank_account,phone,email').order('name');
    if (!q.error && q.data) return q.data as any[];
  } catch {}
  return [];
}

export async function listDirectorProposalsPending() {
  try {
    const r = await supabase.rpc('list_proposals_pending');
    if (!(r as any).error && (r as any).data) return (r as any).data as any[];
  } catch {}
  for (const src of ['v_proposals','proposals']) {
    try {
      const q = await supabase.from(src)
        .select('id, submitted_at, status, sent_to_accountant_at')
        .eq('status','На утверждении')
        .order('submitted_at',{ascending:false});
      if (!q.error && q.data) return (q.data as any[]);
    } catch {}
  }
  return [];
}

export async function rikQuickSearch(q: string, limit = 60, apps?: string[]) {
  const rows = await searchCatalogItems(q, limit, apps);
  return rows.map(r => ({
    rik_code: r.code,
    name_human: r.name,
    uom_code: r.uom ?? null,
    kind: r.kind ?? null,
    apps: null as null | string[],
  }));
}
