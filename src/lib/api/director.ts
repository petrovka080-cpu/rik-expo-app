import type { Database } from "../database.types";
import {
  client,
  createGuardedPagedQuery,
  isRecordRow,
  loadPagedRowsWithCeiling,
  normalizePage,
  toRpcId,
  parseErr,
  type PageInput,
} from "./_core";
import {
  isRpcBooleanOrVoidResponse,
  isRpcNullableRecordArrayResponse,
  isRpcVoidResponse,
  validateRpcResponse,
} from "./queryBoundary";
import type { DirectorPendingRow, DirectorInboxRow } from "./types";
import { recordPlatformObservability } from "../observability/platformObservability";
import { callDirectorReturnMinAutoRpc } from "./director.return.transport";

const logDirectorApiDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

const getDirectorApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = String(record.message ?? "").trim();
    if (message) return message;
  }
  const raw = String(error ?? "").trim();
  return raw || fallback;
};

const recordDirectorApiWarning = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) => {
  const message = getDirectorApiErrorMessage(error, event);
  logDirectorApiDebug("[director.api]", { event, message, ...extra });
  recordPlatformObservability({
    screen: "director",
    surface: "inbox_api",
    category: "fetch",
    event,
    result: "error",
    fallbackUsed: true,
    errorStage: event,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: message,
    extra: {
      module: "director.api",
      owner: "director_api",
      severity: "warn",
      ...extra,
    },
  });
};

type RequestStatus = Database["public"]["Enums"]["request_status_enum"];
type DirectorInboxStatusArg =
  Database["public"]["Functions"]["list_director_inbox"]["Args"]["p_status"];
type DirectorReturnArgs =
  Database["public"]["Functions"]["director_return_min_auto"]["Args"];
type PendingRpcName =
  | "list_pending_foreman_items"
  | "listPending"
  | "list_pending"
  | "listpending";

type DirectorPendingRpcRawRow = {
  id?: unknown;
  request_id?: unknown;
  request_id_old?: unknown;
  request?: unknown;
  request_uuid?: unknown;
  request_id_text?: unknown;
  request_item_id?: unknown;
  name_human?: unknown;
  qty?: unknown;
  uom?: unknown;
};

type DirectorRequestIdLookupRow = {
  id?: unknown;
  id_old?: unknown;
};

type DirectorRequestItemFallbackRow = {
  id?: unknown;
  request_id?: unknown;
  name_human?: unknown;
  qty?: unknown;
  uom?: unknown;
};

const asRequestStatus = (value: string): RequestStatus => value as RequestStatus;

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecordRow(value) ? value : null;
}

const isDirectorRequestItemFallbackRow = (
  value: unknown,
): value is DirectorRequestItemFallbackRow => isRecordRow(value);

function asDirectorPendingRpcRawRows(value: unknown): DirectorPendingRpcRawRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const record = asRecord(row);
    return record
      ? [
          {
            id: record.id,
            request_id: record.request_id,
            request_id_old: record.request_id_old,
            request: record.request,
            request_uuid: record.request_uuid,
            request_id_text: record.request_id_text,
            request_item_id: record.request_item_id,
            name_human: record.name_human,
            qty: record.qty,
            uom: record.uom,
          },
        ]
      : [];
  });
}

function asDirectorRequestIdLookupRows(value: unknown): DirectorRequestIdLookupRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const record = asRecord(row);
    return record
      ? [
          {
            id: record.id,
            id_old: record.id_old,
          },
        ]
      : [];
  });
}

function asDirectorRequestItemFallbackRows(value: unknown): DirectorRequestItemFallbackRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const record = asRecord(row);
    return record
      ? [
          {
            id: record.id,
            request_id: record.request_id,
            name_human: record.name_human,
            qty: record.qty,
            uom: record.uom,
          },
        ]
      : [];
  });
}

export const isDirectorInboxRpcResponse = isRpcNullableRecordArrayResponse;
export const isDirectorLegacyDecisionRpcResponse = isRpcBooleanOrVoidResponse;

