import {
  attachSubcontractAndObject,
  buildSubcontractLookups,
  buildSyntheticSubcontractRows,
  filterVisibleRows,
  selectScopedApprovedSubcontracts,
} from "./contractor.rows";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";

export type ContractorWorkRow = {
  progress_id: string;
  canonical_work_item_id?: string | null;
  canonical_source_kind?: string | null;
  created_at?: string | null;
  purchase_item_id?: string | null;
  work_code: string | null;
  work_name: string | null;
  object_name: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  request_id?: string | null;
  request_status?: string | null;
  contractor_job_id?: string | null;
  uom_id: string | null;
  qty_planned: number;
  qty_done: number;
  qty_left: number;
  unit_price?: number | null;
  work_status: string;
  contractor_id: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type WorkProgressRawRow = {
  id?: string | null;
  progress_id?: string | null;
  purchase_item_id?: string | null;
  object_id?: string | null;
};

type PurchaseItemRawRow = {
  id?: string | null;
  request_item_id?: string | null;
};

type RequestItemRawRow = {
  id?: string | null;
  request_id?: string | null;
};

type RequestRawRow = {
  id?: string | null;
  status?: string | null;
  contractor_job_id?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
};

type SubcontractObjectRawRow = {
  id?: string | null;
  object_name?: string | null;
};

type SubcontractLiteLike = {
  id: string;
  status?: string | null;
  object_name?: string | null;
  work_type?: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  contract_number?: string | null;
  contract_date?: string | null;
  created_at?: string | null;
  created_by?: string | null;
};

export type ContractorSubcontractCard = SubcontractLiteLike;

export type ContractorWorksBundleSourceMeta = {
  primaryOwner: "rpc_scope_v1" | "legacy_client_enrich";
  fallbackUsed: boolean;
  sourceKind: "rpc:contractor_works_bundle_scope_v1" | "legacy:view:v_works_fact+relational_enrich";
  rowParityStatus: "not_checked";
  backendFirstPrimary?: boolean;
};

export type ContractorWorksBundleResult = {
  rows: ContractorWorkRow[];
  subcontractCards: ContractorSubcontractCard[];
  debug: { isStaff: boolean; subcontractsFound: number; totalApproved: number };
  sourceMeta: ContractorWorksBundleSourceMeta;
};

type ContractorRpcScopeGuardResult = {
  rows: ContractorWorkRow[];
  subcontractCards: ContractorSubcontractCard[];
  filteredOutRows: number;
  filteredOutSubcontractCards: number;
  scopeGuardApplied: boolean;
};

type LoadContractorWorksBundleParams = {
  supabaseClient: any;
  normText: (v: unknown) => string;
  looksLikeUuid: (v: string) => boolean;
  pickWorkProgressRow: (row: WorkProgressRawRow) => string;
  myContractorId: string;
  myUserId: string;
  myContractorInn: string | null;
  myContractorCompany: string | null;
  myContractorFullName: string | null;
  isStaff: boolean;
  isExcludedWorkCode: (code: string) => boolean;
  isApprovedForOtherStatus: (status: string | null | undefined) => boolean;
};

type ContractorWorksBundleScopeEnvelope = {
  document_type: "contractor_works_bundle_scope";
  version: "v1";
  rows: ContractorWorkRow[];
  subcontract_cards: ContractorSubcontractCard[];
  meta: Record<string, unknown>;
};

type ContractorWorksBundleScopeMetaInput = {
  total_approved?: unknown;
  [key: string]: unknown;
};

const RPC_SOURCE_KIND: ContractorWorksBundleSourceMeta["sourceKind"] =
  "rpc:contractor_works_bundle_scope_v1";
const LEGACY_SOURCE_KIND: ContractorWorksBundleSourceMeta["sourceKind"] =
  "legacy:view:v_works_fact+relational_enrich";

class ContractorWorksBundleScopeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractorWorksBundleScopeValidationError";
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const pickNonEmptyString = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const normalizeKeyPart = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeDigits = (value: unknown) => String(value || "").replace(/\D+/g, "").trim();

const requireRecord = (value: unknown, scope: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractorWorksBundleScopeValidationError(`${scope} must be an object`);
  }
  return value as Record<string, unknown>;
};

