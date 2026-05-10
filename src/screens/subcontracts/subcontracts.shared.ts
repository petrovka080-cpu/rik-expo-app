import { supabase } from "../../lib/supabaseClient";
import type { Database } from "../../lib/database.types";
import { classifyRpcCompatError, parseErr } from "../../lib/api/_core";
import { validateRpcResponse } from "../../lib/api/queryBoundary";
import { normalizeRuText } from "../../lib/text/encoding";
import {
  callSubcontractCreateDraftRpc,
  callSubcontractCreateRpc,
  callSubcontractStatusMutationRpc,
  type SubcontractApproveArgs,
  type SubcontractCreateArgs,
  type SubcontractCreateDraftArgs,
  type SubcontractRejectArgs,
  type SubcontractStatusRpcName,
} from "./subcontracts.shared.transport";

type SubcontractsTable = Database["public"]["Tables"]["subcontracts"];
type SubcontractRow = SubcontractsTable["Row"];
type SubcontractUpdate = SubcontractsTable["Update"];
type SubcontractItemsTable = Database["public"]["Tables"]["subcontract_items"];
type SubcontractItemRow = SubcontractItemsTable["Row"];
type SubcontractItemInsert = SubcontractItemsTable["Insert"];

type SubcontractMutationOperation = "create" | "approve" | "reject";
type SubcontractStatusMutationPath = "approved" | "already_approved" | "rejected" | "already_rejected";
type SubcontractCreateParseResult =
  | { ok: true; row: Pick<Subcontract, "id" | "display_no"> }
  | { ok: false; failureCode: string; failureMessage: string };
type SubcontractStatusMutationParseResult =
  | {
      ok: true;
      mutationPath: SubcontractStatusMutationPath;
      subcontract: {
        id: string;
        status: SubcontractStatus;
        approvedAt: string | null;
        rejectedAt: string | null;
        directorComment: string | null;
      };
    }
  | {
      ok: false;
      failureCode: string;
      failureMessage: string;
      currentStatus: string | null;
    };

class SubcontractMutationError extends Error {
  readonly operation: SubcontractMutationOperation;
  readonly code: string;
  readonly currentStatus: string | null;