const DIRECTOR_REFERENCE_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 };

async function callPendingRpc(name: PendingRpcName): Promise<DirectorPendingRpcRawRow[]> {
  const rpc = await client.rpc(name);
  if (rpc.error) return [];
  return asDirectorPendingRpcRawRows(rpc.data);
}

export async function listPending(pageInput?: PageInput): Promise<DirectorPendingRow[]> {
  const page = normalizePage(pageInput, { pageSize: 50, maxPageSize: 100 });
  const ridMap = new Map<string, number>();
  let ridSeq = 1;

  const normalize = (arr: DirectorPendingRpcRawRow[]): DirectorPendingRow[] =>
    arr.map((r, i) => {
      const raw =
        r.request_id ?? r.request_id_old ?? r.request ?? r.request_uuid ?? r.request_id_text ?? "";
      let ridNum = Number(raw);
      if (!Number.isFinite(ridNum) || ridNum <= 0) {
        const key = String(raw || "");
        if (!ridMap.has(key)) ridMap.set(key, ridSeq++);
        ridNum = ridMap.get(key)!;
      }
      return {
        id: Number(r.id ?? i + 1),
        request_id: ridNum,
        request_item_id: String(r.request_item_id ?? r.id ?? ""),
        name_human: String(r.name_human ?? ""),
        qty: Number(r.qty ?? 0),
        uom: r.uom == null ? null : String(r.uom),
      };
    });

  try {
    const rpcRows = await callPendingRpc("list_pending_foreman_items");
    if (rpcRows.length) return normalize(rpcRows);

    const rpcRowsCompat = await callPendingRpc("listPending");
    if (rpcRowsCompat.length) return normalize(rpcRowsCompat);

    const rpcRowsLegacy = await callPendingRpc("list_pending");
    if (rpcRowsLegacy.length) return normalize(rpcRowsLegacy);

    const rpcRowsAlt = await callPendingRpc("listpending");
    if (rpcRowsAlt.length) return normalize(rpcRowsAlt);
  } catch (e) {
    logDirectorApiDebug("[listPending] rpc failed → fallback", parseErr(e));
  }

  // fallback (как у тебя было)
  try {
    const reqs = await client
      .from("requests")
      .select("id, id_old")
      .order("id", { ascending: true })
      .range(page.from, page.to)
      .eq("status", asRequestStatus("На утверждении"));
    const requestRows = asDirectorRequestIdLookupRows(reqs.data);
    const ids = requestRows.map((r) => String(r.id ?? ""));
    if (!ids.length) return [];

    const idOldByUuid = new Map<string, number>();
    requestRows.forEach((r) => {
      if (Number.isFinite(r.id_old)) idOldByUuid.set(String(r.id), Number(r.id_old));
    });

    const ri = await loadPagedRowsWithCeiling<DirectorRequestItemFallbackRow>(() =>
      createGuardedPagedQuery(
        client
          .from("request_items")
          .select("id,request_id,name_human,qty,uom,status")
          .in("request_id", ids)
          .neq("status", asRequestStatus("Утверждено"))
          .order("request_id", { ascending: true })
          .order("id", { ascending: true }),
        isDirectorRequestItemFallbackRow,
        "director.listPending.request_items_fallback",
      ),
      DIRECTOR_REFERENCE_PAGE_DEFAULTS,
    );

    if (ri.error) throw ri.error;

    const requestItemRows = asDirectorRequestItemFallbackRows(ri.data);
    const out: DirectorPendingRow[] = [];
    for (let i = 0; i < requestItemRows.length; i++) {
      const r = requestItemRows[i];
      const uuid = String(r.request_id);
      let ridNum = idOldByUuid.get(uuid);
      if (!Number.isFinite(ridNum)) {
        if (!ridMap.has(uuid)) ridMap.set(uuid, ridSeq++);
        ridNum = ridMap.get(uuid)!;
      }
      out.push({
        id: i + 1,
        request_id: ridNum!,
        request_item_id: String(r.id ?? ""),
        name_human: String(r.name_human ?? ""),
        qty: Number(r.qty ?? 0),
        uom: r.uom == null ? null : String(r.uom),
      });
    }
    return out;
  } catch (e) {
    logDirectorApiDebug("[listPending/fallback]", parseErr(e));
    return [];
  }
}

