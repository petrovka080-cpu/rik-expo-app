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

/** Позиции заявки: сначала RPC request_items_list, потом фолбэк в таблицу */
export async function listRequestItems(
  requestId: string
): Promise<RequestItem[]> {
  const id = norm(requestId);
  if (!id) return [];

  // 1) Основной путь — RPC
  try {
    const { supabase } = await import('./supabaseClient');

    const { data, error } = await supabase.rpc('request_items_list', {
      p_request_id: id
    });

    if (!error && Array.isArray(data)) {
      return data as RequestItem[];
    }

    console.warn('[listRequestItems] RPC failed, fallback to table', error);
  } catch (e) {
    console.warn('[listRequestItems] RPC exception, fallback to table', e);
  }

  // 2) Фолбэк — обычная таблица
  const { supabase } = await import('./supabaseClient');
  const { data, error } = await supabase
    .from('request_items')
    .select('id,request_id,line_no,code,name,uom,qty,note')
    .eq('request_id', id)
    .order('line_no');

  if (error) {
    console.error('[listRequestItems] fallback table error', error);
    return [];
  }

  return (data ?? []) as RequestItem[];
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
// Добавление позиции из РИК-а через RPC request_add_item_min
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
  try {
    // базовая валидация
    const rid = String(requestId || '').trim();
    const code = String(rikCode || '').trim();
    const q = Number(qty);

    if (!rid || !code || !Number.isFinite(q) || q <= 0) {
      console.warn('[catalog_api.addRequestItemFromRik] bad input', {
        requestId,
        rikCode,
        qty,
      });
      return false;
    }

    // используем RPC-функцию request_add_item_min (она уже есть в БД)
    const { supabase } = await import('./supabaseClient');

    const { error } = await supabase.rpc('request_add_item_min', {
      // ВАЖНО: ИМЕНА ПАРАМЕТРОВ ДОЛЖНЫ СОВПАДАТЬ С SQL-ФУНКЦИЕЙ
      // request_add_item_min(
      //   p_request_id uuid,
      //   p_code       text,
      //   p_qty        numeric,
      //   p_note       text DEFAULT NULL,
      //   p_app_code   text DEFAULT NULL,
      //   p_name_human text DEFAULT NULL,
      //   p_uom        text DEFAULT NULL,
      //   p_kind       text DEFAULT NULL
      // )
      p_request_id: rid,
      p_code: code,
      p_qty: q,
      p_note: opts.note ?? null,
      p_app_code: opts.app_code ?? null,
      p_name_human: opts.name_human ?? null,
      p_uom: opts.uom ?? null,
      p_kind: opts.kind ?? null,
    });

    if (error) {
      console.warn(
        '[catalog_api.addRequestItemFromRik] request_add_item_min error:',
        error.message ?? error
      );
      return false;
    }

    return true;
  } catch (e: any) {
    console.warn(
      '[catalog_api.addRequestItemFromRik] unexpected error:',
      e?.message ?? e
    );
    return false;
  }
}
type BuyerProposalBucket = {
  supplierId?: string;
  supplier_id?: string;
  currency?: string | null;
  requestItemIds?: string[];
  request_item_ids?: string[];
  items?: { request_item_id: string }[];
};

export async function createProposalsBySupplier(
  buckets: BuyerProposalBucket[],
  _opts?: unknown
): Promise<boolean> {
  try {
    if (!Array.isArray(buckets) || buckets.length === 0) {
      console.warn('[catalog_api.createProposalsBySupplier] empty buckets');
      return false;
    }

    for (const bucket of buckets) {
      const supplierId = norm(bucket.supplierId ?? bucket.supplier_id);
      if (!supplierId) {
        console.warn(
          '[catalog_api.createProposalsBySupplier] bucket without supplierId',
          bucket
        );
        continue;
      }

      // собираем request_item_ids
      let ids: string[] =
        bucket.requestItemIds ??
        bucket.request_item_ids ??
        (Array.isArray(bucket.items)
          ? bucket.items.map((it) => String(it.request_item_id))
          : []);

      ids = ids.map((x) => norm(x)).filter(Boolean);

      if (!ids.length) {
        console.warn(
          '[catalog_api.createProposalsBySupplier] bucket without items',
          bucket
        );
        continue;
      }

      // 1) создаём предложение
      const created = await proposalCreate({
        supplierId,
        currency: bucket.currency ?? null,
      });

      if (!created?.proposal_id) {
        console.warn(
          '[catalog_api.createProposalsBySupplier] proposalCreate failed for supplier',
          supplierId
        );
        continue;
      }

      // 2) привязываем позиции заявки к предложению
      try {
        const { error } = await supabase.rpc('proposal_add_items', {
          p_proposal_id: created.proposal_id,
          p_request_item_ids: ids,
        } as any);

        if (error) {
          console.warn(
            '[catalog_api.createProposalsBySupplier] proposal_add_items error:',
            error.message ?? error
          );
        }
      } catch (e: any) {
        console.warn(
          '[catalog_api.createProposalsBySupplier] proposal_add_items exception:',
          e?.message ?? e
        );
      }
    }

    return true;
  } catch (err: any) {
    console.warn(
      '[catalog_api.createProposalsBySupplier] unexpected exception:',
      err?.message ?? err
    );
    return false;
  }
}

type ProposalCreateParams = {
  supplierId: string;
  currency?: string | null;
};

export async function proposalCreate(
  params: ProposalCreateParams
): Promise<{ proposal_id: string } | null> {
  try {
    const supplierId = norm(params?.supplierId);
    if (!supplierId) {
      console.warn('[catalog_api.proposalCreate] no supplierId', params);
      return null;
    }

    const currency = params?.currency ?? null;

    // 1) пробуем RPC proposal_create
    try {
      const { data, error } = await supabase.rpc('proposal_create', {
        p_supplier_id: supplierId,
        p_currency: currency,
      } as any);

      if (!error && data) {
        const id =
          (data as any).proposal_id ??
          (data as any).id ??
          (Array.isArray(data)
            ? data[0]?.proposal_id ?? data[0]?.id
            : undefined);

        if (id) {
          return { proposal_id: String(id) };
        }
      }

      if (error) {
        console.warn(
          '[catalog_api.proposalCreate] proposal_create rpc error:',
          error.message ?? error
        );
      }
    } catch (e: any) {
      console.warn(
        '[catalog_api.proposalCreate] rpc exception:',
        e?.message ?? e
      );
    }

    // 2) фолбэк: прямой insert в таблицу proposals
    try {
      const { data, error } = await supabase
        .from('proposals')
        .insert([{ supplier_id: supplierId, currency }])
        .select('id')
        .single();

      if (!error && data?.id) {
        return { proposal_id: String((data as any).id) };
      }

      if (error) {
        console.warn(
          '[catalog_api.proposalCreate] insert proposals error:',
          error.message ?? error
        );
      }
    } catch (e: any) {
      console.warn(
        '[catalog_api.proposalCreate] insert exception:',
        e?.message ?? e
      );
    }

    return null;
  } catch (err: any) {
    console.warn(
      '[catalog_api.proposalCreate] unexpected exception:',
      err?.message ?? err
    );
    return null;
  }
}

