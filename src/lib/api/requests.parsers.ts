import type { Database } from "../database.types";
import type { ReqItemRow, RequestRecord } from "./types";

type RequestSubmitResultRow = Database["public"]["Functions"]["request_submit"]["Returns"];
type RequestSubmitAtomicRpcResult =
  Database["public"]["Functions"]["request_submit_atomic_v1"]["Returns"];

export type ParsedRequestSubmitAtomicSuccess = {
  ok: true;
  requestId: string;
  submitPath: string;
  hasPostDraftItems: boolean;
  reconciled: boolean;
  record: RequestRecord | null;
  verification: Record<string, unknown> | null;
};

export type ParsedRequestSubmitAtomicFailure = {
  ok: false;
  requestId: string;
  failureCode: string;
  failureMessage: string;
  validation: Record<string, unknown> | null;
  invalidItemIds: string[];
};

export type ParsedRequestSubmitAtomicResult =
  | ParsedRequestSubmitAtomicSuccess
  | ParsedRequestSubmitAtomicFailure;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const asText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const asBoolean = (value: unknown): boolean => value === true;

export function mapRequestRow(raw: unknown): RequestRecord | null {
  if (!isRecord(raw)) return null;
  const idRaw = raw.id ?? raw.request_id ?? null;
  if (!idRaw) return null;

  const id = String(idRaw);

  const norm = (v: unknown) => (v == null ? null : String(v).trim());

  const asNumber = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id,
    status: typeof raw.status === "string" ? raw.status : null,
    display_no: norm(raw.display_no ?? raw.number ?? raw.label ?? raw.display) || null,
    year: asNumber(raw.year),
    seq: asNumber(raw.seq),
    foreman_name: norm(raw.foreman_name),
    need_by: norm(raw.need_by),
    comment: norm(raw.comment),
    object_type_code: norm(raw.object_type_code),
    level_code: norm(raw.level_code),
    system_code: norm(raw.system_code),
    zone_code: norm(raw.zone_code),
    created_at: norm(raw.created_at),
  };
}

export function parseRequestItemRow(raw: unknown): ReqItemRow | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const requestId = raw.request_id;
  if (!id || (typeof requestId !== "string" && typeof requestId !== "number")) return null;
  return {
    id,
    request_id: requestId,
    name_human: typeof raw.name_human === "string" && raw.name_human.trim() ? raw.name_human : "вЂ”",
    qty: Number(raw.qty ?? 0),
    uom: typeof raw.uom === "string" ? raw.uom : null,
    status: typeof raw.status === "string" ? raw.status : null,
    supplier_hint: typeof raw.supplier_hint === "string" ? raw.supplier_hint : null,
    app_code: typeof raw.app_code === "string" ? raw.app_code : null,
    note: typeof raw.note === "string" ? raw.note : null,
  };
}

export function parseRequestItemsByRequestRows(data: unknown): ReqItemRow[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const parsed = parseRequestItemRow(row);
    return parsed ? [parsed] : [];
  });
}

export function parseRequestSubmitResultRow(data: unknown): RequestRecord | null {
  const row = data as RequestSubmitResultRow | null;
  return mapRequestRow(row);
}

export function parseRequestSubmitAtomicResult(
  data: unknown,
): ParsedRequestSubmitAtomicResult {
  const payload = isRecord(data) ? (data as RequestSubmitAtomicRpcResult & Record<string, unknown>) : {};
  const ok = asBoolean(payload.ok);
  const requestId = asText(payload.request_id ?? payload.requestId) ?? "";
  const validation = isRecord(payload.validation) ? payload.validation : null;
  const invalidItemIdsSource = payload.invalid_item_ids ?? payload.invalidItemIds;
  const invalidItemIds = Array.isArray(invalidItemIdsSource)
    ? invalidItemIdsSource
        .map((value) => asText(value))
        .filter((value): value is string => Boolean(value))
    : [];

  if (!ok) {
    return {
      ok: false,
      requestId,
      failureCode: asText(payload.failure_code ?? payload.failureCode) ?? "request_submit_failed",
      failureMessage:
        asText(payload.failure_message ?? payload.failureMessage) ??
        "Request submit was rejected by server truth.",
      validation,
      invalidItemIds,
    };
  }

  return {
    ok: true,
    requestId,
    submitPath: asText(payload.submit_path ?? payload.submitPath) ?? "rpc_submit",
    hasPostDraftItems: asBoolean(
      payload.has_post_draft_items ?? payload.hasPostDraftItems,
    ),
    reconciled: asBoolean(payload.reconciled),
    record: mapRequestRow(payload.request),
    verification: isRecord(payload.verification) ? payload.verification : null,
  };
}