  constructor(params: {
    operation: SubcontractMutationOperation;
    failureCode: string;
    failureMessage: string;
    currentStatus?: string | null;
  }) {
    super(params.failureMessage || `subcontract ${params.operation} failed`);
    this.name = "SubcontractMutationError";
    this.operation = params.operation;
    this.code = params.failureCode;
    this.currentStatus = params.currentStatus ?? null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const toNullableString = (value: unknown): string | null => {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const logSubcontractsDebug = (scope: string, details?: Record<string, unknown>) => {
  if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ === true) {
    console.warn(`[subcontracts.shared] ${scope}`, details ?? {});
  }
};

const ru = (value: unknown, fallback = ""): string => {
  const normalized = String(normalizeRuText(String(value ?? fallback)) ?? "").trim();
  return normalized || fallback;
};

const ruOrNull = (value: unknown): string | null => {
  if (value == null) return null;
  const normalized = ru(value);
  return normalized || null;
};

const asDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const toOptionalRpcArg = <T>(value: T | null | undefined): T | undefined =>
  value == null ? undefined : value;

export type SubcontractStatus = "draft" | "pending" | "approved" | "rejected" | "closed";
export type SubcontractWorkMode = "labor_only" | "turnkey" | "mixed";
export type SubcontractPriceType = "by_volume" | "by_shift" | "by_hour";

export type Subcontract = {
  id: string;
  display_no?: string | null;
  year?: number | null;
  seq?: number | null;
  created_at: string;
  created_by?: string | null;
  status: SubcontractStatus;
  foreman_name: string | null;
  contractor_org: string | null;
  contractor_inn: string | null;
  contractor_rep: string | null;
  contractor_phone: string | null;
  contract_number: string | null;
  contract_date: string | null;
  object_name: string | null;
  work_zone: string | null;
  work_type: string | null;
  qty_planned: number | null;
  uom: string | null;
  date_start: string | null;
  date_end: string | null;
  work_mode: SubcontractWorkMode | null;
  price_per_unit: number | null;
  total_price: number | null;
  price_type: SubcontractPriceType | null;
  foreman_comment: string | null;
  director_comment: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
};

export type SubcontractItemSource = "catalog" | "smeta";

export type SubcontractItem = {
  id: string;
  created_at: string;
  subcontract_id: string;
  created_by: string | null;
  source: SubcontractItemSource;
  rik_code: string | null;
  name: string;
  qty: number;
  uom: string | null;
  status: "draft" | "canceled";
};

export type SubcontractListStatusFilter = Exclude<SubcontractStatus, "draft">;

export type SubcontractPageRequest = {
  offset?: number;
  pageSize?: number;
};

export type SubcontractPageResult<T> = {
  items: T[];
  nextOffset: number | null;
  hasMore: boolean;
  offset: number;
  pageSize: number;
};

export const SUBCONTRACT_DEFAULT_PAGE_SIZE = 50;
export const SUBCONTRACT_MAX_PAGE_SIZE = 100;
export const SUBCONTRACT_COLLECT_ALL_MAX_ROWS = 5000;
export const SUBCONTRACT_COLLECT_ALL_MAX_PAGES = Math.ceil(
  SUBCONTRACT_COLLECT_ALL_MAX_ROWS / SUBCONTRACT_MAX_PAGE_SIZE,
);
const SUBCONTRACT_ROW_SELECT =
  "id, display_no, year, seq, created_at, created_by, status, foreman_name, contractor_org, contractor_inn, contractor_rep, contractor_phone, contract_number, contract_date, object_name, work_zone, work_type, qty_planned, uom, date_start, date_end, work_mode, price_per_unit, total_price, price_type, foreman_comment, director_comment, submitted_at, approved_at, rejected_at";
const SUBCONTRACT_ITEM_ROW_SELECT =
  "id, created_at, subcontract_id, created_by, source, rik_code, name, qty, uom, status";

export type NewSubcontractItem = {
  source: SubcontractItemSource;
  rik_code?: string | null;
  name: string;
  qty: number;
  uom?: string | null;
};

const normalizeSubcontractStatus = (value: unknown): SubcontractStatus => {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "pending":
      return "pending";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "closed":
      return "closed";
    default:
      return "draft";
  }
};

const normalizeSubcontractWorkMode = (value: unknown): SubcontractWorkMode | null => {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "labor_only":
      return "labor_only";
    case "turnkey":
      return "turnkey";
    case "mixed":
      return "mixed";
    default:
      return null;
  }
};

const normalizeSubcontractPriceType = (value: unknown): SubcontractPriceType | null => {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "by_volume":
      return "by_volume";
    case "by_shift":
      return "by_shift";
    case "by_hour":
      return "by_hour";
    default:
      return null;
  }
};

const normalizeSubcontractItemSource = (value: unknown): SubcontractItemSource =>
  String(value ?? "").trim().toLowerCase() === "smeta" ? "smeta" : "catalog";

const normalizeSubcontractItemStatus = (value: unknown): "draft" | "canceled" =>
  String(value ?? "").trim().toLowerCase() === "canceled" ? "canceled" : "draft";

const toInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const clampInt = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizePageRequest = (request?: SubcontractPageRequest) => {
  const offset = Math.max(0, toInt(request?.offset, 0));
  const pageSize = clampInt(
    toInt(request?.pageSize, SUBCONTRACT_DEFAULT_PAGE_SIZE),
    1,
    SUBCONTRACT_MAX_PAGE_SIZE,
  );
  return {
    offset,
    pageSize,
    from: offset,
    toInclusive: offset + pageSize,
  };
};