export async function approve(approvalId: number | string) {
  try {
    const rpc = await client.rpc("approve_one", { p_proposal_id: toRpcId(approvalId) });
    if (!rpc.error) {
      const accepted = validateRpcResponse(rpc.data, isDirectorLegacyDecisionRpcResponse, {
        rpcName: "approve_one",
        caller: "src/lib/api/director.approve",
        domain: "director",
      });
      if (accepted !== false) return true;
      throw new Error("approve_one returned false");
    }
  } catch (error) {
    recordDirectorApiWarning("approve_rpc_failed", error, {
      approvalId: String(approvalId),
    });
  }

  const upd = await client
    .from("proposals")
    .update({ status: "Утверждено" })
    .eq("id", String(approvalId))
    .eq("status", "На утверждении")
    .select("id")
    .maybeSingle();

  if (upd.error) throw upd.error;
  return !!upd.data;
}

export async function reject(approvalId: number | string, _reason = "Без причины") {
  try {
    const rpc = await client.rpc("reject_one", { p_proposal_id: toRpcId(approvalId) });
    if (!rpc.error) {
      const accepted = validateRpcResponse(rpc.data, isDirectorLegacyDecisionRpcResponse, {
        rpcName: "reject_one",
        caller: "src/lib/api/director.reject",
        domain: "director",
      });
      if (accepted !== false) return true;
      throw new Error("reject_one returned false");
    }
  } catch (error) {
    recordDirectorApiWarning("reject_rpc_failed", error, {
      approvalId: String(approvalId),
    });
  }

  const upd = await client
    .from("proposals")
    .update({ status: "Отклонено" })
    .eq("id", String(approvalId))
    .eq("status", "На утверждении")
    .select("id")
    .maybeSingle();

  if (upd.error) throw upd.error;
  return !!upd.data;
}

export async function directorReturnToBuyer(
  a: { proposalId: string | number; comment?: string } | string | number,
  b?: string | null
) {
  const payload = typeof a === "object" && a !== null ? a : null;
  const pid = payload ? String(payload.proposalId) : String(a);
  const comment = payload?.comment ?? b;
  const c = (comment ?? "").trim() || null;

  const args: DirectorReturnArgs = {
    p_proposal_id: pid,
    p_comment: c,
  };
  const { data, error } = await callDirectorReturnMinAutoRpc(args);

  if (error) throw error;
  validateRpcResponse(data, isRpcVoidResponse, {
    rpcName: "director_return_min_auto",
    caller: "src/lib/api/director.directorReturnToBuyer",
    domain: "director",
  });
  return true;
}

export async function listDirectorInbox(
  status: "На утверждении" | "Утверждено" | "Отклонено" = "На утверждении"
) {
  const args: { p_status?: DirectorInboxStatusArg } = { p_status: status };
  // SCALE_BOUND_EXCEPTION: legacy director inbox list RPC has no pagination args; migrated screens should use director_pending_proposals_scope_v1.
  const { data, error } = await client.rpc("list_director_inbox", args);
  if (error) {
    logDirectorApiDebug("[listDirectorInbox]", parseErr(error));
    return [];
  }
  const validated = validateRpcResponse(data, isDirectorInboxRpcResponse, {
    rpcName: "list_director_inbox",
    caller: "src/lib/api/director.listDirectorInbox",
    domain: "director",
  });
  const rows = (validated ?? []) as DirectorInboxRow[];
  return rows.filter((r) => (r?.kind ?? "") !== "request");
}
