import { supabase } from './supabaseClient';
import { loadMyProfile, clearProfileCache } from './api/profile_api';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform, Alert } from 'react-native';
import { exportPdf } from './pdf_export';
import {
  PREMIUM_CSS,
  buildDocHeader,
  buildSupplierCard,
  buildSignatures,
  buildDocFooter,
  wrapInHtmlDocument,
  escapeHtml,
  formatNumber,
  formatDate,
} from './pdf_templates';
import { generateDocumentQR } from './qr_utils';

// ============================== Modular API Note ==============================
// Types and functions are also available from src/lib/api/ for new code:
// - import { UserProfile, CatalogItem, ... } from '../lib/api/types'
// - import { loadMyProfile, getMyRole, ... } from '../lib/api/profile_api'
// - import { listRefs } from '../lib/api/refs_api'


// --- utils: normalize UUID (убираем # и валидируем) ---
export const normalizeUuid = (raw: string | null | undefined): string | null => {
  const s = String(raw ?? '').trim().replace(/^#/, '');
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(s) ? s : null;
};

/** ===== Legacy shim: proposalDecide ===== */
declare global {

  var proposalDecide: ((...args: any[]) => Promise<void>) | undefined;
}
export const proposalDecide: (...args: any[]) => Promise<void> =
  (globalThis.proposalDecide ??= async (..._args: any[]) => { });
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
  foreman_name?: string | null;
  need_by?: string | null;
  comment?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
};

export type RequestRecord = {
  id: string;
  status?: string | null;
  display_no?: string | null;
  year?: number | null;
  seq?: number | null;
  foreman_name?: string | null;
  need_by?: string | null;
  comment?: string | null;
  object_id?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  created_at?: string | null;
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
  level_name?: string | null;     // уровень/этаж
  zone_name?: string | null;      // зона
  system_code?: string | null;    // система
  foreman_name?: string | null;   // имя прораба
  status: string;
  created_at?: string;
  kind?: string | null;           // тип: material, work, service
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
  request_nos?: string | null;
  object_names?: string | null;
  item_names?: string | null;
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

let _draftRequestIdAny: string | number | null = null;
export const getDraftRequestId = () => _draftRequestIdAny;

// универсальный ретрай RPC с разными именами параметров/имен функций
const rpcCompat = async <T = any>(
  variants: Array<{ fn: string; args?: Record<string, any> }>
): Promise<T> => {
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
};

// helper: безопасный request_id для фильтров (не допускаем eq.=)
const toFilterId = (v: number | string) => {
  if (typeof v === 'number') return v;
  const raw = String(v ?? '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/^#/, '');
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(normalized)) return normalized;
  return /^\d+$/.test(normalized) ? Number(normalized) : normalized;
};

// ============================== Suppliers API (НОВОЕ) ==============================
export const listSuppliers = async (q?: string): Promise<Supplier[]> => {
  try {
    const result = await client
      .from('suppliers')
      .select('id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes')
      .order('name', { ascending: true });

    if (result.error) throw result.error;
    const list = (result.data || []) as Supplier[];

    if (!q?.trim()) return list;

    const searchTerm = normStr(q);
    return list.filter(s =>
      normStr(s.name).includes(searchTerm) ||
      normStr(s.inn).includes(searchTerm) ||
      normStr(s.specialization).includes(searchTerm)
    );
  } catch (e) {
    console.warn('[listSuppliers]', parseErr(e));
    return [];
  }
};

export const upsertSupplier = async (draft: Partial<Supplier>): Promise<Supplier> => {
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

  // Update existing
  if (draft.id) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(payload)
      .eq('id', draft.id)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Поставщик не найден');
    return data as Supplier;
  }

  // Create new
  const companyId = await getMyCompanyId();
  if (companyId) payload.company_id = companyId;

  const { data, error } = await supabase
    .from('suppliers')
    .insert([payload])
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Не удалось создать поставщика');
  return data as Supplier;
};

export const listSupplierFiles = async (supplierId: string): Promise<any[]> => {
  try {
    const { data, error } = await client
      .from('supplier_files')
      .select('id,created_at,file_name,file_url,group_key')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[listSupplierFiles]', parseErr(e));
    return [];
  }
};

// ============================== RIK search ==============================

/**
 * Cyrillic ↔ Latin look-alike character maps.
 * Users often type Cyrillic "М" when they mean Latin "M" in codes like M400.
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  'А': 'A', 'а': 'a', 'В': 'B', 'в': 'b', 'Е': 'E', 'е': 'e',
  'К': 'K', 'к': 'k', 'М': 'M', 'м': 'm', 'Н': 'H', 'н': 'h',
  'О': 'O', 'о': 'o', 'Р': 'P', 'р': 'p', 'С': 'C', 'с': 'c',
  'Т': 'T', 'т': 't', 'У': 'Y', 'у': 'y', 'Х': 'X', 'х': 'x',
};

const LATIN_TO_CYRILLIC: Record<string, string> = {
  'A': 'А', 'a': 'а', 'B': 'В', 'b': 'в', 'E': 'Е', 'e': 'е',
  'K': 'К', 'k': 'к', 'M': 'М', 'm': 'м', 'H': 'Н', 'h': 'н',
  'O': 'О', 'o': 'о', 'P': 'Р', 'p': 'р', 'C': 'С', 'c': 'с',
  'T': 'Т', 't': 'т', 'Y': 'У', 'y': 'у', 'X': 'Х', 'x': 'х',
};

/** Common Russian construction terms → their English code equivalents */
const RU_TO_CODE: Record<string, string> = {
  'бетон': 'BETON', 'цемент': 'CEMENT', 'раствор': 'RASTVOR',
  'арматура': 'REBAR', 'кирпич': 'KIRPICH', 'плитка': 'TILE',
  'штукатурка': 'PLASTER', 'шпаклевка': 'SHPAKLEVKA', 'шпаклёвка': 'SHPAKLEVKA',
  'краска': 'PAINT', 'грунтовка': 'GRUNT', 'гидроизоляция': 'HYDRO',
  'утеплитель': 'INSUL', 'кабель': 'CABLE', 'труба': 'PIPE',
  'профиль': 'PROFILE', 'гипсокартон': 'DRYWALL', 'фанера': 'PLYWOOD',
};

/**
 * Convert grade marks from Cyrillic to Latin: "М400" → "M400", "В25" → "B25"
 * Only converts single letters followed by digits (grade patterns)
 */
const convertGradeMarks = (s: string): string =>
  s.replace(/([МмВвСсРрАаПп])(\d)/g, (_, letter, digit) =>
    (CYRILLIC_TO_LATIN[letter] || letter) + digit
  );

/**
 * Normalize search query for better matching:
 * - Collapse spaces in grade patterns: "М 400" → "М400", "В 25" → "В25"
 * - Collapse spaces between numbers and units
 * - Trim and collapse multiple spaces
 */
const normalizeSearchQuery = (q: string): string => {
  let normalized = q.trim();
  // Collapse spaces between letter and digits in grade patterns:
  // "М 400" → "М400", "В 25" → "В25", "П 3" → "П3", "F 100" → "F100", "W 8" → "W8"
  normalized = normalized.replace(/([А-Яа-яA-Za-z])\s+(\d)/g, '$1$2');
  // Collapse spaces between digits and "x"/"х"
  normalized = normalized.replace(/(\d)\s*[xхXХ]\s*(\d)/gi, '$1x$2');
  // Collapse multiple spaces
  normalized = normalized.replace(/\s{2,}/g, ' ').trim();
  return normalized;
};

/**
 * Generate search variants for better matching coverage.
 * Handles Cyrillic↔Latin confusion, grade normalization, and code conversion.
 */
const getSearchVariants = (query: string): string[] => {
  const variants = new Set<string>();
  const normalized = normalizeSearchQuery(query);
  variants.add(normalized);
  if (normalized !== query) variants.add(query);

  // Convert Cyrillic grade marks to Latin: "бетон М400" → "бетон M400"
  const latinGrades = convertGradeMarks(normalized);
  if (latinGrades !== normalized) variants.add(latinGrades);

  // Try full code conversion: "бетон М400" → search also by "BETON" + "M400"
  const words = normalized.toLowerCase().split(/\s+/);
  const codeWords: string[] = [];
  for (const word of words) {
    const codeEquiv = RU_TO_CODE[word];
    if (codeEquiv) {
      codeWords.push(codeEquiv);
    } else {
      // Convert grade marks in the word
      codeWords.push(convertGradeMarks(word).toUpperCase());
    }
  }
  const codeVariant = codeWords.join('-');
  if (codeVariant !== normalized) variants.add(codeVariant);

  // Without spaces → dashes version (for rik_code matching)
  const dashed = normalized.replace(/\s+/g, '-');
  if (dashed !== normalized) variants.add(dashed);
  const dashedLatin = latinGrades.replace(/\s+/g, '-');
  if (dashedLatin !== dashed) variants.add(dashedLatin);

  return Array.from(variants);
};