const requireArray = (value: unknown, field: string, scope: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new ContractorWorksBundleScopeValidationError(`${scope}.${field} must be an array`);
  }
  return value;
};

const requireString = (value: unknown, field: string, scope: string): string => {
  const normalized = pickNonEmptyString(value);
  if (!normalized) {
    throw new ContractorWorksBundleScopeValidationError(`${scope}.${field} must be a non-empty string`);
  }
  return normalized;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNullableString = (value: unknown): string | null => pickNonEmptyString(value);

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  const record = asRecord(error);
  return String(record.message ?? error ?? "").trim();
};

function adaptRpcRows(value: unknown): ContractorWorkRow[] {
  return requireArray(value, "rows", "contractor_works_bundle_scope_v1").map((rowValue) => {
    const row = requireRecord(rowValue, "contractor_works_bundle_scope_v1.rows[]");
    return {
      progress_id: requireString(row.progress_id, "progress_id", "contractor_works_bundle_scope_v1.rows[]"),
      created_at: toNullableString(row.created_at),
      purchase_item_id: toNullableString(row.purchase_item_id),
      work_code: toNullableString(row.work_code),
      work_name: toNullableString(row.work_name),
      object_name: toNullableString(row.object_name),
      contractor_org: toNullableString(row.contractor_org),
      contractor_inn: toNullableString(row.contractor_inn),
      contractor_phone: toNullableString(row.contractor_phone),
      request_id: toNullableString(row.request_id),
      request_status: toNullableString(row.request_status),
      contractor_job_id: toNullableString(row.contractor_job_id),
      uom_id: toNullableString(row.uom_id),
      qty_planned: toNumber(row.qty_planned, 0),
      qty_done: toNumber(row.qty_done, 0),
      qty_left: toNumber(row.qty_left, 0),
      unit_price: row.unit_price == null ? null : toNumber(row.unit_price, 0),
      work_status: String(row.work_status ?? "").trim(),
      contractor_id: toNullableString(row.contractor_id),
      started_at: toNullableString(row.started_at),
      finished_at: toNullableString(row.finished_at),
    };
  });
}

function adaptRpcSubcontractCards(value: unknown): ContractorSubcontractCard[] {
  return requireArray(value, "subcontract_cards", "contractor_works_bundle_scope_v1").map((cardValue) => {
    const card = requireRecord(cardValue, "contractor_works_bundle_scope_v1.subcontract_cards[]");
    return {
      id: requireString(card.id, "id", "contractor_works_bundle_scope_v1.subcontract_cards[]"),
      status: toNullableString(card.status),
      object_name: toNullableString(card.object_name),
      work_type: toNullableString(card.work_type),
      qty_planned: card.qty_planned == null ? null : toNumber(card.qty_planned, 0),
      uom: toNullableString(card.uom),
      contractor_org: toNullableString(card.contractor_org),
      contractor_inn: toNullableString(card.contractor_inn),
      contractor_phone: toNullableString(card.contractor_phone),
      contract_number: toNullableString(card.contract_number),
      contract_date: toNullableString(card.contract_date),
      created_at: toNullableString(card.created_at),
      created_by: toNullableString(card.created_by),
    };
  });
}

function adaptContractorWorksBundleScopeEnvelope(value: unknown): ContractorWorksBundleScopeEnvelope {
  const root = requireRecord(value, "contractor_works_bundle_scope_v1");
  const documentType = requireString(root.document_type, "document_type", "contractor_works_bundle_scope_v1");
  if (documentType !== "contractor_works_bundle_scope") {
    throw new ContractorWorksBundleScopeValidationError(
      `contractor_works_bundle_scope_v1 invalid document_type: ${documentType}`,
    );
  }
  const version = requireString(root.version, "version", "contractor_works_bundle_scope_v1");
  if (version !== "v1") {
    throw new ContractorWorksBundleScopeValidationError(
      `contractor_works_bundle_scope_v1 invalid version: ${version}`,
    );
  }
  const meta = asRecord(root.meta) as ContractorWorksBundleScopeMetaInput;
  return {
    document_type: "contractor_works_bundle_scope",
    version: "v1",
    rows: adaptRpcRows(root.rows),
    subcontract_cards: adaptRpcSubcontractCards(root.subcontract_cards),
    meta,
  };
}

