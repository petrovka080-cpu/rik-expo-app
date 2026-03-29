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
import { normalizeRuText } from "../../lib/text/encoding";
import { apiFetchIssuedMaterialsReportFast } from "./warehouse.stock.read";

const WAREHOUSE_DAY_MATERIALS_PDF_SOURCE_RPC_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_WAREHOUSE_DAY_MATERIALS_PDF_SOURCE_RPC_V1 ?? "",
)
  .trim()
  .toLowerCase();

type WarehouseDayMaterialsReportRecord = Record<string, unknown>;
type WarehouseDayMaterialsReportPdfSourceEnvelopeV1 = {
  document_type: "warehouse_day_materials_report";
  version: "v1";
  generated_at: string;
  document_id: string;
  source_branch: "canonical";
  header: WarehouseDayMaterialsReportRecord;
  rows: WarehouseDayMaterialsReportRecord[];
  totals: WarehouseDayMaterialsReportRecord;
  meta?: WarehouseDayMaterialsReportRecord;
};

const WAREHOUSE_DAY_MATERIALS_PDF_RPC_ROLLOUT_ID: PdfRpcRolloutId =
  "warehouse_day_materials_source_v1";
const WAREHOUSE_DAY_MATERIALS_PDF_RPC_MODE: PdfRpcRolloutMode = resolvePdfRpcRolloutMode(
  WAREHOUSE_DAY_MATERIALS_PDF_SOURCE_RPC_V1_MODE_RAW,
);

registerPdfRpcRolloutPath(
  WAREHOUSE_DAY_MATERIALS_PDF_RPC_ROLLOUT_ID,
  WAREHOUSE_DAY_MATERIALS_PDF_RPC_MODE,
);

export type WarehouseDayMaterialsReportPdfRow = {
  material_code: string;
  material_name: string;
  uom: string;
  sum_in_req: number;
  sum_free: number;
  sum_over: number;
  sum_total: number;
  docs_cnt: number;
  lines_cnt: number;
};

export type WarehouseDayMaterialsReportPdfRange = {
  pdfFrom: string;
  pdfTo: string;
  rpcFrom: string;
  rpcTo: string;
};

export type WarehouseDayMaterialsReportPdfSource =
  | "rpc:pdf_warehouse_day_materials_source_v1"
  | "legacy:wh_report_issued_materials_fast";

export type WarehouseDayMaterialsReportPdfSourceBranchMeta = {
  sourceBranch: "rpc_v1" | "legacy_fallback";
  fallbackReason?: "rpc_error" | "invalid_payload" | "disabled" | "missing_fields";
  rpcVersion?: "v1";
  payloadShapeVersion?: "v1";
};

type WarehouseDayMaterialsReportSource = {
  rows: WarehouseDayMaterialsReportPdfRow[];
  docsTotal: number;
  source: WarehouseDayMaterialsReportPdfSource;
  branchMeta: WarehouseDayMaterialsReportPdfSourceBranchMeta;
};

type GetWarehouseDayMaterialsReportPdfSourceParams = {
  supabase: SupabaseClient;
  range: WarehouseDayMaterialsReportPdfRange;
  legacyDocsTotal: number;
};

class WarehouseDayMaterialsPdfSourceValidationError extends Error {
  reason: "invalid_payload" | "missing_fields";

  constructor(reason: "invalid_payload" | "missing_fields", message: string) {
    super(message);
    this.name = "WarehouseDayMaterialsPdfSourceValidationError";
    this.reason = reason;
  }
}

class WarehouseDayMaterialsPdfSourceRpcError extends Error {
  code?: string;
  disableForSession: boolean;

  constructor(message: string, options?: { code?: string; disableForSession?: boolean }) {
    super(message);
    this.name = "WarehouseDayMaterialsPdfSourceRpcError";
    this.code = options?.code;
    this.disableForSession = options?.disableForSession === true;
  }
}

const asRecord = (value: unknown): WarehouseDayMaterialsReportRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as WarehouseDayMaterialsReportRecord)
    : {};

const asArrayOfRecords = (value: unknown): WarehouseDayMaterialsReportRecord[] =>
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

const isMissingName = (value: unknown): boolean => {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (/^[-\u2014\u2013\u2212]+$/.test(text)) return true;
  const lowered = text.toLowerCase();
  if (lowered === "null" || lowered === "undefined" || lowered === "n/a") return true;
  if (lowered.includes("отсутств")) return true;
  return false;
};

const requireNonEmptyString = (value: unknown, field: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new WarehouseDayMaterialsPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_day_materials_source_v1 missing ${field}`,
    );
  }
  return text;
};

const requireRecord = (value: unknown, field: string) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WarehouseDayMaterialsPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_day_materials_source_v1 missing ${field}`,
    );
  }
  return value as WarehouseDayMaterialsReportRecord;
};

const requireArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) {
    throw new WarehouseDayMaterialsPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_day_materials_source_v1 missing ${field}`,
    );
  }
  return value;
};

const getFallbackReasonForRpcError = (
  error: unknown,
): WarehouseDayMaterialsReportPdfSourceBranchMeta["fallbackReason"] => {
  if (error instanceof WarehouseDayMaterialsPdfSourceValidationError) return error.reason;
  return "rpc_error";
};

const shouldDisableWarehouseDayMaterialsPdfRpcForSession = (
  errorCode: unknown,
  errorMessage: unknown,
) => {
  const code = String(errorCode ?? "").trim().toUpperCase();
  const message = String(errorMessage ?? "").toLowerCase();
  if (code === "PGRST202") return true;
  if (message.includes("could not find the function")) return true;
  if (message.includes("schema cache")) return true;
  if (message.includes("function public.pdf_warehouse_day_materials_source_v1")) return true;
  return false;
};

const normalizeWarehouseDayMaterialsReportRow = (
  value: unknown,
): WarehouseDayMaterialsReportPdfRow => {
  const row = asRecord(value);
  const materialCode = String(row.material_code ?? "").trim();
  const rawName = String(normalizeRuText(String(row.material_name ?? materialCode ?? ""))).trim();
  const materialName = !isMissingName(rawName)
    ? rawName
    : (materialCode || "Позиция");

  return {
    material_code: materialCode,
    material_name: materialName,
    uom: String(row.uom ?? "").trim(),
    sum_in_req: toNumber(row.sum_in_req),
    sum_free: toNumber(row.sum_free),
    sum_over: toNumber(row.sum_over),
    sum_total: toNumber(row.sum_total),
    docs_cnt: toNumber(row.docs_cnt),
    lines_cnt: toNumber(row.lines_cnt),
  };
};

function validateWarehouseDayMaterialsPdfSourceV1(
  value: unknown,
): WarehouseDayMaterialsReportPdfSourceEnvelopeV1 {
  const root = requireRecord(value, "root");
  const documentType = requireNonEmptyString(root.document_type, "document_type");
  if (documentType !== "warehouse_day_materials_report") {
    throw new WarehouseDayMaterialsPdfSourceValidationError(
      "invalid_payload",
      `pdf_warehouse_day_materials_source_v1 invalid document_type: ${documentType}`,
    );
  }

  const version = requireNonEmptyString(root.version, "version");
  if (version !== "v1") {
    throw new WarehouseDayMaterialsPdfSourceValidationError(
      "invalid_payload",
      `pdf_warehouse_day_materials_source_v1 invalid version: ${version}`,
    );
  }

  const documentId = requireNonEmptyString(root.document_id, "document_id");
  const header = requireRecord(root.header, "header");
  const rows = requireArray(root.rows, "rows");
  const totals = requireRecord(root.totals, "totals");

  if (!("docs_total" in totals) || !("rows_count" in totals) || !("qty_total" in totals)) {
    throw new WarehouseDayMaterialsPdfSourceValidationError(
      "missing_fields",
      "pdf_warehouse_day_materials_source_v1 missing totals.docs_total, totals.rows_count or totals.qty_total",
    );
  }

  return {
    document_type: "warehouse_day_materials_report",
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

function logWarehouseDayMaterialsPdfSourceBranch(
  range: WarehouseDayMaterialsReportPdfRange,
  meta: WarehouseDayMaterialsReportPdfSourceBranchMeta,
  source: WarehouseDayMaterialsReportPdfSource,
) {
  recordPdfRpcRolloutBranch(WAREHOUSE_DAY_MATERIALS_PDF_RPC_ROLLOUT_ID, {
    source,
    branchMeta: meta,
  });
  if (!__DEV__) return;
  console.info("[warehouse-day-materials-pdf-source]", {
    source,
    sourceBranch: meta.sourceBranch,
    fallbackReason: meta.fallbackReason ?? null,
    rpcVersion: meta.rpcVersion ?? null,
    payloadShapeVersion: meta.payloadShapeVersion ?? null,
    rangeFrom: range.rpcFrom,
    rangeTo: range.rpcTo,
  });
}

export async function fetchWarehouseDayMaterialsReportPdfSourceViaRpc(
  params: Pick<GetWarehouseDayMaterialsReportPdfSourceParams, "supabase" | "range">,
): Promise<WarehouseDayMaterialsReportSource> {
  const { data, error } = await params.supabase.rpc(
    "pdf_warehouse_day_materials_source_v1",
    {
      p_from: params.range.rpcFrom,
      p_to: params.range.rpcTo,
    },
  );

  if (error) {
    throw new WarehouseDayMaterialsPdfSourceRpcError(
      `pdf_warehouse_day_materials_source_v1 failed: ${error.message}`,
      {
        code: "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
        disableForSession: shouldDisableWarehouseDayMaterialsPdfRpcForSession(
          "code" in error ? (error as { code?: unknown }).code : undefined,
          "message" in error ? (error as { message?: unknown }).message : undefined,
        ),
      },
    );
  }

  const envelope = validateWarehouseDayMaterialsPdfSourceV1(data);

  return {
    rows: envelope.rows.map(normalizeWarehouseDayMaterialsReportRow),
    docsTotal: Math.max(0, Math.round(toNumber(envelope.totals.docs_total))),
    source: "rpc:pdf_warehouse_day_materials_source_v1",
    branchMeta: {
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    },
  };
}

export async function fetchWarehouseDayMaterialsReportPdfSourceFallback(
  params: GetWarehouseDayMaterialsReportPdfSourceParams,
  fallbackReason: WarehouseDayMaterialsReportPdfSourceBranchMeta["fallbackReason"] = "rpc_error",
): Promise<WarehouseDayMaterialsReportSource> {
  const rawRows = await apiFetchIssuedMaterialsReportFast(params.supabase, {
    from: params.range.rpcFrom,
    to: params.range.rpcTo,
    objectId: null,
  });

  return {
    rows: (rawRows || []).map(normalizeWarehouseDayMaterialsReportRow),
    docsTotal: Math.max(0, Math.round(params.legacyDocsTotal)),
    source: "legacy:wh_report_issued_materials_fast",
    branchMeta: {
      sourceBranch: "legacy_fallback",
      fallbackReason,
      payloadShapeVersion: "v1",
    },
  };
}

export async function getWarehouseDayMaterialsReportPdfSource(
  params: GetWarehouseDayMaterialsReportPdfSourceParams,
): Promise<WarehouseDayMaterialsReportSource> {
  const rpcMode = WAREHOUSE_DAY_MATERIALS_PDF_RPC_MODE;

  if (rpcMode === "force_off") {
    const legacySource = await fetchWarehouseDayMaterialsReportPdfSourceFallback(
      params,
      "disabled",
    );
    logWarehouseDayMaterialsPdfSourceBranch(
      params.range,
      legacySource.branchMeta,
      legacySource.source,
    );
    return legacySource;
  }

  if (
    rpcMode === "auto" &&
    getPdfRpcRolloutAvailability(WAREHOUSE_DAY_MATERIALS_PDF_RPC_ROLLOUT_ID) === "missing"
  ) {
    const legacySource = await fetchWarehouseDayMaterialsReportPdfSourceFallback(
      params,
      "disabled",
    );
    logWarehouseDayMaterialsPdfSourceBranch(
      params.range,
      legacySource.branchMeta,
      legacySource.source,
    );
    return legacySource;
  }

  try {
    const rpcSource = await fetchWarehouseDayMaterialsReportPdfSourceViaRpc(params);
    if (rpcMode === "auto") {
      setPdfRpcRolloutAvailability(WAREHOUSE_DAY_MATERIALS_PDF_RPC_ROLLOUT_ID, "available");
    }
    logWarehouseDayMaterialsPdfSourceBranch(
      params.range,
      rpcSource.branchMeta,
      rpcSource.source,
    );
    return rpcSource;
  } catch (error) {
    const fallbackReason = getFallbackReasonForRpcError(error);
    if (
      rpcMode === "auto" &&
      error instanceof WarehouseDayMaterialsPdfSourceRpcError &&
      error.disableForSession
    ) {
      setPdfRpcRolloutAvailability(WAREHOUSE_DAY_MATERIALS_PDF_RPC_ROLLOUT_ID, "missing", {
        errorMessage: error.message,
      });
    }
    if (__DEV__) {
      console.warn("[warehouse-day-materials-pdf-source] rpc_v1 fallback", {
        fallbackReason,
        rpcMode,
        rpcAvailability: getPdfRpcRolloutAvailability(
          WAREHOUSE_DAY_MATERIALS_PDF_RPC_ROLLOUT_ID,
        ),
        rangeFrom: params.range.rpcFrom,
        rangeTo: params.range.rpcTo,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    const legacySource = await fetchWarehouseDayMaterialsReportPdfSourceFallback(
      params,
      fallbackReason,
    );
    logWarehouseDayMaterialsPdfSourceBranch(
      params.range,
      legacySource.branchMeta,
      legacySource.source,
    );
    return legacySource;
  }
}