export const rikQuickSearch = async (q: string, limit = 50, _apps?: string[]): Promise<CatalogItem[]> => {
  const rawQuery = (q ?? '').trim();
  if (!rawQuery || rawQuery.length < 2) return [];

  const pLimit = Math.max(1, Math.min(200, limit || 50));
  const pQuery = normalizeSearchQuery(rawQuery);
  const variants = getSearchVariants(rawQuery);

  // === Build a single powerful OR clause from all variants ===
  const orParts: string[] = [];
  for (const v of variants) {
    orParts.push(`rik_code.ilike.%${v}%`);
    orParts.push(`name_human.ilike.%${v}%`);
  }
  const mainOrClause = orParts.join(',');

  // === Run all searches in PARALLEL (no more sequential RPC failures) ===
  const [itemsResult, aliasResult] = await Promise.all([
    // 1. Direct items search with all variants
    Promise.resolve(
      client
        .from('rik_items')
        .select('rik_code,name_human,uom_code,sector_code,spec,kind')
        .or(mainOrClause)
        .order('rik_code', { ascending: true })
        .limit(pLimit * 2)
    ).then(r => (!r.error && Array.isArray(r.data)) ? r.data : [])
      .catch(() => [] as any[]),

    // 2. Alias search with all variants (consolidated into a single query)
    Promise.resolve(
      client
        .from('rik_aliases')
        .select('rik_code')
        .or(variants.map(v => `alias.ilike.%${v}%`).join(','))
        .limit(pLimit * 2)
    ).then(r => (!r.error && Array.isArray(r.data)) ? r.data.map((x: any) => String(x.rik_code)) : [])
      .catch(() => [] as string[]),
  ]);

  // === Collect base results ===
  const seenCodes = new Set<string>();
  const base: any[] = [];

  const addResults = (items: any[]) => {
    for (const item of items) {
      const code = String(item.rik_code);
      if (!seenCodes.has(code)) {
        seenCodes.add(code);
        base.push(item);
      }
    }
  };

  addResults(itemsResult);

  // === Word-by-word intersection for multi-word queries ===
  const words = pQuery.split(/\s+/).filter(w => w.length >= 2);
  if (words.length >= 2) {
    const getWordVariants = (word: string): string[] => {
      const wv = new Set<string>();
      wv.add(word);
      const latinized = convertGradeMarks(word);
      if (latinized !== word) wv.add(latinized);
      const codeEquiv = RU_TO_CODE[word.toLowerCase()];
      if (codeEquiv) wv.add(codeEquiv);
      wv.add(word.toUpperCase());
      return Array.from(wv);
    };

    // Search each word in parallel
    const wordSearches = words.slice(0, 3).map(word => {
      const wordVars = getWordVariants(word);
      const wordOr = wordVars.flatMap(wv => [
        `rik_code.ilike.%${wv}%`,
        `name_human.ilike.%${wv}%`
      ]).join(',');

      return Promise.resolve(
        client
          .from('rik_items')
          .select('rik_code,name_human,uom_code,sector_code,spec,kind')
          .or(wordOr)
          .limit(pLimit * 3)
      ).then(r => (!r.error && Array.isArray(r.data)) ? r.data : [])
        .catch(() => [] as any[]);
    });

    const wordResults = await Promise.all(wordSearches);

    // Intersect: find items matching ALL words
    if (wordResults.length === words.length && wordResults[0]?.length > 0) {
      const intersection = wordResults[0].filter(item => {
        const code = String(item.rik_code);
        return wordResults.every(wr => wr.some((r: any) => String(r.rik_code) === code));
      });
      addResults(intersection);
    }
  }

  // === Fetch alias-only items not yet found ===
  const missedAliasCodes = aliasResult.filter(c => !seenCodes.has(c));
  if (missedAliasCodes.length > 0) {
    try {
      const extraItems = await client
        .from('rik_items')
        .select('rik_code,name_human,uom_code,sector_code,spec,kind')
        .in('rik_code', missedAliasCodes.slice(0, pLimit))
        .limit(pLimit);

      if (!extraItems.error && Array.isArray(extraItems.data)) {
        addResults(extraItems.data);
      }
    } catch { /* ignore */ }
  }

  // === Resolve Russian names from aliases ===
  let aliasMap: Record<string, string> = {};
  const allResultCodes = Array.from(new Set(base.map(r => String(r.rik_code)).filter(Boolean)));

  if (allResultCodes.length) {
    try {
      const mapResult = await client
        .from('rik_aliases')
        .select('rik_code,alias')
        .in('rik_code', allResultCodes);

      if (!mapResult.error && Array.isArray(mapResult.data)) {
        const queryLower = pQuery.toLowerCase();
        const byCode: Record<string, { hit?: string; any?: string }> = {};

        for (const r of mapResult.data) {
          const alias = (r.alias || '').trim();
          if (!alias || !/[А-Яа-яЁё]/.test(alias)) continue;

          const code = String(r.rik_code);
          byCode[code] ||= {};
          if (!byCode[code].any) byCode[code].any = alias;
          if (!byCode[code].hit && alias.toLowerCase().includes(queryLower)) {
            byCode[code].hit = alias;
          }
        }
        aliasMap = Object.fromEntries(
          Object.entries(byCode).map(([code, meta]) => [code, meta.hit ?? meta.any!])
        );
      }
    } catch { /* ignore */ }
  }

  // === Rank results ===
  const queryWords = pQuery.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  const allVariantsLower = variants.map(v => v.toLowerCase());

  const ranked = base
    .map(r => ({ ...r, name_human: aliasMap[r.rik_code] ?? r.name_human ?? r.rik_code }))
    .sort((a, b) => {
      const aName = String(a.name_human).toLowerCase();
      const bName = String(b.name_human).toLowerCase();
      const aCode = String(a.rik_code).toLowerCase();
      const bCode = String(b.rik_code).toLowerCase();
      const aFull = aName + ' ' + aCode;
      const bFull = bName + ' ' + bCode;

      // Score by how many query words match (more = better)
      const aWordScore = queryWords.filter(w => aFull.includes(w)).length;
      const bWordScore = queryWords.filter(w => bFull.includes(w)).length;
      if (bWordScore !== aWordScore) return bWordScore - aWordScore;

      // Score by match quality (startsWith > includes)
      const searchLower = pQuery.toLowerCase();
      const scoreA = aName.startsWith(searchLower) ? 0 : aCode.startsWith(searchLower) ? 1 : aName.includes(searchLower) ? 2 : 3;
      const scoreB = bName.startsWith(searchLower) ? 0 : bCode.startsWith(searchLower) ? 1 : bName.includes(searchLower) ? 2 : 3;
      if (scoreA !== scoreB) return scoreA - scoreB;

      return String(a.rik_code).localeCompare(String(b.rik_code));
    });

  // === Deduplicate and return ===
  const uniqueResults: CatalogItem[] = [];
  const finalSeen = new Set<string>();

  for (const item of ranked) {
    const code = String(item.rik_code);
    if (finalSeen.has(code)) continue;
    finalSeen.add(code);
    uniqueResults.push(item);
    if (uniqueResults.length >= pLimit) break;
  }

  return uniqueResults;
};

// === profiles: unified profile loading ===
export type UserProfile = {
  userId: string;
  role: string;
  companyId: string | null;
  fullName: string | null;
  isContractor?: boolean;
};

export { loadMyProfile, clearProfileCache };

/**
 * @deprecated Use loadMyProfile() instead
 */
export const ensureMyProfile = async (): Promise<boolean> => true;

/**
 * Get current user's role.
 */
export const getMyRole = async (): Promise<string | null> => {
  const profile = await loadMyProfile();
  return profile?.role || null;
};

/**
 * Get current user's company ID.
 */
export const getMyCompanyId = async (): Promise<string | null> => {
  try {
    const profile = await loadMyProfile();
    return profile?.companyId || null;
  } catch (e: any) {
    console.warn('[getMyCompanyId] failed', e.message || e);
    return null;
  }
};

// ============================== Requests / Items ==============================
export const listRequestItems = async (requestId: number | string): Promise<ReqItemRow[]> => {
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
  } catch (e: any) {
    console.warn('[listRequestItems]', e?.message ?? e);
    return [];
  }
};

export const ensureRequest = async (requestId: number | string): Promise<number | string> => {
  const rid = requestId;
  try {
    const { data, error } = await client.from('requests').select('id').eq('id', toFilterId(rid) as any).limit(1).maybeSingle();
    if (!error && data?.id != null) return data.id;
  } catch {
    // Ignore and try upsert
  }

  try {
    const { data, error } = await client.from('requests').upsert({ id: rid, status: 'Черновик' } as any, { onConflict: 'id' }).select('id').single();
    if (!error && data?.id != null) return data.id;
  } catch (e: any) {
    console.warn('[ensureRequest/upsert]', parseErr(e));
  }
  return rid;
};

const mapRequestRow = (raw: any): RequestRecord | null => {
  if (!raw) return null;
  const idRaw = raw?.id ?? raw?.request_id ?? null;
  if (!idRaw) return null;

  const id = String(idRaw);
  const norm = (v: any) => (v != null ? String(v).trim() : null);
  const asNumber = (v: any) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id,
    status: raw?.status ?? null,
    display_no: norm(raw?.display_no ?? raw?.number ?? raw?.label ?? raw?.display) || null,
    year: asNumber(raw?.year),
    seq: asNumber(raw?.seq),
    foreman_name: norm(raw?.foreman_name),
    need_by: norm(raw?.need_by),
    comment: norm(raw?.comment),
    object_id: norm(raw?.object_id),
    object_type_code: norm(raw?.object_type_code),
    level_code: norm(raw?.level_code),
    system_code: norm(raw?.system_code),
    zone_code: norm(raw?.zone_code),
    created_at: norm(raw?.created_at),
  };
};

export const requestCreateDraft = async (meta?: RequestMeta): Promise<RequestRecord | null> => {
  const companyId = await getMyCompanyId();

  const payload: Record<string, any> = {
    status: 'Черновик',
    foreman_name: meta?.foreman_name ?? null,
    need_by: meta?.need_by ?? null,
    comment: meta?.comment ?? null,
    object_type_code: meta?.object_type_code ?? null,
    level_code: meta?.level_code ?? null,
    system_code: meta?.system_code ?? null,
    zone_code: meta?.zone_code ?? null,
    company_id: companyId
  };

  try {
    const { data, error } = await client
      .from('requests')
      .insert(payload)
      .select('id,status,display_no,need_by,comment,foreman_name,object_type_code,level_code,system_code,zone_code,created_at')
      .single();

    if (error) throw error;

    const row = mapRequestRow(data);
    if (!row) throw new Error('Failed to map created request row');

    _draftRequestIdAny = row.id;
    return row;
  } catch (e: any) {
    console.warn('[requestCreateDraft]', parseErr(e));
    throw e;
  }
};

export const ensureRequestSmart = async (currentId?: number | string, meta?: RequestMeta): Promise<number | string> => {
  if (currentId != null && String(currentId).trim()) return currentId;

  try {
    const created = await requestCreateDraft(meta);
    if (created?.id) return created.id;
  } catch (e: any) {
    console.warn('[ensureRequestSmart]', parseErr(e));
  }
  return currentId ?? '';
};

export const addRequestItemFromRik = async (
  requestId: number | string,
  rik_code: string,
  qty: number,
  opts?: { note?: string; app_code?: string; kind?: string; name_human?: string; uom?: string | null }
): Promise<boolean> => {
  if (!rik_code) throw new Error('rik_code required');

  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) throw new Error('qty must be > 0');

  const rid = toFilterId(requestId);
  if (rid == null) throw new Error('request_id is empty');

  const row: Record<string, any> = {
    request_id: rid as any,
    rik_code,
    qty: q,
    status: 'Черновик',
  };

  if (opts?.note !== undefined) row.note = opts.note;
  if (opts?.app_code !== undefined) row.app_code = opts.app_code;
  if (opts?.kind !== undefined) row.kind = opts.kind;
  if (opts?.name_human !== undefined) row.name_human = opts.name_human;
  if (opts?.uom !== undefined) row.uom = opts.uom;


  const { error } = await client.from('request_items').insert([row]);
  if (error) {
    console.warn('[addRequestItemFromRik]', parseErr(error));
    throw error;
  }

  return true;
};