const emptyPageResult = <T>(request?: SubcontractPageRequest): SubcontractPageResult<T> => {
  const page = normalizePageRequest(request);
  return {
    items: [],
    nextOffset: null,
    hasMore: false,
    offset: page.offset,
    pageSize: page.pageSize,
  };
};

const buildPageResult = <TRow, TItem>(
  rows: TRow[] | null | undefined,
  mapper: (row: TRow) => TItem,
  request: ReturnType<typeof normalizePageRequest>,
): SubcontractPageResult<TItem> => {
  const mapped = Array.isArray(rows) ? rows.map(mapper) : [];
  const hasMore = mapped.length > request.pageSize;
  return {
    items: hasMore ? mapped.slice(0, request.pageSize) : mapped,
    nextOffset: hasMore ? request.offset + request.pageSize : null,
    hasMore,
    offset: request.offset,
    pageSize: request.pageSize,
  };
};

async function collectAllPages<T>(
  loadPage: (request: SubcontractPageRequest) => Promise<SubcontractPageResult<T>>,
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  let completed = false;
  for (let pageIndex = 0; pageIndex < SUBCONTRACT_COLLECT_ALL_MAX_PAGES; pageIndex += 1) {
    const page = await loadPage({
      offset,
      pageSize: SUBCONTRACT_MAX_PAGE_SIZE,
    });
    if (items.length + page.items.length > SUBCONTRACT_COLLECT_ALL_MAX_ROWS) {
      throw new Error(
        `Subcontract full list read exceeded max row ceiling (${SUBCONTRACT_COLLECT_ALL_MAX_ROWS})`,
      );
    }
    items.push(...page.items);
    if (!page.hasMore || page.nextOffset == null) {
      completed = true;
      break;
    }
    if (page.nextOffset <= offset) {
      throw new Error("Subcontract full list read pagination did not advance");
    }
    if (items.length >= SUBCONTRACT_COLLECT_ALL_MAX_ROWS) {
      throw new Error(
        `Subcontract full list read exceeded max row ceiling (${SUBCONTRACT_COLLECT_ALL_MAX_ROWS})`,
      );
    }
    offset = page.nextOffset;
  }
  if (!completed) {
    throw new Error(
      `Subcontract full list read exceeded max page ceiling (${SUBCONTRACT_COLLECT_ALL_MAX_PAGES})`,
    );
  }
  return items;
}

export function mergeSubcontractPages<T extends { id: string }>(current: T[], next: T[]): T[] {
  if (next.length === 0) return current;
  const seen = new Set(current.map((item) => String(item.id)));
  const appended = next.filter((item) => !seen.has(String(item.id)));
  return appended.length > 0 ? [...current, ...appended] : current;
}

const normalizeSubcontractPatch = (patch: Partial<Subcontract>): SubcontractUpdate => ({
  ...patch,
  foreman_name: ruOrNull(patch.foreman_name),
  contractor_org: ruOrNull(patch.contractor_org),
  contractor_inn: ruOrNull(patch.contractor_inn),
  contractor_rep: ruOrNull(patch.contractor_rep),
  contractor_phone: ruOrNull(patch.contractor_phone),
  contract_number: ruOrNull(patch.contract_number),
  object_name: ruOrNull(patch.object_name),
  work_zone: ruOrNull(patch.work_zone),
  work_type: ruOrNull(patch.work_type),
  uom: ruOrNull(patch.uom),
  foreman_comment: ruOrNull(patch.foreman_comment),
  director_comment: ruOrNull(patch.director_comment),
});