function matchesContractorIdentity(
  value: { contractor_org?: string | null; contractor_inn?: string | null; created_by?: string | null },
  params: Pick<
    LoadContractorWorksBundleParams,
    "myUserId" | "myContractorInn" | "myContractorCompany" | "myContractorFullName"
  >,
): boolean {
  const createdBy = String(value.created_by || "").trim();
  const myUserId = String(params.myUserId || "").trim();
  if (createdBy && myUserId && createdBy === myUserId) return true;

  const cardInn = normalizeDigits(value.contractor_inn);
  const myInn = normalizeDigits(params.myContractorInn);
  if (cardInn && myInn && cardInn === myInn) return true;

  const cardName = normalizeKeyPart(value.contractor_org);
  const allowedNames = [params.myContractorCompany, params.myContractorFullName]
    .map((entry) => normalizeKeyPart(entry))
    .filter(Boolean);
  return Boolean(cardName && allowedNames.some((entry) => entry === cardName));
}

function isRpcBundleScopedForContractor(
  result: ContractorWorksBundleResult,
  params: Pick<
    LoadContractorWorksBundleParams,
    "myContractorId" | "myUserId" | "myContractorInn" | "myContractorCompany" | "myContractorFullName"
  >,
): boolean {
  if (!result.subcontractCards.length) {
    return result.rows.every((row) => {
      const rowContractorId = String(row.contractor_id || "").trim();
      return !rowContractorId || rowContractorId === params.myContractorId;
    });
  }
  return result.subcontractCards.every((card) =>
    matchesContractorIdentity(
      {
        contractor_org: card.contractor_org,
        contractor_inn: card.contractor_inn,
        created_by: card.created_by,
      },
      params,
    ),
  );
}

function scopeRpcBundleForContractor(
  result: ContractorWorksBundleResult,
  params: Pick<
    LoadContractorWorksBundleParams,
    "isStaff" | "myContractorId" | "myUserId" | "myContractorInn" | "myContractorCompany" | "myContractorFullName"
  >,
): ContractorRpcScopeGuardResult {
  if (params.isStaff) {
    return {
      rows: result.rows,
      subcontractCards: result.subcontractCards,
      filteredOutRows: 0,
      filteredOutSubcontractCards: 0,
      scopeGuardApplied: false,
    };
  }

  const scopedSubcontractCards = result.subcontractCards.filter((card) =>
    matchesContractorIdentity(
      {
        contractor_org: card.contractor_org,
        contractor_inn: card.contractor_inn,
        created_by: card.created_by,
      },
      params,
    ),
  );
  const scopedJobIds = new Set(scopedSubcontractCards.map((card) => String(card.id || "").trim()).filter(Boolean));
  const scopedRows = result.rows.filter((row) => {
    const contractorId = String(row.contractor_id || "").trim();
    if (contractorId && contractorId === params.myContractorId) return true;
    if (
      matchesContractorIdentity(
        {
          contractor_org: row.contractor_org,
          contractor_inn: row.contractor_inn,
        },
        params,
      )
    ) {
      return true;
    }
    const subcontractId = String(row.contractor_job_id || "").trim();
    return subcontractId ? scopedJobIds.has(subcontractId) : false;
  });

  return {
    rows: scopedRows,
    subcontractCards: scopedSubcontractCards,
    filteredOutRows: Math.max(0, result.rows.length - scopedRows.length),
    filteredOutSubcontractCards: Math.max(0, result.subcontractCards.length - scopedSubcontractCards.length),
    scopeGuardApplied:
      scopedRows.length !== result.rows.length || scopedSubcontractCards.length !== result.subcontractCards.length,
  };
}

