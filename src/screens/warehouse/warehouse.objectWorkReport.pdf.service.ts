import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getPdfRpcRolloutAvailability,
  recordPdfRpcRolloutBranch,
  registerPdfRpcRolloutPath,
  resolvePdfRpcRolloutMode,
  setPdfRpcRolloutAvailability,
  type PdfRpcRolloutId,
  type PdfRpcRolloutMode,
} from "../../lib/documents/pdfRpcRollout";
import { apiFetchIssuedByObjectReportFast } from "./warehouse.stock.read";

const WAREHOUSE_OBJECT_WORK_PDF_SOURCE_RPC_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_WAREHOUSE_OBJECT_WORK_PDF_SOURCE_RPC_V1 ?? "",
)
  .trim()
  .toLowerCase();

type WarehouseObjectWorkReportRecord = Record<string, unknown>;
type WarehouseObjectWorkPdfSourceEnvelopeV1 = {
  document_type: "warehouse_object_work_report";
  version: "v1";
  generated_at: string;
  document_id: string;
  source_branch: "canonical";
  header: WarehouseObjectWorkReportRecord;
  rows: WarehouseObjectWorkReportRecord[];
  totals: WarehouseObjectWorkReportRecord;
  meta?: WarehouseObjectWorkReportRecord;
};

const WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID: PdfRpcRolloutId =
  "warehouse_object_work_source_v1";
const WAREHOUSE_OBJECT_WORK_PDF_RPC_MODE: PdfRpcRolloutMode = resolvePdfRpcRolloutMode(
  WAREHOUSE_OBJECT_WORK_PDF_SOURCE_RPC_V1_MODE_RAW,
);

registerPdfRpcRolloutPath(
  WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID,
  WAREHOUSE_OBJECT_WORK_PDF_RPC_MODE,
);

export type WarehouseObjectWorkReportPdfRow = {
  object_id: string | null;
  object_name: string;
  work_name: string;
  docs_cnt: number;
  req_cnt: number;
  active_days: number;
  uniq_materials: number;
  recipients_text: string | null;
  top3_materials: string | null;
};

export type WarehouseObjectWorkReportPdfRange = {
  pdfFrom: string;
  pdfTo: string;
  rpcFrom: string;
  rpcTo: string;
};

export type WarehouseObjectWorkReportPdfSource =
  | "rpc:pdf_warehouse_object_work_source_v1"
  | "legacy:wh_report_issued_by_object_fast";

export type WarehouseObjectWorkReportPdfSourceBranchMeta = {
  sourceBranch: "rpc_v1" | "legacy_fallback";
  fallbackReason?: "rpc_error" | "invalid_payload" | "disabled" | "missing_fields";
  rpcVersion?: "v1";
  payloadShapeVersion?: "v1";
};

type WarehouseObjectWorkReportSource = {
  rows: WarehouseObjectWorkReportPdfRow[];
  docsTotal: number;
  source: WarehouseObjectWorkReportPdfSource;
  branchMeta: WarehouseObjectWorkReportPdfSourceBranchMeta;
};

type GetWarehouseObjectWorkReportPdfSourceParams = {
  supabase: SupabaseClient;
  range: WarehouseObjectWorkReportPdfRange;
  legacyDocsTotal: number;
  objectId?: string | null;
};

class WarehouseObjectWorkPdfSourceValidationError extends Error {
  reason: "invalid_payload" | "missing_fields";

  constructor(reason: "invalid_payload" | "missing_fields", message: string) {
    super(message);
    this.name = "WarehouseObjectWorkPdfSourceValidationError";
    this.reason = reason;
  }
}

class WarehouseObjectWorkPdfSourceRpcError extends Error {
  code?: string;
  disableForSession: boolean;

  constructor(message: string, options?: { code?: string; disableForSession?: boolean }) {
    super(message);
    this.name = "WarehouseObjectWorkPdfSourceRpcError";
    this.code = options?.code;
    this.disableForSession = options?.disableForSession === true;
  }
}

const asRecord = (value: unknown): WarehouseObjectWorkReportRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as WarehouseObjectWorkReportRecord)
    : {};

const asArrayOfRecords = (value: unknown): WarehouseObjectWorkReportRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const toNumber = (value: unknown) => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.\-]/g, "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toText = (value: unknown) => String(value ?? "").trim();

const requireNonEmptyString = (value: unknown, field: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new WarehouseObjectWorkPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_object_work_source_v1 missing ${field}`,
    );
  }
  return text;
};

const requireRecord = (value: unknown, field: string) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WarehouseObjectWorkPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_object_work_source_v1 missing ${field}`,
    );
  }
  return value as WarehouseObjectWorkReportRecord;
};

const requireArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) {
    throw new WarehouseObjectWorkPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_object_work_source_v1 missing ${field}`,
    );
  }
  return value;
};

const getFallbackReasonForRpcError = (
  error: unknown,
): WarehouseObjectWorkReportPdfSourceBranchMeta["fallbackReason"] => {
  if (error instanceof WarehouseObjectWorkPdfSourceValidationError) return error.reason;
  return "rpc_error";
};

const shouldDisableWarehouseObjectWorkPdfRpcForSession = (
  errorCode: unknown,
  errorMessage: unknown,
) => {
  const code = String(errorCode ?? "").trim().toUpperCase();
  const message = String(errorMessage ?? "").toLowerCase();
  if (code === "PGRST202") return true;
  if (message.includes("could not find the function")) return true;
  if (message.includes("schema cache")) return true;
  if (message.includes("function public.pdf_warehouse_object_work_source_v1")) return true;
  return false;
};

const normalizeWarehouseObjectWorkReportRow = (
  value: unknown,
): WarehouseObjectWorkReportPdfRow => {
  const row = asRecord(value);
  return {
    object_id: toText(row.object_id) || null,
    object_name: toText(row.object_name) || "Р‘РµР· РѕР±СЉРµРєС‚Р°",
    work_name: toText(row.work_name) || "Р‘РµР· РІРёРґР° СЂР°Р±РѕС‚",
    docs_cnt: toNumber(row.docs_cnt),
    req_cnt: toNumber(row.req_cnt),
    active_days: toNumber(row.active_days),
    uniq_materials: toNumber(row.uniq_materials),
    recipients_text: toText(row.recipients_text) || null,
    top3_materials: toText(row.top3_materials) || null,
  };
};

function validateWarehouseObjectWorkPdfSourceV1(
  value: unknown,
): WarehouseObjectWorkPdfSourceEnvelopeV1 {
  const root = requireRecord(value, "root");
  const documentType = requireNonEmptyString(root.document_type, "document_type");
  if (documentType !== "warehouse_object_work_report") {
    throw new WarehouseObjectWorkPdfSourceValidationError(
      "invalid_payload",
      `pdf_warehouse_object_work_source_v1 invalid document_type: ${documentType}`,
    );
  }

  const version = requireNonEmptyString(root.version, "version");
  if (version !== "v1") {
    throw new WarehouseObjectWorkPdfSourceValidationError(
      "invalid_payload",
      `pdf_warehouse_object_work_source_v1 invalid version: ${version}`,
    );
  }

  const documentId = requireNonEmptyString(root.document_id, "document_id");
  const header = requireRecord(root.header, "header");
  const rows = requireArray(root.rows, "rows");
  const totals = requireRecord(root.totals, "totals");

  if (!("docs_total" in totals) || !("rows_count" in totals)) {
    throw new WarehouseObjectWorkPdfSourceValidationError(
      "missing_fields",
      "pdf_warehouse_object_work_source_v1 missing totals.docs_total or totals.rows_count",
    );
  }

  return {
    document_type: "warehouse_object_work_report",
    version: "v1",
    generated_at: String(root.generated_at ?? "").trim(),
    document_id: documentId,
    source_branch: "canonical",
    header,
    rows: asArrayOfRecords(rows),
    totals,
    meta: asRecord(root.meta),
  };
}

function logWarehouseObjectWorkPdfSourceBranch(
  range: WarehouseObjectWorkReportPdfRange,
  meta: WarehouseObjectWorkReportPdfSourceBranchMeta,
  source: WarehouseObjectWorkReportPdfSource,
  objectId?: string | null,
) {
  recordPdfRpcRolloutBranch(WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID, {
    source,
    branchMeta: meta,
  });
  if (!__DEV__) return;
  console.info("[warehouse-object-work-pdf-source]", {
    source,
    sourceBranch: meta.sourceBranch,
    fallbackReason: meta.fallbackReason ?? null,
    rpcVersion: meta.rpcVersion ?? null,
    payloadShapeVersion: meta.payloadShapeVersion ?? null,
    rangeFrom: range.rpcFrom,
    rangeTo: range.rpcTo,
    objectId: objectId ?? null,
  });
}

export async function fetchWarehouseObjectWorkReportPdfSourceViaRpc(
  params: Pick<GetWarehouseObjectWorkReportPdfSourceParams, "supabase" | "range" | "objectId">,
): Promise<WarehouseObjectWorkReportSource> {
  const { data, error } = await params.supabase.rpc(
    "pdf_warehouse_object_work_source_v1",
    {
      p_from: params.range.rpcFrom,
      p_to: params.range.rpcTo,
      p_object_id: params.objectId ?? null,
    },
  );

  if (error) {
    throw new WarehouseObjectWorkPdfSourceRpcError(
      `pdf_warehouse_object_work_source_v1 failed: ${error.message}`,
      {
        code: "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
        disableForSession: shouldDisableWarehouseObjectWorkPdfRpcForSession(
          "code" in error ? (error as { code?: unknown }).code : undefined,
          "message" in error ? (error as { message?: unknown }).message : undefined,
        ),
      },
    );
  }

  const envelope = validateWarehouseObjectWorkPdfSourceV1(data);

  return {
    rows: envelope.rows.map(normalizeWarehouseObjectWorkReportRow),
    docsTotal: Math.max(0, Math.round(toNumber(envelope.totals.docs_total))),
    source: "rpc:pdf_warehouse_object_work_source_v1",
    branchMeta: {
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    },
  };
}

export async function fetchWarehouseObjectWorkReportPdfSourceFallback(
  params: GetWarehouseObjectWorkReportPdfSourceParams,
  fallbackReason: WarehouseObjectWorkReportPdfSourceBranchMeta["fallbackReason"] = "rpc_error",
): Promise<WarehouseObjectWorkReportSource> {
  const rawRows = await apiFetchIssuedByObjectReportFast(params.supabase, {
    from: params.range.rpcFrom,
    to: params.range.rpcTo,
    objectId: params.objectId ?? null,
  });

  return {
    rows: (rawRows || []).map(normalizeWarehouseObjectWorkReportRow),
    docsTotal: Math.max(0, Math.round(params.legacyDocsTotal)),
    source: "legacy:wh_report_issued_by_object_fast",
    branchMeta: {
      sourceBranch: "legacy_fallback",
      fallbackReason,
      payloadShapeVersion: "v1",
    },
  };
}

export async function getWarehouseObjectWorkReportPdfSource(
  params: GetWarehouseObjectWorkReportPdfSourceParams,
): Promise<WarehouseObjectWorkReportSource> {
  const rpcMode = WAREHOUSE_OBJECT_WORK_PDF_RPC_MODE;

  if (rpcMode === "force_off") {
    const legacySource = await fetchWarehouseObjectWorkReportPdfSourceFallback(
      params,
      "disabled",
    );
    logWarehouseObjectWorkPdfSourceBranch(
      params.range,
      legacySource.branchMeta,
      legacySource.source,
      params.objectId ?? null,
    );
    return legacySource;
  }

  if (
    rpcMode === "auto" &&
    getPdfRpcRolloutAvailability(WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID) === "missing"
  ) {
    const legacySource = await fetchWarehouseObjectWorkReportPdfSourceFallback(
      params,
      "disabled",
    );
    logWarehouseObjectWorkPdfSourceBranch(
      params.range,
      legacySource.branchMeta,
      legacySource.source,
      params.objectId ?? null,
    );
    return legacySource;
  }

  try {
    const rpcSource = await fetchWarehouseObjectWorkReportPdfSourceViaRpc(params);
    if (rpcMode === "auto") {
      setPdfRpcRolloutAvailability(WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID, "available");
    }
    logWarehouseObjectWorkPdfSourceBranch(
      params.range,
      rpcSource.branchMeta,
      rpcSource.source,
      params.objectId ?? null,
    );
    return rpcSource;
  } catch (error) {
    const fallbackReason = getFallbackReasonForRpcError(error);
    if (
      rpcMode === "auto" &&
      error instanceof WarehouseObjectWorkPdfSourceRpcError &&
      error.disableForSession
    ) {
      setPdfRpcRolloutAvailability(WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID, "missing", {
        errorMessage: error.message,
      });
    }
    if (__DEV__) {
      console.warn("[warehouse-object-work-pdf-source] rpc_v1 fallback", {
        fallbackReason,
        rpcMode,
        rpcAvailability: getPdfRpcRolloutAvailability(
          WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID,
        ),
        rangeFrom: params.range.rpcFrom,
        rangeTo: params.range.rpcTo,
        objectId: params.objectId ?? null,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    const legacySource = await fetchWarehouseObjectWorkReportPdfSourceFallback(
      params,
      fallbackReason,
    );
    logWarehouseObjectWorkPdfSourceBranch(
      params.range,
      legacySource.branchMeta,
      legacySource.source,
      params.objectId ?? null,
    );
    return legacySource;
  }
}
