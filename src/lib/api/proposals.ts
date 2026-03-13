import { supabase } from "../supabaseClient";
import type { Database } from "../database.types";
import { client, toRpcId } from "./_core";
import type { ProposalItemRow } from "./types";

const logProposalsDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

type ProposalRow = Pick<
  Database["public"]["Tables"]["proposals"]["Row"],
  "id" | "proposal_no" | "id_short"
>;
type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];
type ProposalItemInsert = Database["public"]["Tables"]["proposal_items"]["Insert"];
type ProposalItemTableRow = Pick<
  Database["public"]["Tables"]["proposal_items"]["Row"],
  "id" | "name_human" | "uom" | "qty" | "app_code" | "rik_code"
>;
type ProposalItemViewRow = Database["public"]["Views"]["proposal_items_view"]["Row"];
type ProposalSnapshotItemRow = Database["public"]["Views"]["proposal_snapshot_items"]["Row"];
type ProposalCreateRpcRow = { id: string | number };
type ProposalPendingRpcRow = { id: string | number; submitted_at: string | null };
type ProposalItemsRpcRow = {
  id: number | null;
  rik_code: string | null;
  name_human: string | null;
  uom: string | null;
  app_code: string | null;
  total_qty: number | null;
};

function getObjectField<T>(value: unknown, key: string): T | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;
  return (value as Record<string, unknown>)[key] as T;
}

function normalizeProposalMeta(row: ProposalRow | null | undefined, fallbackId: string) {
  return {
    id: String(row?.id ?? fallbackId),
    proposal_no: row?.proposal_no ?? null,
    id_short: row?.id_short ?? null,
  };
}

function normalizeProposalItems(rows: ProposalItemsRpcRow[]): ProposalItemRow[] {
  return rows.map((r, i) => ({
    id: Number(r.id ?? i),
    rik_code: r.rik_code ?? null,
    name_human: String(r.name_human ?? ""),
    uom: r.uom ?? null,
    app_code: r.app_code ?? null,
    total_qty: Number(r.total_qty ?? 0),
  }));
}