const normalizeSubcontractRow = (row: SubcontractRow): Subcontract => ({
  ...row,
  created_at: String(row.created_at ?? ""),
  status: normalizeSubcontractStatus(row.status),
  work_mode: normalizeSubcontractWorkMode(row.work_mode),
  price_type: normalizeSubcontractPriceType(row.price_type),
  display_no: ruOrNull(row.display_no),
  foreman_name: ruOrNull(row.foreman_name),
  contractor_org: ruOrNull(row.contractor_org),
  contractor_inn: ruOrNull(row.contractor_inn),
  contractor_rep: ruOrNull(row.contractor_rep),
  contractor_phone: ruOrNull(row.contractor_phone),
  contract_number: ruOrNull(row.contract_number),
  object_name: ruOrNull(row.object_name),
  work_zone: ruOrNull(row.work_zone),
  work_type: ruOrNull(row.work_type),
  uom: ruOrNull(row.uom),
  foreman_comment: ruOrNull(row.foreman_comment),
  director_comment: ruOrNull(row.director_comment),
});

const normalizeSubcontractItemRow = (row: SubcontractItemRow): SubcontractItem => ({
  id: String(row.id),
  created_at: String(row.created_at ?? ""),
  subcontract_id: String(row.subcontract_id),
  created_by: row.created_by ?? null,
  source: normalizeSubcontractItemSource(row.source),
  rik_code: row.rik_code ?? null,
  name: ru(row.name, "Позиция"),
  qty: Number.isFinite(Number(row.qty)) ? Number(row.qty) : 0,
  uom: ruOrNull(row.uom),
  status: normalizeSubcontractItemStatus(row.status),
});

const buildSubcontractCreatePayload = (
  userId: string,
  foremanName: string,
  patch: SubcontractUpdate,
): SubcontractCreateArgs => ({
  p_created_by: userId,
  p_foreman_name: toOptionalRpcArg(ruOrNull(foremanName)),
  p_contractor_org: toOptionalRpcArg(patch.contractor_org),
  p_contractor_inn: toOptionalRpcArg(patch.contractor_inn),
  p_contractor_rep: toOptionalRpcArg(patch.contractor_rep),
  p_contractor_phone: toOptionalRpcArg(patch.contractor_phone),
  p_contract_number: toOptionalRpcArg(patch.contract_number),
  p_contract_date: toOptionalRpcArg(asDate(patch.contract_date)),
  p_object_name: toOptionalRpcArg(patch.object_name),
  p_work_zone: toOptionalRpcArg(patch.work_zone),
  p_work_type: toOptionalRpcArg(patch.work_type),
  p_qty_planned: toOptionalRpcArg(patch.qty_planned),
  p_uom: toOptionalRpcArg(patch.uom),
  p_date_start: toOptionalRpcArg(asDate(patch.date_start)),
  p_date_end: toOptionalRpcArg(asDate(patch.date_end)),
  p_work_mode: toOptionalRpcArg(patch.work_mode),
  p_price_per_unit: toOptionalRpcArg(patch.price_per_unit),
  p_total_price: toOptionalRpcArg(patch.total_price),
  p_price_type: toOptionalRpcArg(patch.price_type),
  p_foreman_comment: toOptionalRpcArg(patch.foreman_comment),
});

const buildLegacySubcontractCreatePayload = (
  payload: SubcontractCreateArgs,
): SubcontractCreateDraftArgs => ({
  p_created_by: payload.p_created_by,
  p_foreman_name: payload.p_foreman_name,
  p_contractor_org: payload.p_contractor_org,
  p_contractor_rep: payload.p_contractor_rep,
  p_contractor_phone: payload.p_contractor_phone,
  p_contract_number: payload.p_contract_number,
  p_contract_date: payload.p_contract_date,
  p_object_name: payload.p_object_name,
  p_work_zone: payload.p_work_zone,
  p_work_type: payload.p_work_type,
  p_qty_planned: payload.p_qty_planned,
  p_uom: payload.p_uom,
  p_date_start: payload.p_date_start,
  p_date_end: payload.p_date_end,
  p_work_mode: payload.p_work_mode,
  p_price_per_unit: payload.p_price_per_unit,
  p_total_price: payload.p_total_price,
  p_price_type: payload.p_price_type,
  p_foreman_comment: payload.p_foreman_comment,
});