export function mapWorksFactRows(
  rows: Record<string, unknown>[],
  normText: (v: unknown) => string,
): ContractorWorkRow[] {
  return (rows ?? []).map((x) => ({
    progress_id: String(x.progress_id || "").trim(),
    created_at: x.created_at == null ? null : String(x.created_at),
    purchase_item_id: x.purchase_item_id == null ? null : String(x.purchase_item_id),
    work_code: String(x.work_code || "").trim() || null,
    work_name: normText(x.work_name) || null,
    object_name: normText(x.object_name) || null,
    contractor_org: normText(x.contractor_org ?? x.subcontractor_org) || null,
    contractor_inn: normText(x.contractor_inn ?? x.subcontractor_inn) || null,
    contractor_phone: normText(x.contractor_phone ?? x.subcontractor_phone) || null,
    request_id: x.request_id == null ? (x.req_id == null ? null : String(x.req_id)) : String(x.request_id),
    request_status: normText(x.request_status ?? x.status) || null,
    contractor_job_id:
      x.contractor_job_id == null
        ? x.subcontract_id == null
          ? null
          : String(x.subcontract_id)
        : String(x.contractor_job_id),
    uom_id: x.uom_id == null ? null : String(x.uom_id),
    qty_planned: Number(x.qty_planned ?? 0),
    qty_done: Number(x.qty_done ?? 0),
    qty_left: Number(x.qty_left ?? 0),
    unit_price:
      x.unit_price == null
        ? x.price_per_unit == null
          ? null
          : Number(x.price_per_unit)
        : Number(x.unit_price),
    work_status: normText(x.work_status) || "",
    contractor_id: x.contractor_id == null ? null : String(x.contractor_id),
    started_at: x.started_at == null ? null : String(x.started_at),
    finished_at: x.finished_at == null ? null : String(x.finished_at),
  }));
}

export async function enrichWorksRows(params: {
  supabaseClient: any;
  mappedBase: ContractorWorkRow[];
  looksLikeUuid: (v: string) => boolean;
  pickWorkProgressRow: (row: WorkProgressRawRow) => string;
}): Promise<{ rows: ContractorWorkRow[]; objByJob: Map<string, string> }> {
  const { supabaseClient, mappedBase, looksLikeUuid, pickWorkProgressRow } = params;

  const wpIds = mappedBase
    .filter((r) => {
      const id = String(r.progress_id || "").trim();
      if (!looksLikeUuid(id)) return false;
      return !r.request_id && !r.purchase_item_id;
    })
    .map((r) => String(r.progress_id || "").trim());

  const wpById = new Map<string, WorkProgressRawRow>();
  if (wpIds.length) {
    const wpByIdRes = await supabaseClient
      .from("work_progress")
      .select("id, purchase_item_id, object_id")
      .in("id", wpIds);
    if (!wpByIdRes.error && Array.isArray(wpByIdRes.data)) {
      for (const row of wpByIdRes.data as WorkProgressRawRow[]) {
        const id = pickWorkProgressRow(row);
        if (id) wpById.set(id, row);
      }
    }
  }

  const mapped = mappedBase.map((r) => {
    const wp = wpById.get(String(r.progress_id));
    if (!wp) return r;
    return {
      ...r,
      purchase_item_id: r.purchase_item_id || wp.purchase_item_id || null,
    };
  });

  const piIds = Array.from(
    new Set(
      mapped
        .filter((r) => !String(r.request_id || "").trim())
        .map((r) => String(r.purchase_item_id || "").trim())
        .filter(Boolean),
    ),
  );
  const requestIdByPurchaseItem = new Map<string, string>();
  if (piIds.length) {
    const piQ = await supabaseClient.from("purchase_items").select("id, request_item_id").in("id", piIds);
    if (!piQ.error && Array.isArray(piQ.data)) {
      const reqItemIds = Array.from(
        new Set(
          (piQ.data as PurchaseItemRawRow[])
            .map((x) => String(x.request_item_id || "").trim())
            .filter(Boolean),
        ),
      );
      const reqByReqItem = new Map<string, string>();
      if (reqItemIds.length) {
        const riQ = await supabaseClient.from("request_items").select("id, request_id").in("id", reqItemIds);
        if (!riQ.error && Array.isArray(riQ.data)) {
          for (const ri of riQ.data as RequestItemRawRow[]) {
            const riId = String(ri.id || "").trim();
            const reqId = String(ri.request_id || "").trim();
            if (riId && reqId) reqByReqItem.set(riId, reqId);
          }
        }
      }
      for (const pi of piQ.data as PurchaseItemRawRow[]) {
        const piId = String(pi.id || "").trim();
        const riId = String(pi.request_item_id || "").trim();
        const reqId = reqByReqItem.get(riId) || "";
        if (piId && reqId) requestIdByPurchaseItem.set(piId, reqId);
      }
    }
  }

  const mappedByPurchase = mapped.map((r) => {
    const piId = String(r.purchase_item_id || "").trim();
    return {
      ...r,
      request_id: r.request_id || (piId ? requestIdByPurchaseItem.get(piId) || null : null),
    };
  });

  const reqIds = Array.from(
    new Set(
      mappedByPurchase
        .filter((r) => {
          const rid = String(r.request_id || "").trim();
          if (!rid) return false;
          return !r.request_status || !r.contractor_job_id || !r.object_name;
        })
        .map((r) => String(r.request_id || "").trim())
        .filter(Boolean),
    ),
  );
  const reqById = new Map<string, RequestRawRow>();
  if (reqIds.length) {
    const rq = await supabaseClient
      .from("requests")
      .select("id, status, contractor_job_id, object_type_code, level_code, system_code")
      .in("id", reqIds);
    if (!rq.error && Array.isArray(rq.data)) {
      for (const r of rq.data as RequestRawRow[]) {
        const id = String(r.id || "").trim();
        if (id) reqById.set(id, r);
      }
    }
  }

  const mappedByReq = mappedByPurchase.map((r) => {
    const req = reqById.get(String(r.request_id || "").trim());
    if (!req) return r;
    const reqObject = [req.object_type_code, req.level_code, req.system_code]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(" / ");
    return {
      ...r,
      request_status: r.request_status || req.status || null,
      contractor_job_id: r.contractor_job_id || req.contractor_job_id || null,
      object_name: r.object_name || reqObject || null,
    };
  });

  const jobIds = Array.from(
    new Set(
      mappedByReq
        .filter((r) => !!String(r.contractor_job_id || "").trim() && !String(r.object_name || "").trim())
        .map((r) => String(r.contractor_job_id || "").trim())
        .filter(Boolean),
    ),
  );
  const objByJob = new Map<string, string>();
  if (jobIds.length) {
    const sq = await supabaseClient.from("subcontracts").select("id, object_name").in("id", jobIds);
    if (!sq.error && Array.isArray(sq.data)) {
      for (const s of sq.data as SubcontractObjectRawRow[]) {
        const id = String(s.id || "").trim();
        const obj = String(s.object_name || "").trim();
        if (id && obj) objByJob.set(id, obj);
      }
    }
  }

  return { rows: mappedByReq, objByJob };
}

