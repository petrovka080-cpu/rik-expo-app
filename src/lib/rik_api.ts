// src/lib/rik_api.ts — боевой минимальный API (стабильно, без спорных SELECT'ов)
import { supabase } from './supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// --- utils: normalize UUID (убираем # и валидируем) ---
export function normalizeUuid(raw: string | null | undefined) {
  const s = String(raw ?? '').trim().replace(/^#/, '');
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(s) ? s : null;
}

/** ===== Legacy shim: proposalDecide ===== */
declare global {
  // eslint-disable-next-line no-var
  var proposalDecide: ((...args: any[]) => Promise<void>) | undefined;
}
export const proposalDecide: (...args: any[]) => Promise<void> =
  (globalThis.proposalDecide ??= async (..._args: any[]) => {});
/** ===== End shim ===== */

// ============================== Types ==============================
export type CatalogItem = {
  rik_code: string;
  name_human?: string | null;
  name?: string | null;
  uom_code?: string | null;
  sector_code?: string | null;
  spec?: string | null;
  kind?: string | null;
  apps?: string[] | null;
};

export type ReqItemRow = {
  id: string;
  request_id: number | string;
  name_human: string;
  qty: number;
  uom?: string | null;
  status?: string | null;
  supplier_hint?: string | null;
  app_code?: string | null;
  note?: string | null;
};

export type RequestMeta = {
  foreman_name?: string;
  need_by?: string;
  comment?: string;
};

export type DirectorPendingRow = {
  id: number;
  request_id: number;
  request_item_id: string;
  name_human: string;
  qty: number;
  uom?: string | null;
};

export type BuyerInboxRow = {
  request_id: string;             // uuid
  request_id_old?: number | null; // для обратной совместимости
  request_item_id: string;
  rik_code: string | null;
  name_human: string;
  qty: string | number;
  uom?: string | null;
  app_code?: string | null;
  note?: string | null;
  object_name?: string | null;
  status: string;
  created_at?: string;
};

export type ProposalSummary = {
  id: number;
  status: 'На утверждении' | 'Утверждено' | 'Отклонено' | string;
  submitted_at?: string | null;
  decided_at?: string | null;
  reason?: string | null;
};

export type ProposalItem = {
  id: number;
  rik_code: string | null;
  name_human: string;
  uom: string | null;
  app_code: string | null;
  total_qty: number;
};

/** ===== Accountant types (НОВЫЕ) ===== */
export type AccountantInboxRow = {
  proposal_id: string;
  supplier?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_amount?: number | null;
  invoice_currency?: string | null;
  payment_status?: string | null;
  total_paid?: number | null;
  sent_to_accountant_at?: string | null;
  has_invoice?: boolean | null;
  payments_count?: number | null;
};

/** ===== Suppliers (НОВЫЕ) ===== */
export type Supplier = {
  id: string;
  name: string;            // юридическое/фактическое название (обязательно)
  inn?: string | null;     // ИНН
  bank_account?: string | null; // расчётный счёт
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  contact_name?: string | null;
  notes?: string | null;
};

// ============================== Internals ==============================
const client: SupabaseClient = supabase;
const toRpcId = (id: number | string) => String(id);
const parseErr = (e: any) =>
  e?.message ||
  e?.error_description ||
  (typeof e === 'string'
    ? e
    : (() => {
        try { return JSON.stringify(e); } catch { return String(e); }
      })());

const normStr = (s?: string | null) => String(s ?? '').trim().toLowerCase();

// универсальный ретрай RPC с разными именами параметров/имен функций
async function rpcCompat<T = any>(
  variants: Array<{ fn: string; args?: Record<string, any> }>
): Promise<T> {
  let lastErr: any = null;
  for (const v of variants) {
    try {
      const { data, error } = await supabase.rpc(v.fn as any, v.args as any);
      if (!error) return data as T;
      lastErr = error;
      const msg = String(error?.message || '');
      if (msg.includes('Could not find') || error?.code === 'PGRST302') continue;
    } catch (e: any) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return [] as unknown as T;
}

// helper: безопасный request_id для фильтров (не допускаем eq.=)
const toFilterId = (v: number | string) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (!s) return null;
  return /^\d+$/.test(s) ? Number(s) : s;
};

// ============================== Suppliers API (НОВОЕ) ==============================
export async function listSuppliers(q?: string): Promise<Supplier[]> {
  try {
    const r = await client
      .from('suppliers')
      .select('id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes')
      .order('name', { ascending: true });

    if (r.error) throw r.error;
    const list = (r.data || []) as Supplier[];
    if (!q || !q.trim()) return list;

    const n = normStr(q);
    return list.filter(s =>
      normStr(s.name).includes(n) ||
      normStr(s.inn).includes(n) ||
      normStr(s.specialization).includes(n)
    );
  } catch (e) {
    console.warn('[listSuppliers]', parseErr(e));
    return [];
  }
}

export async function upsertSupplier(draft: Partial<Supplier>): Promise<Supplier> {
  const payload: any = {
    name: (draft.name || '').trim(),
    inn: (draft.inn ?? '').trim() || null,
    bank_account: (draft.bank_account ?? '').trim() || null,
    specialization: (draft.specialization ?? '').trim() || null,
    contact_name: (draft.contact_name ?? '').trim() || null,
    phone: (draft.phone ?? '').trim() || null,
    email: (draft.email ?? '').trim() || null,
    website: (draft.website ?? '').trim() || null,
    address: (draft.address ?? '').trim() || null,
    notes: (draft.notes ?? '').trim() || null,
  };

  if (!payload.name) throw new Error('Укажите название поставщика');

  // если id есть — обновляем
  if (draft.id) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(payload)
      .eq('id', draft.id)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data as Supplier;
  }

  // если нет — вставляем
  const { data, error } = await supabase
    .from('suppliers')
    .insert([payload])
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data as Supplier;
}

export async function listSupplierFiles(supplierId: string) {
  try {
    const r = await client
      .from('supplier_files')
      .select('id,created_at,file_name,file_url,group_key')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });
    if (r.error) throw r.error;
    return r.data || [];
  } catch (e) {
    console.warn('[listSupplierFiles]', parseErr(e));
    return [];
  }
}

