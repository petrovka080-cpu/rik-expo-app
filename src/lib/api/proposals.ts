import type { Database } from "../database.types";
import { beginPlatformObservability } from "../observability/platformObservability";
import { recordCatchDiscipline } from "../observability/catchDiscipline";
import {
  classifyRpcCompatError,
  client,
  loadPagedRowsWithCeiling,
  normalizePage,
  type PagedQuery,
  type PageInput,
} from "./_core";
import {
  classifyProposalItemsByRequestItemIntegrity,
  ensureActiveProposalRequestItemsIntegrity,
  ensureProposalRequestItemsIntegrity,
} from "./integrity.guards";
import { toProposalRequestItemIntegrityDegradedError } from "./proposalIntegrity";
import { callProposalItemsForWebRpc } from "./proposals.transport";
import {
  isRpcIgnoredMutationResponse,
  isRpcNonEmptyString,
  isRpcNumberLike,
  isRpcNumberLikeResponse,
  isRpcNullableRecordArrayResponse,
  isRpcRecord,
  isRpcRecordArray,
  validateRpcResponse,
} from "./queryBoundary";
import type { ProposalItemRow } from "./types";

const logProposalsDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

const recordProposalCatch = (params: {
  screen: "buyer" | "director";
  surface: string;
  event: string;
  kind: "critical_fail" | "soft_failure" | "cleanup_only" | "degraded_fallback";
  error: unknown;
  sourceKind: string;
  errorStage: string;
  extra?: Record<string, unknown>;
}) =>
  recordCatchDiscipline({
    screen: params.screen,
    surface: params.surface,
    event: params.event,
    kind: params.kind,
    error: params.error,
    sourceKind: params.sourceKind,
    errorStage: params.errorStage,
    extra: params.extra,
  });

type ProposalRow = Pick<
  Database["public"]["Tables"]["proposals"]["Row"],
  "id" | "proposal_no" | "id_short"
>;
type ProposalSubmitVerificationRow = Pick<
  Database["public"]["Tables"]["proposals"]["Row"],
  "id" | "status" | "submitted_at" | "sent_to_accountant_at"
>;
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
type ProposalSubmitTextRpcArgsCompat = { p_proposal_id_text: string };
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

export const isProposalCreateRpcResponse = (value: unknown): value is ProposalCreateRpcResult =>
  isRpcNonEmptyString(value) ||
  (isRpcRecord(value) && (isRpcNonEmptyString(value.id) || isRpcNumberLike(value.id)));

export const isProposalItemsForWebRpcResponse = (
  value: unknown,
): value is ProposalItemsRpcRow[] | null | undefined =>
  value == null || isRpcRecordArray(value);

export const isProposalPendingRowsRpcResponse = (
  value: unknown,
): value is ProposalPendingRpcRow[] | null | undefined =>
  isRpcNullableRecordArrayResponse(value) &&
  (value ?? []).every((row) => {
    const submittedAt = row.submitted_at;
    return (
      (isRpcNonEmptyString(row.id) || isRpcNumberLike(row.id)) &&
      (submittedAt == null || typeof submittedAt === "string")
    );
  });

export const isProposalAddItemsRpcResponse = isRpcNumberLikeResponse;
export const isProposalIgnoredMutationRpcResponse = isRpcIgnoredMutationResponse;

const _PROPOSAL_STATUS_PENDING_RU = "\u041d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438";
const PROPOSAL_STATUS_DRAFT_EN = "draft";
const PROPOSAL_STATUS_PENDING_EN = "pending";
const PROPOSAL_STATUS_SUBMITTED_EN = "submitted";
const PROPOSAL_STATUS_APPROVED_EN = "approved";
const PROPOSAL_STATUS_REJECTED_EN = "rejected";
type ProposalCreatePath = "rpc_primary";
type ProposalItemsSourceKind =
  | "view:proposal_snapshot_items"
  | "view:proposal_items_view"
  | "table:proposal_items"
  | "rpc:proposal_items_for_web";

const PROPOSAL_REFERENCE_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 };

