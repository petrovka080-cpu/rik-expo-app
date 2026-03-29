import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildWarehouseIncomingFormHtml,
  exportWarehouseHtmlPdf,
} from "../../lib/pdf/pdf.warehouse";
import { isCorruptedText, normalizeRuText } from "../../lib/text/encoding";
import { apiFetchIncomingLines } from "./warehouse.stock.read";
import {
  createWarehousePdfFileName,
  type WarehousePdfOffloadContract,
} from "./warehouse.pdf.boundary";
import {
  getPdfRpcRolloutAvailability,
  recordPdfRpcRolloutBranch,
  registerPdfRpcRolloutPath,
  resolvePdfRpcRolloutMode,
  setPdfRpcRolloutAvailability,
  type PdfRpcRolloutId,
  type PdfRpcRolloutMode,
} from "../../lib/documents/pdfRpcRollout";

const DEFAULT_ORG_NAME = "ООО «РИК»";
const DEFAULT_WAREHOUSE_NAME = "Главный склад";
const WAREHOUSE_INCOMING_PDF_SOURCE_RPC_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_WAREHOUSE_INCOMING_PDF_SOURCE_RPC_V1 ?? "",
)
  .trim()
  .toLowerCase();

type WarehouseIncomingFormPdfRecord = Record<string, unknown>;
type WarehouseIncomingFormPdfSourceEnvelopeV1 = {
  document_type: "warehouse_incoming_form";
  version: "v1";
  generated_at: string;
  document_id: string;
  source_branch: "canonical";
  header: WarehouseIncomingFormPdfRecord;
  rows: WarehouseIncomingFormPdfRecord[];
  totals: WarehouseIncomingFormPdfRecord;
  meta?: WarehouseIncomingFormPdfRecord;
};
type WarehouseIncomingLegacyGatherSource = "main" | "fallback";
type WarehouseIncomingFormSourceResult = {
  incoming: WarehouseIncomingHeadLike;
  lines: WarehouseIncomingLineLike[];
  source: WarehouseIncomingFormPdfSource;
  branchMeta: WarehouseIncomingFormPdfSourceBranchMeta;
};

const WAREHOUSE_INCOMING_PDF_RPC_ROLLOUT_ID: PdfRpcRolloutId =
  "warehouse_incoming_source_v1";
const WAREHOUSE_INCOMING_PDF_RPC_MODE: PdfRpcRolloutMode = resolvePdfRpcRolloutMode(
  WAREHOUSE_INCOMING_PDF_SOURCE_RPC_V1_MODE_RAW,
);

registerPdfRpcRolloutPath(
  WAREHOUSE_INCOMING_PDF_RPC_ROLLOUT_ID,
  WAREHOUSE_INCOMING_PDF_RPC_MODE,
);

export type WarehouseIncomingHeadLike = {
  incoming_id?: string | number | null;
  id?: string | number | null;
  who?: string | null;
  warehouseman_fio?: string | null;
  event_dt?: string | null;
  display_no?: string | null;
  note?: string | null;
};

export type WarehouseIncomingLineLike = Record<string, unknown>;

export type WarehouseIncomingFormPdfPayload = {
  incoming: WarehouseIncomingHeadLike;
  lines: WarehouseIncomingLineLike[];
  orgName: string;
  warehouseName: string;
};

export type WarehouseIncomingFormPdfContract = WarehousePdfOffloadContract<
  WarehouseIncomingFormPdfPayload,
  "warehouse_incoming_form"
>;

export type WarehouseIncomingFormPdfSource =
  | "rpc:pdf_warehouse_incoming_source_v1"
  | "legacy:client_source:main"
  | "legacy:client_source:fallback";

export type WarehouseIncomingFormPdfSourceBranchMeta = {
  sourceBranch: "rpc_v1" | "legacy_fallback";
  fallbackReason?: "rpc_error" | "invalid_payload" | "disabled" | "missing_fields";
  rpcVersion?: "v1";
  payloadShapeVersion?: "v1";
};

type WarehouseIncomingFormData = {
  incoming: WarehouseIncomingHeadLike;
  lines: WarehouseIncomingLineLike[];
  source: WarehouseIncomingLegacyGatherSource;
};

