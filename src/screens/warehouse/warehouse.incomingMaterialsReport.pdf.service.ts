import type { SupabaseClient } from "@supabase/supabase-js";
import {
  registerPdfRpcRolloutPath,
  resolvePdfRpcRolloutMode,
  setPdfRpcRolloutAvailability,
  type PdfRpcRolloutBranchMeta,
  type PdfRpcRolloutFallbackReason,
  type PdfRpcRolloutId,
  type PdfRpcRolloutMode,
} from "../../lib/documents/pdfRpcRollout";
import { beginPdfLifecycleObservation } from "../../lib/pdf/pdfLifecycle";
import { isCorruptedText, normalizeRuText } from "../../lib/text/encoding";
import {
  assertWarehousePdfRpcPrimary,
  logWarehousePdfSourceBranch,
  recordWarehousePdfRpcFailure,
} from "./warehouse.pdf.source.shared";

const WAREHOUSE_INCOMING_MATERIALS_PDF_SOURCE_RPC_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_WAREHOUSE_INCOMING_MATERIALS_PDF_SOURCE_RPC_V1 ?? "",
)
  .trim()
  .toLowerCase();

type WarehouseIncomingMaterialsReportRecord = Record<string, unknown>;
type WarehouseIncomingMaterialsReportPdfSourceEnvelopeV1 = {
  document_type: "warehouse_incoming_materials_report";
  version: "v1";
  generated_at: string;
  document_id: string;
  source_branch: "canonical";
  header: WarehouseIncomingMaterialsReportRecord;
  rows: WarehouseIncomingMaterialsReportRecord[];
  totals: WarehouseIncomingMaterialsReportRecord;
  meta?: WarehouseIncomingMaterialsReportRecord;
};

const WAREHOUSE_INCOMING_MATERIALS_PDF_RPC_ROLLOUT_ID: PdfRpcRolloutId =
  "warehouse_incoming_materials_source_v1";
const WAREHOUSE_INCOMING_MATERIALS_PDF_RPC_MODE: PdfRpcRolloutMode =
  resolvePdfRpcRolloutMode(WAREHOUSE_INCOMING_MATERIALS_PDF_SOURCE_RPC_V1_MODE_RAW);

registerPdfRpcRolloutPath(
  WAREHOUSE_INCOMING_MATERIALS_PDF_RPC_ROLLOUT_ID,
  WAREHOUSE_INCOMING_MATERIALS_PDF_RPC_MODE,
);

export type WarehouseIncomingMaterialsReportPdfRow = {
  material_code: string;
  material_name: string;
  uom: string;
  sum_total: number;
  docs_cnt: number;
  lines_cnt: number;
};

export type WarehouseIncomingMaterialsReportPdfSource =
  "rpc:pdf_warehouse_incoming_materials_source_v1";

export type WarehouseIncomingMaterialsReportPdfSourceBranchMeta = PdfRpcRolloutBranchMeta;

export type WarehouseIncomingMaterialsReportPdfRange = {
  pdfFrom: string;
  pdfTo: string;
  rpcFrom: string;
  rpcTo: string;
};

type WarehouseIncomingMaterialsReportSource = {
  rows: WarehouseIncomingMaterialsReportPdfRow[];
  docsTotal: number;
  source: WarehouseIncomingMaterialsReportPdfSource;
  branchMeta: WarehouseIncomingMaterialsReportPdfSourceBranchMeta;
};

type GetWarehouseIncomingMaterialsReportPdfSourceParams = {
  supabase: SupabaseClient;
  range: WarehouseIncomingMaterialsReportPdfRange;
  legacyDocsTotal: number;
  nameByCode?: Record<string, string>;
};

class WarehouseIncomingMaterialsPdfSourceValidationError extends Error {
  reason: "invalid_payload" | "missing_fields";

  constructor(reason: "invalid_payload" | "missing_fields", message: string) {
    super(message);
    this.name = "WarehouseIncomingMaterialsPdfSourceValidationError";
    this.reason = reason;
  }
}

class WarehouseIncomingMaterialsPdfSourceRpcError extends Error {
  code?: string;
  disableForSession: boolean;

