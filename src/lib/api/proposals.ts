import { supabase } from "../supabaseClient";
import type { Database } from "../database.types";
import { client } from "./_core";
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
type ProposalCreateRpcResult = Database["public"]["Functions"]["proposal_create"]["Returns"];
type ProposalCreateCompatRow = { id: string | number };
type ProposalPendingRpcRow = { id: string | number; submitted_at: string | null };
type ProposalItemsRpcRow = {
  id: number | null;
  rik_code: string | null;
  name_human: string | null;
  uom: string | null;
  app_code: string | null;
  total_qty: number | null;
};
type ProposalAddItemsRpcArgsCompat =
  | { p_proposal_id: number; p_request_item_ids: string[] }
  | { p_proposal_id: string; p_request_item_ids: string[] }
  | { p_proposal_id_text: string; p_request_item_ids: string[] };
type ProposalAddItemsRpcResult = Database["public"]["Functions"]["proposal_add_items"]["Returns"];
type ProposalSubmitRpcArgsCompat = { p_proposal_id: string };
type ProposalItemsSnapshotRpcArgs = Database["public"]["Functions"]["proposal_items_snapshot"]["Args"];
type ProposalMutationMetaRow = {
  request_item_id: string;
  price?: string | null;
  supplier?: string | null;
  note?: string | null;
};

const PROPOSAL_STATUS_PENDING = "На утверждении";

const PROPOSAL_STATUS_PENDING_CANONICAL = "\u041d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438";

// ============================== Boundary parsers ==============================
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

function buildProposalCreateFallbackInsert(): ProposalInsert {
  return {};
}

function parseProposalCreateResult(data: ProposalCreateRpcResult): string | null {
  if (typeof data === "string" && data.trim()) return data.trim();
  const record = data as unknown as ProposalCreateCompatRow | null;
  if (record && typeof record.id !== "undefined" && record.id !== null) {
    const id = String(record.id).trim();
    return id || null;
  }
  return null;
}

function buildProposalAddItemsArgs(
  proposalId: number | string,
  requestItemIds: string[],
): ProposalAddItemsRpcArgsCompat {
  if (typeof proposalId === "number" && Number.isFinite(proposalId)) {
    return { p_proposal_id: proposalId, p_request_item_ids: requestItemIds };
  }
  return { p_proposal_id: String(proposalId), p_request_item_ids: requestItemIds };
}

function parseProposalAddItemsResult(data: ProposalAddItemsRpcResult): number {
  return Number(data ?? 0);
}

function buildProposalItemInsert(
  proposalIdText: string,
  requestItemId: string,
): ProposalItemInsert {
  return {
    proposal_id: proposalIdText,
    proposal_id_text: proposalIdText,
    request_item_id: requestItemId,
  };
}

function buildProposalSubmitArgs(proposalId: string): ProposalSubmitRpcArgsCompat {
  return { p_proposal_id: proposalId };
}

function buildProposalSubmitFallbackUpdate() {
  return { status: PROPOSAL_STATUS_PENDING_CANONICAL, submitted_at: new Date().toISOString() };
}

function buildProposalSubmitCleanupUpdate() {
  return { payment_status: null, sent_to_accountant_at: null };
}

function buildProposalItemsSnapshotArgs(
  proposalId: number | string,
  metaRows: ProposalMutationMetaRow[],
): ProposalItemsSnapshotRpcArgs {
  return {
    p_proposal_id: String(proposalId),
    p_meta: metaRows,
  };
}

// ============================== Boundary aggregators ==============================
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
  return client.rpc("proposal_submit", buildProposalSubmitArgs(proposalId));
}

// ============================== Low-level proposal helpers ==============================
async function runProposalCreateRpc() {
  return client.rpc("proposal_create");
}

async function selectProposalMetaById(proposalId: string) {
  return client
    .from("proposals")
    .select("id,proposal_no,id_short")
    .eq("id", proposalId)
    .maybeSingle();
}

async function insertProposalHeadFallback(payload: ProposalInsert) {
  return client.from("proposals").insert(payload).select("id,proposal_no,id_short").single();
}

async function runProposalAddItemsRpc(
  proposalId: number | string,
  requestItemIds: string[],
) {
  return client.rpc("proposal_add_items", buildProposalAddItemsArgs(proposalId, requestItemIds));
}

async function insertProposalItemFallback(
  proposalIdText: string,
  requestItemId: string,
) {
  const payload = buildProposalItemInsert(proposalIdText, requestItemId);
  return client.from("proposal_items").insert(payload).select("id").single();
}

async function updateProposalPendingFallback(proposalId: string) {
  return client
    .from("proposals")
    .update(buildProposalSubmitFallbackUpdate())
    .eq("id", proposalId)
    .select("id")
    .maybeSingle();
}

async function cleanupProposalSubmission(proposalId: string) {
  return client
    .from("proposals")
    .update(buildProposalSubmitCleanupUpdate())
    .eq("id", proposalId);
}

export async function proposalCreateFull(): Promise<{ id: string; proposal_no: string | null; id_short: number | null }> {
  try {
    const { data, error } = await runProposalCreateRpc();
    if (!error && data != null) {
      const id = parseProposalCreateResult(data);
      if (!id) throw new Error("proposal_create returned empty id");
      const q = await selectProposalMetaById(id);

      return normalizeProposalMeta(q.data, id);
    }
  } catch {}

  const insertPayload = buildProposalCreateFallbackInsert();
  const ins = await insertProposalHeadFallback(insertPayload);
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
    const { data, error } = await runProposalAddItemsRpc(proposalId, requestItemIds);
    if (error) throw error;
    return parseProposalAddItemsResult(data);
  } catch {
    let ok = 0;
    for (const requestItemId of requestItemIds) {
      try {
        const ins = await insertProposalItemFallback(proposalIdText, requestItemId);
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
    const upd = await updateProposalPendingFallback(pid);
    if (upd.error) throw upd.error;
    if (!upd.data?.id) return 0;
  }

  await cleanupProposalSubmission(pid);

  return 1;
}

export async function listDirectorProposalsPending(): Promise<Array<{ id: string; submitted_at: string | null }>> {
  const rowsFromTable = await client
    .from("proposals")
    .select("id, submitted_at")
    .eq("status", PROPOSAL_STATUS_PENDING_CANONICAL)
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
  metaRows: ProposalMutationMetaRow[] = [],
) {
  const { error } = await client.rpc("proposal_items_snapshot", buildProposalItemsSnapshotArgs(proposalId, metaRows));

  if (error) throw error;
  return true;
}

export async function proposalSetItemsMeta(
  _proposalId: number | string,
  _rows: { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null },
) {
  return true;
}