// ============================== RIK search ==============================
export async function rikQuickSearch(q: string, limit = 50, apps?: string[]) {
  const pQuery = (q ?? '').trim();
  const pLimit = Math.max(1, Math.min(200, limit || 50));

  try {
    const { data, error } = await client.rpc('rik_quick_search_typed', {
      p_q: pQuery, p_limit: pLimit, p_apps: apps ?? null,
    } as any);
    if (!error && Array.isArray(data)) return (data ?? []) as CatalogItem[];
  } catch {}

  try {
    const { data, error } = await client.rpc('rik_quick_ru', {
      p_q: pQuery, p_limit: pLimit, p_apps: apps ?? null,
    } as any);
    if (!error && Array.isArray(data)) return (data ?? []) as CatalogItem[];
  } catch {}

  try {
    const { data, error } = await client.rpc('rik_quick_search', {
      p_q: pQuery, p_limit: pLimit, p_apps: apps ?? null,
    } as any);
    if (!error && Array.isArray(data)) return (data ?? []) as CatalogItem[];
  } catch {}

  if (!pQuery) return [];
  let base: any[] = [];
  {
    const fb = await client
      .from('rik_items')
      .select('rik_code,name_human,uom_code,sector_code,spec,kind')
      .or(`rik_code.ilike.%${pQuery}%,name_human.ilike.%${pQuery}%`)
      .order('rik_code', { ascending: true })
      .limit(pLimit * 2);
    if (!fb.error && Array.isArray(fb.data)) base = fb.data as any[];
  }

  let aliasCodes: string[] = [];
  try {
    const al = await client
      .from('rik_aliases')
      .select('rik_code')
      .ilike('alias', `%${pQuery}%`)
      .limit(pLimit * 2);
    if (!al.error && Array.isArray(al.data)) {
      aliasCodes = Array.from(new Set((al.data as any[]).map((r) => String(r.rik_code))));
    }
  } catch {}

  if (aliasCodes.length) {
    const have = new Set(base.map((r) => String(r.rik_code)));
    const extraCodes = aliasCodes.filter((c) => !have.has(c));
    if (extraCodes.length) {
      const add = await client
        .from('rik_items')
        .select('rik_code,name_human,uom_code,sector_code,spec,kind')
        .in('rik_code', extraCodes)
        .limit(pLimit * 2);
      if (!add.error && Array.isArray(add.data)) base = base.concat(add.data as any[]);
    }
  }

  let aliasMap: Record<string, string> = {};
  const allCodes = Array.from(new Set(base.map((r) => String(r.rik_code)).filter(Boolean)));
  if (allCodes.length) {
    try {
      const al2 = await client
        .from('rik_aliases')
        .select('rik_code,alias')
        .in('rik_code', allCodes);
      if (!al2.error && Array.isArray(al2.data)) {
        const prefer = pQuery.toLowerCase();
        const byCode: Record<string, { hit?: string; any?: string }> = {};
        for (const r of (al2.data as any[])) {
          const a = (r.alias || '').trim();
          if (!a) continue;
          if (!/[А-Яа-яЁё]/.test(a)) continue;
          const code = String(r.rik_code);
          byCode[code] ||= {};
          if (!byCode[code].any) byCode[code].any = a;
          if (!byCode[code].hit && a.toLowerCase().startsWith(prefer)) byCode[code].hit = a;
        }
        aliasMap = Object.fromEntries(Object.entries(byCode).map(([k, v]) => [k, v.hit ?? v.any!]));
      }
    } catch {}
  }

  const merged = base.map((r) => ({ ...r, name_human: aliasMap[r.rik_code] ?? r.name_human ?? r.rik_code }));

  const seen = new Set<string>();
  const qa = pQuery.toLowerCase();
  const ranked = merged.sort((a, b) => {
    const aName = String(a.name_human || '').toLowerCase();
    const bName = String(b.name_human || '').toLowerCase();
    const aCode = String(a.rik_code || '').toLowerCase();
    const bCode = String(b.rik_code || '').toLowerCase();
    const ra = aName.startsWith(qa) ? 0 : aCode.startsWith(qa) ? 1 : aName.includes(qa) ? 2 : 3;
    const rb = bName.startsWith(qa) ? 0 : bCode.startsWith(qa) ? 1 : bName.includes(qa) ? 2 : 3;
    return ra - rb || String(a.rik_code).localeCompare(String(b.rik_code));
  });

  const out: CatalogItem[] = [];
  for (const r of ranked) {
    const key = String(r.rik_code);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= pLimit) break;
  }
  return out;
}

// === profiles: ensure & role ===
export async function ensureMyProfile(): Promise<boolean> {
  const { error } = await supabase.rpc('ensure_my_profile');
  if (error) { console.warn('[ensureMyProfile]', error.message); return false; }
  return true;
}

export async function getMyRole(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_my_role');
  if (error) { console.warn('[getMyRole]', error.message); return null; }
  return (data as string) ?? null;
}

// ============================== Requests / Items ==============================
export async function listRequestItems(requestId: number | string): Promise<ReqItemRow[]> {
  try {
    const raw = String(requestId ?? '').trim();
    if (!raw) return [];

    const { data, error } = await client.rpc('request_items_by_request', { p_request_id: raw });
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    return rows.map((r: any) => ({
      id: r.id,
      request_id: r.request_id,
      name_human: r.name_human ?? '—',
      qty: Number(r.qty ?? 0),
      uom: r.uom ?? null,
      status: r.status ?? null,
      supplier_hint: r.supplier_hint ?? null,
      app_code: r.app_code ?? null,
      note: r.note ?? null,
    })) as ReqItemRow[];
  } catch (e) {
    console.warn('[listRequestItems]', (e as any)?.message ?? e);
    return [];
  }
}

export async function ensureRequest(requestId: number | string): Promise<number | string> {
  const rid = requestId;
  try {
    const found = await client.from('requests').select('id').eq('id', toFilterId(rid) as any).limit(1).maybeSingle();
    if (!found.error && found.data?.id != null) return found.data.id;
  } catch {}
  try {
    const up = await client.from('requests').upsert({ id: rid, status: 'Черновик' } as any, { onConflict: 'id' }).select('id').single();
    if (!up.error && up.data?.id != null) return up.data.id;
  } catch (e) {
    console.warn('[ensureRequest/upsert]', parseErr(e));
  }
  return rid;
}

export async function ensureRequestSmart(currentId?: number | string, meta?: RequestMeta): Promise<number | string> {
  try {
    const r0 = await client.rpc('request_ensure');
    if (!r0.error && r0.data != null) return r0.data as any;
  } catch {}

  try {
    const { data, error } = await client.rpc('request_ensure', {
      p_id: currentId ?? null,
      p_foreman_name: meta?.foreman_name ?? null,
      p_need_by: meta?.need_by ?? null,
      p_comment: meta?.comment ?? null,
    } as any);
    if (!error) return (data as any) ?? currentId ?? '';
  } catch (e) {
    console.warn('[ensureRequestSmart]', parseErr(e));
  }
  return currentId ?? '';
}

export async function addRequestItemFromRik(
  requestId: number | string,
  rik_code: string,
  qty: number,
  opts?: { note?: string; app_code?: string; kind?: string; name_human?: string; uom?: string | null }
): Promise<boolean> {
  try {
    if (!rik_code) throw new Error('rik_code required');
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) throw new Error('qty must be > 0');

    const rid = toFilterId(requestId);
    if (rid == null) throw new Error('request_id is empty');

    const row: any = { request_id: rid as any, rik_code, qty: q };
    if (opts?.name_human) row.name_human = opts.name_human;
    if (typeof opts?.uom !== 'undefined') row.uom = opts.uom;
    if (opts?.note) row.note = opts.note;
    if (opts?.app_code) row.app_code = opts.app_code;
    if (opts?.kind) row.kind = opts.kind;

    const { error } = await client.from('request_items').insert([row]);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[addRequestItemFromRik]', parseErr(e));
    return false;
  }
}

