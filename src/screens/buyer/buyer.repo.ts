// src/screens/buyer/buyer.repo.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";
import {
  getLatestCanonicalProposalAttachment,
  listCanonicalProposalAttachments,
  toProposalAttachmentLegacyRow,
} from "../../lib/api/proposalAttachments.service";
import { ensureProposalRequestItemsIntegrity } from "../../lib/api/integrity.guards";
import {
  isProposalRequestItemIntegrityRpcResponse,
  type ProposalRequestItemIntegrityRow,
} from "../../lib/api/proposalIntegrity";
import { validateRpcResponse } from "../../lib/api/queryBoundary";
import { callProposalRequestItemIntegrityRpc } from "../../lib/api/integrity.guards.transport";
import { loadPagedRowsWithCeiling, type PageInput, type PagedQuery } from "../../lib/api/_core";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import { applySupabaseAbortSignal, throwIfAborted } from "../../lib/requestCancellation";
import { createBuyerProposalAttachmentSignedUrl } from "./buyer.repo.storage.transport";

export type PropAttachmentRow = {
  id: string;
  file_name: string;
  url?: string | null;
  group_key?: string | null;
  created_at?: string | null;
};
type ProposalAccountingItemRow = {
  supplier?: string | null;
  qty?: number | null;
  price?: number | null;
};
type RawAttachmentRow = {
  id?: string | number | null;
  file_name?: string | null;
  url?: string | null;
  group_key?: string | null;
  created_at?: string | null;
  bucket_id?: string | null;
  storage_path?: string | null;
};
export type RepoAttachmentRow = PropAttachmentRow & {
  bucket_id?: string | null;
  storage_path?: string | null;
};

const BUYER_REPO_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 };

async function loadPagedBuyerRepoRows<T>(
  queryFactory: () => PagedQuery<T>,
  pageInput?: PageInput,
): Promise<{ data: T[] | null; error: unknown | null }> {
  return loadPagedRowsWithCeiling(queryFactory, BUYER_REPO_LIST_PAGE_DEFAULTS, pageInput);
}

export async function repoGetLatestProposalPdfAttachment(supabase: SupabaseClient, pidStr: string) {
  try {
    const latest = await getLatestCanonicalProposalAttachment(supabase, pidStr, "proposal_pdf", {
      screen: "buyer",
    });
    return {
      id: latest.row.attachmentId,
      file_name: latest.row.fileName,
    };
  } catch (error) {
    recordCatchDiscipline({
      screen: "buyer",
      surface: "buyer_repo",
      event: "latest_proposal_pdf_attachment_lookup_failed",
      kind: "degraded_fallback",
      error,
      sourceKind: "canonical:proposal_attachments",
      errorStage: "load_latest_pdf_attachment",
      extra: {
        proposalId: pidStr,
      },
    });
    return null;
  }
}

export async function repoGetProposalItemsForAccounting(
  supabase: SupabaseClient,
  pidStr: string,
  options?: { signal?: AbortSignal | null },
) {
  throwIfAborted(options?.signal);
  const pi = await loadPagedBuyerRepoRows(() =>
    applySupabaseAbortSignal(
      supabase
        .from("proposal_items")
        .select("supplier, qty, price")
        .eq("proposal_id", pidStr)
        .order("id", { ascending: true }),
      options?.signal,
    ),
  );
  throwIfAborted(options?.signal);

  if (pi.error) throw pi.error;
  return Array.isArray(pi.data) ? (pi.data as ProposalAccountingItemRow[]) : [];
}

export async function repoGetSupplierCardByName(
  supabase: SupabaseClient,
  supplierName: string,
  options?: { signal?: AbortSignal | null },
) {
  const name = String(supplierName || "").trim();
  if (!name) return null;

  throwIfAborted(options?.signal);
  const cardQ = await applySupabaseAbortSignal(
    supabase
      .from("suppliers")
      .select("name, inn, bank_account, phone, email")
      .ilike("name", name)
      .maybeSingle(),
    options?.signal,
  );
  throwIfAborted(options?.signal);

  if (cardQ.error) return { name }; // 1:1 fallback как у тебя
  const d = cardQ.data || null;
  if (!d) return { name };

  return {
    name: d.name || name,
    inn: d.inn || null,
    bank_account: d.bank_account || null,
    phone: d.phone || null,
    email: d.email || null,
  };
}