export type ProposalStatus = "draft" | "submitted" | "approved" | "rejected";
export type ProposalSubmitSourceKind =
  | "rpc:proposal_submit"
  | "rpc:proposal_submit_text_v1";

export type ProposalSubmitVerificationResult = {
  proposalId: string;
  rawStatus: string | null;
  status: ProposalStatus;
  submittedAt: string | null;
  visibleToDirector: boolean;
  sourceKind: ProposalSubmitSourceKind;
};

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

function parseProposalAddItemsResult(data: ProposalAddItemsRpcResult | string): number {
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

function buildProposalSubmitTextArgs(proposalId: string): ProposalSubmitTextRpcArgsCompat {
  return { p_proposal_id_text: proposalId };
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

async function runProposalSubmitRpc(
  proposalId: string,
): Promise<{ sourceKind: ProposalSubmitSourceKind }> {
  const primary = await client.rpc(
    "proposal_submit_text_v1" as never,
    buildProposalSubmitTextArgs(proposalId) as never,
  );
  if (!primary.error) {
    validateRpcResponse(primary.data, isProposalIgnoredMutationRpcResponse, {
      rpcName: "proposal_submit_text_v1",
      caller: "src/lib/api/proposals.runProposalSubmitRpc",
      domain: "proposal",
    });
    return { sourceKind: "rpc:proposal_submit_text_v1" };
  }

  const decision = classifyRpcCompatError(primary.error);
  if (!decision.allowNextVariant) {
    throw primary.error;
  }

  const compatibility = await client.rpc("proposal_submit", buildProposalSubmitArgs(proposalId));
  if (compatibility.error) throw compatibility.error;
  validateRpcResponse(compatibility.data, isProposalIgnoredMutationRpcResponse, {
    rpcName: "proposal_submit",
    caller: "src/lib/api/proposals.runProposalSubmitRpc",
    domain: "proposal",
  });
  return { sourceKind: "rpc:proposal_submit" };
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

async function selectProposalSubmitVerificationById(proposalId: string) {
  return client
    .from("proposals")
    .select("id,status,submitted_at,sent_to_accountant_at")
    .eq("id", proposalId)
    .maybeSingle<ProposalSubmitVerificationRow>();
}

async function selectProposalItemsSnapshot(proposalId: string) {
  return loadPagedRowsWithCeiling<ProposalSnapshotItemRow>(
    () =>
      client
        .from("proposal_snapshot_items")
        .select("id, request_item_id, rik_code, name_human, uom, app_code, total_qty, price, note, supplier")
        .eq("proposal_id", proposalId)
        .order("id", { ascending: true }) as unknown as PagedQuery<ProposalSnapshotItemRow>,
    PROPOSAL_REFERENCE_PAGE_DEFAULTS,
  );
}

async function selectProposalItemsView(proposalId: string) {
  return loadPagedRowsWithCeiling<ProposalItemViewRow>(
    () =>
      client
        .from("proposal_items_view")
        .select("id, request_item_id, rik_code, name_human, uom, app_code, total_qty, price, note, supplier")
        .eq("proposal_id", proposalId)
        .order("id", { ascending: true }) as unknown as PagedQuery<ProposalItemViewRow>,
    PROPOSAL_REFERENCE_PAGE_DEFAULTS,
  );
}

async function selectProposalItemsTable(proposalId: string) {
  return loadPagedRowsWithCeiling<ProposalItemTableRow>(
    () =>
      client
        .from("proposal_items")
        .select("id, request_item_id, name_human, uom, app_code, rik_code, qty, price, note, supplier")
        .eq("proposal_id", proposalId)
        .order("id", { ascending: true }) as unknown as PagedQuery<ProposalItemTableRow>,
    PROPOSAL_REFERENCE_PAGE_DEFAULTS,
  );
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

  const result = await callProposalItemsForWebRpc(proposalId);
  if (result.error) throw result.error;
  const validated = validateRpcResponse(result.data, isProposalItemsForWebRpcResponse, {
    rpcName: "proposal_items_for_web",
    caller: "src/lib/api/proposals.loadProposalItemsFromSource",
    domain: "proposal",
  });
  return Array.isArray(validated) && validated.length
    ? normalizeProposalItems(validated)
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
      recordProposalCatch({
        screen: "buyer",
        surface: "proposal_add_items",
        event: "proposal_items_bulk_insert_failed",
        kind: "degraded_fallback",
        error: e,
        sourceKind: "table:proposal_items",
        errorStage: "fallback_bulk_insert",
        extra: {
          proposalId: proposalIdText,
          batchSize: pack.length,
        },
      });
      logProposalsDebug("[proposalAddItems/fallback/bulk]", msg);
    }

    for (const requestItemId of pack) {
      try {
        const ins = await insertProposalItemFallback(proposalIdText, requestItemId);
        if (!ins.error) ok++;
        else {
          recordProposalCatch({
            screen: "buyer",
            surface: "proposal_add_items",
            event: "proposal_item_insert_failed",
            kind: "degraded_fallback",
            error: ins.error,
            sourceKind: "table:proposal_items",
            errorStage: "fallback_single_insert",
            extra: {
              proposalId: proposalIdText,
              requestItemId,
            },
          });
          logProposalsDebug("[proposalAddItems/fallback/insert]", ins.error.message);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        recordProposalCatch({
          screen: "buyer",
          surface: "proposal_add_items",
          event: "proposal_item_insert_failed",
          kind: "degraded_fallback",
          error: e,
          sourceKind: "table:proposal_items",
          errorStage: "fallback_single_insert",
          extra: {
            proposalId: proposalIdText,
            requestItemId,
          },
        });
        logProposalsDebug("[proposalAddItems/fallback/insert ex]", msg);
      }
    }
  }

  return ok;
}

async function cleanupProposalSubmission(proposalId: string) {
  return client
    .from("proposals")
    .update(buildProposalSubmitCleanupUpdate())
    .eq("id", proposalId);
}

async function countProposalItems(proposalId: string): Promise<number> {
  const result = await client
    .from("proposal_items")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId);
  if (result.error) throw result.error;
  return Number(result.count ?? 0);
}

const normalizeProposalStatusToken = (raw: unknown): string =>
  String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export function normalizeProposalStatus(raw: unknown): ProposalStatus {
  const normalized = normalizeProposalStatusToken(raw);
  if (
    !normalized ||
    normalized === PROPOSAL_STATUS_DRAFT_EN ||
    normalized.includes("\u0447\u0435\u0440\u043d\u043e\u0432")
  ) {
    return "draft";
  }
  if (
    normalized === PROPOSAL_STATUS_PENDING_EN ||
    normalized === PROPOSAL_STATUS_SUBMITTED_EN ||
    normalized.includes("\u043d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438")
  ) {
    return "submitted";
  }
  if (
    normalized === PROPOSAL_STATUS_APPROVED_EN ||
    normalized.includes("\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d")
  ) {
    return "approved";
  }
  if (
    normalized === PROPOSAL_STATUS_REJECTED_EN ||
    normalized.includes("\u043e\u0442\u043a\u043b\u043e\u043d") ||
    normalized.includes("\u0434\u043e\u0440\u0430\u0431\u043e\u0442") ||
    normalized.includes("rework")
  ) {
    return "rejected";
  }
  return "draft";
}

export function isProposalDirectorVisibleRow(row: {
  status?: unknown;
  submitted_at?: unknown;
  sent_to_accountant_at?: unknown;
} | null | undefined): boolean {
  if (!row) return false;
  if (!String(row.submitted_at ?? "").trim()) return false;
  if (String(row.sent_to_accountant_at ?? "").trim()) return false;
  return normalizeProposalStatus(row.status) === "submitted";
}

async function verifySubmittedProposal(
  proposalId: string,
  sourceKind: ProposalSubmitSourceKind,
): Promise<ProposalSubmitVerificationResult> {
  const result = await selectProposalSubmitVerificationById(proposalId);
  if (result.error) throw result.error;
  if (!result.data?.id) {
    throw new Error(`[proposalSubmit/rpc_submit] proposal missing after submit: ${proposalId}`);
  }

  const itemsCount = await countProposalItems(proposalId);
  if (itemsCount <= 0) {
    throw new Error(`[proposalSubmit/rpc_submit] proposal has no linked items: ${proposalId}`);
  }

  const row = result.data;
  const normalizedStatus = normalizeProposalStatus(row.status);
  if (normalizedStatus !== "submitted") {
    throw new Error(
      `[proposalSubmit/rpc_submit] proposal status mismatch: expected submitted, got ${String(
        row.status ?? "null",
      )}`,
    );
  }
  if (!row.submitted_at) {
    throw new Error(`[proposalSubmit/rpc_submit] proposal submitted_at missing: ${proposalId}`);
  }
  if (String(row.sent_to_accountant_at ?? "").trim()) {
    throw new Error(`[proposalSubmit/rpc_submit] proposal still sent_to_accountant_at: ${proposalId}`);
  }

  return {
    proposalId,
    rawStatus: row.status ?? null,
    status: normalizedStatus,
    submittedAt: row.submitted_at,
    visibleToDirector: isProposalDirectorVisibleRow(row),
    sourceKind,
  };
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
    const validated = validateRpcResponse(data, isProposalCreateRpcResponse, {
      rpcName: "proposal_create",
      caller: "src/lib/api/proposals.proposalCreateFull",
      domain: "proposal",
    });
    const id = parseProposalCreateResult(validated);
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
}

export async function proposalCreate(): Promise<number | string> {
  const created = await proposalCreateFull();
  return created.id;
}

export async function proposalAddItems(proposalId: number | string, requestItemIds: string[]) {
  const proposalIdText = String(proposalId);
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "proposal_add_items",
    category: "fetch",
    event: "add_proposal_items",
    sourceKind: "rpc:proposal_add_items",
  });
  await ensureActiveProposalRequestItemsIntegrity(client, proposalIdText, requestItemIds, {
    screen: "buyer",
    surface: "proposal_add_items",
    sourceKind: "mutation:proposal_items",
  });
  try {
    try {
      const { data, error } = await runProposalAddItemsRpc(proposalId, requestItemIds);
      if (error) throw error;
      const validated = validateRpcResponse(data, isProposalAddItemsRpcResponse, {
        rpcName: "proposal_add_items",
        caller: "src/lib/api/proposals.proposalAddItems",
        domain: "proposal",
      });
      const inserted = parseProposalAddItemsResult(validated);
      observation.success({
        sourceKind: "rpc:proposal_add_items",
        rowCount: inserted,
        extra: {
          proposalId: proposalIdText,
          requestItemCount: requestItemIds.length,
          publishState: "ready",
        },
      });
      return inserted;
    } catch (error) {
      recordProposalCatch({
        screen: "buyer",
        surface: "proposal_add_items",
        event: "proposal_add_items_rpc_failed",
        kind: "degraded_fallback",
        error,
        sourceKind: "rpc:proposal_add_items",
        errorStage: "rpc_primary",
        extra: {
          proposalId: proposalIdText,
          requestItemCount: requestItemIds.length,
        },
      });
    }

    const inserted = await insertProposalItemsFallbackBulk(proposalIdText, requestItemIds);
    if (inserted > 0 || requestItemIds.length === 0) {
      observation.success({
        sourceKind: "table:proposal_items",
        fallbackUsed: true,
        rowCount: inserted,
        extra: {
          proposalId: proposalIdText,
          requestItemCount: requestItemIds.length,
          publishState: "degraded",
        },
      });
    } else {
      observation.error(new Error("proposal_add_items fallback inserted zero rows"), {
        sourceKind: "table:proposal_items",
        errorStage: "fallback_bulk_insert",
        fallbackUsed: true,
        extra: {
          proposalId: proposalIdText,
          requestItemCount: requestItemIds.length,
          publishState: "error",
        },
      });
    }
    return inserted;
  } catch (error) {
    observation.error(error, {
      sourceKind: "table:proposal_items",
      errorStage: "fallback_insert",
      fallbackUsed: true,
      extra: {
        proposalId: proposalIdText,
        requestItemCount: requestItemIds.length,
        publishState: "error",
      },
    });
    throw error;
  }
}