async function loadContractorWorksBundleLegacyInternal(
  params: LoadContractorWorksBundleParams,
  options?: { observe?: boolean },
): Promise<ContractorWorksBundleResult> {
  const {
    supabaseClient,
    normText,
    looksLikeUuid,
    pickWorkProgressRow,
    myContractorId,
    myUserId,
    myContractorInn,
    myContractorCompany,
    myContractorFullName,
    isStaff,
    isExcludedWorkCode,
    isApprovedForOtherStatus,
  } = params;

  const observation =
    options?.observe !== false
      ? beginPlatformObservability({
          screen: "contractor",
          surface: "works_bundle",
          category: "fetch",
          event: "load_works_bundle",
          sourceKind: LEGACY_SOURCE_KIND,
        })
      : null;

  try {
    const sqApprovedPromise = supabaseClient
      .from("subcontracts")
      .select(
        "id, status, work_type, object_name, qty_planned, uom, contractor_org, contractor_inn, contractor_phone, contract_number, contract_date, created_at, created_by",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(500);

    const worksRes = await supabaseClient.from("v_works_fact").select("*").order("created_at", { ascending: false });
    if (worksRes.error) {
      throw worksRes.error;
    }

    const mappedBase = mapWorksFactRows(
      Array.isArray(worksRes.data) ? (worksRes.data as Record<string, unknown>[]) : [],
      normText,
    );
    const enrichResult = await enrichWorksRows({
      supabaseClient,
      mappedBase,
      looksLikeUuid,
      pickWorkProgressRow,
    });

    const sqApproved = await sqApprovedPromise;
    if (sqApproved.error) {
      throw sqApproved.error;
    }

    const allApproved = Array.isArray(sqApproved.data) ? (sqApproved.data as SubcontractLiteLike[]) : [];
    const subcontractCards = selectScopedApprovedSubcontracts({
      allApproved,
      isStaff,
      myUserId,
      myContractorInn,
      myContractorNames: [myContractorCompany, myContractorFullName].filter(
        (value): value is string => Boolean(String(value || "").trim()),
      ),
    });

    const lookupMaps = buildSubcontractLookups(subcontractCards);
    const mappedWithObject = attachSubcontractAndObject({
      rows: enrichResult.rows,
      objByJob: enrichResult.objByJob,
      lookups: lookupMaps,
    });

    const allowedJobIds = new Set(subcontractCards.map((s) => String(s.id || "").trim()).filter(Boolean));
    const filtered = filterVisibleRows({
      rows: mappedWithObject,
      allowedJobIds,
      myContractorId,
      isStaff,
      isExcludedWorkCode,
      isApprovedForOtherStatus,
    });

    const existingJobIds = new Set(filtered.map((r) => String(r.contractor_job_id || "").trim()).filter(Boolean));
    const syntheticRows: ContractorWorkRow[] = buildSyntheticSubcontractRows(subcontractCards, existingJobIds).map((r) => ({
      progress_id: String(r.progress_id || "").trim(),
      created_at: null,
      purchase_item_id: r.purchase_item_id == null ? null : String(r.purchase_item_id),
      work_code: r.work_code == null ? null : String(r.work_code),
      work_name: r.work_name == null ? null : String(r.work_name),
      object_name: r.object_name == null ? null : String(r.object_name),
      contractor_org: r.contractor_org == null ? null : String(r.contractor_org),
      contractor_inn: r.contractor_inn == null ? null : String(r.contractor_inn),
      contractor_phone: r.contractor_phone == null ? null : String(r.contractor_phone),
      request_id: r.request_id == null ? null : String(r.request_id),
      request_status: null,
      contractor_job_id: r.contractor_job_id == null ? null : String(r.contractor_job_id),
      uom_id: r.uom_id == null ? null : String(r.uom_id),
      qty_planned: Number(r.qty_planned ?? 0),
      qty_done: Number(r.qty_done ?? 0),
      qty_left: Number(r.qty_left ?? 0),
      unit_price: r.unit_price == null ? null : Number(r.unit_price),
      work_status: String(r.work_status || ""),
      contractor_id: r.contractor_id == null ? null : String(r.contractor_id),
      started_at: r.started_at == null ? null : String(r.started_at),
      finished_at: r.finished_at == null ? null : String(r.finished_at),
    }));

    const result: ContractorWorksBundleResult = {
      rows: [...syntheticRows, ...filtered],
      subcontractCards,
      debug: {
        isStaff,
        subcontractsFound: subcontractCards.length,
        totalApproved: allApproved.length,
      },
      sourceMeta: {
        primaryOwner: "legacy_client_enrich",
        fallbackUsed: true,
        sourceKind: LEGACY_SOURCE_KIND,
        rowParityStatus: "not_checked",
        backendFirstPrimary: false,
      },
    };

    observation?.success({
      rowCount: result.rows.length,
      sourceKind: LEGACY_SOURCE_KIND,
      fallbackUsed: true,
      extra: {
        subcontractCards: subcontractCards.length,
        totalApproved: allApproved.length,
        isStaff,
        primaryOwner: "legacy_client_enrich",
      },
    });
    return result;
  } catch (error) {
    observation?.error(error, {
      rowCount: 0,
      errorStage: "load_works_bundle_legacy",
      sourceKind: LEGACY_SOURCE_KIND,
    });
    throw error;
  }
}

async function loadContractorWorksBundleRpcInternal(
  params: LoadContractorWorksBundleParams,
  options?: { observe?: boolean },
): Promise<ContractorWorksBundleResult> {
  const { supabaseClient, myContractorId, isStaff } = params;
  const observation =
    options?.observe !== false
      ? beginPlatformObservability({
          screen: "contractor",
          surface: "works_bundle",
          category: "fetch",
          event: "load_works_bundle_rpc",
          sourceKind: RPC_SOURCE_KIND,
        })
      : null;

  try {
    const { data, error } = await supabaseClient.rpc("contractor_works_bundle_scope_v1", {
      p_my_contractor_id: myContractorId || null,
      p_is_staff: isStaff,
    });
    if (error) throw error;

    const envelope = adaptContractorWorksBundleScopeEnvelope(data);
    const totalApproved = toNumber(envelope.meta.total_approved, envelope.subcontract_cards.length);
    const result: ContractorWorksBundleResult = {
      rows: envelope.rows,
      subcontractCards: envelope.subcontract_cards,
      debug: {
        isStaff,
        subcontractsFound: envelope.subcontract_cards.length,
        totalApproved,
      },
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: RPC_SOURCE_KIND,
        rowParityStatus: "not_checked",
        backendFirstPrimary: true,
      },
    };

    observation?.success({
      rowCount: result.rows.length,
      sourceKind: RPC_SOURCE_KIND,
      fallbackUsed: false,
      extra: {
        subcontractCards: result.subcontractCards.length,
        totalApproved,
        isStaff,
        primaryOwner: "rpc_scope_v1",
      },
    });
    return result;
  } catch (error) {
    observation?.error(error, {
      rowCount: 0,
      errorStage: "load_works_bundle_rpc",
      sourceKind: RPC_SOURCE_KIND,
    });
    throw error;
  }
}