// ============================== Approvals / Director ==============================
export const listPending = async (): Promise<DirectorPendingRow[]> => {
  const normalize = (items: any[]) => items.map((r, i) => ({
    id: i + 1,
    request_id: r.request_id_old ?? r.request_id,
    request_item_id: String(r.id ?? r.request_item_id ?? ''),
    name_human: String(r.name_human ?? ''),
    qty: Number(r.qty ?? 0),
    uom: r.uom ?? null,
  }));

  const companyId = await getMyCompanyId();

  try {
    const rpcFns = ['list_pending_foreman_items', 'listPending', 'list_pending', 'listpending'];
    for (const fn of rpcFns) {
      const { data, error } = await client.rpc(fn as any);
      if (!error && Array.isArray(data)) return normalize(data);
    }
  } catch (e: any) {
    console.warn('[listPending] rpc failed → fallback', parseErr(e));
  }

  try {
    let reqsQuery = client.from('requests').select('id, id_old').eq('status', 'На утверждении');
    if (companyId) reqsQuery = reqsQuery.eq('company_id', companyId);

    const { data: requests, error: requestsError } = await reqsQuery;
    if (requestsError) throw requestsError;

    const ids = (requests || []).map((r: any) => String(r.id));
    if (!ids.length) return [];

    const idOldByUuid = new Map<string, number>();
    requests?.forEach((r: any) => {
      if (Number.isFinite(r.id_old)) idOldByUuid.set(String(r.id), Number(r.id_old));
    });

    const { data: items, error: itemsError } = await client
      .from('request_items')
      .select('id,request_id,name_human,qty,uom,status')
      .in('request_id', ids)
      .neq('status', 'Утверждено')
      .order('request_id', { ascending: true })
      .order('id', { ascending: true });

    if (itemsError) throw itemsError;

    const ridMap = new Map<string, number>();
    let ridSeq = 1;

    return (items || []).map((r: any, i: number) => {
      const uuid = String(r.request_id);
      let ridNum = idOldByUuid.get(uuid);
      if (!Number.isFinite(ridNum)) {
        if (!ridMap.has(uuid)) ridMap.set(uuid, ridSeq++);
        ridNum = ridMap.get(uuid)!;
      }
      return {
        id: i + 1,
        request_id: ridNum!,
        request_item_id: String(r.id ?? ''),
        name_human: String(r.name_human ?? ''),
        qty: Number(r.qty ?? 0),
        uom: r.uom ?? null,
      };
    });
  } catch (e: any) {
    console.warn('[listPending/fallback]', parseErr(e));
    return [];
  }
};

export const approve = async (approvalId: number | string): Promise<boolean> => {
  try {
    const { error } = await client.rpc('approve_one', { p_proposal_id: toRpcId(approvalId) });
    if (!error) return true;
  } catch {
    // Ignore RPC failure
  }

  const { data, error } = await client
    .from('proposals')
    .update({
      status: 'Утверждено',
      sent_to_accountant_at: new Date().toISOString(),
      payment_status: 'К оплате'
    })
    .eq('id', approvalId)
    .eq('status', 'На утверждении')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

export const reject = async (approvalId: number | string, _reason = 'Без причины'): Promise<boolean> => {
  try {
    const { error } = await client.rpc('reject_one', { p_proposal_id: toRpcId(approvalId) });
    if (!error) return true;
  } catch {
    // Ignore RPC failure
  }

  const { data, error } = await client
    .from('proposals')
    .update({ status: 'Отклонено' })
    .eq('id', approvalId)
    .eq('status', 'На утверждении')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

export const listDirectorHistory = async (limit = 50): Promise<DirectorPendingRow[]> => {
  console.log('[listDirectorHistory] START');

  // Valid statuses for history
  const completedStatuses = ['Утверждено', 'Завершено', 'Получено', 'Выполнено', 'Оплачено'];

  try {
    // Query request_items with requests join - no company_id filter (column doesn't exist)
    const { data, error } = await client
      .from('request_items')
      .select('id,request_id,name_human,qty,uom,status,requests!inner(status, created_at)')
      .order('request_id', { ascending: false })
      .limit(limit * 3);

    if (error) {
      console.warn('[listDirectorHistory] Query error:', error.message);
      throw error;
    }

    // Filter by completed statuses in JavaScript
    const filtered = (data || []).filter((r: any) => {
      const reqStatus = r.requests?.status;
      return completedStatuses.some(s => reqStatus?.includes(s));
    }).slice(0, limit);

    console.log('[listDirectorHistory] Result:', { fetched: data?.length, filtered: filtered.length });

    return filtered.map((r: any, i: number) => ({
      id: i + 1,
      request_id: r.request_id,
      request_item_id: String(r.id),
      name_human: String(r.name_human ?? ''),
      qty: Number(r.qty ?? 0),
      uom: r.uom ?? null,
      status: r.requests?.status || 'Завершено'
    }));
  } catch (e) {
    console.warn('[listDirectorHistory] ERROR:', e);
    return [];
  }
};

export const directorReturnToBuyer = async (
  a: { proposalId: string | number; comment?: string } | string | number,
  b?: string | null
): Promise<boolean> => {
  const pid = typeof a === 'object' && a !== null ? String((a as any).proposalId) : String(a);
  const comment = typeof a === 'object' && a !== null ? (a as any).comment : b;
  const c = (comment ?? '').trim() || null;

  const { error } = await supabase.rpc('director_return_min_auto', {
    p_proposal_id: pid,
    p_comment: c,
  });

  if (error) throw error;
  return true;
};

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

export const listDirectorInbox = async (status: 'На утверждении' | 'Утверждено' | 'Отклонено' = 'На утверждении'): Promise<DirectorInboxRow[]> => {
  try {
    const { data, error } = await client.rpc('list_director_inbox', { p_status: status, p_company_id: null });
    if (!error && data) return data as DirectorInboxRow[];
    console.warn('[listDirectorInbox] RPC failed, trying fallback:', error?.message);
  } catch (err) {
    console.warn('[listDirectorInbox] RPC exception:', err);
  }

  try {
    const { data, error } = await client
      .from('requests')
      .select('id, submitted_at, status, foreman_name, request_items(count)')
      .eq('status', status)
      .order('submitted_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []).map((r: any) => ({
      kind: 'request',
      request_id: r.id,
      items_count: r.request_items?.[0]?.count ?? 0,
      submitted_at: r.submitted_at,
      status: r.status,
      actor_name: r.foreman_name || 'Прораб',
    })) as DirectorInboxRow[];
  } catch (e: any) {
    console.warn('[listDirectorInbox] Fallback failed:', e);
    return [];
  }
};

export const requestSubmit = async (
  requestId: number | string,
  options?: {
    object_id?: string | null;
    foreman_name?: string | null;
    level_name?: string | null;
    system_code?: string | null;
    zone_name?: string | null;
    note?: string | null;
  }
): Promise<RequestRecord | null> => {
  const asStr = String(requestId ?? '').trim();
  const ridForRpc = normalizeUuid(asStr) ?? asStr;
  if (!ridForRpc) throw new Error('request_id is empty');
  const requestFilterId = toFilterId(requestId) as any;

  const syncPendingRequestItems = async (stage: string) => {
    const pendingPayload = { status: '\u041d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438' };
    try {
      await client
        .from('request_items')
        .update(pendingPayload)
        .eq('request_id', requestFilterId)
        .not('status', 'in', '("\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e","\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e","approved","rejected")');
      await client
        .from('request_items')
        .update(pendingPayload)
        .eq('request_id', requestFilterId)
        .is('status', null);
    } catch (e: any) {
      console.warn(`[requestSubmit/request_items ${stage}]`, parseErr(e));
    }
  };

  if (options) {
    try {
      const updatePayload: Record<string, any> = {};
      if (options.object_id !== undefined) updatePayload.object_id = options.object_id;
      if (options.foreman_name !== undefined) updatePayload.foreman_name = options.foreman_name;
      if (options.level_name !== undefined) updatePayload.level_name = options.level_name;
      if (options.system_code !== undefined) updatePayload.system_code = options.system_code;
      if (options.zone_name !== undefined) updatePayload.zone_name = options.zone_name;
      if (options.note !== undefined) updatePayload.note = options.note;

      if (Object.keys(updatePayload).length > 0) {
        await client
          .from('requests')
          .update(updatePayload)
          .eq('id', toFilterId(requestId) as any);
      }
    } catch (e: any) {
      console.warn('[requestSubmit] Failed to update metadata:', parseErr(e));
    }
  }

  try {
    const { data, error } = await client.rpc('request_submit', { p_request_id: ridForRpc as any });
    if (error) throw error;

    const row = mapRequestRow(data);
    if (row) {
      await syncPendingRequestItems('post-rpc');
      if (String(_draftRequestIdAny) === String(ridForRpc)) _draftRequestIdAny = null;
      return row;
    }
  } catch (e: any) {
    console.warn('[requestSubmit/rpc]', parseErr(e));
  }

  // Fallback direct update
  const { data: updData, error: updError } = await client
    .from('requests')
    .update({ status: 'На утверждении', submitted_at: new Date().toISOString() })
    .eq('id', toFilterId(requestId) as any)
    .select('id, status, display_no, foreman_name, need_by, comment, object_id, object_type_code, level_code, system_code, zone_code, created_at, year, seq')
    .maybeSingle();

  if (updError) throw updError;
  const fallback = updData ? mapRequestRow(updData) : null;

  if (fallback && String(_draftRequestIdAny) === String(ridForRpc)) {
    _draftRequestIdAny = null;
  }

  await syncPendingRequestItems('fallback');

  return fallback;
};