// ============================== Approvals / Director ==============================
export async function listPending(): Promise<DirectorPendingRow[]> {
  const ridMap = new Map<string, number>();
  let ridSeq = 1;

  const normalize = (arr: any[]): DirectorPendingRow[] =>
    (arr ?? []).map((r: any, i: number) => {
      const raw =
        r.request_id ?? r.request_id_old ?? r.request ?? r.request_uuid ?? r.request_id_text ?? '';
      let ridNum = Number(raw);
      if (!Number.isFinite(ridNum) || ridNum <= 0) {
        const key = String(raw || '');
        if (!ridMap.has(key)) ridMap.set(key, ridSeq++);
        ridNum = ridMap.get(key)!;
      }
      return {
        id: Number(r.id ?? i + 1),
        request_id: ridNum,
        request_item_id: String(r.request_item_id ?? r.id ?? ''),
        name_human: String(r.name_human ?? ''),
        qty: Number(r.qty ?? 0),
        uom: r.uom ?? null,
      };
    });

  try {
    let rpc = await client.rpc('list_pending_foreman_items');
    if (!rpc.error && Array.isArray(rpc.data)) return normalize(rpc.data as any[]);

    rpc = await client.rpc('listPending');
    if (!rpc.error && Array.isArray(rpc.data)) return normalize(rpc.data as any[]);
    rpc = await client.rpc('list_pending');
    if (!rpc.error && Array.isArray(rpc.data)) return normalize(rpc.data as any[]);
    rpc = await client.rpc('listpending');
    if (!rpc.error && Array.isArray(rpc.data)) return normalize(rpc.data as any[]);
  } catch (e) {
    console.warn('[listPending] rpc failed → fallback', parseErr(e));
  }

  try {
    const reqs = await client.from('requests').select('id, id_old').eq('status', 'На утверждении');
    const ids = (reqs.data || []).map((r: any) => String(r.id));
    if (!ids.length) return [];

    const idOldByUuid = new Map<string, number>();
    (reqs.data || []).forEach((r: any) => {
      if (Number.isFinite(r.id_old)) idOldByUuid.set(String(r.id), Number(r.id_old));
    });

    const ri = await client
      .from('request_items')
      .select('id,request_id,name_human,qty,uom,status')
      .in('request_id', ids)
      .neq('status', 'Утверждено')
      .order('request_id', { ascending: true })
      .order('id', { ascending: true });

    if (ri.error) throw ri.error;

    const out: DirectorPendingRow[] = [];
    for (let i = 0; i < (ri.data || []).length; i++) {
      const r: any = (ri.data as any[])[i];
      const uuid = String(r.request_id);
      let ridNum = idOldByUuid.get(uuid);
      if (!Number.isFinite(ridNum)) {
        if (!ridMap.has(uuid)) ridMap.set(uuid, ridSeq++);
        ridNum = ridMap.get(uuid)!;
      }
      out.push({
        id: i + 1,
        request_id: ridNum!,
        request_item_id: String(r.id ?? ''),
        name_human: String(r.name_human ?? ''),
        qty: Number(r.qty ?? 0),
        uom: r.uom ?? null,
      });
    }
    return out;
  } catch (e) {
    console.warn('[listPending/fallback]', parseErr(e));
    return [];
  }
}

export async function approve(approvalId: number | string) {
  try {
    const rpc = await client.rpc('approve_one', { p_proposal_id: toRpcId(approvalId) });
    if (!rpc.error) return true;
  } catch {}
  const upd = await client
    .from('proposals')
    .update({ status: 'Утверждено' })
    .eq('id', approvalId)
    .eq('status', 'На утверждении')
    .select('id')
    .maybeSingle();
  if (upd.error) throw upd.error;
  return !!upd.data;
}

export async function reject(approvalId: number | string, _reason = 'Без причины') {
  try {
    const rpc = await client.rpc('reject_one', { p_proposal_id: toRpcId(approvalId) });
    if (!rpc.error) return true;
  } catch {}
  const upd = await client
    .from('proposals')
    .update({ status: 'Отклонено' })
    .eq('id', approvalId)
    .eq('status', 'На утверждении')
    .select('id')
    .maybeSingle();
  if (upd.error) throw upd.error;
  return !!upd.data;
}
export async function directorReturnToBuyer(
  a: { proposalId: string | number; comment?: string } | string | number,
  b?: string | null
) {
  const pid = typeof a === 'object' && a !== null ? String((a as any).proposalId) : String(a);
  const comment = typeof a === 'object' && a !== null ? (a as any).comment : b;
  const c = (comment ?? '').trim() || null;

  const { error } = await supabase.rpc('director_return_min_auto', {
    p_proposal_id: pid,
    p_comment: c,
  });
  if (error) throw error;
  return true;
}

export type DirectorInboxRow = {
  kind: 'request' | 'proposal';
  entity_id: string;
  request_id: string | null;
  supplier: string | null;
  actor_name: string | null;
  status: string;
  submitted_at: string | null;
  items_count: number | null;
};

// ⚙️ Инбокс директора — скрываем шапки (kind==='request'), чтобы нижний блок не появлялся
export async function listDirectorInbox(status: 'На утверждении' | 'Утверждено' | 'Отклонено' = 'На утверждении') {
  const { data, error } = await client.rpc('list_director_inbox', { p_status: status });
  if (error) { console.warn('[listDirectorInbox]', error.message); return []; }
  const rows = (data ?? []) as DirectorInboxRow[];
  return rows.filter(r => (r?.kind ?? '') !== 'request');
}

export async function requestSubmit(requestId: number | string) {
  try {
    const asStr = String(requestId ?? '').trim();
    const ridForRpc = normalizeUuid(asStr) ?? asStr;
    if (!ridForRpc) throw new Error('request_id is empty');
    const rpc = await client.rpc('request_submit', { p_request_id: ridForRpc as any });
    if (rpc.error) throw rpc.error;
    return 1;
  } catch (e) {
    console.warn('[requestSubmit/rpc]', parseErr(e));
  }
  const upd = await client
    .from('requests')
    .update({ status: 'На утверждении', submitted_at: new Date().toISOString() })
    .eq('id', toFilterId(requestId) as any)
    .select('id')
    .maybeSingle();
  if (upd.error) throw upd.error;
  return upd.data?.id ? 1 : 0;
}

// ============================== Buyer: inbox & proposals ==============================
export async function listBuyerInbox(): Promise<BuyerInboxRow[]> {
  try {
    const { data, error } = await client.rpc('list_buyer_inbox');
    if (!error) return (data ?? []) as BuyerInboxRow[];
  } catch {}
  const fb = await client
    .from('request_items')
    .select('request_id,id as request_item_id,name_human,qty,uom,app_code,status')
    .in('status', ['Утверждено', 'К закупке'])
    .order('request_id', { ascending: true })
    .limit(1000);
  if (fb.error) {
    console.warn('[listBuyerInbox/fallback]', parseErr(fb.error));
    return [];
  }
  return (fb.data ?? []) as any;
}

