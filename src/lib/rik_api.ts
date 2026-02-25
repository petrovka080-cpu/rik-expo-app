// src/lib/rik_api.ts — боевой минимальный API (стабильно, без спорных SELECT'ов)
import { supabase } from './supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  proposalCreate,
  proposalAddItems,
  proposalSubmit,
  listDirectorProposalsPending,
  proposalItems,
  proposalSnapshotItems,
  proposalSetItemsMeta
} from "./api/proposals";
import {
  buildRequestPdfHtml,
  exportRequestPdf,
  resolveRequestLabel,
  batchResolveRequestLabels
} from "./api/pdf_request";

import {
  buildProposalPdfHtml,
  exportProposalPdf
} from "./api/pdf_proposal";

import { buildPaymentOrderHtml, exportPaymentOrderPdf } from "./api/pdf_payment";
import {
  listPending,
  approve,
  reject,
  directorReturnToBuyer,
  listDirectorInbox
} from "./api/director";

// ✅ локальные импорты, чтобы можно было использовать в RIK_API
import { rikQuickSearch } from "./api/rik";
import { listSuppliers, upsertSupplier, listSupplierFiles } from "./api/suppliers";
import { notifList, notifMarkRead } from "./api/notifications";
import { ensureMyProfile, getMyRole } from "./api/profile";
import {
  proposalSendToAccountant,
  accountantAddPayment,
  accountantReturnToBuyer,
  listAccountantInbox
} from "./api/accountant";
import { uploadProposalAttachment } from "./api/storage";
import { listBuyerInbox, listBuyerProposalsByStatus } from "./api/buyer";

import {
  openHtmlAsPdfUniversal
} from "./api/pdf";
import {
  listRequestItems,
  requestCreateDraft,
  ensureRequestSmart,
  getOrCreateDraftRequestId,
  clearCachedDraftRequestId,
  ensureRequest,
  addRequestItemFromRik,
  requestSubmit
} from "./api/requests";


export { buildProposalPdfHtml, exportProposalPdf
};

export {
  proposalSendToAccountant,
  accountantAddPayment,
  accountantReturnToBuyer,
  listAccountantInbox
};
export { uploadProposalAttachment };
export {
  openHtmlAsPdfUniversal
};
export {
  listRequestItems,
  requestCreateDraft,
  ensureRequestSmart,
  getOrCreateDraftRequestId,
  clearCachedDraftRequestId,
  ensureRequest,
  addRequestItemFromRik,
  requestSubmit
};
export { listPending, approve, reject, directorReturnToBuyer, listDirectorInbox };
export { listBuyerInbox, listBuyerProposalsByStatus };
export {
  proposalCreate,
  proposalAddItems,
  proposalSubmit,
  listDirectorProposalsPending,
  proposalItems,
  proposalSnapshotItems,
  proposalSetItemsMeta
};
export {
  buildRequestPdfHtml,
  exportRequestPdf,
  resolveRequestLabel,
  batchResolveRequestLabels
};

export { buildPaymentOrderHtml, exportPaymentOrderPdf };

// ✅ внешние экспорты (чтобы экраны могли импортить как раньше)
export { rikQuickSearch };
export { listSuppliers, upsertSupplier, listSupplierFiles };
export { notifList, notifMarkRead };
export { ensureMyProfile, getMyRole };

// --- utils: normalize UUID (убираем # и валидируем) ---а
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


const toFilterId = (v: number | string) => {
  const raw = String(v ?? '').trim().replace(/^#/, '');
  if (!raw) return null;

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // ✅ UUID пропускаем
  if (uuidRe.test(raw)) return raw;

  // ❌ чистые цифры — запрещаем (это и есть твои 1766... Date.now())
  if (/^\d+$/.test(raw)) return null;

  // ❌ всё остальное как id тоже не принимаем
  return null;
};


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

  // ==== PDF Proposal (как было) ====
  exportProposalPdf,
  buildProposalPdfHtml,

  // ==== PDF Requests / Payments (вынесено в api) ====
  exportRequestPdf,
  buildRequestPdfHtml,
  resolveRequestLabel,
  batchResolveRequestLabels,
  exportPaymentOrderPdf,
  buildPaymentOrderHtml,

  listDirectorInbox,
  proposalDecide,
  ensureMyProfile,
  getMyRole,

  proposalSendToAccountant,
  accountantAddPayment,
  accountantReturnToBuyer,
  listAccountantInbox,

  listSuppliers,
  upsertSupplier,
  listSupplierFiles,

  notifList,
  notifMarkRead
};
 