// ============================== Buyer: inbox & proposals ==============================
// ============================== Buyer: inbox & proposals ==============================
// ============================== Buyer: inbox & proposals ==============================
export const listBuyerInbox = async (): Promise<BuyerInboxRow[]> => {
  // CRITICAL: Guests should not see any data
  const role = await getMyRole();
  if (!role || role === 'guest') {
    console.log('[listBuyerInbox] Guest role - returning empty');
    return [];
  }

  const companyId = await getMyCompanyId();
  console.log('[listBuyerInbox] companyId:', companyId, 'role:', role);

  // If no company, return empty (guests/unassigned users)
  if (!companyId) {
    console.log('[listBuyerInbox] No companyId - returning empty');
    return [];
  }

  // Try RPC first - it now returns all non-rejected items
  try {
    const { data, error } = await client.rpc('list_buyer_inbox', { p_company_id: companyId || null });
    if (!error && Array.isArray(data)) {
      console.log('[listBuyerInbox] RPC success, items:', data.length, 'statuses:', [...new Set(data.map((r: any) => r.status))]);
      // Return all items - RPC already filters by status
      return data as BuyerInboxRow[];
    }
    if (error) console.warn('[listBuyerInbox] RPC error:', error.message);
  } catch (e: any) {
    console.warn('[listBuyerInbox] RPC exception:', parseErr(e));
  }

  // Fallback: Direct query
  console.log('[listBuyerInbox] Using direct query fallback...');
  let requestIdsFilter: string[] = [];
  try {
    const { data: reqs } = await client.from('requests').select('id').eq('company_id', companyId);
    if (reqs) requestIdsFilter = reqs.map((r: any) => String(r.id));
  } catch { /* ignore */ }

  if (requestIdsFilter.length === 0) return [];

  // Valid statuses for buyer inbox (non-rejected)
  const ALLOWED_LOWER = new Set(['черновик', 'на утверждении', 'утверждено', 'к оплате', 'в работе', 'pending', 'approved']);
  const allowedArray = Array.from(ALLOWED_LOWER);
  const query = client
    .from('request_items')
    .select(`
      request_id,
      request_item_id:id,
      rik_code,
      name_human,
      qty,
      uom,
      app_code,
      status,
      kind,
      note,
      request:requests!request_id (
        object_name,
        level_name,
        zone_name,
        system_code,
        foreman_name,
        object:objects!object_id (name)
      )
    `)
    .or(allowedArray.map(s => `status.ilike.${s}`).join(','))
    .in('request_id', requestIdsFilter)
    .order('request_id', { ascending: true })
    .limit(1000);

  const { data, error } = await query;
  if (error) return [];

  return (data || []).map((r: any) => ({
    ...r,
    object_name: r.request?.object_name || r.request?.object?.name || null,
    level_name: r.request?.level_name || null,
    zone_name: r.request?.zone_name || null,
    system_code: r.request?.system_code || null,
    foreman_name: r.request?.foreman_name || null,
  })) as BuyerInboxRow[];
};

export const listBuyerProposalsByStatus = async (status: 'На утверждении' | 'Утверждено' | 'Отклонено'): Promise<any[]> => {
  // Load role with detailed diagnostics
  const role = await getMyRole();
  console.log(`[listBuyerProposalsByStatus] Role check: "${role}" for status "${status}"`);

  // Allow all roles except guest to see proposals - buyers need to see proposals
  // Directors also use this to review proposals
  if (role === 'guest') {
    console.log('[listBuyerProposalsByStatus] Guest role - returning empty');
    return [];
  }

  // If role is null/undefined, still try to fetch (profile might be loading)
  if (!role) {
    console.warn('[listBuyerProposalsByStatus] Role is null/undefined, attempting fetch anyway');
  }

  // Filter by company_id so buyer only sees their own company's proposals
  const companyId = await getMyCompanyId();
  if (!companyId) {
    console.warn('[listBuyerProposalsByStatus] No companyId - returning empty');
    return [];
  }

  console.log(`[listBuyerProposalsByStatus] Fetching "${status}" for role: ${role}, company: ${companyId}`);

  try {
    // Direct query - only select columns that actually exist in proposals table
    let query = client
      .from('proposals')
      .select('id, status, submitted_at, supplier, supplier_name, invoice_amount, display_no')
      .eq('company_id', companyId)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(200);

    // Handle status variations
    if (status === 'Отклонено') {
      // Include 'На доработке' as well
      query = query.or('status.eq.Отклонено,status.ilike.На доработке%');
    } else {
      query = query.ilike('status', `%${status}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[listBuyerProposalsByStatus] Query error:', error.message);
      return [];
    }

    console.log(`[listBuyerProposalsByStatus] Success: ${data?.length ?? 0} items for "${status}"`);
    return data || [];
  } catch (e: any) {
    console.error('[listBuyerProposalsByStatus] Exception:', e);
    return [];
  }
};



// ============================== Proposals CRUD ==============================
export const proposalCreate = async (): Promise<number | string> => {
  const companyId = await getMyCompanyId();
  if (!companyId) {
    if (Platform.OS !== 'web') {
      Alert.alert('Ошибка профиля', 'У вашего аккаунта не указана компания. Обратитесь к администратору.');
    } else {
      console.error('[proposalCreate] company_id is null for user');
    }
  }

  try {
    const { data, error } = await client.rpc('proposal_create', { p_company_id: companyId });
    if (!error && data != null) {
      if (typeof data === 'object' && 'id' in (data as any)) return (data as any).id;
      return data as any as string | number;
    }
  } catch {
    // Ignore RPC failure
  }

  const { data, error } = await client.from('proposals').insert({ company_id: companyId }).select('id').single();
  if (error) throw error;
  return data?.id;
};

export const proposalAddItems = async (proposalId: number | string, requestItemIds: string[]): Promise<number> => {
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
        const { error } = await client
          .from('proposal_items')
          .insert({ proposal_id: String(proposalId), request_item_id: id })
          .select('id')
          .single();
        if (!error) ok++;
        else console.warn('[proposalAddItems/fallback/insert]', error.message);
      } catch (e: any) {
        console.warn('[proposalAddItems/fallback/insert ex]', e?.message ?? e);
      }
    }
    return ok;
  }
};

export const proposalSubmit = async (proposalId: number | string): Promise<number> => {
  const pid = String(proposalId);

  try {
    const { error } = await client.rpc('proposal_submit', { p_proposal_id: toRpcId(proposalId) });
    if (error) throw error;
  } catch {
    const { data, error } = await client
      .from('proposals')
      .update({ status: 'На утверждении', submitted_at: new Date().toISOString() })
      .eq('id', proposalId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) return 0;
  }

  // Clear accountant flags
  await client
    .from('proposals')
    .update({ payment_status: null, sent_to_accountant_at: null })
    .eq('id', pid);

  return 1;
};

// ===== Безопасный список предложений по статусу для директора =====
export const listDirectorProposalsByStatus = async (status: string): Promise<Array<{ id: string; submitted_at: string | null; supplier?: string | null; doc_no?: string | null; display_no?: number | null; }>> => {
  const companyId = await getMyCompanyId();
  if (!companyId) {
    console.warn('[listDirectorProposalsByStatus] NO companyId found');
    return [];
  }

  console.log(`[listDirectorProposalsByStatus] Fetching "${status}" for company ${companyId}`);

  try {
    // Direct query with company_id filter
    let query = supabase
      .from('proposals')
      .select('id, status, submitted_at, supplier, supplier_name, doc_no, display_no')
      .eq('company_id', companyId)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(200);

    // Handle status variations
    if (status === 'На доработке' || status === 'Отклонено') {
      query = query.or('status.eq.Отклонено,status.ilike.На доработке%');
    } else {
      query = query.ilike('status', `%${status}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[listDirectorProposalsByStatus] Query error:', error.message);
      return [];
    }

    const items = (data as any[]) || [];
    console.log(`[listDirectorProposalsByStatus] Success: ${items.length} items for "${status}"`);

    // DEBUG: If no items found, check if there are ANY proposals in DB
    if (items.length === 0) {
      const { data: allProposals, error: allErr } = await supabase
        .from('proposals')
        .select('id, status, company_id, submitted_at')
        .ilike('status', `%${status}%`)
        .limit(20);
      console.log('[listDirectorProposalsByStatus] DEBUG - ALL proposals with status:', {
        count: allProposals?.length ?? 0,
        myCompanyId: companyId,
        proposals: (allProposals || []).map((p: any) => ({
          id: String(p.id).slice(0, 8),
          status: p.status,
          company_id: p.company_id ? String(p.company_id).slice(0, 8) : 'NULL',
          submitted: p.submitted_at ? 'yes' : 'no'
        }))
      });
    }

    return items.map(x => ({
      id: String(x.id),
      submitted_at: x.submitted_at ?? null,
      supplier: x.supplier ?? x.supplier_name ?? null,
      doc_no: x.doc_no ?? null,
      display_no: x.display_no ?? null
    }));
  } catch (e: any) {
    console.error('[listDirectorProposalsByStatus] Exception:', e);
    return [];
  }
};

/**
 * @deprecated Use listDirectorProposalsByStatus('На утверждении')
 */
export const listDirectorProposalsPending = async () => listDirectorProposalsByStatus('На утверждении');
;

// ===== ПРОЧИТАТЬ СТРОКИ ПРЕДЛОЖЕНИЯ: TABLE → snapshot → view → rpc =====
export type ProposalItemRow = {
  id: number;
  rik_code: string | null;
  name_human: string;
  uom: string | null;
  app_code: string | null;
  total_qty: number;
  price: number | null;
  supplier: string | null;
  request_item_id: string | null;
};

export const proposalItems = async (proposalId: string | number): Promise<ProposalItemRow[]> => {
  const pid = String(proposalId);
  let rows: any[] = [];

  try {
    const { data, error } = await supabase
      .from('proposal_items')
      .select('id, name_human, uom, qty, app_code, rik_code, price, supplier, request_item_id, proposal_id')
      .eq('proposal_id', pid)
      .order('id', { ascending: true });

    if (!error && Array.isArray(data) && data.length) {
      const key = (r: any) => [
        String(r.name_human ?? ''), String(r.uom ?? ''), String(r.app_code ?? ''), String(r.rik_code ?? ''),
      ].join('||');

      const agg = new Map<string, ProposalItemRow & { proposal_id?: string }>();
      (data as any[]).forEach((r: any, i: number) => {
        const k = key(r);
        const prev = agg.get(k);
        agg.set(k, {
          id: prev?.id ?? Number(r.id ?? i),
          name_human: String(r.name_human ?? ''),
          uom: r.uom ?? null,
          app_code: r.app_code ?? null,
          rik_code: r.rik_code ?? null,
          total_qty: (prev?.total_qty ?? 0) + Number(r.qty ?? 0),
          price: r.price ?? prev?.price ?? null,
          supplier: r.supplier ?? prev?.supplier ?? null,
          request_item_id: r.request_item_id ?? prev?.request_item_id ?? null,
          proposal_id: r.proposal_id ?? prev?.proposal_id ?? null,
        } as any);
      });
      rows = Array.from(agg.values());
    }
  } catch (e: any) {
    console.warn('[proposalItems/table]', parseErr(e));
  }

  if (!rows.length) {
    try {
      const { data, error } = await supabase
        .from('proposal_snapshot_items')
        .select('id, rik_code, name_human, uom, app_code, total_qty, price, supplier, request_item_id, proposal_id')
        .eq('proposal_id', pid)
        .order('id', { ascending: true });
      if (!error && data?.length) rows = data as any[];
    } catch {
      // Ignore
    }
  }

  if (!rows.length) {
    try {
      const { data, error } = await supabase
        .from('proposal_items_view')
        .select('id, rik_code, name_human, uom, app_code, total_qty, price, supplier, request_item_id, proposal_id')
        .eq('proposal_id', pid)
        .order('id', { ascending: true });
      if (!error && data?.length) rows = data as any[];
    } catch {
      // Ignore
    }
  }

  if (!rows.length) {
    try {
      const { data, error } = await supabase.rpc('proposal_items_for_web', { p_id: pid });
      if (!error && Array.isArray(data) && data.length) rows = data as any[];
    } catch {
      // Ignore
    }
  }

  return (rows || []).map((r: any, i: number) => ({
    id: Number(r.id ?? i),
    rik_code: r.rik_code ?? null,
    name_human: r.name_human ?? '',
    uom: r.uom ?? null,
    app_code: r.app_code ?? null,
    total_qty: Number(r.total_qty ?? r.qty ?? 0),
    price: r.price != null ? Number(r.price) : null,
    supplier: r.supplier ?? null,
    request_item_id: r.request_item_id ?? null,
  }));
};

// ============================== Snapshot RPC ==============================
export const proposalSnapshotItems = async (
  proposalId: number | string,
  metaRows: { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null; }[] = []
): Promise<boolean> => {
  const { error } = await client.rpc('proposal_items_snapshot', { p_proposal_id: String(proposalId), p_meta: metaRows });
  if (error) throw error;
  return true;
};

// ============================== Meta & Attachments ==============================
export const proposalSetItemsMeta = async (
  _proposalId: number | string,
  _rows: { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null; }
): Promise<boolean> => true;



export const uploadProposalAttachment = async (
  proposalId: string,
  file: any,
  filename: string,
  kind: 'invoice' | 'payment' | 'proposal_pdf' | string
): Promise<void> => {
  const FILES_BUCKET = 'proposal_files';
  const base = `proposals/${proposalId}/${kind}`;

  // ⬇️ делаем безопасное имя (латиница/цифры/._-), остальное → '_'
  const safe = (filename || 'file')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const storagePath = kind === 'payment' ? `${base}/${Date.now()}-${safe}` : `${base}/${safe}`;

  const body = Platform.OS === 'web'
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
        file_name: safe,
        group_key: kind,
      } as any,
      { onConflict: 'proposal_id,group_key,file_name', ignoreDuplicates: false }
    );

  if (metaErr) throw metaErr;
};