export async function listBuyerProposalsByStatus(status: 'На утверждении' | 'Утверждено' | 'Отклонено') {
  const { data, error } = await client
    .from('proposals')
    .select('id, status, submitted_at')
    .eq('status', status)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================== Proposals CRUD ==============================
export async function proposalCreate(): Promise<number | string> {
  try {
    const { data, error } = await client.rpc('proposal_create');
    if (!error && data != null) {
      if (typeof data === 'object' && 'id' in (data as any)) return (data as any).id;
      return data as any;
    }
  } catch {}
  const ins = await client.from('proposals').insert({}).select('id').single();
  if (ins.error) throw ins.error;
  return ins.data?.id;
}

export async function proposalAddItems(proposalId: number | string, requestItemIds: string[]) {
  try {
    const { data, error } = await client.rpc('proposal_add_items', {
      p_proposal_id: String(proposalId),
      p_request_item_ids: requestItemIds,
    });
    if (error) throw error;
    return Number(data ?? 0);
  } catch (_) {
    let ok = 0;
    for (const id of requestItemIds) {
      try {
        const ins = await client
          .from('proposal_items')
          .insert({ proposal_id: String(proposalId), request_item_id: id })
          .select('id')
          .single();
        if (!ins.error) ok++;
        else console.warn('[proposalAddItems/fallback/insert]', ins.error.message);
      } catch (e: any) {
        console.warn('[proposalAddItems/fallback/insert ex]', e?.message ?? e);
      }
    }
    return ok;
  }
}

export async function proposalSubmit(proposalId: number | string) {
  const pid = String(proposalId);

  // 1) основная попытка через RPC
  try {
    const { error } = await client.rpc('proposal_submit', { p_proposal_id: toRpcId(proposalId) });
    if (error) throw error;
  } catch {
    // 2) fallback UPDATE (как было)
    const upd = await client
      .from('proposals')
      .update({ status: 'На утверждении', submitted_at: new Date().toISOString() })
      .eq('id', proposalId)
      .select('id')
      .maybeSingle();
    if (upd.error) throw upd.error;
    if (!upd.data?.id) return 0;
  }

  // 3) ⬅️ МИНИ-ФИКС: при "На утверждении" — гасим след бухгалтера
  //    (это не меняет бизнес-логику, только устраняет "залипание")
  await client
    .from('proposals')
    .update({ payment_status: null, sent_to_accountant_at: null })
    .eq('id', pid);

  return 1;
}

// ===== Безопасный список «предложений на утверждении» для директора =====
export async function listDirectorProposalsPending(): Promise<Array<{ id: string; submitted_at: string | null }>> {
  let r = await supabase
    .from('proposals')
    .select('id, submitted_at')
    .eq('status', 'На утверждении')
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  if (r.error || !r.data) {
    try {
      const rpc = await supabase.rpc('list_director_proposals_pending', {});
      if (!rpc.error && rpc.data) {
        return (rpc.data as any[])
          .map(x => ({ id: String(x.id), submitted_at: x.submitted_at ?? null }))
          .filter(x => x.submitted_at != null);
      }
    } catch {}
    console.warn('[listDirectorProposalsPending] error:', r.error?.message);
    return [];
  }

  return (r.data || [])
    .map((x: any) => ({ id: String(x.id), submitted_at: x.submitted_at ?? null }))
    .filter(x => x.submitted_at != null);
}

// ===== ПРОЧИТАТЬ СТРОКИ ПРЕДЛОЖЕНИЯ: TABLE → snapshot → view → rpc =====
export type ProposalItemRow = {
  id: number;
  rik_code: string | null;
  name_human: string;
  uom: string | null;
  app_code: string | null;
  total_qty: number;
};

export async function proposalItems(proposalId: string | number): Promise<ProposalItemRow[]> {
  const pid = String(proposalId);
  let rows: any[] = [];

  try {
    const q = await supabase
      .from('proposal_items')
      .select('id, name_human, uom, qty, app_code, rik_code')
      .eq('proposal_id', pid)
      .order('id', { ascending: true });

    if (!q.error && Array.isArray(q.data) && q.data.length) {
      const key = (r: any) => [
        String(r.name_human ?? ''), String(r.uom ?? ''), String(r.app_code ?? ''), String(r.rik_code ?? ''),
      ].join('||');

      const agg = new Map<string, { id: number; name_human: string; uom: string | null; app_code: string | null; rik_code: string | null; total_qty: number }>();
      (q.data as any[]).forEach((r: any, i: number) => {
        const k = key(r);
        const prev = agg.get(k);
        agg.set(k, {
          id: prev?.id ?? Number(r.id ?? i),
          name_human: String(r.name_human ?? ''),
          uom: r.uom ?? null,
          app_code: r.app_code ?? null,
          rik_code: r.rik_code ?? null,
          total_qty: (prev?.total_qty ?? 0) + Number(r.qty ?? 0),
        });
      });

      rows = Array.from(agg.values());
    }
  } catch (e) {
    console.warn('[proposalItems/table]', (e as any)?.message ?? e);
  }

  if (!rows.length) {
    try {
      const snap = await supabase
        .from('proposal_snapshot_items')
        .select('id, rik_code, name_human, uom, app_code, total_qty')
        .eq('proposal_id', pid)
        .order('id', { ascending: true });
      if (!snap.error && snap.data?.length) rows = snap.data as any[];
    } catch {}
  }

  if (!rows.length) {
    try {
      const view = await supabase
        .from('proposal_items_view')
        .select('id, rik_code, name_human, uom, app_code, total_qty')
        .eq('proposal_id', pid)
        .order('id', { ascending: true });
      if (!view.error && view.data?.length) rows = view.data as any[];
    } catch {}
  }

  if (!rows.length) {
    try {
      const r = await supabase.rpc('proposal_items_for_web', { p_id: pid });
      if (!r.error && r.data?.length) rows = r.data as any[];
    } catch {}
  }

  return (rows || []).map((r: any, i: number) => ({
    id: Number(r.id ?? i),
    rik_code: r.rik_code ?? null,
    name_human: r.name_human ?? '',
    uom: r.uom ?? null,
    app_code: r.app_code ?? null,
    total_qty: Number(r.total_qty ?? r.qty ?? 0),
  }));
}

// ============================== Snapshot RPC ==============================
export async function proposalSnapshotItems(
  proposalId: number | string,
  metaRows: { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null; }[] = []
) {
  const { error } = await client.rpc('proposal_items_snapshot', { p_proposal_id: String(proposalId), p_meta: metaRows });
  if (error) throw error;
  return true;
}

// ============================== Meta & Attachments ==============================
export async function proposalSetItemsMeta(
  _proposalId: number | string,
  _rows: { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null; }
) { return true; }

const FILES_BUCKET = 'proposal_files';

export async function uploadProposalAttachment(
  proposalId: string,
  file: any,
  filename: string,
  kind: 'invoice' | 'payment' | 'proposal_pdf' | string
): Promise<void> {
  const FILES_BUCKET = 'proposal_files';
  const base = `proposals/${proposalId}/${kind}`;

  // ⬇️ делаем безопасное имя (латиница/цифры/._-), остальное → '_'
  const safe = (filename || 'file')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')              // диакритика
    .replace(/[^a-zA-Z0-9._-]+/g, '_')            // всё «лишнее» в _
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const storagePath =
    kind === 'payment'
      ? `${base}/${Date.now()}-${safe}`
      : `${base}/${safe}`;

  const body =
    Platform.OS === 'web'
      ? file
      : { uri: file.uri, type: file.mimeType || 'application/octet-stream', name: safe };

  const { error: upErr } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(storagePath, body, { upsert: true });
  if (upErr) throw upErr;

  const { error: metaErr } = await supabase
    .from('proposal_attachments')
    .upsert(
      {
        proposal_id: proposalId,
        bucket_id: FILES_BUCKET,
        storage_path: storagePath,
        file_name: safe,       // ⬅️ сохраняем безопасное имя
        group_key: kind,
      } as any,
      { onConflict: 'proposal_id,group_key,file_name', ignoreDuplicates: false }
    );
  if (metaErr) throw metaErr;
}


// ============================== PDF: Proposals ==============================

// Читаем «шапку» только теми полями, которые есть в твоей таблице proposals
async function selectProposalHeadSafe(idFilter: number | string) {
  const q = await supabase
    .from('proposals')
    .select('status,submitted_at,buyer_fio,buyer_email,created_by,approved_at')
    .eq('id', idFilter)
    .maybeSingle();

  if (q.error || !q.data) {
    return {
      status: '',
      submittedAt: null as string | null,
      buyerFioAny: null as string | null,
      approvedAt: null as string | null,
    };
  }
  const d: any = q.data;
  return {
    status:      (typeof d.status === 'string' ? d.status : '') || '',
    submittedAt: (d.submitted_at ?? null) as string | null,
    buyerFioAny: (d.buyer_fio ?? d.buyer_email ?? d.created_by ?? null) as string | null,
    approvedAt:  (d.approved_at ?? null) as string | null,
  };
}

export async function buildProposalPdfHtml(proposalId: number | string): Promise<string> {
  const pid = String(proposalId);
  const idFilter: number | string = /^\d+$/.test(pid) ? Number(pid) : pid;
  const locale = 'ru-RU';

  const esc = (s: any) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = (v?: any) => { const n = Number(String(v ?? '').replace(',', '.').trim()); return Number.isFinite(n) ? n : 0; };
  const fmt = (x: number) => x.toLocaleString(locale);

  try {
    const head = await selectProposalHeadSafe(idFilter);
    const status      = head.status;
    const submittedAt = head.submittedAt;
    const buyerFio    = head.buyerFioAny;
    const approvedAt  = head.approvedAt;

    // Строки предложения (с максимумом полей)
    const { data: piRaw } = await supabase
      .from('proposal_items')
      .select('id, request_item_id, name_human, uom, qty, app_code, rik_code, price, supplier, note')
      .eq('proposal_id', idFilter)
      .order('id', { ascending: true });

    const pi: any[] = Array.isArray(piRaw) ? piRaw : [];

    // Дотягиваем недостающие поля из request_items
    const needFill = pi.filter((r) => !r?.name_human || !r?.uom || !r?.qty || !r?.app_code || !r?.rik_code);
    if (needFill.length) {
      const ids = needFill.map((r) => r.request_item_id).filter(Boolean);
      if (ids.length) {
        const ri = await supabase
          .from('request_items')
          .select('id,name_human,uom,qty,app_code,rik_code')
          .in('id', ids as any[]);
        if (!ri.error && Array.isArray(ri.data)) {
          const byId = new Map(ri.data.map((r: any) => [String(r.id), r]));
          for (const r of pi) {
            const src = byId.get(String(r.request_item_id)); if (!src) continue;
            r.name_human = r.name_human ?? src.name_human ?? null;
            r.uom        = r.uom        ?? src.uom        ?? null;
            r.qty        = r.qty        ?? src.qty        ?? null;
            r.app_code   = r.app_code   ?? src.app_code   ?? null;
            r.rik_code   = r.rik_code   ?? src.rik_code   ?? null;
          }
        }
      }
    }

    // Карточки поставщиков (НОВОЕ): distinct имена → таблица suppliers → карточки
    const distinctSupplierNames = Array.from(new Set(pi.map(r => String(r?.supplier || '').trim()).filter(Boolean)));
    let supplierCards: Supplier[] = [];
    if (distinctSupplierNames.length) {
      const all = await listSuppliers(); // читаем всё и сопоставляем по имени без регистра
      supplierCards = distinctSupplierNames.map(nm => {
        const hit = all.find(s => normStr(s.name) === normStr(nm));
        return hit || ({ id: `ghost:${nm}`, name: nm } as Supplier);
      });
    }

    // Справочник применений (опционально)
    let appNames: Record<string, string> = {};
    try {
      const apps = await supabase.from('rik_apps' as any).select('app_code,name_human');
      if (!apps.error && Array.isArray(apps.data)) {
        appNames = Object.fromEntries(apps.data.map((a: any) => [a.app_code, a.name_human]));
      }
    } catch {}

    const includeSupplier = pi.some(r => (r?.supplier ?? '').toString().trim() !== '');

    const body = (pi.length ? pi : [{ id: 0 }]).map((r: any, i: number) => {
      if (!pi.length) {
        return `<tr><td colspan="${includeSupplier ? 8 : 7}" class="muted">Нет строк</td></tr>`;
      }
      const qty = num(r.qty), price = num(r.price), amount = qty * price;
      const name = r.name_human ?? '';
      const code = r.rik_code ? `${r.rik_code} · ` : '';
      const uom  = r.uom ?? '';
      const app  = r.app_code ? appNames[r.app_code] ?? r.app_code : '';
      const supplier = (r.supplier ?? '').toString();
      const note = r.note ? `<div style="opacity:.7;font-size:11px">Прим.: ${esc(r.note)}</div>` : '';
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${esc(code + name)}${note}</td>
        <td style="text-align:right">${qty || ''}</td>
        <td style="text-align:center">${esc(uom)}</td>
        <td>${esc(app)}</td>
        ${includeSupplier ? `<td>${esc(supplier)}</td>` : ``}
        <td style="text-align:right">${price ? fmt(price) : ''}</td>
        <td style="text-align:right">${amount ? fmt(amount) : ''}</td>
      </tr>`;
    }).join('');

    const suppliersHtml = supplierCards.length ? `
      <h2>Поставщики</h2>
      ${supplierCards.map((s) => `
        <div class="supplier">
          <div class="s-name">${esc(s.name)}</div>
          <div class="s-meta">
            ${s.inn ? `<span>ИНН: ${esc(s.inn)}</span>` : ''}
            ${s.bank_account ? `<span>Счёт: ${esc(s.bank_account)}</span>` : ''}
            ${s.specialization ? `<span>Спец.: ${esc(s.specialization)}</span>` : ''}
            ${s.contact_name ? `<span>Контакт: ${esc(s.contact_name)}</span>` : ''}
            ${s.phone ? `<span>Тел.: ${esc(s.phone)}</span>` : ''}
            ${s.email ? `<span>Email: ${esc(s.email)}</span>` : ''}
            ${s.website ? `<span>Сайт: ${esc(s.website)}</span>` : ''}
            ${s.address ? `<span>Адрес: ${esc(s.address)}</span>` : ''}
            ${s.notes ? `<span>Примечание: ${esc(s.notes)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    ` : '';

    const total = pi.reduce((acc, r) => acc + num(r.qty) * num(r.price), 0);
    const dateStr = (submittedAt ? new Date(submittedAt) : new Date()).toLocaleString(locale);
    const supplierTh = includeSupplier ? `<th style="width:160px">Поставщик</th>` : ``;
    const sumColspan = includeSupplier ? 7 : 6;

    return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Предложение #${esc(pid)}</title><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; padding:16px; color:#111}
  h1{font-size:18px;margin:0 0 6px 0}
  h2{font-size:16px;margin:14px 0 6px}
  .muted{opacity:.75}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ccc;padding:6px 8px;font-size:13px;vertical-align:top}
  th{background:#f8fafc;text-align:left}
  .sumline td{font-weight:700;background:#f1f5f9}
  .header{display:flex;gap:16px;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap}
  .block{padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
  .signs{display:flex;gap:24px;margin-top:24px;flex-wrap:wrap}
  .sign{flex:1 1 300px;border:1px dashed #cbd5e1;border-radius:8px;padding:10px 12px}
  .line{margin-top:24px;border-bottom:1px solid #334155;width:220px}
  .supplier{ padding:10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:#fff }
  .supplier .s-name{ font-weight:800; margin-bottom:4px }
  .supplier .s-meta{ color:#334155; display:flex; flex-wrap:wrap; gap:10px; }
  @media print{.noprint{display:none}}
</style></head><body>
  <div class="header">
    <div class="block">
      <h1>Предложение на закупку № ${esc(pid)}</h1>
      <div class="muted">Дата: ${esc(dateStr)}${approvedAt ? ` · <b>Утверждено:</b> ${esc(new Date(approvedAt).toLocaleString(locale))}` : ''}</div>
      ${status ? `<div class="muted">Статус: ${esc(status)}</div>` : ''}
    </div>
    <div class="block">
      ${buyerFio ? `<div><b>Снабженец:</b> ${esc(buyerFio)}</div>` : ''}
    </div>
  </div>

  ${suppliersHtml}

  <table>
    <thead><tr>
      <th style="width:36px;text-align:center">#</th>
      <th>Наименование</th>
      <th style="width:80px;text-align:right">Кол-во</th>
      <th style="width:64px;text-align:center">Ед.</th>
      <th style="width:140px">Применение</th>
      ${supplierTh}
      <th style="width:110px">Цена</th>
      <th style="width:120px">Сумма</th>
    </tr></thead>
    <tbody>
      ${body}
      ${pi.length ? `<tr class="sumline"><td colspan="${sumColspan}" style="text-align:right">ИТОГО</td><td style="text-align:right">${fmt(total)}</td></tr>` : ''}
    </tbody>
  </table>

  <div class="signs">
    <div class="sign">
      <div><b>Снабженец</b></div>
      <div class="line"></div>
      <div class="muted" style="margin-top:6px">/ ${esc(buyerFio || '')} /</div>
    </div>
    <div class="sign">
      <div><b>Директор</b></div>
      <div class="line"></div>
      <div class="muted" style="margin-top:6px">/  /</div>
    </div>
  </div>

  <div class="noprint" style="margin-top:14px"><button onclick="window.print()">Печать</button></div>
</body></html>`;
  } catch (e: any) {
    const esc2 = (s: any) => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]!));
    return `<!doctype html><meta charset="utf-8"/><title>Ошибка</title>
<pre style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding:16px;">Ошибка подготовки PDF: ${esc2(e?.message || e)}</pre>`;
  }
}

export async function exportProposalPdf(proposalId: number | string) {
  const html = await buildProposalPdfHtml(proposalId);
  try {
    // native (expo)
    // @ts-ignore
    const Print = await import('expo-print');
    const { uri } = await (Print as any).printToFileAsync({ html });
    try {
      // @ts-ignore
      const Sharing = await import('expo-sharing');
      if ((Sharing as any).isAvailableAsync && (await (Sharing as any).isAvailableAsync())) {
        await (Sharing as any).shareAsync(uri);
      }
    } catch {}
    return uri as string;
  } catch {
    // web fallback
    if (typeof window !== 'undefined') {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.focus(); }
    }
    return '';
  }
}

// ============================== PDF: Requests ==============================
// экспортируемый резолвер красивого номера (используем и за пределами PDF)
export async function resolveRequestLabel(rid: string | number): Promise<string> {
  const id = String(rid).trim();
  if (!id) return '#—';
  try {
    const { data, error } = await supabase
      .from('v_requests_display' as any)
      .select('display_no')
      .eq('id', id)
      .maybeSingle();
    if (!error && data?.display_no) {
      const dn = String(data.display_no).trim();
      if (dn) return dn;
    }
  } catch (e) {
    console.warn('[resolveRequestLabel]', (e as any)?.message ?? e);
  }
  return /^\d+$/.test(id) ? `#${id}` : `#${id.slice(0, 8)}`;
}

export async function batchResolveRequestLabels(ids: Array<string | number>): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(ids.map(x => String(x ?? '').trim()).filter(Boolean)));
  if (!uniq.length) return {};
  try {
    const { data, error } = await supabase
      .from('v_requests_display' as any)
      .select('id, display_no')
      .in('id', uniq);
    if (error) throw error;
    const m: Record<string,string> = {};
    for (const r of (data ?? [])) {
      const id = String((r as any).id ?? '');
      const dn = String((r as any).display_no ?? '').trim();
      if (id && dn) m[id] = dn;
    }
    return m;
  } catch {
    return {};
  }
}

