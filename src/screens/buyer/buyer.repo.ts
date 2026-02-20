// src/screens/buyer/buyer.repo.ts
export type PropAttachmentRow = {
  id: string;
  file_name: string;
  url?: string | null;
  group_key?: string | null;
  created_at?: string | null;
};

export async function repoGetLatestProposalPdfAttachment(supabase: any, pidStr: string) {
  const q = await supabase
    .from("proposal_attachments")
    .select("id, file_name")
    .eq("proposal_id", pidStr)
    .eq("group_key", "proposal_pdf")
    .order("created_at", { ascending: false })
    .limit(1);

  if (q.error) throw q.error;
  const row = (q.data && q.data[0]) || null;
  return row ? { id: String(row.id), file_name: String(row.file_name ?? "") } : null;
}

export async function repoGetProposalItemsForAccounting(supabase: any, pidStr: string) {
  const pi = await supabase
    .from("proposal_items")
    .select("supplier, qty, price")
    .eq("proposal_id", pidStr);

  if (pi.error) throw pi.error;
  return Array.isArray(pi.data) ? (pi.data as any[]) : [];
}

export async function repoGetSupplierCardByName(supabase: any, supplierName: string) {
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
export async function repoListProposalAttachments(supabase: any, proposalId: string) {
  const pid = String(proposalId || "").trim();
  if (!pid) return [];

  const q = await supabase
    .from("proposal_attachments")
    // ⚠️ НЕ добавляй сюда несуществующие поля — из-за этого и бывает 400
    .select("id, proposal_id, file_name, url, group_key, created_at, bucket_id, storage_path")
    .eq("proposal_id", pid)
    .order("created_at", { ascending: false });

  if (q.error) throw q.error;

  const raw = (q.data || []) as any[];

  const out: any[] = [];
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
export async function repoGetProposalItemsForView(supabase: any, pidStr: string) {
  const q = await supabase
    .from("proposal_items")
    .select("request_item_id, qty, price, supplier, note")
    .eq("proposal_id", pidStr)
    .order("request_item_id", { ascending: true });

  if (q.error) throw q.error;
  return Array.isArray(q.data) ? q.data : [];
}

export async function repoGetRequestItemsByIds(supabase: any, ids: string[]) {
  const clean = Array.from(new Set((ids || []).map(String).filter(Boolean)));
  if (!clean.length) return [];

  const ri = await supabase
    .from("request_items")
    .select("id, name_human, uom, qty, rik_code, app_code")
    .in("id", clean);

  if (ri.error) throw ri.error;
  return Array.isArray(ri.data) ? ri.data : [];
}
export async function repoGetProposalItemLinks(supabase: any, proposalIds: string[]) {
  const ids = Array.from(new Set((proposalIds || []).map(String).filter(Boolean)));
  if (!ids.length) return [];

  const q = await supabase
    .from("proposal_items")
    .select("proposal_id, request_item_id")
    .in("proposal_id", ids);

  if (q.error) throw q.error;
  return Array.isArray(q.data) ? q.data : [];
}

export async function repoGetRequestItemToRequestMap(supabase: any, requestItemIds: string[]) {
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
  supabase: any,
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
  note?: string | null;
};

export async function repoUpdateProposalItems(
  supabase: any,
  proposalId: string | number,
  rows: RepoProposalItemUpdate[]
) {
  const pid = String(proposalId || "").trim();
  if (!pid) return;
  if (!Array.isArray(rows) || rows.length === 0) return;

  // ✅ 1:1 логика как была: обновляем по одному item (без изменения бизнес-логики)
  for (const r of rows) {
    const rid = String(r?.request_item_id || "").trim();
    if (!rid) continue;

    const upd: any = {
      name_human: r.name_human ?? null,
      uom: r.uom ?? null,
      qty: r.qty ?? null,
      app_code: r.app_code ?? null,
      rik_code: r.rik_code ?? null,
    };

    if (typeof r.price === "number" && Number.isFinite(r.price)) {
      upd.price = r.price;
    }
    if (r.note != null) {
      upd.note = r.note;
    }

    await supabase
      .from("proposal_items")
      .update(upd)
      .eq("proposal_id", pid)
      .eq("request_item_id", rid);
  }
}