const parseSubcontractCreateResult = (data: unknown): SubcontractCreateParseResult | null => {
  if (!isRecord(data)) return null;

  if (data.ok === false) {
    return {
      ok: false,
      failureCode: String(data.failure_code ?? data.failureCode ?? "subcontract_create_failed"),
      failureMessage: String(
        data.failure_message ?? data.failureMessage ?? "subcontract create failed",
      ),
    };
  }

  const source = isRecord(data.subcontract) ? data.subcontract : data;
  const id = toNullableString(source.id);
  if (!id) return null;

  return {
    ok: true,
    row: {
      id,
      display_no: toNullableString(source.display_no),
    },
  };
};

const parseSubcontractStatusMutationResult = (
  operation: Extract<SubcontractMutationOperation, "approve" | "reject">,
  data: unknown,
): SubcontractStatusMutationParseResult | null => {
  if (!isRecord(data)) return null;

  if (data.ok === false) {
    const subcontract = isRecord(data.subcontract) ? data.subcontract : null;
    return {
      ok: false,
      failureCode: String(data.failure_code ?? data.failureCode ?? `subcontract_${operation}_failed`),
      failureMessage: String(
        data.failure_message ?? data.failureMessage ?? `subcontract ${operation} failed`,
      ),
      currentStatus: toNullableString(data.current_status ?? subcontract?.status),
    };
  }

  const subcontract = isRecord(data.subcontract) ? data.subcontract : null;
  const id = toNullableString(subcontract?.id);
  const mutationPathRaw = String(data.mutation_path ?? data.mutationPath ?? "").trim().toLowerCase();
  let mutationPath: SubcontractStatusMutationPath;

  if (operation === "approve") {
    if (mutationPathRaw === "already_approved") {
      mutationPath = "already_approved" as const;
    } else if (mutationPathRaw === "approved") {
      mutationPath = "approved" as const;
    } else {
      return null;
    }
  } else if (mutationPathRaw === "already_rejected") {
    mutationPath = "already_rejected" as const;
  } else if (mutationPathRaw === "rejected") {
    mutationPath = "rejected" as const;
  } else {
    return null;
  }

  if (!id) return null;

  return {
    ok: true,
    mutationPath,
    subcontract: {
      id,
      status: normalizeSubcontractStatus(subcontract?.status),
      approvedAt: toNullableString(subcontract?.approved_at ?? subcontract?.approvedAt),
      rejectedAt: toNullableString(subcontract?.rejected_at ?? subcontract?.rejectedAt),
      directorComment: ruOrNull(subcontract?.director_comment ?? subcontract?.directorComment),
    },
  };
};

const isSubcontractCreateRpcResponse = (value: unknown): value is Record<string, unknown> =>
  parseSubcontractCreateResult(value) != null;

const isSubcontractApproveRpcResponse = (value: unknown): value is Record<string, unknown> =>
  parseSubcontractStatusMutationResult("approve", value) != null;

const isSubcontractRejectRpcResponse = (value: unknown): value is Record<string, unknown> =>
  parseSubcontractStatusMutationResult("reject", value) != null;

const ensureSubcontractCreateSucceeded = (
  data: unknown,
): Pick<Subcontract, "id" | "display_no"> => {
  const parsed = parseSubcontractCreateResult(data);
  if (!parsed) {
    logSubcontractsDebug("create.invalid_payload", {
      operation: "create",
    });
    throw new Error("subcontract create returned invalid payload");
  }

  if (parsed.ok === false) {
    logSubcontractsDebug("create.controlled_failure", {
      operation: "create",
      failureCode: parsed.failureCode,
      failureMessage: parsed.failureMessage,
    });
    throw new SubcontractMutationError({
      operation: "create",
      failureCode: parsed.failureCode,
      failureMessage: parsed.failureMessage,
    });
  }

  return parsed.row;
};