// ============================== PDF: Proposals ==============================

// Читаем «шапку» только теми полями, которые есть в твоей таблице proposals
// Читаем «шапку» только теми полями, которые есть в твоей таблице proposals
const selectProposalHeadSafe = async (idFilter: number | string) => {
  const { data, error } = await supabase
    .from('proposals')
    .select('status,submitted_at,buyer_fio,buyer_email,created_by,approved_at')
    .eq('id', idFilter)
    .maybeSingle();

  if (error || !data) {
    return {
      status: '',
      submittedAt: null as string | null,
      buyerFioAny: null as string | null,
      approvedAt: null as string | null,
    };
  }

  const d: any = data;
  return {
    status: (typeof d.status === 'string' ? d.status : '') || '',
    submittedAt: (d.submitted_at ?? null) as string | null,
    buyerFioAny: (d.buyer_fio ?? d.buyer_email ?? d.created_by ?? null) as string | null,
    approvedAt: (d.approved_at ?? null) as string | null,
  };
};

export async function buildProposalPdfHtml(proposalId: number | string): Promise<string> {
  const pid = String(proposalId);
  const idFilter: number | string = /^\d+$/.test(pid) ? Number(pid) : pid;
  const locale = 'ru-RU';

  const num = (v?: any) => { const n = Number(String(v ?? '').replace(',', '.').trim()); return Number.isFinite(n) ? n : 0; };
  const fmt = (x: number) => x.toLocaleString(locale);

  try {
    // Import the standardized template
    const { generateProposalActHtml } = await import('./pdf_templates');

    const head = await selectProposalHeadSafe(idFilter);
    const status = head.status;
    const submittedAt = head.submittedAt;
    const buyerFio = head.buyerFioAny;

    // Fetch proposal items
    const { data: piRaw } = await supabase
      .from('proposal_items')
      .select('id, request_item_id, name_human, uom, qty, app_code, rik_code, price, supplier, note')
      .eq('proposal_id', idFilter)
      .order('id', { ascending: true });

    const pi: any[] = Array.isArray(piRaw) ? piRaw : [];

    // Fill missing fields from request_items
    const needFill = pi.filter((r) => !r?.name_human || !r?.uom || !r?.qty);
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
            r.uom = r.uom ?? src.uom ?? null;
            r.qty = r.qty ?? src.qty ?? null;
            r.rik_code = r.rik_code ?? src.rik_code ?? null;
          }
        }
      }
    }

    // Get first supplier info
    const distinctSupplierNames = Array.from(new Set(pi.map(r => String(r?.supplier || '').trim()).filter(Boolean)));
    let supplierName = '';
    let supplierInn = '';
    let supplierPhone = '';

    if (distinctSupplierNames.length) {
      const all = await listSuppliers();
      const hit = all.find(s => normStr(s.name) === normStr(distinctSupplierNames[0]));
      if (hit) {
        supplierName = hit.name || '';
        supplierInn = (hit as any).inn || '';
        supplierPhone = (hit as any).phone || '';
      } else {
        supplierName = distinctSupplierNames[0];
      }
    }

    // Build items array for template (with persistent item code)
    const { itemCode: _itemCode } = await import('./format');
    const items = pi.map((r: any) => {
      const qty = num(r.qty);
      const price = num(r.price);
      const amount = qty * price;
      return {
        code: _itemCode(r.request_item_id || r.id),
        name: String(r.rik_code ? `${r.rik_code} · ` : '') + String(r.name_human ?? ''),
        unit: String(r.uom ?? ''),
        qty: String(qty || ''),
        price: price ? fmt(price) : '',
        amount: amount ? fmt(amount) : '',
        supplier: String(r.supplier ?? ''),
      };
    });

    const total = pi.reduce((acc, r) => acc + num(r.qty) * num(r.price), 0);
    const dateStr = (submittedAt ? new Date(submittedAt) : new Date()).toLocaleDateString(locale);

    // Use the standardized template
    return generateProposalActHtml({
      proposalId: pid,
      date: dateStr,
      status: status || 'Черновик',
      buyerName: buyerFio || '',
      supplierName,
      supplierInn,
      supplierPhone,
      items,
      totalAmount: fmt(total),
    });

  } catch (e: any) {
    const esc2 = (s: any) => String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]!));
    return `<!doctype html><meta charset="utf-8"/><title>Ошибка</title>
<pre style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding:16px;">Ошибка подготовки PDF: ${esc2(e?.message || e)}</pre>`;
  }
}

/**
 * Premium PDF Builder V2 — Modern Design with QR codes
 */
export async function buildProposalPdfHtmlPremium(proposalId: number | string): Promise<string> {
  const pid = String(proposalId);
  const idFilter: number | string = /^\d+$/.test(pid) ? Number(pid) : pid;

  try {
    // Fetch proposal header
    const head = await selectProposalHeadSafe(idFilter);
    const { status, submittedAt, buyerFioAny, approvedAt } = head;

    // Fetch proposal items
    const { data: piRaw } = await supabase
      .from('proposal_items')
      .select('id, request_item_id, name_human, uom, qty, app_code, rik_code, price, supplier, note')
      .eq('proposal_id', idFilter)
      .order('id', { ascending: true });

    const pi: any[] = Array.isArray(piRaw) ? piRaw : [];

    // Fill missing fields from request_items
    const needFill = pi.filter((r) => !r?.name_human || !r?.uom || !r?.qty);
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
            r.uom = r.uom ?? src.uom ?? null;
            r.qty = r.qty ?? src.qty ?? null;
          }
        }
      }
    }

    // Get supplier cards
    const distinctSupplierNames = Array.from(new Set(pi.map(r => String(r?.supplier || '').trim()).filter(Boolean)));
    let supplierCardsHtml = '';
    if (distinctSupplierNames.length) {
      const all = await listSuppliers();
      const cards = distinctSupplierNames.map(nm => {
        const hit = all.find(s => normStr(s.name) === normStr(nm));
        return hit || { name: nm };
      });
      supplierCardsHtml = cards.map(s => buildSupplierCard({
        name: s.name || '',
        inn: (s as any).inn,
        account: (s as any).bank_account,
        phone: (s as any).phone,
        email: (s as any).email,
        address: (s as any).address,
        specialization: (s as any).specialization,
      })).join('');
    }

    // Build table rows (with persistent item code)
    const { itemCode: _itemCode2 } = await import('./format');
    const includeSupplier = pi.some(r => (r?.supplier ?? '').toString().trim() !== '');
    const tableRows = pi.map((r: any, i: number) => {
      const qty = Number(r.qty) || 0;
      const price = Number(String(r.price ?? '').replace(',', '.')) || 0;
      const amount = qty * price;
      const note = r.note ? `<div class="cell-note">📝 ${escapeHtml(r.note)}</div>` : '';
      const code = _itemCode2(r.request_item_id || r.id);

      return `<tr>
        <td class="text-center">${i + 1}</td>
        <td style="font-family: monospace; font-weight: 600; color: #1e3a8a; text-align: center;">#${code}</td>
        <td class="cell-name">${escapeHtml(r.name_human || r.rik_code || '')}${note}</td>
        <td class="text-right">${qty || ''}</td>
        <td class="text-center">${escapeHtml(r.uom || '')}</td>
        <td>${escapeHtml(r.app_code || '')}</td>
        ${includeSupplier ? `<td>${escapeHtml(r.supplier || '')}</td>` : ''}
        <td class="text-right">${price ? formatNumber(price) : ''}</td>
        <td class="text-right">${amount ? formatNumber(amount) : ''}</td>
      </tr>`;
    }).join('');

    const total = pi.reduce((acc, r) => acc + (Number(r.qty) || 0) * (Number(String(r.price ?? '').replace(',', '.')) || 0), 0);
    const sumColspan = includeSupplier ? 7 : 6;

    // Generate QR code for document
    const qrDataUrl = generateDocumentQR('proposal', pid, 80);

    // Build full HTML
    const header = buildDocHeader({
      title: 'Предложение на закупку',
      docNumber: pid.length > 12 ? `${pid.slice(0, 8)}...` : pid,
      date: formatDate(submittedAt) || formatDate(new Date()),
      status: status || 'Черновик',
      qrDataUrl,
    });

    const suppliersSection = supplierCardsHtml ? `
      <div class="section">
        <div class="section-title">Поставщики</div>
        ${supplierCardsHtml}
      </div>
    ` : '';

    const tableHtml = `
      <div class="section">
        <div class="section-title">Материалы и услуги</div>
        <table>
          <thead>
            <tr>
              <th style="width:40px" class="text-center">#</th>
              <th style="width:80px" class="text-center">Код</th>
              <th>Наименование</th>
              <th style="width:70px" class="text-right">Кол-во</th>
              <th style="width:60px" class="text-center">Ед.</th>
              <th style="width:120px">Применение</th>
              ${includeSupplier ? '<th style="width:150px">Поставщик</th>' : ''}
              <th style="width:100px" class="text-right">Цена</th>
              <th style="width:110px" class="text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="8" class="muted text-center">Нет позиций</td></tr>'}
            ${pi.length ? `<tr class="totals-row"><td colspan="${sumColspan}" class="text-right">ИТОГО</td><td class="text-right total-value">${formatNumber(total)}</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    const signatures = buildSignatures(buyerFioAny || '', '');
    const footer = buildDocFooter();

    const bodyContent = `
      ${header}
      ${suppliersSection}
      ${tableHtml}
      ${signatures}
      ${footer}
    `;

    return wrapInHtmlDocument(bodyContent, `Предложение ${pid}`);

  } catch (e: any) {
    console.error('[buildProposalPdfHtmlPremium] Error:', e);
    return `<!doctype html><meta charset="utf-8"/><title>Ошибка</title>
<pre style="font-family:monospace; padding:16px; color:red;">Ошибка подготовки PDF: ${escapeHtml(e?.message || e)}</pre>`;
  }
}