export async function buildRequestPdfHtml(requestId: number | string): Promise<string> {
  const rid = String(requestId);
  const idFilter: number | string = /^\d+$/.test(rid) ? Number(rid) : rid;
  const locale = 'ru-RU';

  const esc = (s: any) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = (v?: any) => { const n = Number(String(v ?? '').replace(',', '.').trim()); return Number.isFinite(n) ? n : 0; };

  const displayLabel = await resolveRequestLabel(rid);

  const head = await client
    .from('requests')
    .select('id, foreman_name, need_by, comment, status, object_type_code, level_code, system_code, zone_code')
    .eq('id', idFilter)
    .maybeSingle();
  if (head.error || !head.data) throw new Error('Заявка не найдена');
  const H: any = head.data;

  const [obj, lvl, sys, zn] = await Promise.all([
    H.object_type_code ? client.from('ref_object_types').select('name').eq('code', H.object_type_code).maybeSingle() : Promise.resolve({ data: null } as any),
    H.level_code      ? client.from('ref_levels').select('name').eq('code', H.level_code).maybeSingle()             : Promise.resolve({ data: null } as any),
    H.system_code     ? client.from('ref_systems').select('name').eq('code', H.system_code).maybeSingle()           : Promise.resolve({ data: null } as any),
    H.zone_code       ? client.from('ref_zones').select('name').eq('code', H.zone_code).maybeSingle()               : Promise.resolve({ data: null } as any),
  ]);
  const objectName = (obj as any)?.data?.name || '';
  const levelName  = (lvl as any)?.data?.name || '';
  const systemName = (sys as any)?.data?.name || '';
  const zoneName   = (zn as any)?.data?.name || '';

  const items = await client
    .from('request_items')
    .select('id, name_human, rik_code, uom, qty, app_code, note')
    .eq('request_id', idFilter)
    .order('id', { ascending: true });

  const rows: any[] = Array.isArray(items.data) ? items.data : [];
  const body = rows.map((r: any, i: number) => {
    const q = num(r.qty);
    const note = r.note ? `<div class="muted">Прим.: ${esc(r.note)}</div>` : '';
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${esc(r.name_human || r.rik_code || '')}${note}</td>
      <td>${esc(r.rik_code || '')}</td>
      <td style="text-align:right">${q || ''}</td>
      <td style="text-align:center">${esc(r.uom || '')}</td>
      <td>${esc(r.app_code || '')}</td>
    </tr>`;
  }).join('');

  const dateStr = new Date().toLocaleString(locale);

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Заявка ${esc(displayLabel)}</title><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; padding:16px; color:#111}
  h1{font-size:18px;margin:0 0 6px 0}
  .muted{opacity:.75}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ccc;padding:6px 8px;font-size:13px;vertical-align:top}
  th{background:#f8fafc;text-align:left}
  .header{display:flex;gap:16px;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap}
  .block{padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
  .signs{display:flex;gap:24px;margin-top:24px;flex-wrap:wrap}
  .sign{flex:1 1 300px;border:1px dashed #cbd5e1;border-radius:8px;padding:10px 12px}
  .line{margin-top:24px;border-bottom:1px solid #334155;width:220px}
  @media print{.noprint{display:none}}
</style></head><body>
  <div class="header">
    <div class="block">
      <h1>Заявка ${esc(displayLabel)}</h1>
      <div class="muted">Дата: ${esc(dateStr)}${H.need_by ? ` · <b>Нужно к:</b> ${esc(H.need_by)}` : ''}</div>
      ${H.status ? `<div class="muted">Статус: ${esc(H.status)}</div>` : ''}
      <div><b>Прораб:</b> ${esc(H.foreman_name || '(не указан)')}</div>
      <div><b>Объект:</b> ${esc(objectName || '(не указано)')}</div>
      <div><b>Этаж/уровень:</b> ${esc(levelName || '(не указано)')}</div>
      ${systemName ? `<div><b>Система/вид работ:</b> ${esc(systemName)}</div>` : ''}
      ${zoneName ? `<div><b>Зона/участок:</b> ${esc(zoneName)}</div>` : ''}
      ${H.comment ? `<div class="muted">Примечание: ${esc(H.comment)}</div>` : ''}
    </div>
  </div>

  <table>
    <thead><tr>
      <th style="width:36px;text-align:center">#</th>
      <th>Наименование</th>
      <th style="width:120px">Код</th>
      <th style="width:80px;text-align:right">Кол-во</th>
      <th style="width:64px;text-align:center">Ед.</th>
      <th style="width:140px">Применение</th>
    </tr></thead>
    <tbody>
      ${body || `<tr><td colspan="6" class="muted">Нет строк</td></tr>`}
    </tbody>
  </table>

  <div class="signs">
    <div class="sign">
      <div><b>Прораб</b></div>
      <div class="line"></div>
      <div class="muted" style="margin-top:6px">/ ${esc(H.foreman_name || '')} /</div>
    </div>
    <div class="sign">
      <div><b>Директор</b></div>
      <div class="line"></div>
      <div class="muted" style="margin-top:6px">/  /</div>
    </div>
  </div>

  <div class="noprint" style="margin-top:14px"><button onclick="window.print()">Печать</button></div>
</body></html>`;
}

// cache id черновика на сессию (uuid или int)
let _draftRequestIdAny: string | number | null = null;

export async function getOrCreateDraftRequestId(): Promise<string | number> {
  if (_draftRequestIdAny != null) return _draftRequestIdAny;
  const { data, error } = await client.rpc('request_ensure');
  if (error) throw error;

  const idRaw = data as any;
  const id =
    typeof idRaw === 'number' ? idRaw :
    typeof idRaw === 'string' ? idRaw :
    (idRaw?.id ?? String(idRaw ?? ''));

  if ((typeof id === 'number' && Number.isFinite(id) && id > 0) || (typeof id === 'string' && id.length >= 8)) {
    _draftRequestIdAny = id;
    return id;
  }
  throw new Error('request_ensure returned invalid id');
}

export async function exportRequestPdf(requestId: number | string) {
  const html = await buildRequestPdfHtml(requestId);
  try {
    // native (expo)
    // @ts-ignore
    const Print = await import('expo-print');
    const { uri } = await (Print as any).printToFileAsync({ html });
    try {
      // @ts-ignore
      const Sharing = await import('expo-sharing');
      if ((Sharing as any).isAvailableAsync && (await (Sharing as any).isAvailableAsync())) {
        await (Sharing as any).shareAsync(uri);
      }
    } catch {}
    return uri as string;
  } catch {
    // web fallback
    if (typeof window !== 'undefined') {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.focus(); }
    }
    return '';
  }
}

/* ============================== Бухгалтерия: RPC-обёртки (НОВЫЕ) ============================== */
export async function proposalSendToAccountant(
  input:
    | { proposalId: string | number; invoiceNumber?: string; invoiceDate?: string; invoiceAmount?: number; invoiceCurrency?: string }
    | string
    | number
) {
  const isObj = typeof input === 'object' && input !== null;
  const pid = String(isObj ? (input as any).proposalId : input);

  const invoiceNumber   = isObj ? (input as any).invoiceNumber   : undefined;
  const invoiceDateRaw  = isObj ? (input as any).invoiceDate     : undefined;
  const invoiceAmount   = isObj ? (input as any).invoiceAmount   : undefined;
  const invoiceCurrency = isObj ? (input as any).invoiceCurrency : undefined;

  const invoiceDate = (() => {
    const s = String(invoiceDateRaw ?? '').trim();
    if (!s) return undefined;
    return s.slice(0, 10); // 'YYYY-MM-DD'
  })();

  const args: Record<string, any> = { p_proposal_id: pid };
  if (invoiceNumber   != null && String(invoiceNumber).trim())   args.p_invoice_number   = String(invoiceNumber);
  if (invoiceDate     != null && String(invoiceDate).trim())     args.p_invoice_date     = String(invoiceDate);
  if (typeof invoiceAmount === 'number')                         args.p_invoice_amount   = Number(invoiceAmount);
  if (invoiceCurrency != null && String(invoiceCurrency).trim()) args.p_invoice_currency = String(invoiceCurrency);

  const { error } = await supabase.rpc('proposal_send_to_accountant_min', args);
  if (error) throw error;
  return true;
}


export async function accountantAddPayment(input: {
  proposalId: string | number;
  amount: number;
  method?: string;
  note?: string;
}) {
  const pid = String(input.proposalId);
  const amt = Number(input.amount);
  const m = input.method?.trim();
  const n = input.note?.trim();

  const argsP   = { p_proposal_id: pid, p_amount: amt, ...(m ? { p_method: m } : {}), ...(n ? { p_note: n } : {}) };
  const argsRaw = { proposal_id: pid,  amount: amt,    ...(m ? { method: m } : {}),   ...(n ? { note: n } : {}) };

  await rpcCompat<void>([
    { fn: 'acc_add_payment_min',        args: argsP   },
    { fn: 'acc_add_payment_min_compat', args: argsRaw },
    { fn: 'acc_add_payment',            args: argsP   },
    { fn: 'acc_add_payment',            args: argsRaw },
  ]);
  return true;
}

// >>> added: совместимая сигнатура — можно (proposalId, comment?) или ({ proposalId, comment? })
export async function accountantReturnToBuyer(
  a: { proposalId: string | number; comment?: string } | string | number,
  b?: string | null
) {
  const pid = typeof a === 'object' && a !== null ? String((a as any).proposalId) : String(a);
  const comment = typeof a === 'object' && a !== null ? (a as any).comment : b;
  const c = comment?.trim();

  await rpcCompat<void>([
    { fn: 'acc_return_min_auto', args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } }, // главный RPC
    { fn: 'acc_return_min',      args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } }, // алиас
    { fn: 'acc_return',          args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } }, // алиас
  ]);
  return true;
}