// ✅ PROD: attachments list with signed url fallback (как в director.tsx)
export async function repoListProposalAttachments(supabase: SupabaseClient, proposalId: string) {
  const pid = String(proposalId || "").trim();
  if (!pid) return [];

  const result = await listCanonicalProposalAttachments(supabase, pid, { screen: "buyer" });
  const raw: RawAttachmentRow[] = result.rows.map((row) => toProposalAttachmentLegacyRow(row));

  const out: RepoAttachmentRow[] = [];
  for (const r of raw) {
    let url = String(r?.url || "").trim();

    // ✅ если url нет — делаем signed url по bucket_id/storage_path
    if (!url) {
      const bucket = String(r?.bucket_id || "").trim();
      const path = String(r?.storage_path || "").trim();

      if (bucket && path) {
        try {
          const s = await createBuyerProposalAttachmentSignedUrl({
            supabase,
            bucketId: bucket,
            storagePath: path,
            expiresInSeconds: 60 * 60,
          });
          url = String(s?.data?.signedUrl || "").trim();
        } catch (error) {
          recordCatchDiscipline({
            screen: "buyer",
            surface: "buyer_repo",
            event: "proposal_attachment_signed_url_failed",
            kind: "degraded_fallback",
            error,
            sourceKind: "supabase:storage_signed_url",
            errorStage: "create_signed_url",
            extra: {
              proposalId: pid,
              attachmentId: String(r?.id ?? ""),
              bucket,
              storagePath: path,
            },
          });
        }
      }
    }

    out.push({
      id: String(r?.id ?? ""),
      file_name: String(r?.file_name ?? "file"),
      group_key: r?.group_key ?? null,
      created_at: r?.created_at ?? null,
      url: url || null,
      bucket_id: r?.bucket_id ?? null,
      storage_path: r?.storage_path ?? null,
    });
  }

  return out;
}
export async function repoGetProposalItemsForView(
  supabase: SupabaseClient,
  pidStr: string,
  pageInput?: PageInput,
) {
  const q = await loadPagedBuyerRepoRows(() =>
    supabase
      .from("proposal_items")
      .select("request_item_id, name_human, uom, qty, rik_code, app_code, price, supplier, note")
      .eq("proposal_id", pidStr)
      .order("request_item_id", { ascending: true }),
    pageInput,
  );

  if (q.error) throw q.error;
  return Array.isArray(q.data) ? q.data : [];
}

export async function repoGetRequestItemsByIds(supabase: SupabaseClient, ids: string[]) {
  const clean = Array.from(new Set((ids || []).map(String).filter(Boolean)));
  if (!clean.length) return [];

  const ri = await loadPagedBuyerRepoRows(() =>
    supabase
      .from("request_items")
      .select("id, name_human, uom, qty, rik_code, app_code, status, cancelled_at")
      .in("id", clean)
      .order("id", { ascending: true }),
  );

  if (ri.error) throw ri.error;
  return Array.isArray(ri.data) ? ri.data : [];
}

export async function repoGetProposalRequestItemIntegrity(
  supabase: SupabaseClient<Database>,
  proposalId: string,
) {
  const pid = String(proposalId || "").trim();
  if (!pid) return [] as ProposalRequestItemIntegrityRow[];

  const rpc = await callProposalRequestItemIntegrityRpc(supabase, pid);
  if (rpc.error) throw rpc.error;

  const validated = validateRpcResponse(rpc.data, isProposalRequestItemIntegrityRpcResponse, {
    rpcName: "proposal_request_item_integrity_v1",
    caller: "src/screens/buyer/buyer.repo.repoGetProposalRequestItemIntegrity",
    domain: "buyer",
  });

  return validated
        .map((row) => ({
          proposal_id: String(row.proposal_id ?? "").trim(),
          proposal_item_id: Number(row.proposal_item_id ?? 0),
          request_item_id: String(row.request_item_id ?? "").trim(),
          integrity_state:
            row.integrity_state === "source_cancelled" || row.integrity_state === "source_missing"
              ? row.integrity_state
              : "active",
          integrity_reason:
            row.integrity_reason === "request_item_cancelled" ||
            row.integrity_reason === "request_item_missing"
              ? row.integrity_reason
              : null,
          request_item_exists: row.request_item_exists === true,
          request_item_status:
            row.request_item_status == null ? null : String(row.request_item_status),
          request_item_cancelled_at:
            row.request_item_cancelled_at == null
              ? null
              : String(row.request_item_cancelled_at),
        }))
        .filter((row) => row.request_item_id);
}
export async function repoGetProposalItemLinks(
  supabase: SupabaseClient,
  proposalIds: string[],
  pageInput?: PageInput,
) {
  const ids = Array.from(new Set((proposalIds || []).map(String).filter(Boolean)));
  if (!ids.length) return [];

  const q = await loadPagedBuyerRepoRows(() =>
    supabase
      .from("proposal_items")
      .select("proposal_id, request_item_id")
      .in("proposal_id", ids)
      .order("proposal_id", { ascending: true })
      .order("request_item_id", { ascending: true }),
    pageInput,
  );

  if (q.error) throw q.error;
  return Array.isArray(q.data) ? q.data : [];
}

export async function repoGetRequestItemToRequestMap(
  supabase: SupabaseClient,
  requestItemIds: string[],
  pageInput?: PageInput,
) {
  const ids = Array.from(new Set((requestItemIds || []).map(String).filter(Boolean)));
  if (!ids.length) return [];

  const q = await loadPagedBuyerRepoRows(() =>
    supabase
      .from("request_items")
      .select("id, request_id")
      .in("id", ids)
      .order("id", { ascending: true }),
    pageInput,
  );

  if (q.error) throw q.error;
  return Array.isArray(q.data) ? q.data : [];
}
// ================================
// buyer.repo.ts — write ops (PROD)
// ================================
export async function repoSetProposalBuyerFio(
  supabase: SupabaseClient,
  propId: string | number,
  fio: string
) {
  const pid = String(propId || "").trim();
  if (!pid) return;

  await supabase
    .from("proposals")
    .update({ buyer_fio: fio })
    .eq("id", pid);
}

