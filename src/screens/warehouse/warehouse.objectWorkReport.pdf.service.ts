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
import type { AppSupabaseClient } from "../../types/contracts/shared";
import { callWarehouseObjectWorkReportPdfSourceRpc } from "./warehouse.objectWorkReport.pdf.transport";
import {
  assertWarehousePdfRpcPrimary,
  logWarehousePdfSourceBranch,
  recordWarehousePdfRpcFailure,
} from "./warehouse.pdf.source.shared";

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
  "rpc:pdf_warehouse_object_work_source_v1";

export type WarehouseObjectWorkReportPdfSourceBranchMeta = PdfRpcRolloutBranchMeta;

type WarehouseObjectWorkReportSource = {
  rows: WarehouseObjectWorkReportPdfRow[];
  docsTotal: number;
  source: WarehouseObjectWorkReportPdfSource;
  branchMeta: WarehouseObjectWorkReportPdfSourceBranchMeta;
};

type GetWarehouseObjectWorkReportPdfSourceParams = {
  supabase: AppSupabaseClient;
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
): PdfRpcRolloutFallbackReason => {
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
    object_name: toText(row.object_name) || "Без объекта",
    work_name: toText(row.work_name) || "Без вида работ",
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

export async function fetchWarehouseObjectWorkReportPdfSourceViaRpc(
  params: Pick<GetWarehouseObjectWorkReportPdfSourceParams, "supabase" | "range" | "objectId">,
): Promise<WarehouseObjectWorkReportSource> {
  const { data, error } = await callWarehouseObjectWorkReportPdfSourceRpc(
    params.supabase,
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

export async function getWarehouseObjectWorkReportPdfSource(
  params: GetWarehouseObjectWorkReportPdfSourceParams,
): Promise<WarehouseObjectWorkReportSource> {
  const rpcMode = WAREHOUSE_OBJECT_WORK_PDF_RPC_MODE;
  const observation = beginPdfLifecycleObservation({
    screen: "warehouse",
    surface: "warehouse_pdf_source",
    event: "warehouse_object_work_pdf_source_load",
    stage: "source_load",
    sourceKind: "rpc:pdf_warehouse_object_work_source_v1",
    context: {
      documentFamily: "warehouse_object_work_report",
      documentType: "warehouse_materials",
      source: "rpc:pdf_warehouse_object_work_source_v1",
      entityId: params.objectId ?? null,
    },
  });

  try {
    assertWarehousePdfRpcPrimary(
      WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      "pdf_warehouse_object_work_source_v1",
    );
    const rpcSource = await fetchWarehouseObjectWorkReportPdfSourceViaRpc(params);
    if (rpcMode === "auto") {
      setPdfRpcRolloutAvailability(WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID, "available");
    }
    logWarehousePdfSourceBranch({
      id: WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID,
      source: rpcSource.source,
      branchMeta: rpcSource.branchMeta,
      extra: {
        rangeFrom: params.range.rpcFrom,
        rangeTo: params.range.rpcTo,
        objectId: params.objectId ?? null,
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
      id: WAREHOUSE_OBJECT_WORK_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      sourceKind: "rpc:pdf_warehouse_object_work_source_v1",
      tag: "[warehouse-object-work-pdf-source] rpc_v1 hard-fail",
      error,
      failureReason: getFallbackReasonForRpcError(error),
      extra: {
        rangeFrom: params.range.rpcFrom,
        rangeTo: params.range.rpcTo,
        objectId: params.objectId ?? null,
      },
    });
    throw observation.error(error, {
      fallbackMessage: "Warehouse object-work PDF source load failed",
      extra: {
        rangeFrom: params.range.rpcFrom,
        rangeTo: params.range.rpcTo,
        objectId: params.objectId ?? null,
        rpcMode,
        fallbackUsed: false,
      },
    });
  }
}