/** Инбокс бухгалтера (по статусу или все) */
export async function listAccountantInbox(status?: string) {
  const s = (status || '').trim();
  const norm =
    !s ? null :
    /^на доработке/i.test(s) ? 'На доработке' :
    /^частично/i.test(s)     ? 'Частично оплачено' :
    /^оплачено/i.test(s)     ? 'Оплачено' :
                               'К оплате';

  // ГЛАВНОЕ: всегда POST с телом { p_tab: ... } — даже когда null
  const r = await supabase.rpc('list_accountant_inbox', { p_tab: norm });
  if (!r.error && Array.isArray(r.data)) return r.data as any[];

  // надёжный fallback, если где-то REST ещё кешится
  if (norm == null) {
    const r2 = await supabase.rpc('list_accountant_inbox_compat', {} as any);
    if (!r2.error && Array.isArray(r2.data)) return r2.data as any[];
  }
  console.warn('[listAccountantInbox]', r.error?.message);
  return [];
}

// >>> added: уведомления для колокольчика бухгалтера/др. ролей
export async function notifList(role: 'accountant'|'buyer'|'director', limit = 20) {
  try {
    const { data, error } = await supabase
      .from('notifications' as any)
      .select('id, role, title, body, payload, created_at, is_read')
      .eq('role', role)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(100, limit)));
    if (error) throw error;
    return (data ?? []) as any[];
  } catch (e) {
    console.warn('[notifList]', parseErr(e));
    return [];
  }
}