  constructor(message: string, options?: { code?: string; disableForSession?: boolean }) {
    super(message);
    this.name = "WarehouseIncomingMaterialsPdfSourceRpcError";
    this.code = options?.code;
    this.disableForSession = options?.disableForSession === true;
  }
}

const asRecord = (value: unknown): WarehouseIncomingMaterialsReportRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as WarehouseIncomingMaterialsReportRecord)
    : {};

const asArrayOfRecords = (value: unknown): WarehouseIncomingMaterialsReportRecord[] =>
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
  if (isCorruptedText(text)) return true;
  return false;
};

const requireNonEmptyString = (value: unknown, field: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new WarehouseIncomingMaterialsPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_incoming_materials_source_v1 missing ${field}`,
    );
  }
  return text;
};

const requireRecord = (value: unknown, field: string) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WarehouseIncomingMaterialsPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_incoming_materials_source_v1 missing ${field}`,
    );
  }
  return value as WarehouseIncomingMaterialsReportRecord;
};

const requireArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) {
    throw new WarehouseIncomingMaterialsPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_incoming_materials_source_v1 missing ${field}`,
    );
  }
  return value;
};

const getFallbackReasonForRpcError = (
  error: unknown,
): PdfRpcRolloutFallbackReason => {
  if (error instanceof WarehouseIncomingMaterialsPdfSourceValidationError) {
    return error.reason;
  }
  return "rpc_error";
};

const shouldDisableWarehouseIncomingMaterialsPdfRpcForSession = (
  errorCode: unknown,
  errorMessage: unknown,
) => {
  const code = String(errorCode ?? "").trim().toUpperCase();
  const message = String(errorMessage ?? "").toLowerCase();
  if (code === "PGRST202") return true;
  if (message.includes("could not find the function")) return true;
  if (message.includes("schema cache")) return true;
  if (message.includes("function public.pdf_warehouse_incoming_materials_source_v1")) return true;
  return false;
};

const normalizeWarehouseIncomingMaterialsReportRow = (
  value: unknown,
  nameByCode?: Record<string, string>,
): WarehouseIncomingMaterialsReportPdfRow => {
  const row = asRecord(value);
  const materialCode = String(row.material_code ?? "").trim();
  const mappedName = String(nameByCode?.[materialCode] ?? "").trim();
  const rawName = String(normalizeRuText(String(row.material_name ?? materialCode ?? ""))).trim();
  const materialName = !isMissingName(mappedName)
    ? mappedName
    : !isMissingName(rawName)
      ? rawName
      : (materialCode || "Позиция");

  return {
    material_code: materialCode,
    material_name: materialName,
    uom: String(row.uom ?? "").trim(),
    sum_total: toNumber(row.sum_total),
    docs_cnt: toNumber(row.docs_cnt),
    lines_cnt: toNumber(row.lines_cnt),
  };
};

function validateWarehouseIncomingMaterialsPdfSourceV1(
  value: unknown,
): WarehouseIncomingMaterialsReportPdfSourceEnvelopeV1 {
  const root = requireRecord(value, "root");
  const documentType = requireNonEmptyString(root.document_type, "document_type");
  if (documentType !== "warehouse_incoming_materials_report") {
    throw new WarehouseIncomingMaterialsPdfSourceValidationError(
      "invalid_payload",
      `pdf_warehouse_incoming_materials_source_v1 invalid document_type: ${documentType}`,
    );
  }

  const version = requireNonEmptyString(root.version, "version");
  if (version !== "v1") {
    throw new WarehouseIncomingMaterialsPdfSourceValidationError(
      "invalid_payload",
      `pdf_warehouse_incoming_materials_source_v1 invalid version: ${version}`,
    );
  }

  const documentId = requireNonEmptyString(root.document_id, "document_id");
  const header = requireRecord(root.header, "header");
  const rows = requireArray(root.rows, "rows");
  const totals = requireRecord(root.totals, "totals");

  if (!("docs_total" in totals) || !("rows_count" in totals) || !("qty_total" in totals)) {
    throw new WarehouseIncomingMaterialsPdfSourceValidationError(
      "missing_fields",
      "pdf_warehouse_incoming_materials_source_v1 missing totals.docs_total, totals.rows_count or totals.qty_total",
    );
  }

  return {
    document_type: "warehouse_incoming_materials_report",
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

export async function fetchWarehouseIncomingMaterialsReportPdfSourceViaRpc(
  params: Pick<GetWarehouseIncomingMaterialsReportPdfSourceParams, "supabase" | "range" | "nameByCode">,
): Promise<WarehouseIncomingMaterialsReportSource> {
  const { data, error } = await params.supabase.rpc(
    "pdf_warehouse_incoming_materials_source_v1",
    {
      p_from: params.range.rpcFrom,
      p_to: params.range.rpcTo,
    },
  );

  if (error) {
    throw new WarehouseIncomingMaterialsPdfSourceRpcError(
      `pdf_warehouse_incoming_materials_source_v1 failed: ${error.message}`,
      {
        code: "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
        disableForSession: shouldDisableWarehouseIncomingMaterialsPdfRpcForSession(
          "code" in error ? (error as { code?: unknown }).code : undefined,
          "message" in error ? (error as { message?: unknown }).message : undefined,
        ),
      },
    );
  }

  const envelope = validateWarehouseIncomingMaterialsPdfSourceV1(data);

  return {
    rows: envelope.rows.map((row) =>
      normalizeWarehouseIncomingMaterialsReportRow(row, params.nameByCode),
    ),
    docsTotal: Math.max(0, Math.round(toNumber(envelope.totals.docs_total))),
    source: "rpc:pdf_warehouse_incoming_materials_source_v1",
    branchMeta: {
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    },
  };
}

export async function getWarehouseIncomingMaterialsReportPdfSource(
  params: GetWarehouseIncomingMaterialsReportPdfSourceParams,
): Promise<WarehouseIncomingMaterialsReportSource> {
  const rpcMode = WAREHOUSE_INCOMING_MATERIALS_PDF_RPC_MODE;
  const observation = beginPdfLifecycleObservation({
    screen: "warehouse",
    surface: "warehouse_pdf_source",
    event: "warehouse_incoming_materials_pdf_source_load",
    stage: "source_load",
    sourceKind: "rpc:pdf_warehouse_incoming_materials_source_v1",
    context: {
      documentFamily: "warehouse_incoming_materials_report",
      documentType: "warehouse_materials",
      source: "rpc:pdf_warehouse_incoming_materials_source_v1",
    },
  });

  try {
    assertWarehousePdfRpcPrimary(
      WAREHOUSE_INCOMING_MATERIALS_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      "pdf_warehouse_incoming_materials_source_v1",
    );
    const rpcSource = await fetchWarehouseIncomingMaterialsReportPdfSourceViaRpc(params);
    if (rpcMode === "auto") {
      setPdfRpcRolloutAvailability(
        WAREHOUSE_INCOMING_MATERIALS_PDF_RPC_ROLLOUT_ID,
        "available",
      );
    }
    logWarehousePdfSourceBranch({
      id: WAREHOUSE_INCOMING_MATERIALS_PDF_RPC_ROLLOUT_ID,
      source: rpcSource.source,
      branchMeta: rpcSource.branchMeta,
      extra: {
        rangeFrom: params.range.rpcFrom,
        rangeTo: params.range.rpcTo,
        rows: rpcSource.rows.length,
      },
    });
    observation.success({
      sourceKind: rpcSource.source,
      rowCount: rpcSource.rows.length,
      extra: {
        sourceBranch: rpcSource.branchMeta.sourceBranch,
        docsTotal: rpcSource.docsTotal,
      },
    });
    return rpcSource;
  } catch (error) {
    recordWarehousePdfRpcFailure({
      id: WAREHOUSE_INCOMING_MATERIALS_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      sourceKind: "rpc:pdf_warehouse_incoming_materials_source_v1",
      tag: "[warehouse-incoming-materials-pdf-source] rpc_v1 hard-fail",
      error,
      failureReason: getFallbackReasonForRpcError(error),
      extra: {
        rangeFrom: params.range.rpcFrom,
        rangeTo: params.range.rpcTo,
      },
    });
    throw observation.error(error, {
      fallbackMessage: "Warehouse incoming materials PDF source load failed",
      extra: {
        rangeFrom: params.range.rpcFrom,
        rangeTo: params.range.rpcTo,
        rpcMode,
        fallbackUsed: false,
      },
    });
  }
}