const ensureSubcontractStatusMutationSucceeded = (
  operation: Extract<SubcontractMutationOperation, "approve" | "reject">,
  data: unknown,
): void => {
  const parsed = parseSubcontractStatusMutationResult(operation, data);
  if (!parsed) {
    logSubcontractsDebug(`${operation}.invalid_payload`, {
      operation,
    });
    throw new Error(`subcontract ${operation} returned invalid payload`);
  }

  if (parsed.ok === false) {
    logSubcontractsDebug(`${operation}.controlled_failure`, {
      operation,
      failureCode: parsed.failureCode,
      failureMessage: parsed.failureMessage,
      currentStatus: parsed.currentStatus,
    });
    throw new SubcontractMutationError({
      operation,
      failureCode: parsed.failureCode,
      failureMessage: parsed.failureMessage,
      currentStatus: parsed.currentStatus,
    });
  }

  const expectedStatus = operation === "approve" ? "approved" : "rejected";
  if (parsed.subcontract.status !== expectedStatus) {
    logSubcontractsDebug(`${operation}.invalid_payload`, {
      operation,
      mutationPath: parsed.mutationPath,
      currentStatus: parsed.subcontract.status,
    });
    throw new Error(`subcontract ${operation} returned invalid payload`);
  }
};

const runCanonicalSubcontractCreate = async (
  payload: SubcontractCreateArgs,
): Promise<Pick<Subcontract, "id" | "display_no">> => {
  const { data, error } = await callSubcontractCreateRpc(payload);
  if (error) throw error;
  const validated = validateRpcResponse(data, isSubcontractCreateRpcResponse, {
    rpcName: "subcontract_create_v1",
    caller: "runCanonicalSubcontractCreate",
    domain: "contractor",
  });
  return ensureSubcontractCreateSucceeded(validated);
};

const runLegacySubcontractCreateCompat = async (
  payload: SubcontractCreateDraftArgs,
): Promise<Pick<Subcontract, "id" | "display_no">> => {
  const { data, error } = await callSubcontractCreateDraftRpc(payload);
  if (error) throw error;
  const validated = validateRpcResponse(data, isSubcontractCreateRpcResponse, {
    rpcName: "subcontract_create_draft",
    caller: "runLegacySubcontractCreateCompat",
    domain: "contractor",
  });
  return ensureSubcontractCreateSucceeded(validated);
};

const runSubcontractStatusMutation = async (
  operation: Extract<SubcontractMutationOperation, "approve" | "reject">,
  rpcName: SubcontractStatusRpcName,
  args: SubcontractApproveArgs | SubcontractRejectArgs,
): Promise<void> => {
  const { data, error } = await callSubcontractStatusMutationRpc(rpcName, args);
  if (error) {
    logSubcontractsDebug(`${operation}.rpc_failed`, {
      operation,
      rpcName,
      message: parseErr(error),
    });
    throw error;
  }
  const validated = validateRpcResponse(
    data,
    operation === "approve" ? isSubcontractApproveRpcResponse : isSubcontractRejectRpcResponse,
    {
      rpcName,
      caller: "runSubcontractStatusMutation",
      domain: "contractor",
    },
  );
  ensureSubcontractStatusMutationSucceeded(operation, validated);
};

export const STATUS_CONFIG: Record<SubcontractStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "Черновик", bg: "#E2E8F0", fg: "#475569" },
  pending: { label: "На утверждении", bg: "#FEF3C7", fg: "#92400E" },
  approved: { label: "В работе", bg: "#DCFCE7", fg: "#166534" },
  rejected: { label: "Отклонено", bg: "#FEE2E2", fg: "#991B1B" },
  closed: { label: "Закрыта", bg: "#F1F5F9", fg: "#64748B" },
};

export const WORK_MODE_OPTIONS: { value: SubcontractWorkMode; label: string }[] = [
  { value: "labor_only", label: "Только рабочие" },
  { value: "turnkey", label: "Под ключ" },
  { value: "mixed", label: "Смешанный" },
];