export async function exportProposalPdf(proposalId: number | string) {
  // Use premium template by default
  const html = await buildProposalPdfHtmlPremium(proposalId);
  const result = await exportPdf(html, `Proposal_${proposalId}.pdf`);

  // Upload PDF to Storage so QR code direct download works
  try {
    const { uploadPdfToStoragePath } = await import('./files');
    if (result?.uri) {
      const publicUrl = await uploadPdfToStoragePath(result.uri, 'proposal', String(proposalId));
      console.log('[exportProposalPdf] PDF uploaded to Storage:', publicUrl);
    }
  } catch (e) {
    console.warn('[exportProposalPdf] Storage upload failed:', e);
  }

  return result;
}
export async function buildPaymentOrderHtml(paymentId: number): Promise<string> {
  const pid = Number(paymentId);
  if (!Number.isFinite(pid) || pid <= 0) throw new Error('payment_id invalid');

  const { data, error } = await supabase.rpc('get_payment_order_data', { p_payment_id: pid } as any);
  if (error) throw error;
  if (!data) throw new Error('Нет данных для платёжки');

  const payload = data as any;
  const c = payload.company ?? {};
  const p = payload.payment ?? {};
  const pr = payload.proposal ?? {};

  const esc = (s: any) =>
    String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const fmtMoney = (v: any) => {
    const n = Number(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n)
      ? n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';
  };

  const paidAt = p.paid_at ? new Date(p.paid_at).toLocaleString('ru-RU') : '—';
  const amount = fmtMoney(p.amount);
  const cur = String(p.currency ?? pr.invoice_currency ?? 'KGS');

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Платёжное поручение ${esc(p.payment_id)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; padding:16px; color:#111}
  h1{font-size:18px;margin:0 0 10px 0}
  .box{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:10px 0;background:#fff}
  .row{display:flex;gap:12px;flex-wrap:wrap}
  .cell{flex:1 1 260px}
  .lbl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
  .val{margin-top:4px;font-size:14px;font-weight:700;color:#0f172a}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  td{border:1px solid #e5e7eb;padding:8px 10px;vertical-align:top;font-size:13px}
  .muted{color:#64748b}
</style></head><body>

<h1>Платёжное поручение</h1>

<div class="box">
  <div class="row">
    <div class="cell"><div class="lbl">Платёж ID</div><div class="val">${esc(p.payment_id)}</div></div>
    <div class="cell"><div class="lbl">Дата/время оплаты</div><div class="val">${esc(paidAt)}</div></div>
    <div class="cell"><div class="lbl">Сумма</div><div class="val">${esc(amount)} ${esc(cur)}</div></div>
  </div>
  <div class="row" style="margin-top:8px">
    <div class="cell">
      <div class="lbl">Основание</div>
      <div class="val">Счёт: ${esc(pr.invoice_number ?? '—')} от ${esc(pr.invoice_date ?? '—')}</div>
      <div class="muted">Proposal: ${esc(pr.proposal_id ?? '')}</div>
    </div>
  </div>
</div>

<div class="box">
  <div class="lbl">Плательщик (наша компания)</div>
  <table>
    <tr><td>Название</td><td>${esc(c.company_name ?? '—')}</td></tr>
    <tr><td>ИНН / КПП</td><td>${esc(c.inn ?? '—')} / ${esc(c.kpp ?? '—')}</td></tr>
    <tr><td>Адрес</td><td>${esc(c.address ?? '—')}</td></tr>
    <tr><td>Банк</td><td>${esc(c.bank_name ?? '—')}</td></tr>
    <tr><td>БИК</td><td>${esc(c.bik ?? '—')}</td></tr>
    <tr><td>Р/с</td><td>${esc(c.account ?? '—')}</td></tr>
    <tr><td>К/с</td><td>${esc(c.corr_account ?? '—')}</td></tr>
    <tr><td>Тел/Email</td><td>${esc(c.phone ?? '—')} / ${esc(c.email ?? '—')}</td></tr>
  </table>
</div>

<div class="box">
  <div class="lbl">Получатель (поставщик)</div>
  <table>
    <tr><td>Поставщик</td><td>${esc(pr.supplier ?? '—')}</td></tr>
    <tr><td>Назначение</td><td>${esc(p.note ?? '')}</td></tr>
    <tr><td>Способ</td><td>${esc(p.method ?? '')}</td></tr>
  </table>
</div>

</body></html>`;
}

export async function exportPaymentOrderPdf(paymentId: number) {
  const html = await buildPaymentOrderHtml(paymentId);
  return exportPdf(html, `PaymentOrder_${paymentId}.pdf`);
}

// ============================== PDF: Requests ==============================
// экспортируемый резолвер красивого номера (используем и за пределами PDF)
export async function resolveRequestLabel(rid: string | number): Promise<string> {
  const id = String(rid).trim();
  if (!id) return '#—';
  try {
    const { data, error } = await supabase
      .from('requests' as any)
      .select('display_no')
      .eq('id', id)
      .maybeSingle();
    if (!error && data?.display_no) {
      let dn = String(data.display_no).trim();
      // Strip REQ- prefix if present (show only number like "0044/2026")
      if (dn.startsWith('REQ-')) {
        dn = dn.replace(/^REQ-/, '');
      }
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
      .from('requests' as any)
      .select('id, display_no')
      .in('id', uniq);
    if (error) throw error;
    const m: Record<string, string> = {};
    for (const r of (data ?? [])) {
      const id = String((r as any).id ?? '');
      let dn = String((r as any).display_no ?? '').trim();
      // Strip REQ- prefix if present (show only number like "0044/2026")
      if (dn.startsWith('REQ-')) {
        dn = dn.replace(/^REQ-/, '');
      }
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
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const fmtQty = (value: any) => {
    const num = Number(String(value ?? '').replace(',', '.'));
    if (!Number.isFinite(num)) return '';
    return num.toLocaleString(locale, { maximumFractionDigits: 3 });
  };
  const pickRefName = (row: any) => {
    const source = (row && 'data' in row ? (row as any).data : row) ?? {};
    const candidates = [
      source?.name_ru,
      source?.name_human_ru,
      source?.display_name,
      source?.alias_ru,
      source?.name,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
    return '';
  };
  const formatDate = (value: any) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(locale);
      }
    } catch { /* ignore */ }
    const str = String(value ?? '').trim();
    return str;
  };
  const formatDateTime = (value: any) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString(locale);
      }
    } catch { /* ignore */ }
    const str = String(value ?? '').trim();
    return str;
  };

  const displayLabel = await resolveRequestLabel(rid);

  const head = await client
    .from('requests')
    .select('id, foreman_name, need_by, comment, status, created_at, object_type_code, level_code, system_code, zone_code')
    .eq('id', idFilter)
    .maybeSingle();
  if (head.error || !head.data) throw new Error('Заявка не найдена');
  const H: any = head.data;

  const [obj, lvl, sys, zn] = await Promise.all([
    H.object_type_code
      ? client
        .from('ref_object_types')
        .select('name,name_ru,name_human_ru,display_name,alias_ru')
        .eq('code', H.object_type_code)
        .maybeSingle()
      : Promise.resolve({ data: null } as any),
    H.level_code
      ? client
        .from('ref_levels')
        .select('name,name_ru,name_human_ru,display_name,alias_ru')
        .eq('code', H.level_code)
        .maybeSingle()
      : Promise.resolve({ data: null } as any),
    H.system_code
      ? client
        .from('ref_systems')
        .select('name,name_ru,name_human_ru,display_name,alias_ru')
        .eq('code', H.system_code)
        .maybeSingle()
      : Promise.resolve({ data: null } as any),
    H.zone_code
      ? client
        .from('ref_zones')
        .select('name,name_ru,name_human_ru,display_name,alias_ru')
        .eq('code', H.zone_code)
        .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);
  const objectName = pickRefName(obj);
  const levelName = pickRefName(lvl);
  const systemName = pickRefName(sys);
  const zoneName = pickRefName(zn);

  const createdAt = formatDateTime(H.created_at);
  const needByFormatted = formatDate(H.need_by);
  const generatedAt = new Date().toLocaleString(locale);

  const statusRaw = String(H.status ?? '').trim();
  const statusKey = statusRaw.toLowerCase();
  const statusLabel =
    statusKey === 'draft' || statusKey === 'черновик'
      ? 'Черновик'
      : statusKey === 'pending' || statusKey === 'на утверждении'
        ? 'На утверждении'
        : statusKey === 'approved' || statusKey === 'утверждено' || statusKey === 'утверждена'
          ? 'Утверждена'
          : statusKey === 'rejected' || statusKey === 'отклонено' || statusKey === 'отклонена'
            ? 'Отклонена'
            : statusRaw;

  const metaPairs: Array<{ label: string; value: string }> = [
    { label: 'Объект', value: objectName || '—' },
    { label: 'Этаж / уровень', value: levelName || '—' },
    { label: 'Система', value: systemName || '—' },
    { label: 'Зона / участок', value: zoneName || '—' },
    { label: 'ФИО прораба', value: H.foreman_name || '(не указано)' },
    { label: 'Дата создания', value: createdAt || '—' },
    { label: 'Нужно к', value: needByFormatted || '—' },
    { label: 'Статус', value: statusLabel || '—' },
  ];

  const metaHtml = metaPairs
    .map(
      (pair) =>
        `<div class="cell"><div class="meta-label">${esc(pair.label)}</div><div class="meta-value">${esc(pair.value)}</div></div>`,
    )
    .join('');

  const items = await client
    .from('request_items')
    .select('id, name_human, uom, qty, note, app_code')
    .eq('request_id', idFilter)
    .order('id', { ascending: true });

  const rows: any[] = Array.isArray(items.data) ? items.data : [];

  // === Use standardized PDF templates for premium styling ===
  const {
    PREMIUM_CSS,
    buildDocHeader,
    buildSignatures,
    buildDocFooter,
    wrapInHtmlDocument,
    escapeHtml
  } = await import('./pdf_templates');
  const { generateDocumentQR } = await import('./qr_utils');

  const qrDataUrl = generateDocumentQR('request', rid, 100);

  // Build header with QR
  const headerHtml = buildDocHeader({
    title: `Заявка ${displayLabel}`,
    docNumber: rid,
    date: createdAt,
    status: statusLabel,
    qrDataUrl
  });

  // Build meta info block
  const infoBlockHtml = `
    <div class="info-block">
      ${metaPairs.map(p => `<div class="info-row"><span class="info-label">${escapeHtml(p.label)}:</span><span>${escapeHtml(p.value)}</span></div>`).join('')}
    </div>
  `;

  // Build items table
  const tableHtml = rows.length ? `
    <table class="request-table">
      <thead>
        <tr>
          <th style="width:40px;text-align:center;">№</th>
          <th>Позиция</th>
          <th style="width:80px;text-align:center;">Ед.изм.</th>
          <th style="width:100px;text-align:right;">Количество</th>
          <th style="min-width:150px;">Примечание</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r: any, i: number) => {
    const notes: string[] = [];
    if (r.note) notes.push(escapeHtml(r.note));
    if (r.app_code) notes.push(`<span class="muted">Применение: ${escapeHtml(r.app_code)}</span>`);
    return `<tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${escapeHtml(r.name_human || '')}</td>
            <td style="text-align:center;">${escapeHtml(r.uom || '')}</td>
            <td style="text-align:right;">${fmtQty(r.qty)}</td>
            <td>${notes.join('<br/>') || '—'}</td>
          </tr>`;
  }).join('')}
      </tbody>
    </table>
  ` : '<p class="muted" style="text-align:center;">Нет позиций</p>';

  const commentBlock = H.comment
    ? `<div class="section"><div class="section-title">Комментарий</div><p>${escapeHtml(H.comment)}</p></div>`
    : '';

  const signaturesHtml = buildSignatures(H.foreman_name || 'Прораб', 'Директор');
  const footerHtml = buildDocFooter();

  // Extra styles for request PDF tables
  const extraStyles = `
    <style>
      .info-block { 
        margin: 20px 0; 
        padding: 15px; 
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
        border-radius: 8px; 
        border-left: 4px solid #0ea5e9;
      }
      .info-row { display: flex; margin-bottom: 6px; font-size: 13px; }
      .info-label { width: 140px; font-weight: 600; color: #475569; }
      .request-table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin: 15px 0 !important;
        font-size: 12px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }
      .request-table th {
        background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
        color: white !important;
        font-weight: 600 !important;
        padding: 12px 10px !important;
        border: none !important;
      }
      .request-table td {
        padding: 10px !important;
        border-bottom: 1px solid #e2e8f0 !important;
        border-left: none !important;
        border-right: none !important;
        border-top: none !important;
        background: white !important;
      }
      .request-table tr:nth-child(even) td {
        background: #f8fafc !important;
      }
      .request-table tr:last-child td {
        border-bottom: none !important;
      }
    </style>
  `;

  const bodyHtml = `
    ${extraStyles}
    ${headerHtml}
    ${infoBlockHtml}
    <div class="section">
      <div class="section-title">Позиции заявки</div>
      ${tableHtml}
    </div>
    ${commentBlock}
    ${signaturesHtml}
    ${footerHtml}
    <div style="font-size: 8px; color: #666; margin-top: 10px; text-align: center;">
      ID заявки: ${rid} | Сформировано: ${generatedAt}
    </div>
  `;

  return wrapInHtmlDocument(bodyHtml, `Заявка ${displayLabel}`);
}

// cache id черновика на сессию (uuid или int)
export const clearCachedDraftRequestId = (): void => {
  _draftRequestIdAny = null;
};

export const getOrCreateDraftRequestId = async (): Promise<string | number> => {
  if (_draftRequestIdAny != null) return _draftRequestIdAny;
  const created = await requestCreateDraft();
  if (created?.id) return created.id;
  throw new Error('requestCreateDraft returned invalid id');
};

export async function exportRequestPdf(requestId: number | string) {
  const html = await buildRequestPdfHtml(requestId);
  return exportPdf(html, `Request_${requestId}.pdf`);
}

/* ============================== Бухгалтерия: RPC-обёртки (НОВЫЕ) ============================== */
export const proposalSendToAccountant = async (
  input: { proposalId: string | number; invoiceNumber?: string; invoiceDate?: string; invoiceAmount?: number; invoiceCurrency?: string } | string | number
): Promise<boolean> => {
  const isObj = typeof input === 'object' && input !== null;
  const pid = String(isObj ? (input as any).proposalId : input);

  const invoiceNumber = isObj ? (input as any).invoiceNumber : undefined;
  const invoiceDateRaw = isObj ? (input as any).invoiceDate : undefined;
  const invoiceAmount = isObj ? (input as any).invoiceAmount : undefined;
  const invoiceCurrency = isObj ? (input as any).invoiceCurrency : undefined;

  const invoiceDate = (() => {
    const s = String(invoiceDateRaw ?? '').trim();
    if (!s) return undefined;
    return s.slice(0, 10); // 'YYYY-MM-DD'
  })();

  const args: Record<string, any> = { p_proposal_id: pid };
  if (invoiceNumber != null && String(invoiceNumber).trim()) args.p_invoice_number = String(invoiceNumber);
  if (invoiceDate != null && String(invoiceDate).trim()) args.p_invoice_date = String(invoiceDate);
  if (typeof invoiceAmount === 'number') args.p_invoice_amount = Number(invoiceAmount);
  if (invoiceCurrency != null && String(invoiceCurrency).trim()) args.p_invoice_currency = String(invoiceCurrency);

  const { error } = await supabase.rpc('proposal_send_to_accountant_min', args);
  if (error) throw error;

  try {
    await supabase.rpc('acc_generate_postings_for_proposal', { p_proposal_id: pid });
  } catch (e) {
    console.warn('[proposalSendToAccountant] Posting generation skipped', e);
  }

  return true;
};


export const accountantAddPayment = async (input: {
  proposalId: string | number;
  amount: number;
  method?: string;
  note?: string;
}): Promise<boolean> => {
  const pid = String(input.proposalId);
  const amt = Number(input.amount);
  const m = input.method?.trim();
  const n = input.note?.trim();

  const argsP = { p_proposal_id: pid, p_amount: amt, ...(m ? { p_method: m } : {}), ...(n ? { p_note: n } : {}) };
  const argsRaw = { proposal_id: pid, amount: amt, ...(m ? { method: m } : {}), ...(n ? { note: n } : {}) };

  await rpcCompat<void>([
    { fn: 'acc_add_payment_min', args: argsP },
    { fn: 'acc_add_payment_min_compat', args: argsRaw },
    { fn: 'acc_add_payment', args: argsP },
    { fn: 'acc_add_payment', args: argsRaw },
  ]);
  return true;
};

// >>> added: совместимая сигнатура — можно (proposalId, comment?) или ({ proposalId, comment? })
export const accountantReturnToBuyer = async (
  a: { proposalId: string | number; comment?: string } | string | number,
  b?: string | null
): Promise<boolean> => {
  const pid = typeof a === 'object' && a !== null ? String((a as any).proposalId) : String(a);
  const comment = typeof a === 'object' && a !== null ? (a as any).comment : b;
  const c = comment?.trim();

  await rpcCompat<void>([
    { fn: 'acc_return_min_auto', args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: 'acc_return_min', args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: 'acc_return', args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: 'proposal_return_to_buyer_min', args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
  ]);
  return true;
};



/** 
 * Список счетов для бухгалтера (входящие).
 * Поддерживает fallback (прямой SELECT), если RPC list_accountant_inbox отсутствует или упал.
 */
export const listAccountantInbox = async (opts?: { tab?: string; companyId?: string | null }): Promise<AccountantInboxRow[]> => {
  const tab = (opts?.tab || '').trim();
  const companyId = opts?.companyId;

  try {
    const norm = !tab ? null :
      /^на доработке/i.test(tab) ? 'На доработке' :
        /^частично/i.test(tab) ? 'Частично оплачено' :
          /^оплачено/i.test(tab) ? 'Оплачено' :
            'К оплате';

    const { data, error } = await supabase.rpc('list_accountant_inbox', { p_status: norm });
    if (!error && Array.isArray(data)) {
      return data as AccountantInboxRow[];
    }
    if (error) console.warn('[listAccountantInbox] RPC fail:', error.message);
  } catch (e: any) {
    console.warn('[listAccountantInbox] RPC exception:', parseErr(e));
  }

  // Fallback: Direct query
  if (!companyId) return [];
  try {
    const { data: props, error } = await supabase
      .from('proposals')
      .select('id, status, payment_status, invoice_number, invoice_date, invoice_amount, total_amount, invoice_currency, supplier, sent_to_accountant_at, company_id')
      .eq('company_id', companyId)
      .not('sent_to_accountant_at', 'is', null)
      .order('sent_to_accountant_at', { ascending: false });

    if (error) throw error;
    if (!props || !props.length) return [];

    const ids = props.map(p => String(p.id));

    // Aggregate payments
    const paidMap = new Map<string, { total: number; count: number }>();
    const { data: pays } = await supabase.from('proposal_payments').select('proposal_id, amount').in('proposal_id', ids);
    (pays || []).forEach((p: any) => {
      const k = String(p.proposal_id);
      const cur = paidMap.get(k) || { total: 0, count: 0 };
      cur.total += Number(p.amount || 0);
      cur.count += 1;
      paidMap.set(k, cur);
    });

    // Check for invoices
    const { data: atts } = await supabase.from('proposal_attachments').select('proposal_id').eq('group_key', 'invoice').in('proposal_id', ids);
    const hasInv = new Set((atts || []).map((a: any) => String(a.proposal_id)));

    // Fetch request_nos via purchases → requests.display_no (same path as director/warehouse)
    const requestNosMap = new Map<string, string>();
    try {
      const { data: purchData } = await supabase
        .from('purchases')
        .select('proposal_id, request_id, requests!request_id(display_no)')
        .in('proposal_id', ids)
        .not('request_id', 'is', null);

      if (purchData && Array.isArray(purchData)) {
        const byProposal = new Map<string, Set<string>>();
        for (const pur of purchData as any[]) {
          const pid = String(pur.proposal_id || '');
          if (!pid) continue;
          const displayNo = pur.requests?.display_no;
          if (displayNo != null) {
            if (!byProposal.has(pid)) byProposal.set(pid, new Set());
            byProposal.get(pid)!.add(String(displayNo));
          }
        }
        for (const [pid, nos] of byProposal) {
          requestNosMap.set(pid, Array.from(nos).join(', '));
        }
      }
    } catch (e) {
      console.warn('[listAccountantInbox] request_nos via purchases failed:', e);
    }

    // Fetch item_names, object_names via proposal_items
    const itemNamesMap = new Map<string, string>();
    const objectNamesMap = new Map<string, string>();
    const supplierFallbackMap = new Map<string, string>();
    try {
      // 1) Item names from proposal_items
      const { data: piData } = await supabase
        .from('proposal_items')
        .select('proposal_id, name')
        .in('proposal_id', ids);

      if (piData && Array.isArray(piData)) {
        const byPid = new Map<string, Set<string>>();
        for (const item of piData as any[]) {
          const pid = String(item.proposal_id || '');
          const name = String(item.name || '').trim();
          if (!pid || !name) continue;
          if (!byPid.has(pid)) byPid.set(pid, new Set());
          byPid.get(pid)!.add(name);
        }
        for (const [pid, names] of byPid) {
          itemNamesMap.set(pid, Array.from(names).slice(0, 5).join(', '));
        }
      }

      // 2) Object names from request_items via proposal_items
      const { data: riData } = await supabase
        .from('proposal_items')
        .select('proposal_id, request_items:request_items(requests:requests(object_name))')
        .in('proposal_id', ids);

      if (riData && Array.isArray(riData)) {
        const byPid = new Map<string, Set<string>>();
        for (const item of riData as any[]) {
          const pid = String(item.proposal_id || '');
          if (!pid) continue;
          const ri = item.request_items;
          const objNames = Array.isArray(ri) ? ri : (ri ? [ri] : []);
          for (const r of objNames) {
            const req = r?.requests;
            const reqs = Array.isArray(req) ? req : (req ? [req] : []);
            for (const rq of reqs) {
              const name = String(rq?.object_name || '').trim();
              if (name) {
                if (!byPid.has(pid)) byPid.set(pid, new Set());
                byPid.get(pid)!.add(name);
              }
            }
          }
        }
        for (const [pid, names] of byPid) {
          objectNamesMap.set(pid, Array.from(names).join(', '));
        }
      }

      // 3) Supplier name fallback from purchases
      const { data: purchSupplier } = await supabase
        .from('purchases')
        .select('proposal_id, supplier_name')
        .in('proposal_id', ids)
        .not('supplier_name', 'is', null);

      if (purchSupplier && Array.isArray(purchSupplier)) {
        for (const pur of purchSupplier as any[]) {
          const pid = String(pur.proposal_id || '');
          const sn = String(pur.supplier_name || '').trim();
          if (pid && sn) supplierFallbackMap.set(pid, sn);
        }
      }
    } catch (e) {
      console.warn('[listAccountantInbox] item_names/object_names fetch failed:', e);
    }

    return props.map((p: any) => {
      const agg = paidMap.get(String(p.id));
      const totalPaid = agg?.total || 0;
      const invoiceSum = Number(p.invoice_amount ?? p.total_amount ?? 0);

      const raw = String(p.payment_status ?? p.status ?? '').toLowerCase();
      let statusStr = 'К оплате';
      if (raw.startsWith('на доработке')) statusStr = 'На доработке';
      else if (totalPaid <= 0) statusStr = 'К оплате';
      else if (invoiceSum - totalPaid > 0) statusStr = 'Частично оплачено';
      else statusStr = 'Оплачено';

      const pid = String(p.id);
      return {
        proposal_id: pid,
        supplier: p.supplier || supplierFallbackMap.get(pid) || null,
        invoice_number: p.invoice_number || null,
        invoice_date: p.invoice_date || null,
        invoice_amount: invoiceSum > 0 ? invoiceSum : null,
        invoice_currency: p.invoice_currency || 'KGS',
        payment_status: statusStr,
        total_paid: totalPaid,
        payments_count: agg?.count || 0,
        has_invoice: hasInv.has(pid),
        sent_to_accountant_at: p.sent_to_accountant_at || null,
        request_nos: requestNosMap.get(pid) || null,
        item_names: itemNamesMap.get(pid) || null,
        object_names: objectNamesMap.get(pid) || null,
      } as AccountantInboxRow;
    });
  } catch (e: any) {
    console.warn('[listAccountantInbox] fallback error:', parseErr(e));
    return [];
  }
};

/**
 * История платежей бухгалтера.
 */
export const listAccountantPaymentsHistory = async (opts: {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  companyId?: string | null;
}): Promise<any[]> => {
  const { dateFrom, dateTo, search, companyId } = opts;

  try {
    const { data, error } = await supabase.rpc('list_accountant_payments_history', {
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
      p_search: search?.trim() || null,
      p_limit: 300,
    });
    if (!error && Array.isArray(data)) return data as any[];
  } catch {
    // Ignore RPC failure
  }

  if (!companyId) return [];
  try {
    let query = supabase
      .from('proposal_payments')
      .select(`
        id, proposal_id, amount, method, note, paid_at,
        proposals!inner (
          company_id, supplier, invoice_number, invoice_date, invoice_amount, invoice_currency
        )
      `)
      .eq('proposals.company_id', companyId)
      .order('paid_at', { ascending: false })
      .limit(300);

    if (dateFrom) query = query.gte('paid_at', dateFrom + 'T00:00:00');
    if (dateTo) query = query.lte('paid_at', dateTo + 'T23:59:59');

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map((p: any) => ({
      payment_id: p.id,
      paid_at: p.paid_at,
      proposal_id: String(p.proposal_id),
      supplier: p.proposals?.supplier || null,
      invoice_number: p.proposals?.invoice_number || null,
      invoice_date: p.proposals?.invoice_date || null,
      invoice_amount: p.proposals?.invoice_amount || null,
      invoice_currency: p.proposals?.invoice_currency || 'KGS',
      amount: Number(p.amount || 0),
      method: p.method || null,
      note: p.note || null,
    }));

    if (search?.trim()) {
      const s = search.toLowerCase();
      return rows.filter(r =>
        (r.supplier || '').toLowerCase().includes(s) ||
        (r.invoice_number || '').toLowerCase().includes(s)
      );
    }
    return rows;
  } catch (e: any) {
    console.warn('[listAccountantPaymentsHistory] fallback fail:', parseErr(e));
    return [];
  }
};
// >>> added: уведомления для колокольчика бухгалтера/др. ролей
export const notifList = async (role: 'accountant' | 'buyer' | 'director', limit = 20): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, role, title, body, payload, created_at, is_read')
      .eq('role', role)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(100, limit)));
    if (error) throw error;
    return (data ?? []) as any[];
  } catch (e: any) {
    console.warn('[notifList]', parseErr(e));
    return [];
  }
};

export const notifMarkRead = async (role: 'accountant' | 'buyer' | 'director'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true } as any)
      .eq('role', role)
      .eq('is_read', false);
    if (error) throw error;
    return true;
  } catch (e: any) {
    console.warn('[notifMarkRead]', parseErr(e));
    return false;
  }
};

/** 
 * Подписка на уведомления (Realtime).
 */
export function subscribeToNotifications(role: string, onUpdate: (payload: any) => void) {
  const ch = supabase.channel(`notif-${role}-rt`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
      if (payload.new?.role === role) {
        onUpdate(payload.new);
      }
    })
    .subscribe();

  return () => {
    try { supabase.removeChannel(ch); } catch { /* ignored */ }
  };
}

// >>> added: красивый заголовок для предложения (используется снаружи)
export const resolveProposalPrettyTitle = async (proposalId: string | number): Promise<string> => {
  const id = String(proposalId).trim();
  if (!id) return `Предложение #—`;

  try {
    const { data, error } = await supabase.from('v_proposals_display').select('id, display_no').eq('id', id).maybeSingle();
    if (!error && data?.display_no) return `Предложение ${String(data.display_no)}`;
  } catch {
    // Ignore
  }

  try {
    const { data, error } = await supabase.from('proposals').select('id').eq('id', id).maybeSingle();
    if (!error && data?.id) {
      return /^\d+$/.test(id) ? `Предложение #${id}` : `Предложение #${id.slice(0, 8)}`;
    }
  } catch {
    // Ignore
  }

  return /^\d+$/.test(id) ? `Предложение #${id}` : `Предложение #${id.slice(0, 8)}`;
};

export const buildProposalPdfHtmlPretty = async (proposalId: number | string): Promise<string> => {
  return buildProposalPdfHtml(proposalId);
};

// ============================== Aggregated export ==============================
export const RIK_API = {
  rikQuickSearch,
  listRequestItems,
  ensureRequest,
  getDraftRequestId,
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

  // ==== Директор: История ====
  listDirectorHistory,

  // ==== Бухгалтерия (новое) ====
  proposalSendToAccountant,
  accountantAddPayment,
  accountantReturnToBuyer,
  listAccountantInbox,
  listAccountantPaymentsHistory,

  // ==== Поставщики (новое) ====
  listSuppliers,
  upsertSupplier,
  listSupplierFiles,

  // ==== Доп. утилиты (новое) ====
  notifList,
  notifMarkRead,
  resolveProposalPrettyTitle,
  buildProposalPdfHtmlPretty,
};

// ============================== Ref Tables (Levels, Systems, Zones) ==============================
export const listRefs = async (table: 'ref_levels' | 'ref_systems' | 'ref_zones' | 'ref_sectors' | 'ref_object_types' | string): Promise<{ code: string; name: string }[]> => {
  try {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') { // undefined_table or schema cache miss
        console.warn(`[listRefs] Table ${table} does not exist, skipping.`);
        return [];
      }
      console.warn('[listRefs] Error for ' + table + ':', error.message, error.code);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('[listRefs] No data in ' + table);
      return [];
    }

    return data.map((r: any, idx: number) => {
      const code = r.id ?? r.code ?? r.level_id ?? r.system_id ?? r.zone_id ?? String(idx + 1);
      const name = r.name ?? r.title ?? r.label ?? `Item ${idx + 1}`;
      return {
        code: String(code),
        name: String(name)
      };
    });
  } catch (e: any) {
    console.warn('[listRefs] failed for ' + table, parseErr(e));
    return [];
  }
};
