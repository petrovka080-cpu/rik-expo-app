import { supabase } from "../supabaseClient";
import { client, toRpcId } from "./_core";
import type { ProposalItemRow } from "./types";

// ✅ NEW: full create (returns id + numbers)
export async function proposalCreateFull(): Promise<{ id: string; proposal_no: string | null; id_short: number | null }> {
  // 1) RPC
  try {
    const { data, error } = await client.rpc("proposal_create");
    if (!error && data != null) {
      const id =
        typeof data === "object" && data && "id" in (data as any)
          ? String((data as any).id)
          : String(data);

      const q = await client
        .from("proposals")
        .select("id,proposal_no,id_short")
        .eq("id", id)
        .maybeSingle();

      return {
        id,
        proposal_no: (q.data as any)?.proposal_no ?? null,
        id_short: (q.data as any)?.id_short ?? null,
      };
    }
  } catch {}

  // 2) fallback INSERT
  const ins = await client.from("proposals").insert({}).select("id,proposal_no,id_short").single();
  if (ins.error) throw ins.error;

  return {
    id: String((ins.data as any)?.id),
    proposal_no: (ins.data as any)?.proposal_no ?? null,
    id_short: (ins.data as any)?.id_short ?? null,
  };
}

// ✅ KEEP: old API (returns only id)
export async function proposalCreate(): Promise<number | string> {
  const created = await proposalCreateFull();
  return created.id;
}

export async function proposalAddItems(proposalId: number | string, requestItemIds: string[]) {
  try {
    const { data, error } = await client.rpc("proposal_add_items", {
      p_proposal_id: String(proposalId),
      p_request_item_ids: requestItemIds,
    } as any);
    if (error) throw error;
    return Number(data ?? 0);
  } catch (_) {
    // fallback insert по одному
    let ok = 0;
    for (const id of requestItemIds) {
      try {
        const ins = await client
          .from("proposal_items")
          .insert({ proposal_id: String(proposalId), request_item_id: id } as any)
          .select("id")
          .single();
        if (!ins.error) ok++;
        else console.warn("[proposalAddItems/fallback/insert]", ins.error.message);
      } catch (e: any) {
        console.warn("[proposalAddItems/fallback/insert ex]", e?.message ?? e);
      }
    }
    return ok;
  }
}

export async function proposalSubmit(proposalId: number | string) {
  const pid = String(proposalId);

  // 1) RPC
  try {
    const { error } = await client.rpc("proposal_submit", { p_proposal_id: toRpcId(proposalId) } as any);
    if (error) throw error;
  } catch {
    // 2) fallback UPDATE
    const upd = await client
      .from("proposals")
      .update({ status: "На утверждении", submitted_at: new Date().toISOString() } as any)
      .eq("id", proposalId)
      .select("id")
      .maybeSingle();
    if (upd.error) throw upd.error;
    if (!upd.data?.id) return 0;
  }

  // 3) мини-фикс: гасим след бухгалтера
  await client
    .from("proposals")
    .update({ payment_status: null, sent_to_accountant_at: null } as any)
    .eq("id", pid);

  return 1;
}

export async function listDirectorProposalsPending(): Promise<Array<{ id: string; submitted_at: string | null }>> {
  let r = await client
    .from("proposals")
    .select("id, submitted_at")
    .eq("status", "На утверждении")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  if (r.error || !r.data) {
    try {
      const rpc = await client.rpc("list_director_proposals_pending", {} as any);
      if (!rpc.error && rpc.data) {
        return (rpc.data as any[])
          .map((x) => ({ id: String(x.id), submitted_at: x.submitted_at ?? null }))
          .filter((x) => x.submitted_at != null);
      }
    } catch {}
    console.warn("[listDirectorProposalsPending] error:", r.error?.message);
    return [];
  }

  return (r.data || [])
    .map((x: any) => ({ id: String(x.id), submitted_at: x.submitted_at ?? null }))
    .filter((x) => x.submitted_at != null);
}

export async function proposalItems(proposalId: string | number): Promise<ProposalItemRow[]> {
  const pid = String(proposalId);
  let rows: any[] = [];

  // 1) table
  try {
    const q = await client
      .from("proposal_items")
      .select("id, name_human, uom, qty, app_code, rik_code")
      .eq("proposal_id", pid)
      .order("id", { ascending: true });

    if (!q.error && Array.isArray(q.data) && q.data.length) {
      const key = (r: any) =>
        [String(r.name_human ?? ""), String(r.uom ?? ""), String(r.app_code ?? ""), String(r.rik_code ?? "")].join("||");

      const agg = new Map<
        string,
        { id: number; name_human: string; uom: string | null; app_code: string | null; rik_code: string | null; total_qty: number }
      >();

      (q.data as any[]).forEach((r: any, i: number) => {
        const k = key(r);
        const prev = agg.get(k);
        agg.set(k, {
          id: prev?.id ?? Number(r.id ?? i),
          name_human: String(r.name_human ?? ""),
          uom: r.uom ?? null,
          app_code: r.app_code ?? null,
          rik_code: r.rik_code ?? null,
          total_qty: (prev?.total_qty ?? 0) + Number(r.qty ?? 0),
        });
      });

      rows = Array.from(agg.values());
    }
  } catch (e) {
    console.warn("[proposalItems/table]", (e as any)?.message ?? e);
  }

  // 2) snapshot
  if (!rows.length) {
    try {
      const snap = await client
        .from("proposal_snapshot_items")
        .select("id, rik_code, name_human, uom, app_code, total_qty")
        .eq("proposal_id", pid)
        .order("id", { ascending: true });
      if (!snap.error && snap.data?.length) rows = snap.data as any[];
    } catch {}
  }

  // 3) view
  if (!rows.length) {
    try {
      const view = await client
        .from("proposal_items_view")
        .select("id, rik_code, name_human, uom, app_code, total_qty")
        .eq("proposal_id", pid)
        .order("id", { ascending: true });
      if (!view.error && view.data?.length) rows = view.data as any[];
    } catch {}
  }

  // 4) rpc
  if (!rows.length) {
    try {
      const r = await supabase.rpc("proposal_items_for_web", { p_id: pid } as any);
      if (!r.error && r.data?.length) rows = r.data as any[];
    } catch {}
  }

  return (rows || []).map((r: any, i: number) => ({
    id: Number(r.id ?? i),
    rik_code: r.rik_code ?? null,
    name_human: r.name_human ?? "",
    uom: r.uom ?? null,
    app_code: r.app_code ?? null,
    total_qty: Number(r.total_qty ?? r.qty ?? 0),
  }));
}

export async function proposalSnapshotItems(
  proposalId: number | string,
  metaRows: { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null }[] = []
) {
  const { error } = await client.rpc("proposal_items_snapshot", {
    p_proposal_id: String(proposalId),
    p_meta: metaRows,
  } as any);

  if (error) throw error;
  return true;
}

// оставляем как было (пока заглушка)
export async function proposalSetItemsMeta(
  _proposalId: number | string,
  _rows: { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null }
) {
  return true;
}