function aggregateTableProposalItems(rows: ProposalItemTableRow[]): ProposalItemRow[] {
  const key = (r: ProposalItemTableRow) =>
    [String(r.name_human ?? ""), String(r.uom ?? ""), String(r.app_code ?? ""), String(r.rik_code ?? "")].join("||");

  const agg = new Map<
    string,
    { id: number; name_human: string; uom: string | null; app_code: string | null; rik_code: string | null; total_qty: number }
  >();

  rows.forEach((r, i) => {
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

  return Array.from(agg.values());
}

async function runProposalSubmitRpc(proposalId: string) {
  return client.rpc("proposal_submit", {
    p_proposal_id: proposalId as never,
  });
}

export async function proposalCreateFull(): Promise<{ id: string; proposal_no: string | null; id_short: number | null }> {
  try {
    const { data, error } = await client.rpc("proposal_create");
    if (!error && data != null) {
      const id = String(getObjectField<string | number>(data, "id") ?? data);
      const q = await client
        .from("proposals")
        .select("id,proposal_no,id_short")
        .eq("id", id)
        .maybeSingle();

      return normalizeProposalMeta(q.data, id);
    }
  } catch {}

  const insertPayload: ProposalInsert = {};
  const ins = await client.from("proposals").insert(insertPayload).select("id,proposal_no,id_short").single();
  if (ins.error) throw ins.error;

  return normalizeProposalMeta(ins.data, "");
}

export async function proposalCreate(): Promise<number | string> {
  const created = await proposalCreateFull();
  return created.id;
}

export async function proposalAddItems(proposalId: number | string, requestItemIds: string[]) {
  const proposalIdText = String(proposalId);
  try {
    const { data, error } = await client.rpc("proposal_add_items", {
      p_proposal_id: toRpcId(proposalId),
      p_request_item_ids: requestItemIds,
    });
    if (error) throw error;
    return Number(data ?? 0);
  } catch {
    let ok = 0;
    for (const requestItemId of requestItemIds) {
      try {
        const payload: ProposalItemInsert = {
          proposal_id: proposalIdText,
          proposal_id_text: proposalIdText,
          request_item_id: requestItemId,
        };
        const ins = await client.from("proposal_items").insert(payload).select("id").single();
        if (!ins.error) ok++;
        else logProposalsDebug("[proposalAddItems/fallback/insert]", ins.error.message);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logProposalsDebug("[proposalAddItems/fallback/insert ex]", msg);
      }
    }
    return ok;
  }
}

export async function proposalSubmit(proposalId: number | string) {
  const pid = String(proposalId);

  try {
    const { error } = await runProposalSubmitRpc(pid);
    if (error) throw error;
  } catch {
    const upd = await client
      .from("proposals")
      .update({ status: "РќР° СѓС‚РІРµСЂР¶РґРµРЅРёРё", submitted_at: new Date().toISOString() })
      .eq("id", pid)
      .select("id")
      .maybeSingle();
    if (upd.error) throw upd.error;
    if (!upd.data?.id) return 0;
  }

  await client
    .from("proposals")
    .update({ payment_status: null, sent_to_accountant_at: null })
    .eq("id", pid);

  return 1;
}

export async function listDirectorProposalsPending(): Promise<Array<{ id: string; submitted_at: string | null }>> {
  const rowsFromTable = await client
    .from("proposals")
    .select("id, submitted_at")
    .eq("status", "РќР° СѓС‚РІРµСЂР¶РґРµРЅРёРё")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  if (rowsFromTable.error || !rowsFromTable.data) {
    try {
      const rpc = await client.rpc("list_director_proposals_pending");
      if (!rpc.error && Array.isArray(rpc.data)) {
        return (rpc.data as ProposalPendingRpcRow[])
          .map((x) => ({ id: String(x.id), submitted_at: x.submitted_at ?? null }))
          .filter((x) => x.submitted_at != null);
      }
    } catch {}
    logProposalsDebug("[listDirectorProposalsPending] error:", rowsFromTable.error?.message);
    return [];
  }

  return rowsFromTable.data
    .map((x) => ({ id: String(x.id), submitted_at: x.submitted_at ?? null }))
    .filter((x) => x.submitted_at != null);
}

export async function proposalItems(proposalId: string | number): Promise<ProposalItemRow[]> {
  const pid = String(proposalId);

  try {
    const q = await client
      .from("proposal_items")
      .select("id, name_human, uom, qty, app_code, rik_code")
      .eq("proposal_id", pid)
      .order("id", { ascending: true });

    if (!q.error && Array.isArray(q.data) && q.data.length) {
      return aggregateTableProposalItems(q.data as ProposalItemTableRow[]);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logProposalsDebug("[proposalItems/table]", msg);
  }

  try {
    const snap = await client
      .from("proposal_snapshot_items")
      .select("id, rik_code, name_human, uom, app_code, total_qty")
      .eq("proposal_id", pid)
      .order("id", { ascending: true });
    if (!snap.error && Array.isArray(snap.data) && snap.data.length) {
      return normalizeProposalItems(snap.data as ProposalSnapshotItemRow[] as ProposalItemsRpcRow[]);
    }
  } catch {}

  try {
    const view = await client
      .from("proposal_items_view")
      .select("id, rik_code, name_human, uom, app_code, total_qty")
      .eq("proposal_id", pid)
      .order("id", { ascending: true });
    if (!view.error && Array.isArray(view.data) && view.data.length) {
      return normalizeProposalItems(view.data as ProposalItemViewRow[] as ProposalItemsRpcRow[]);
    }
  } catch {}

  try {
    const r = await supabase.rpc("proposal_items_for_web", { p_id: pid });
    if (!r.error && Array.isArray(r.data) && r.data.length) {
      return normalizeProposalItems(r.data as ProposalItemsRpcRow[]);
    }
  } catch {}

  return [];
}

export async function proposalSnapshotItems(
  proposalId: number | string,
  metaRows: { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null }[] = [],
) {
  const { error } = await client.rpc("proposal_items_snapshot", {
    p_proposal_id: String(proposalId),
    p_meta: metaRows,
  });

  if (error) throw error;
  return true;
}

export async function proposalSetItemsMeta(
  _proposalId: number | string,
  _rows: { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null },
) {
  return true;
}
