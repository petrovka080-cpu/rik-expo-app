import { supabase } from "../supabaseClient";
import type { Database } from "../database.types";
import { beginPlatformObservability } from "../observability/platformObservability";
import { classifyRpcCompatError, client } from "./_core";
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
  "id" | "request_item_id" | "name_human" | "uom" | "qty" | "app_code" | "rik_code" | "price" | "note" | "supplier"
>;
type ProposalItemViewRow = Database["public"]["Views"]["proposal_items_view"]["Row"];
type ProposalSnapshotItemRow = Database["public"]["Views"]["proposal_snapshot_items"]["Row"];
type ProposalCreateRpcResult = Database["public"]["Functions"]["proposal_create"]["Returns"];
type ProposalCreateCompatRow = { id: string | number };
type ProposalPendingRpcRow = { id: string | number; submitted_at: string | null };
type ProposalItemsRpcRow = {
  id: number | null;
  request_item_id?: string | null;
  rik_code: string | null;
  name_human: string | null;
  uom: string | null;
  app_code: string | null;
  total_qty: number | null;
  price?: number | null;
  note?: string | null;
  supplier?: string | null;
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
type ProposalItemMetaUpsertInput = {
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

const PROPOSAL_STATUS_PENDING_CANONICAL = "\u041d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438";
type ProposalCreatePath = "rpc_primary" | "compat_insert_fallback";
type ProposalItemsSourceKind =
  | "view:proposal_snapshot_items"
  | "view:proposal_items_view"
  | "table:proposal_items"
  | "rpc:proposal_items_for_web";

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
    request_item_id: r.request_item_id != null ? String(r.request_item_id) : null,
    rik_code: r.rik_code ?? null,
    name_human: String(r.name_human ?? ""),
    uom: r.uom ?? null,
    app_code: r.app_code ?? null,
    total_qty: Number(r.total_qty ?? 0),
    price: typeof r.price === "number" && Number.isFinite(r.price) ? Number(r.price) : null,
    note: r.note ?? null,
    supplier: r.supplier ?? null,
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

function buildProposalItemMetaUpsert(
  proposalId: string,
  row: ProposalItemMetaUpsertInput,
): ProposalItemInsert {
  const payload: ProposalItemInsert = {
    proposal_id: proposalId,
    proposal_id_text: proposalId,
    request_item_id: String(row.request_item_id || "").trim(),
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
}

// ============================== Boundary aggregators ==============================
function aggregateTableProposalItems(rows: ProposalItemTableRow[]): ProposalItemRow[] {
  const key = (r: ProposalItemTableRow) =>
    [
      String(r.request_item_id ?? ""),
      String(r.name_human ?? ""),
      String(r.uom ?? ""),
      String(r.app_code ?? ""),
      String(r.rik_code ?? ""),
    ].join("||");

  const agg = new Map<
    string,
    {
      id: number;
      request_item_id: string | null;
      name_human: string;
      uom: string | null;
      app_code: string | null;
      rik_code: string | null;
      total_qty: number;
      price: number | null;
      note: string | null;
      supplier: string | null;
    }
  >();

  rows.forEach((r, i) => {
    const k = key(r);
    const prev = agg.get(k);
    agg.set(k, {
      id: prev?.id ?? Number(r.id ?? i),
      request_item_id: prev?.request_item_id ?? (r.request_item_id != null ? String(r.request_item_id) : null),
      name_human: String(r.name_human ?? ""),
      uom: r.uom ?? null,
      app_code: r.app_code ?? null,
      rik_code: r.rik_code ?? null,
      total_qty: (prev?.total_qty ?? 0) + Number(r.qty ?? 0),
      price:
        prev?.price ??
        (typeof r.price === "number" && Number.isFinite(r.price) ? Number(r.price) : null),
      note: prev?.note ?? r.note ?? null,
      supplier: prev?.supplier ?? r.supplier ?? null,
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

async function selectProposalItemsSnapshot(proposalId: string) {
  return client
    .from("proposal_snapshot_items")
    .select("id, request_item_id, rik_code, name_human, uom, app_code, total_qty, price, note, supplier")
    .eq("proposal_id", proposalId)
    .order("id", { ascending: true });
}

async function selectProposalItemsView(proposalId: string) {
  return client
    .from("proposal_items_view")
    .select("id, request_item_id, rik_code, name_human, uom, app_code, total_qty, price, note, supplier")
    .eq("proposal_id", proposalId)
    .order("id", { ascending: true });
}

async function selectProposalItemsTable(proposalId: string) {
  return client
    .from("proposal_items")
    .select("id, request_item_id, rik_code, name_human, uom, app_code, qty, price, note, supplier")
    .eq("proposal_id", proposalId)
    .order("id", { ascending: true });
}

async function loadProposalItemsFromSource(
  proposalId: string,
  sourceKind: ProposalItemsSourceKind,
): Promise<ProposalItemRow[] | null> {
  if (sourceKind === "view:proposal_snapshot_items") {
    const result = await selectProposalItemsSnapshot(proposalId);
    if (result.error) throw result.error;
    return Array.isArray(result.data) && result.data.length
      ? normalizeProposalItems(result.data as ProposalSnapshotItemRow[] as ProposalItemsRpcRow[])
      : null;
  }

  if (sourceKind === "view:proposal_items_view") {
    const result = await selectProposalItemsView(proposalId);
    if (result.error) throw result.error;
    return Array.isArray(result.data) && result.data.length
      ? normalizeProposalItems(result.data as ProposalItemViewRow[] as ProposalItemsRpcRow[])
      : null;
  }

  if (sourceKind === "table:proposal_items") {
    const result = await selectProposalItemsTable(proposalId);
    if (result.error) throw result.error;
    return Array.isArray(result.data) && result.data.length
      ? aggregateTableProposalItems(result.data as ProposalItemTableRow[])
      : null;
  }

  const result = await supabase.rpc("proposal_items_for_web", { p_id: proposalId });
  if (result.error) throw result.error;
  return Array.isArray(result.data) && result.data.length
    ? normalizeProposalItems(result.data as ProposalItemsRpcRow[])
    : null;
}

async function verifyCreatedProposalMeta(
  proposalId: string,
  path: ProposalCreatePath,
): Promise<{ id: string; proposal_no: string | null; id_short: number | null }> {
  const verified = await selectProposalMetaById(proposalId);
  if (verified.error) throw verified.error;
  const normalized = normalizeProposalMeta(verified.data, proposalId);
  if (!normalized.id) {
    throw new Error(`[proposalCreateFull:${path}] post-create verification returned empty id`);
  }
  return normalized;
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

const chunkProposalItemIds = (requestItemIds: string[], size: number): string[][] => {
  if (size <= 0) return [requestItemIds];
  const out: string[][] = [];
  for (let i = 0; i < requestItemIds.length; i += size) {
    out.push(requestItemIds.slice(i, i + size));
  }
  return out;
};

async function insertProposalItemsFallbackBulk(
  proposalIdText: string,
  requestItemIds: string[],
): Promise<number> {
  let ok = 0;

  for (const pack of chunkProposalItemIds(requestItemIds, 100)) {
    const payload = pack.map((requestItemId) => buildProposalItemInsert(proposalIdText, requestItemId));

    try {
      const { error, data } = await client
        .from("proposal_items")
        .insert(payload)
        .select("id");
      if (error) throw error;
      ok += Array.isArray(data) ? data.length : pack.length;
      continue;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logProposalsDebug("[proposalAddItems/fallback/bulk]", msg);
    }

    for (const requestItemId of pack) {
      try {
        const ins = await insertProposalItemFallback(proposalIdText, requestItemId);
        if (!ins.error) ok++;
        else logProposalsDebug("[proposalAddItems/fallback/insert]", ins.error.message);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logProposalsDebug("[proposalAddItems/fallback/insert ex]", msg);
      }
    }
  }

  return ok;
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
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "proposal_create",
    category: "fetch",
    event: "create_proposal",
    sourceKind: "rpc:proposal_create",
  });

  try {
    const { data, error } = await runProposalCreateRpc();
    if (error) throw error;
    const id = parseProposalCreateResult(data);
    if (!id) throw new Error("proposal_create returned empty id");
    const normalized = await verifyCreatedProposalMeta(id, "rpc_primary");
    observation.success({
      sourceKind: "rpc:proposal_create",
      extra: {
        path: "rpc_primary",
      },
    });
    return normalized;
  } catch (error) {
    const decision = classifyRpcCompatError(error);
    if (!decision.allowNextVariant) {
      observation.error(error, {
        sourceKind: "rpc:proposal_create",
        errorStage: "rpc_primary",
        fallbackUsed: false,
        extra: {
          path: "rpc_primary",
          compatDecision: decision.kind,
          compatReason: decision.reason,
        },
      });
      throw error;
    }

    logProposalsDebug("[proposalCreateFull/fallback]", decision.reason);
  }

  const insertPayload = buildProposalCreateFallbackInsert();
  const ins = await insertProposalHeadFallback(insertPayload);
  if (ins.error) {
    observation.error(ins.error, {
      sourceKind: "table:proposals",
      errorStage: "compat_insert_fallback",
      fallbackUsed: true,
      extra: {
        path: "compat_insert_fallback",
      },
    });
    throw ins.error;
  }

  const inserted = normalizeProposalMeta(ins.data, "");
  if (!inserted.id) {
    const error = new Error("[proposalCreateFull:compat_insert_fallback] insert returned empty id");
    observation.error(error, {
      sourceKind: "table:proposals",
      errorStage: "compat_insert_fallback",
      fallbackUsed: true,
      extra: {
        path: "compat_insert_fallback",
      },
    });
    throw error;
  }

  const verified = await verifyCreatedProposalMeta(inserted.id, "compat_insert_fallback");
  observation.success({
    sourceKind: "table:proposals",
    fallbackUsed: true,
    extra: {
      path: "compat_insert_fallback",
      postCreateVerified: true,
    },
  });
  return verified;
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
    return await insertProposalItemsFallbackBulk(proposalIdText, requestItemIds);
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

export async function listDirectorProposalsPending(): Promise<{ id: string; submitted_at: string | null }[]> {
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
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "proposal_items",
    category: "fetch",
    event: "load_proposal_items",
    sourceKind: "view:proposal_snapshot_items",
  });

  const sourcePlan: readonly ProposalItemsSourceKind[] = [
    "view:proposal_snapshot_items",
    "view:proposal_items_view",
    "table:proposal_items",
    "rpc:proposal_items_for_web",
  ];

  let lastError: unknown = null;
  for (const sourceKind of sourcePlan) {
    try {
      const rows = await loadProposalItemsFromSource(pid, sourceKind);
      if (!rows || rows.length === 0) continue;
      observation.success({
        sourceKind,
        fallbackUsed: sourceKind !== "view:proposal_snapshot_items",
        rowCount: rows.length,
      });
      return rows;
    } catch (error) {
      lastError = error;
      logProposalsDebug(`[proposalItems/${sourceKind}]`, error instanceof Error ? error.message : String(error));
    }
  }

  if (lastError) {
    observation.error(lastError, {
      sourceKind: "view:proposal_snapshot_items",
      errorStage: "source_chain_exhausted",
      fallbackUsed: true,
    });
  } else {
    observation.success({
      sourceKind: "view:proposal_snapshot_items",
      fallbackUsed: false,
      rowCount: 0,
    });
  }
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
  proposalId: number | string,
  rows:
    | ProposalItemMetaUpsertInput[]
    | { request_item_id: string; price?: string | null; supplier?: string | null; note?: string | null },
) {
  const pid = String(proposalId || "").trim();
  if (!pid) return true;

  const inputRows = Array.isArray(rows) ? rows : [rows];
  const payload = inputRows
    .map((row) => {
      const requestItemId = String(row?.request_item_id || "").trim();
      if (!requestItemId) return null;
      const next: ProposalItemMetaUpsertInput = { request_item_id: requestItemId };
      if ("name_human" in row) next.name_human = row.name_human ?? null;
      if ("uom" in row) next.uom = row.uom ?? null;
      if ("qty" in row) next.qty = row.qty ?? null;
      if ("app_code" in row) next.app_code = row.app_code ?? null;
      if ("rik_code" in row) next.rik_code = row.rik_code ?? null;
      if (typeof row.price === "number" && Number.isFinite(row.price)) next.price = row.price;
      if (typeof row.price === "string") {
        const parsed = Number(row.price.replace(",", "."));
        if (Number.isFinite(parsed)) next.price = parsed;
      }
      if ("supplier" in row) next.supplier = row.supplier ?? null;
      if ("note" in row) next.note = row.note ?? null;
      return buildProposalItemMetaUpsert(pid, next);
    })
    .filter((row): row is ProposalItemInsert => Boolean(row));

  if (!payload.length) return true;

  try {
    const { error } = await client.from("proposal_items").upsert(payload, { onConflict: "proposal_id,request_item_id" });
    if (!error) return true;
    throw error;
  } catch (error) {
    logProposalsDebug("[proposalSetItemsMeta/upsert]", error instanceof Error ? error.message : String(error));
  }

  for (const row of payload) {
    const updatePayload: Partial<ProposalItemInsert> = {
      name_human: row.name_human ?? null,
      uom: row.uom ?? null,
      qty: row.qty ?? null,
      app_code: row.app_code ?? null,
      rik_code: row.rik_code ?? null,
      price: row.price ?? null,
      supplier: row.supplier ?? null,
      note: row.note ?? null,
    };
    const { error } = await client
      .from("proposal_items")
      .update(updatePayload)
      .eq("proposal_id", pid)
      .eq("request_item_id", row.request_item_id);
    if (error) throw error;
  }
  return true;
}