export async function loadContractorWorksBundleLegacy(
  params: LoadContractorWorksBundleParams,
): Promise<ContractorWorksBundleResult> {
  return await loadContractorWorksBundleLegacyInternal(params, { observe: true });
}

export async function loadContractorWorksBundleRpc(
  params: LoadContractorWorksBundleParams,
): Promise<ContractorWorksBundleResult> {
  return await loadContractorWorksBundleRpcInternal(params, { observe: true });
}

export async function loadContractorWorksBundle(
  params: LoadContractorWorksBundleParams,
): Promise<ContractorWorksBundleResult> {
  const observation = beginPlatformObservability({
    screen: "contractor",
    surface: "works_bundle",
    category: "fetch",
    event: "load_works_bundle",
    sourceKind: RPC_SOURCE_KIND,
  });

  try {
    const rpcResult = await loadContractorWorksBundleRpcInternal(params, { observe: false });
    const scopedResult = scopeRpcBundleForContractor(rpcResult, params);
    if (scopedResult.scopeGuardApplied) {
      recordPlatformObservability({
        screen: "contractor",
        surface: "works_bundle",
        category: "fetch",
        event: "load_works_bundle_scope_guard",
        result: "success",
        sourceKind: RPC_SOURCE_KIND,
        fallbackUsed: false,
        rowCount: scopedResult.rows.length,
        extra: {
          primaryOwner: rpcResult.sourceMeta.primaryOwner,
          subcontractCards: scopedResult.subcontractCards.length,
          rawRows: rpcResult.rows.length,
          rawSubcontractCards: rpcResult.subcontractCards.length,
          filteredOutRows: scopedResult.filteredOutRows,
          filteredOutSubcontractCards: scopedResult.filteredOutSubcontractCards,
          scopeGuardApplied: true,
        },
      });
    }
    const result: ContractorWorksBundleResult =
      scopedResult.scopeGuardApplied || !isRpcBundleScopedForContractor(rpcResult, params)
        ? {
            ...rpcResult,
            rows: scopedResult.rows,
            subcontractCards: scopedResult.subcontractCards,
            debug: {
              ...rpcResult.debug,
              subcontractsFound: scopedResult.subcontractCards.length,
            },
          }
        : rpcResult;
    observation.success({
      rowCount: result.rows.length,
      sourceKind: result.sourceMeta.sourceKind,
      fallbackUsed: false,
      extra: {
        primaryOwner: result.sourceMeta.primaryOwner,
        subcontractCards: result.subcontractCards.length,
        backendFirstPrimary: true,
        scopeGuardApplied: scopedResult.scopeGuardApplied,
        filteredOutRows: scopedResult.filteredOutRows,
        filteredOutSubcontractCards: scopedResult.filteredOutSubcontractCards,
      },
    });
    return result;
  } catch (error) {
    recordPlatformObservability({
      screen: "contractor",
      surface: "works_bundle",
      category: "fetch",
      event: "load_works_bundle_primary_rpc",
      result: "error",
      sourceKind: RPC_SOURCE_KIND,
      errorStage: "load_works_bundle_rpc",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: toErrorMessage(error) || undefined,
      fallbackUsed: false,
    });
    observation.error(error, {
      rowCount: 0,
      errorStage: "load_works_bundle_rpc",
      sourceKind: RPC_SOURCE_KIND,
      fallbackUsed: false,
    });
    throw error;
  }
}