export async function notifMarkRead(role: 'accountant'|'buyer'|'director') {
  try {
    const { error } = await supabase
      .from('notifications' as any)
      .update({ is_read: true })
      .eq('role', role)
      .eq('is_read', false);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[notifMarkRead]', parseErr(e));
    return false;
  }
}

// >>> added: красивый заголовок для предложения (используется снаружи)
export async function resolveProposalPrettyTitle(proposalId: string | number): Promise<string> {
  const id = String(proposalId).trim();
  if (!id) return `Предложение #—`;
  // пытаемся прочитать display_no из представления, потом — из proposals, иначе — #UUID8
  try {
    const v = await supabase.from('v_proposals_display' as any).select('id, display_no').eq('id', id).maybeSingle();
    if (!v.error && v.data?.display_no) return `Предложение ${String(v.data.display_no)}`;
  } catch {}
  try {
    const p = await supabase.from('proposals').select('id').eq('id', id).maybeSingle();
    if (!p.error && p.data?.id) {
      return /^\d+$/.test(id) ? `Предложение #${id}` : `Предложение #${id.slice(0, 8)}`;
    }
  } catch {}
  return /^\d+$/.test(id) ? `Предложение #${id}` : `Предложение #${id.slice(0, 8)}`;
}

// >>> added: "pretty" алиас, пока просто прокидывает текущий HTML
export async function buildProposalPdfHtmlPretty(proposalId: number | string) {
  return buildProposalPdfHtml(proposalId);
}