export const PRICE_TYPE_OPTIONS: { value: SubcontractPriceType; label: string }[] = [
  { value: "by_volume", label: "За объём" },
  { value: "by_shift", label: "За смену" },
  { value: "by_hour", label: "За час" },
];

export const WORK_MODE_LABEL: Record<SubcontractWorkMode, string> = {
  labor_only: "Только рабочие",
  turnkey: "Под ключ",
  mixed: "Смешанный",
};

export const PRICE_TYPE_LABEL: Record<SubcontractPriceType, string> = {
  by_volume: "За объём",
  by_shift: "За смену",
  by_hour: "За час",
};

export function fmtAmount(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("ru-RU");
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU");
}

export async function listForemanSubcontractsPage(
  userId: string,
  request?: SubcontractPageRequest,
): Promise<SubcontractPageResult<Subcontract>> {
  const uid = String(userId || "").trim();
  if (!uid) return emptyPageResult(request);

  const page = normalizePageRequest(request);
  const { data, error } = await supabase
    .from("subcontracts")
    .select(SUBCONTRACT_ROW_SELECT)
    .eq("created_by", uid)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.from, page.toInclusive);
  if (error) throw error;
  return buildPageResult(data as SubcontractRow[] | null | undefined, normalizeSubcontractRow, page);
}

export async function listForemanSubcontracts(userId: string): Promise<Subcontract[]> {
  return await collectAllPages((request) => listForemanSubcontractsPage(userId, request));
}

export async function listDirectorSubcontractsPage(params?: {
  status?: SubcontractListStatusFilter | null;
  offset?: number;
  pageSize?: number;
}): Promise<SubcontractPageResult<Subcontract>> {
  const page = normalizePageRequest(params);
  let query = supabase
    .from("subcontracts")
    .select(SUBCONTRACT_ROW_SELECT)
    .not("status", "eq", "draft");
  if (params?.status) {
    query = query.eq("status", params.status);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.from, page.toInclusive);
  if (error) throw error;
  return buildPageResult(data as SubcontractRow[] | null | undefined, normalizeSubcontractRow, page);
}

export async function countDirectorSubcontracts(status?: SubcontractListStatusFilter | null): Promise<number> {
  let query = supabase
    .from("subcontracts")
    .select("id", { count: "exact", head: true })
    .not("status", "eq", "draft");
  if (status) {
    query = query.eq("status", status);
  }
  const { count, error } = await query;
  if (error) throw error;
  return Math.max(0, Number(count ?? 0));
}

export async function listDirectorSubcontracts(): Promise<Subcontract[]> {
  return await collectAllPages((request) => listDirectorSubcontractsPage(request));
}

export async function listAccountantSubcontractsPage(
  request?: SubcontractPageRequest,
): Promise<SubcontractPageResult<Subcontract>> {
  const page = normalizePageRequest(request);
  const { data, error } = await supabase
    .from("subcontracts")
    .select(SUBCONTRACT_ROW_SELECT)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.from, page.toInclusive);
  if (error) throw error;
  return buildPageResult(data as SubcontractRow[] | null | undefined, normalizeSubcontractRow, page);
}

export async function listAccountantSubcontracts(): Promise<Subcontract[]> {
  return await collectAllPages((request) => listAccountantSubcontractsPage(request));
}

export async function createSubcontractDraft(userId: string, foremanName: string): Promise<string> {
  const row = await createSubcontractDraftWithPatch(userId, foremanName, {});
  return row.id;
}

