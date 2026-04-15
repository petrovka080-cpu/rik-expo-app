import { supabase } from "../../lib/supabaseClient";
import type { Database } from "../../lib/database.types";
import { classifyRpcCompatError, parseErr } from "../../lib/api/_core";
import { normalizeRuText } from "../../lib/text/encoding";

type SubcontractsTable = Database["public"]["Tables"]["subcontracts"];
type SubcontractRow = SubcontractsTable["Row"];
type SubcontractUpdate = SubcontractsTable["Update"];
type SubcontractCreateArgs = Database["public"]["Functions"]["subcontract_create_v1"]["Args"];
type SubcontractCreateDraftArgs = Database["public"]["Functions"]["subcontract_create_draft"]["Args"];
type SubcontractApproveArgs = Database["public"]["Functions"]["subcontract_approve_v1"]["Args"];
type SubcontractRejectArgs = Database["public"]["Functions"]["subcontract_reject_v1"]["Args"];
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
  name: ru(row.name, "РџРѕР·РёС†РёСЏ"),
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
  p_foreman_name: ruOrNull(foremanName),
  p_contractor_org: patch.contractor_org ?? null,
  p_contractor_inn: patch.contractor_inn ?? null,
  p_contractor_rep: patch.contractor_rep ?? null,
  p_contractor_phone: patch.contractor_phone ?? null,
  p_contract_number: patch.contract_number ?? null,
  p_contract_date: asDate(patch.contract_date),
  p_object_name: patch.object_name ?? null,
  p_work_zone: patch.work_zone ?? null,
  p_work_type: patch.work_type ?? null,
  p_qty_planned: patch.qty_planned ?? null,
  p_uom: patch.uom ?? null,
  p_date_start: asDate(patch.date_start),
  p_date_end: asDate(patch.date_end),
  p_work_mode: patch.work_mode ?? null,
  p_price_per_unit: patch.price_per_unit ?? null,
  p_total_price: patch.total_price ?? null,
  p_price_type: patch.price_type ?? null,
  p_foreman_comment: patch.foreman_comment ?? null,
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

const ensureSubcontractCreateSucceeded = (
  data: unknown,
): Pick<Subcontract, "id" | "display_no"> => {
  const parsed = parseSubcontractCreateResult(data);
  if (!parsed) {
    logSubcontractsDebug("create.invalid_payload", {
      operation: "create",
      payload: data,
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
      payload: data,
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
  const { data, error } = await supabase.rpc("subcontract_create_v1", payload);
  if (error) throw error;
  return ensureSubcontractCreateSucceeded(data);
};

const runLegacySubcontractCreateCompat = async (
  payload: SubcontractCreateDraftArgs,
): Promise<Pick<Subcontract, "id" | "display_no">> => {
  const { data, error } = await supabase.rpc("subcontract_create_draft", payload);
  if (error) throw error;
  return ensureSubcontractCreateSucceeded(data);
};

const runSubcontractStatusMutation = async (
  operation: Extract<SubcontractMutationOperation, "approve" | "reject">,
  rpcName: "subcontract_approve_v1" | "subcontract_reject_v1",
  args: SubcontractApproveArgs | SubcontractRejectArgs,
): Promise<void> => {
  const { data, error } = await supabase.rpc(rpcName, args);
  if (error) {
    logSubcontractsDebug(`${operation}.rpc_failed`, {
      operation,
      rpcName,
      message: parseErr(error),
    });
    throw error;
  }
  ensureSubcontractStatusMutationSucceeded(operation, data);
};

export const STATUS_CONFIG: Record<SubcontractStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "Р§РµСЂРЅРѕРІРёРє", bg: "#E2E8F0", fg: "#475569" },
  pending: { label: "РќР° СѓС‚РІРµСЂР¶РґРµРЅРёРё", bg: "#FEF3C7", fg: "#92400E" },
  approved: { label: "Р’ СЂР°Р±РѕС‚Рµ", bg: "#DCFCE7", fg: "#166534" },
  rejected: { label: "РћС‚РєР»РѕРЅРµРЅРѕ", bg: "#FEE2E2", fg: "#991B1B" },
  closed: { label: "Р—Р°РєСЂС‹С‚Р°", bg: "#F1F5F9", fg: "#64748B" },
};

export const WORK_MODE_OPTIONS: { value: SubcontractWorkMode; label: string }[] = [
  { value: "labor_only", label: "РўРѕР»СЊРєРѕ СЂР°Р±РѕС‡РёРµ" },
  { value: "turnkey", label: "РџРѕРґ РєР»СЋС‡" },
  { value: "mixed", label: "РЎРјРµС€Р°РЅРЅС‹Р№" },
];

export const PRICE_TYPE_OPTIONS: { value: SubcontractPriceType; label: string }[] = [
  { value: "by_volume", label: "Р—Р° РѕР±СЉС‘Рј" },
  { value: "by_shift", label: "Р—Р° СЃРјРµРЅСѓ" },
  { value: "by_hour", label: "Р—Р° С‡Р°СЃ" },
];

export const WORK_MODE_LABEL: Record<SubcontractWorkMode, string> = {
  labor_only: "РўРѕР»СЊРєРѕ СЂР°Р±РѕС‡РёРµ",
  turnkey: "РџРѕРґ РєР»СЋС‡",
  mixed: "РЎРјРµС€Р°РЅРЅС‹Р№",
};

export const PRICE_TYPE_LABEL: Record<SubcontractPriceType, string> = {
  by_volume: "Р—Р° РѕР±СЉС‘Рј",
  by_shift: "Р—Р° СЃРјРµРЅСѓ",
  by_hour: "Р—Р° С‡Р°СЃ",
};

export function fmtAmount(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "вЂ”";
  return Number(v).toLocaleString("ru-RU");
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "вЂ”";
  return new Date(iso).toLocaleDateString("ru-RU");
}

export async function listForemanSubcontracts(userId: string): Promise<Subcontract[]> {
  const { data, error } = await supabase
    .from("subcontracts")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeSubcontractRow) : [];
}

export async function listDirectorSubcontracts(): Promise<Subcontract[]> {
  const { data, error } = await supabase
    .from("subcontracts")
    .select("*")
    .not("status", "eq", "draft")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeSubcontractRow) : [];
}

export async function listAccountantSubcontracts(): Promise<Subcontract[]> {
  const { data, error } = await supabase
    .from("subcontracts")
    .select("*")
    .eq("status", "approved")
    .order("approved_at", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeSubcontractRow) : [];
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

export async function listSubcontractItems(subcontractId: string): Promise<SubcontractItem[]> {
  const sid = String(subcontractId || "").trim();
  if (!sid) return [];
  const { data, error } = await supabase
    .from("subcontract_items")
    .select("*")
    .eq("subcontract_id", sid)
    .eq("status", "draft")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeSubcontractItemRow) : [];
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
    name: ru(item.name, "РџРѕР·РёС†РёСЏ"),
    qty: Number(item.qty) > 0 ? Number(item.qty) : 1,
    uom: ruOrNull(item.uom),
    status: "draft",
  }));

  const { data, error } = await supabase
    .from("subcontract_items")
    .insert(payload)
    .select("*");
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