export async function proposalSubmit(
  proposalId: number | string,
): Promise<ProposalSubmitVerificationResult> {
  const pid = String(proposalId);
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "proposal_submit",
    category: "fetch",
    event: "submit_proposal",
    sourceKind: "rpc:proposal_submit",
  });

  let submitSourceKind: ProposalSubmitSourceKind = "rpc:proposal_submit_text_v1";
  try {
    const submitRpc = await runProposalSubmitRpc(pid);
    submitSourceKind = submitRpc.sourceKind;
    const cleanup = await cleanupProposalSubmission(pid);
    if (cleanup.error) throw cleanup.error;
    const verified = await verifySubmittedProposal(pid, submitSourceKind);
    observation.success({
      sourceKind: submitSourceKind,
      rowCount: verified.visibleToDirector ? 1 : 0,
      extra: {
        proposalId: pid,
        normalizedStatus: verified.status,
        rawStatus: verified.rawStatus,
        visibleToDirector: verified.visibleToDirector,
      },
    });
    return verified;
  } catch (error) {
    const normalizedError = toProposalRequestItemIntegrityDegradedError(error) ?? error;
    observation.error(normalizedError, {
      sourceKind: submitSourceKind,
      errorStage: "rpc_submit_or_verify",
      fallbackUsed: false,
      extra: {
        proposalId: pid,
      },
    });
    throw normalizedError;
  }
}