type PrepareWarehouseIncomingFormPdfParams = {
  incomingId: string;
  supabase: SupabaseClient;
  repIncoming: WarehouseIncomingHeadLike[];
  warehousemanFio: string;
  matNameByCode: Record<string, string>;
  orgName: string;
  warehouseName?: string;
  ensureIncomingLines?: (incomingId: string) => Promise<WarehouseIncomingLineLike[] | null | undefined> | WarehouseIncomingLineLike[] | null | undefined;
};

class WarehouseIncomingPdfSourceValidationError extends Error {
  reason: "invalid_payload" | "missing_fields";

  constructor(reason: "invalid_payload" | "missing_fields", message: string) {
    super(message);
    this.name = "WarehouseIncomingPdfSourceValidationError";
    this.reason = reason;
  }
}

class WarehouseIncomingPdfSourceRpcError extends Error {
  code?: string;
  disableForSession: boolean;

  constructor(message: string, options?: { code?: string; disableForSession?: boolean }) {
    super(message);
    this.name = "WarehouseIncomingPdfSourceRpcError";
    this.code = options?.code;
    this.disableForSession = options?.disableForSession === true;
  }
}

const asRecord = (value: unknown): WarehouseIncomingFormPdfRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as WarehouseIncomingFormPdfRecord)
    : {};

const asArrayOfRecords = (value: unknown): WarehouseIncomingFormPdfRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const requireNonEmptyString = (value: unknown, field: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new WarehouseIncomingPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_incoming_source_v1 missing ${field}`,
    );
  }
  return text;
};

const requireRecord = (value: unknown, field: string) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WarehouseIncomingPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_incoming_source_v1 missing ${field}`,
    );
  }
  return value as WarehouseIncomingFormPdfRecord;
};

const requireArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) {
    throw new WarehouseIncomingPdfSourceValidationError(
      "missing_fields",
      `pdf_warehouse_incoming_source_v1 missing ${field}`,
    );
  }
  return value;
};

const getFallbackReasonForRpcError = (
  error: unknown,
): WarehouseIncomingFormPdfSourceBranchMeta["fallbackReason"] => {
  if (error instanceof WarehouseIncomingPdfSourceValidationError) return error.reason;
  return "rpc_error";
};

