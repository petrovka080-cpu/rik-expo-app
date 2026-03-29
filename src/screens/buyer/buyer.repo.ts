// src/screens/buyer/buyer.repo.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getLatestCanonicalProposalAttachment,
} from "../../lib/api/proposalAttachments.service";

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

export async function repoGetLatestProposalPdfAttachment(supabase: SupabaseClient, pidStr: string) {
  try {
    const latest = await getLatestCanonicalProposalAttachment(supabase, pidStr, "proposal_pdf", {
      screen: "buyer",
    });
    return {
      id: latest.row.attachmentId,
      file_name: latest.row.fileName,
    };
  } catch {
    return null;
  }
}

export async function repoGetProposalItemsForAccounting(supabase: SupabaseClient, pidStr: string) {
  const pi = await supabase
    .from("proposal_items")
    .select("supplier, qty, price")
    .eq("proposal_id", pidStr);

  if (pi.error) throw pi.error;
  return Array.isArray(pi.data) ? (pi.data as ProposalAccountingItemRow[]) : [];
}

export async function repoGetSupplierCardByName(supabase: SupabaseClient, supplierName: string) {
  const name = String(supplierName || "").trim();
  if (!name) return null;

  const cardQ = await supabase
    .from("suppliers")
    .select("name, inn, bank_account, phone, email")
    .ilike("name", name)
    .maybeSingle();

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

  const q = await supabase
    .from("proposal_attachments")
    // ⚠️ НЕ добавляй сюда несуществующие поля — из-за этого и бывает 400
    .select("id, proposal_id, file_name, url, group_key, created_at, bucket_id, storage_path")
    .eq("proposal_id", pid)
    .order("created_at", { ascending: false });

  if (q.error) throw q.error;

  const raw: RawAttachmentRow[] = Array.isArray(q.data) ? q.data : [];

  const out: RepoAttachmentRow[] = [];
  for (const r of raw) {
    let url = String(r?.url || "").trim();

    // ✅ если url нет — делаем signed url по bucket_id/storage_path
    if (!url) {
      const bucket = String(r?.bucket_id || "").trim();
      const path = String(r?.storage_path || "").trim();

      if (bucket && path) {
        try {
          const s = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60); // 1h
          url = String(s?.data?.signedUrl || "").trim();
        } catch {}
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
export async function repoGetProposalItemsForView(supabase: SupabaseClient, pidStr: string) {
  const q = await supabase
    .from("proposal_items")
    .select("request_item_id, qty, price, supplier, note")
    .eq("proposal_id", pidStr)
    .order("request_item_id", { ascending: true });

  if (q.error) throw q.error;
  return Array.isArray(q.data) ? q.data : [];
}

export async function repoGetRequestItemsByIds(supabase: SupabaseClient, ids: string[]) {
  const clean = Array.from(new Set((ids || []).map(String).filter(Boolean)));
  if (!clean.length) return [];

  const ri = await supabase
    .from("request_items")
    .select("id, name_human, uom, qty, rik_code, app_code")
    .in("id", clean);

  if (ri.error) throw ri.error;
  return Array.isArray(ri.data) ? ri.data : [];
}
export async function repoGetProposalItemLinks(supabase: SupabaseClient, proposalIds: string[]) {
  const ids = Array.from(new Set((proposalIds || []).map(String).filter(Boolean)));
  if (!ids.length) return [];

  const q = await supabase
    .from("proposal_items")
    .select("proposal_id, request_item_id")
    .in("proposal_id", ids);

  if (q.error) throw q.error;
  return Array.isArray(q.data) ? q.data : [];
}

export async function repoGetRequestItemToRequestMap(supabase: SupabaseClient, requestItemIds: string[]) {
  const ids = Array.from(new Set((requestItemIds || []).map(String).filter(Boolean)));
  if (!ids.length) return [];

  const q = await supabase
    .from("request_items")
    .select("id, request_id")
    .in("id", ids);

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