export async function createSubcontractDraftWithPatch(
  userId: string,
  foremanName: string,
  patch: Partial<Subcontract>,
): Promise<Pick<Subcontract, "id" | "display_no">> {
  const payload = buildSubcontractCreatePayload(userId, foremanName, normalizeSubcontractPatch(patch));

  try {
    return await runCanonicalSubcontractCreate(payload);
  } catch (error) {
    const decision = classifyRpcCompatError(error);
    if (!decision.allowNextVariant) {
      logSubcontractsDebug("create.rpc_failed", {
        operation: "create",
        reason: decision.reason,
        message: parseErr(error),
      });
      throw error;
    }

    logSubcontractsDebug("create.compat_legacy_rpc", {
      operation: "create",
      reason: decision.reason,
      message: parseErr(error),
      contractorInnDropped: payload.p_contractor_inn != null,
    });

    try {
      return await runLegacySubcontractCreateCompat(buildLegacySubcontractCreatePayload(payload));
    } catch (compatError) {
      logSubcontractsDebug("create.compat_failed", {
        operation: "create",
        message: parseErr(compatError),
      });
      throw compatError;
    }
  }
}

export async function updateSubcontract(id: string, patch: Partial<Subcontract>): Promise<void> {
  const { error } = await supabase
    .from("subcontracts")
    .update(normalizeSubcontractPatch(patch))
    .eq("id", id);
  if (error) throw error;
}

export async function submitSubcontract(id: string): Promise<void> {
  const { error } = await supabase
    .from("subcontracts")
    .update({ status: "pending", submitted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");
  if (error) throw error;
}

export async function approveSubcontract(id: string): Promise<void> {
  await runSubcontractStatusMutation("approve", "subcontract_approve_v1", {
    p_subcontract_id: String(id || "").trim(),
  });
}

export async function rejectSubcontract(id: string, comment: string): Promise<void> {
  const args: SubcontractRejectArgs = {
    p_subcontract_id: String(id || "").trim(),
  };
  const normalizedComment = ruOrNull(comment);
  if (normalizedComment != null) {
    args.p_director_comment = normalizedComment;
  }
  await runSubcontractStatusMutation("reject", "subcontract_reject_v1", args);
}

export async function listSubcontractItemsPage(
  subcontractId: string,
  request?: SubcontractPageRequest,
): Promise<SubcontractPageResult<SubcontractItem>> {
  const sid = String(subcontractId || "").trim();
  if (!sid) return emptyPageResult(request);
  const page = normalizePageRequest(request);
  const { data, error } = await supabase
    .from("subcontract_items")
    .select(SUBCONTRACT_ITEM_ROW_SELECT)
    .eq("subcontract_id", sid)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.from, page.toInclusive);
  if (error) throw error;
  return buildPageResult(data as SubcontractItemRow[] | null | undefined, normalizeSubcontractItemRow, page);
}

export async function listSubcontractItems(subcontractId: string): Promise<SubcontractItem[]> {
  return await collectAllPages((request) => listSubcontractItemsPage(subcontractId, request));
}

export async function appendSubcontractItems(
  subcontractId: string,
  createdBy: string | null,
  items: NewSubcontractItem[],
): Promise<SubcontractItem[]> {
  const sid = String(subcontractId || "").trim();
  if (!sid || !items.length) return [];

  const payload: SubcontractItemInsert[] = items.map((item) => ({
    subcontract_id: sid,
    created_by: createdBy || null,
    source: item.source,
    rik_code: item.rik_code ?? null,
    name: ru(item.name, "Позиция"),
    qty: Number(item.qty) > 0 ? Number(item.qty) : 1,
    uom: ruOrNull(item.uom),
    status: "draft",
  }));

  const { data, error } = await supabase
    .from("subcontract_items")
    .insert(payload)
    .select(SUBCONTRACT_ITEM_ROW_SELECT);
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeSubcontractItemRow) : [];
}

export async function removeSubcontractItem(itemId: string): Promise<void> {
  const iid = String(itemId || "").trim();
  if (!iid) return;
  const { error } = await supabase
    .from("subcontract_items")
    .delete()
    .eq("id", iid);
  if (error) throw error;
}

export async function clearSubcontractItems(subcontractId: string): Promise<void> {
  const sid = String(subcontractId || "").trim();
  if (!sid) return;
  const { error } = await supabase
    .from("subcontract_items")
    .delete()
    .eq("subcontract_id", sid);
  if (error) throw error;
}