const shouldDisableWarehouseIncomingPdfRpcForSession = (
  errorCode: unknown,
  errorMessage: unknown,
) => {
  const code = String(errorCode ?? "").trim().toUpperCase();
  const message = String(errorMessage ?? "").toLowerCase();
  if (code === "PGRST202") return true;
  if (message.includes("could not find the function")) return true;
  if (message.includes("schema cache")) return true;
  if (message.includes("function public.pdf_warehouse_incoming_source_v1")) return true;
  return false;
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

const ensureIncomingId = (incomingId: string): string => {
  const normalized = String(incomingId ?? "").trim();
  if (!normalized) {
    throw new Error("Некорректный номер прихода.");
  }
  return normalized;
};

const pickIncomingHead = (params: {
  incomingId: string;
  repIncoming: WarehouseIncomingHeadLike[];
  warehousemanFio: string;
}): WarehouseIncomingHeadLike => {
  const { incomingId, repIncoming, warehousemanFio } = params;
  const head = (repIncoming || []).find(
    (row) => String(row.incoming_id || "") === incomingId || String(row.id || "") === incomingId,
  );
  const who = String(head?.who ?? head?.warehouseman_fio ?? warehousemanFio ?? "").trim() || "—";

  return head ?? {
    incoming_id: incomingId,
    event_dt: null,
    display_no: `PR-${incomingId.slice(0, 8)}`,
    warehouseman_fio: who,
    who,
  };
};

const normalizeWarehouseIncomingPdfLine = (
  line: WarehouseIncomingLineLike,
): WarehouseIncomingLineLike => {
  const code = String(line?.code ?? "").trim();
  const rawName = String(
    line?.name_ru ?? line?.material_name ?? line?.name ?? code ?? "Позиция",
  ).trim();
  const nameRu = String(normalizeRuText(rawName || code || "Позиция")).trim() || code || "Позиция";
  const uom = String(line?.uom ?? line?.uom_id ?? "—").trim() || "—";
  const qtyReceived = line?.qty_received ?? line?.qty ?? 0;

  return {
    ...line,
    name_ru: nameRu,
    material_name: nameRu,
    name: nameRu,
    uom,
    qty_received: qtyReceived,
  };
};

function validateWarehouseIncomingFormPdfSourceV1(
  value: unknown,
): WarehouseIncomingFormPdfSourceEnvelopeV1 {
  const root = requireRecord(value, "root");
  const documentType = requireNonEmptyString(root.document_type, "document_type");
  if (documentType !== "warehouse_incoming_form") {
    throw new WarehouseIncomingPdfSourceValidationError(
      "invalid_payload",
      `pdf_warehouse_incoming_source_v1 invalid document_type: ${documentType}`,
    );
  }

  const version = requireNonEmptyString(root.version, "version");
  if (version !== "v1") {
    throw new WarehouseIncomingPdfSourceValidationError(
      "invalid_payload",
      `pdf_warehouse_incoming_source_v1 invalid version: ${version}`,
    );
  }

  const documentId = requireNonEmptyString(root.document_id, "document_id");
  const header = requireRecord(root.header, "header");
  const rows = requireArray(root.rows, "rows");
  const totals = requireRecord(root.totals, "totals");
  const incomingId = String(header.incoming_id ?? header.id ?? documentId).trim();

  if (!incomingId) {
    throw new WarehouseIncomingPdfSourceValidationError(
      "missing_fields",
      "pdf_warehouse_incoming_source_v1 missing header.incoming_id",
    );
  }

  if (!("lines_count" in totals) || !("qty_total" in totals)) {
    throw new WarehouseIncomingPdfSourceValidationError(
      "missing_fields",
      "pdf_warehouse_incoming_source_v1 missing totals.lines_count or totals.qty_total",
    );
  }

  if (rows.length === 0) {
    throw new WarehouseIncomingPdfSourceValidationError(
      "missing_fields",
      "pdf_warehouse_incoming_source_v1 returned empty rows",
    );
  }

  return {
    document_type: "warehouse_incoming_form",
    version: "v1",
    generated_at: String(root.generated_at ?? "").trim(),
    document_id: documentId,
    source_branch: "canonical",
    header: {
      ...header,
      incoming_id: incomingId,
      id: String(header.id ?? incomingId).trim() || incomingId,
    },
    rows: asArrayOfRecords(rows),
    totals,
    meta: asRecord(root.meta),
  };
}

function logWarehouseIncomingPdfSourceBranch(
  incomingId: string,
  meta: WarehouseIncomingFormPdfSourceBranchMeta,
  source: WarehouseIncomingFormPdfSource,
) {
  recordPdfRpcRolloutBranch(WAREHOUSE_INCOMING_PDF_RPC_ROLLOUT_ID, {
    source,
    branchMeta: meta,
  });
  if (!__DEV__) return;
  console.info("[warehouse-incoming-pdf-source]", {
    incomingId,
    source,
    sourceBranch: meta.sourceBranch,
    fallbackReason: meta.fallbackReason ?? null,
    rpcVersion: meta.rpcVersion ?? null,
    payloadShapeVersion: meta.payloadShapeVersion ?? null,
  });
}

export async function gatherWarehouseIncomingFormPdfData(
  params: PrepareWarehouseIncomingFormPdfParams,
): Promise<WarehouseIncomingFormData> {
  const incomingId = ensureIncomingId(params.incomingId);
  const incoming = pickIncomingHead({
    incomingId,
    repIncoming: params.repIncoming,
    warehousemanFio: params.warehousemanFio,
  });

  let source: WarehouseIncomingLegacyGatherSource = "main";
  let lines = await apiFetchIncomingLines(params.supabase, incomingId);
  if (!Array.isArray(lines) || lines.length === 0) {
    source = "fallback";
    const fallbackLines = await params.ensureIncomingLines?.(incomingId);
    if (Array.isArray(fallbackLines)) {
      lines = fallbackLines;
    }
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    const error = new Error("Нет оприходованных позиций") as Error & { reason?: string };
    error.reason = "empty";
    throw error;
  }

  return {
    incoming,
    lines,
    source,
  };
}

export async function fetchWarehouseIncomingFormPdfSourceViaRpc(params: {
  incomingId: string;
  supabase: SupabaseClient;
}): Promise<WarehouseIncomingFormSourceResult> {
  const incomingId = ensureIncomingId(params.incomingId);
  const { data, error } = await params.supabase.rpc("pdf_warehouse_incoming_source_v1", {
    p_incoming_id: incomingId,
  });

  if (error) {
    throw new WarehouseIncomingPdfSourceRpcError(
      `pdf_warehouse_incoming_source_v1 failed: ${error.message}`,
      {
        code: "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
        disableForSession: shouldDisableWarehouseIncomingPdfRpcForSession(
          "code" in error ? (error as { code?: unknown }).code : undefined,
          "message" in error ? (error as { message?: unknown }).message : undefined,
        ),
      },
    );
  }

  const envelope = validateWarehouseIncomingFormPdfSourceV1(data);

  return {
    incoming: asRecord(envelope.header) as WarehouseIncomingHeadLike,
    lines: envelope.rows.map(normalizeWarehouseIncomingPdfLine),
    source: "rpc:pdf_warehouse_incoming_source_v1",
    branchMeta: {
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    },
  };
}

export async function fetchWarehouseIncomingFormPdfSourceFallback(
  params: PrepareWarehouseIncomingFormPdfParams,
  fallbackReason: WarehouseIncomingFormPdfSourceBranchMeta["fallbackReason"] = "rpc_error",
): Promise<WarehouseIncomingFormSourceResult> {
  const gathered = await gatherWarehouseIncomingFormPdfData(params);

  return {
    incoming: gathered.incoming,
    lines: gathered.lines,
    source:
      gathered.source === "fallback"
        ? "legacy:client_source:fallback"
        : "legacy:client_source:main",
    branchMeta: {
      sourceBranch: "legacy_fallback",
      fallbackReason,
      payloadShapeVersion: "v1",
    },
  };
}

export async function getWarehouseIncomingFormPdfSource(
  params: PrepareWarehouseIncomingFormPdfParams,
): Promise<WarehouseIncomingFormSourceResult> {
  const incomingId = ensureIncomingId(params.incomingId);
  const rpcMode = WAREHOUSE_INCOMING_PDF_RPC_MODE;

  if (rpcMode === "force_off") {
    const legacySource = await fetchWarehouseIncomingFormPdfSourceFallback(
      { ...params, incomingId },
      "disabled",
    );
    logWarehouseIncomingPdfSourceBranch(incomingId, legacySource.branchMeta, legacySource.source);
    return legacySource;
  }

  if (
    rpcMode === "auto" &&
    getPdfRpcRolloutAvailability(WAREHOUSE_INCOMING_PDF_RPC_ROLLOUT_ID) === "missing"
  ) {
    const legacySource = await fetchWarehouseIncomingFormPdfSourceFallback(
      { ...params, incomingId },
      "disabled",
    );
    logWarehouseIncomingPdfSourceBranch(incomingId, legacySource.branchMeta, legacySource.source);
    return legacySource;
  }

  try {
    const rpcSource = await fetchWarehouseIncomingFormPdfSourceViaRpc({
      incomingId,
      supabase: params.supabase,
    });
    if (rpcMode === "auto") {
      setPdfRpcRolloutAvailability(WAREHOUSE_INCOMING_PDF_RPC_ROLLOUT_ID, "available");
    }
    logWarehouseIncomingPdfSourceBranch(incomingId, rpcSource.branchMeta, rpcSource.source);
    return rpcSource;
  } catch (error) {
    const fallbackReason = getFallbackReasonForRpcError(error);
    if (
      rpcMode === "auto" &&
      error instanceof WarehouseIncomingPdfSourceRpcError &&
      error.disableForSession
    ) {
      setPdfRpcRolloutAvailability(WAREHOUSE_INCOMING_PDF_RPC_ROLLOUT_ID, "missing", {
        errorMessage: error.message,
      });
    }
    if (__DEV__) {
      console.warn("[warehouse-incoming-pdf-source] rpc_v1 fallback", {
        incomingId,
        fallbackReason,
        rpcMode,
        rpcAvailability: getPdfRpcRolloutAvailability(
          WAREHOUSE_INCOMING_PDF_RPC_ROLLOUT_ID,
        ),
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    const legacySource = await fetchWarehouseIncomingFormPdfSourceFallback(
      { ...params, incomingId },
      fallbackReason,
    );
    logWarehouseIncomingPdfSourceBranch(incomingId, legacySource.branchMeta, legacySource.source);
    return legacySource;
  }
}

export function shapeWarehouseIncomingFormPdfPayload(params: {
  incoming: WarehouseIncomingHeadLike;
  lines: WarehouseIncomingLineLike[];
  matNameByCode: Record<string, string>;
  orgName: string;
  warehouseName?: string;
}): WarehouseIncomingFormPdfPayload {
  const warehouseName = String(params.warehouseName ?? "").trim() || DEFAULT_WAREHOUSE_NAME;
  const orgName = String(params.orgName ?? "").trim() || DEFAULT_ORG_NAME;

  return {
    incoming: params.incoming,
    lines: (params.lines || []).map((line) => {
      const code = String(line?.code ?? "").trim().toUpperCase();
      const mapped = String(params.matNameByCode?.[code] ?? "").trim();
      const raw = String(line?.name_ru ?? line?.material_name ?? line?.name ?? "").trim();
      const materialName = !isMissingName(mapped)
        ? mapped
        : !isMissingName(raw)
          ? raw
          : code;

      return {
        ...line,
        material_name: materialName,
      };
    }),
    orgName,
    warehouseName,
  };
}

export function createWarehouseIncomingFormPdfContract(params: {
  incomingId: string;
  payload: WarehouseIncomingFormPdfPayload;
}): WarehouseIncomingFormPdfContract {
  const incomingId = ensureIncomingId(params.incomingId);

  return {
    version: 1,
    flow: "warehouse_incoming_form",
    template: "warehouse_incoming_form_v1",
    title: `Приходный ордер ${incomingId}`,
    fileName: createWarehousePdfFileName({
      documentType: "warehouse_document",
      title: "warehouse_incoming",
      entityId: incomingId,
    }),
    documentType: "warehouse_document",
    entityId: incomingId,
    payload: params.payload,
  };
}

export function renderWarehouseIncomingFormPdfHtml(
  contract: WarehouseIncomingFormPdfContract,
): string {
  return buildWarehouseIncomingFormHtml({
    incoming: contract.payload.incoming,
    lines: contract.payload.lines,
    orgName: contract.payload.orgName,
    warehouseName: contract.payload.warehouseName,
  });
}

export async function exportWarehouseIncomingFormPdfContract(
  contract: WarehouseIncomingFormPdfContract,
): Promise<string> {
  return await exportWarehouseHtmlPdf({
    fileName: `Incoming_${contract.entityId ?? "unknown"}`,
    html: renderWarehouseIncomingFormPdfHtml(contract),
  });
}

export async function prepareWarehouseIncomingFormPdf(
  params: PrepareWarehouseIncomingFormPdfParams,
): Promise<{
  contract: WarehouseIncomingFormPdfContract;
  source: WarehouseIncomingFormPdfSource;
  branchMeta: WarehouseIncomingFormPdfSourceBranchMeta;
}> {
  const incomingId = ensureIncomingId(params.incomingId);
  const gathered = await getWarehouseIncomingFormPdfSource({
    ...params,
    incomingId,
  });
  const payload = shapeWarehouseIncomingFormPdfPayload({
    incoming: gathered.incoming,
    lines: gathered.lines,
    matNameByCode: params.matNameByCode,
    orgName: params.orgName,
    warehouseName: params.warehouseName,
  });

  return {
    contract: createWarehouseIncomingFormPdfContract({
      incomingId,
      payload,
    }),
    source: gathered.source,
    branchMeta: gathered.branchMeta,
  };
}