export type RepoProposalItemUpdate = {
  request_item_id: string;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  app_code?: string | null;
  rik_code?: string | null;
  price?: number | null;
  supplier?: string | null;
  note?: string | null;
};

type ProposalItemBulkMutationRow = {
  proposal_id: string;
  request_item_id: string;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  app_code?: string | null;
  rik_code?: string | null;
  price?: number | null;
  supplier?: string | null;
  note?: string | null;
};

let proposalItemsBulkUpsertAvailable: boolean | null = null;

const chunkRows = <T,>(rows: T[], size: number): T[][] => {
  if (size <= 0) return [rows];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

const buildProposalItemMutationPayload = (
  proposalId: string,
  row: RepoProposalItemUpdate,
): ProposalItemBulkMutationRow | null => {
  const requestItemId = String(row?.request_item_id || "").trim();
  if (!proposalId || !requestItemId) return null;

  const payload: ProposalItemBulkMutationRow = {
    proposal_id: proposalId,
    request_item_id: requestItemId,
  };

  if ("name_human" in row) payload.name_human = row.name_human ?? null;
  if ("uom" in row) payload.uom = row.uom ?? null;
  if ("qty" in row) payload.qty = row.qty ?? null;
  if ("app_code" in row) payload.app_code = row.app_code ?? null;
  if ("rik_code" in row) payload.rik_code = row.rik_code ?? null;
  if (typeof row.price === "number" && Number.isFinite(row.price)) payload.price = row.price;
  if ("supplier" in row) payload.supplier = row.supplier ?? null;
  if ("note" in row) payload.note = row.note ?? null;

  return payload;
};

export async function repoUpdateProposalItems(
  supabase: SupabaseClient,
  proposalId: string | number,
  rows: RepoProposalItemUpdate[]
) {
  const pid = String(proposalId || "").trim();
  if (!pid) return;
  if (!Array.isArray(rows) || rows.length === 0) return;

  const payloads = rows
    .map((row) => buildProposalItemMutationPayload(pid, row))
    .filter((row): row is ProposalItemBulkMutationRow => !!row);

  if (!payloads.length) return;

  await ensureProposalRequestItemsIntegrity(supabase, pid, payloads.map((row) => row.request_item_id), {
    screen: "buyer",
    surface: "repo_update_proposal_items",
    sourceKind: "mutation:proposal_items_repo",
  });

  if (proposalItemsBulkUpsertAvailable !== false) {
    try {
      for (const pack of chunkRows(payloads, 100)) {
        const { error } = await supabase
          .from("proposal_items")
          .upsert(pack, { onConflict: "proposal_id,request_item_id" });
        if (error) throw error;
      }
      proposalItemsBulkUpsertAvailable = true;
      return;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e ?? "");
      recordCatchDiscipline({
        screen: "buyer",
        surface: "buyer_repo",
        event: "proposal_items_bulk_upsert_failed",
        kind: "degraded_fallback",
        error: e,
        sourceKind: "table:proposal_items",
        errorStage: "bulk_upsert",
        extra: {
          proposalId: pid,
          rowCount: payloads.length,
        },
      });
      if (__DEV__) {
        console.warn("[buyer.repo] proposal_items bulk upsert fallback:", message);
      }
      if (
        message.toLowerCase().includes("no unique") ||
        message.toLowerCase().includes("on conflict") ||
        message.toLowerCase().includes("constraint")
      ) {
        proposalItemsBulkUpsertAvailable = false;
      }
    }
  }

  // ✅ 1:1 логика как была: обновляем по одному item (без изменения бизнес-логики)
  for (const r of rows) {
    const rid = String(r?.request_item_id || "").trim();
    if (!rid) continue;

    const upd: {
      name_human?: string | null;
      uom?: string | null;
      qty?: number | null;
      app_code?: string | null;
      rik_code?: string | null;
      price?: number;
      supplier?: string | null;
      note?: string | null;
    } = {};

    if ("name_human" in r) upd.name_human = r.name_human ?? null;
    if ("uom" in r) upd.uom = r.uom ?? null;
    if ("qty" in r) upd.qty = r.qty ?? null;
    if ("app_code" in r) upd.app_code = r.app_code ?? null;
    if ("rik_code" in r) upd.rik_code = r.rik_code ?? null;
    if (typeof r.price === "number" && Number.isFinite(r.price)) upd.price = r.price;
    if ("supplier" in r) upd.supplier = r.supplier ?? null;
    if ("note" in r) upd.note = r.note ?? null;

    if (!Object.keys(upd).length) continue;

    await supabase
      .from("proposal_items")
      .update(upd)
      .eq("proposal_id", pid)
      .eq("request_item_id", rid);
  }
}