// ============================== Aggregated export ==============================
export const RIK_API = {
  rikQuickSearch,
  listRequestItems,
  ensureRequest,
  getOrCreateDraftRequestId,
  ensureRequestSmart,
  addRequestItemFromRik,

  listPending,
  approve,
  reject,
  requestSubmit,
  directorReturnToBuyer,

  listBuyerInbox,
  listBuyerProposalsByStatus,
  proposalCreate,
  proposalAddItems,
  proposalSubmit,
  listDirectorProposalsPending,
  proposalItems,
  proposalSnapshotItems,
  proposalSetItemsMeta,
  uploadProposalAttachment,

  exportRequestPdf,
  exportProposalPdf,
  buildProposalPdfHtml,

  listDirectorInbox,
  proposalDecide,
  ensureMyProfile,
  getMyRole,

  // ==== Бухгалтерия (новое) ====
  proposalSendToAccountant,
  accountantAddPayment,
  accountantReturnToBuyer,
  listAccountantInbox,

  // ==== Поставщики (новое) ====
  listSuppliers,
  upsertSupplier,
  listSupplierFiles,

  // ==== Доп. утилиты (новое) ====
  notifList,            // >>> added
  notifMarkRead,        // >>> added
  resolveProposalPrettyTitle, // >>> added
  buildProposalPdfHtmlPretty, // >>> added
};
// ===== временные совместимые экспорты под нейтральные имена =====
export type { CatalogItem } from "./catalog_api";
export { searchCatalogItems } from "./catalog_api";
// ===== совместимые экспорты под нейтральные имена (новое) =====
export type { CatalogItem, CatalogGroup, UomRef } from "./catalog_api";
export { searchCatalogItems, listCatalogGroups, listUoms } from "./catalog_api";

// (по желанию, если сразу подключаешь склад из clean-view)
export type { IncomingItem } from "./catalog_api";
export { listIncomingItems } from "./catalog_api";


export type { CatalogItem, CatalogGroup, UomRef, IncomingItem } from "./catalog_api";
export { searchCatalogItems, listCatalogGroups, listUoms, listIncomingItems } from "./catalog_api";