export async function listDirectorProposalsPending(
  pageInput?: PageInput,
): Promise<{ id: string; submitted_at: string | null }[]> {
  const page = normalizePage(pageInput, { pageSize: 50, maxPageSize: 100 });
  const observation = beginPlatformObservability({
    screen: "director",
    surface: "pending_proposals",
    category: "fetch",
    event: "list_pending_proposals",
    sourceKind: "table:proposals",
  });
  const rowsFromTable = await client
    .from("proposals")
    .select("id, status, submitted_at, sent_to_accountant_at")
    .not("submitted_at", "is", null)
    .is("sent_to_accountant_at", null)
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.from, page.to);

  if (rowsFromTable.error || !rowsFromTable.data) {
    recordProposalCatch({
      screen: "director",
      surface: "pending_proposals",
      event: "pending_proposals_table_read_failed",
      kind: "degraded_fallback",
      error: rowsFromTable.error ?? new Error("pending proposals table returned no data"),
      sourceKind: "table:proposals",
      errorStage: "table_primary",
    });
    try {
      const rpc = await client.rpc("list_director_proposals_pending");
      if (!rpc.error) {
        const validated = validateRpcResponse(rpc.data, isProposalPendingRowsRpcResponse, {
          rpcName: "list_director_proposals_pending",
          caller: "src/lib/api/proposals.listDirectorProposalsPending",
          domain: "director",
        });
        const rows = (validated ?? [])
          .map((x) => ({ id: String(x.id), submitted_at: x.submitted_at ?? null }))
          .filter((x) => x.submitted_at != null);
        observation.success({
          sourceKind: "rpc:list_director_proposals_pending",
          fallbackUsed: true,
          rowCount: rows.length,
          extra: {
            publishState: "degraded",
          },
        });
        return rows;
      }
      if (rpc.error) {
        recordProposalCatch({
          screen: "director",
          surface: "pending_proposals",
          event: "pending_proposals_rpc_failed",
          kind: "soft_failure",
          error: rpc.error,
          sourceKind: "rpc:list_director_proposals_pending",
          errorStage: "rpc_fallback",
        });
      }
    } catch (error) {
      recordProposalCatch({
        screen: "director",
        surface: "pending_proposals",
        event: "pending_proposals_rpc_failed",
        kind: "critical_fail",
        error,
        sourceKind: "rpc:list_director_proposals_pending",
        errorStage: "rpc_fallback",
      });
    }
    observation.error(rowsFromTable.error ?? new Error("pending proposals fallback exhausted"), {
      sourceKind: "rpc:list_director_proposals_pending",
      errorStage: "fallback_exhausted",
      fallbackUsed: true,
      extra: {
        publishState: "error",
      },
    });
    logProposalsDebug("[listDirectorProposalsPending] error:", rowsFromTable.error?.message);
    return [];
  }

  const rows = rowsFromTable.data
    .filter((row) => isProposalDirectorVisibleRow(row))
    .map((x) => ({ id: String(x.id), submitted_at: x.submitted_at ?? null }))
    .filter((x) => x.submitted_at != null);
  observation.success({
    sourceKind: "table:proposals",
    rowCount: rows.length,
    extra: {
      publishState: rows.length > 0 ? "ready" : "empty",
    },
  });
  return rows;
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
      const classified = await classifyProposalItemsByRequestItemIntegrity(client, rows, {
        screen: "buyer",
        surface: "proposal_items",
        sourceKind,
        proposalId: pid,
      });
      observation.success({
        sourceKind,
        fallbackUsed: sourceKind !== "view:proposal_snapshot_items",
        rowCount: classified.rows.length,
        extra: {
          degradedRequestItems: classified.degradedRequestItemIds.length,
          cancelledRequestItems: classified.cancelledRequestItemIds.length,
          missingRequestItems: classified.missingRequestItemIds.length,
          publishState: classified.degradedRequestItemIds.length ? "degraded" : "ready",
        },
      });
      return classified.rows;
    } catch (error) {
      lastError = error;
      recordProposalCatch({
        screen: "buyer",
        surface: "proposal_items",
        event: "proposal_items_source_failed",
        kind: "degraded_fallback",
        error,
        sourceKind,
        errorStage: "source_chain_step",
        extra: {
          proposalId: pid,
        },
      });
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
  const { data, error } = await client.rpc("proposal_items_snapshot", buildProposalItemsSnapshotArgs(proposalId, metaRows));

  if (error) throw error;
  validateRpcResponse(data, isProposalIgnoredMutationRpcResponse, {
    rpcName: "proposal_items_snapshot",
    caller: "src/lib/api/proposals.proposalSnapshotItems",
    domain: "proposal",
  });
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
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "proposal_set_items_meta",
    category: "fetch",
    event: "set_proposal_items_meta",
    sourceKind: "table:proposal_items",
  });

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

  await ensureProposalRequestItemsIntegrity(
    client,
    pid,
    payload.map((row) => String(row.request_item_id ?? "").trim()),
    {
      screen: "buyer",
      surface: "proposal_set_items_meta",
      sourceKind: "mutation:proposal_items_meta",
    },
  );

  try {
    try {
      const { error } = await client.from("proposal_items").upsert(payload, { onConflict: "proposal_id,request_item_id" });
      if (!error) {
        observation.success({
          sourceKind: "table:proposal_items",
          rowCount: payload.length,
          extra: {
            proposalId: pid,
            publishState: "ready",
          },
        });
        return true;
      }
      throw error;
    } catch (error) {
      recordProposalCatch({
        screen: "buyer",
        surface: "proposal_set_items_meta",
        event: "proposal_items_meta_upsert_failed",
        kind: "degraded_fallback",
        error,
        sourceKind: "table:proposal_items",
        errorStage: "upsert",
        extra: {
          proposalId: pid,
          rowCount: payload.length,
        },
      });
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
    observation.success({
      sourceKind: "table:proposal_items",
      fallbackUsed: true,
      rowCount: payload.length,
      extra: {
        proposalId: pid,
        publishState: "degraded",
      },
    });
    return true;
  } catch (error) {
    observation.error(error, {
      sourceKind: "table:proposal_items",
      errorStage: "row_update",
      fallbackUsed: true,
      extra: {
        proposalId: pid,
        rowCount: payload.length,
        publishState: "error",
      },
    });
    throw error;
  }
}
