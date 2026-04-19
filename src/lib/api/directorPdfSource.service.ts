import {
  getPdfRpcRolloutAvailability,
  recordPdfRpcRolloutBranch,
  registerPdfRpcRolloutPath,
  resolvePdfRpcRolloutMode,
  setPdfRpcRolloutAvailability,
  type PdfRpcRolloutBranchMeta,
  type PdfRpcRolloutFallbackReason,
  type PdfRpcRolloutId,
  type PdfRpcRolloutMode,
} from "../documents/pdfRpcRollout";
import { recordCatchDiscipline } from "../observability/catchDiscipline";
import { beginPdfLifecycleObservation } from "../pdf/pdfLifecycle";
import { supabase } from "../supabaseClient";
import type { DirectorReportFetchMeta } from "./director_reports";
import { adaptCanonicalMaterialsPayload, adaptCanonicalWorksPayload } from "./director_reports.adapters";
import { loadDirectorReportTransportScope } from "./directorReportsTransport.service";
import type { DirectorDisciplinePayload, DirectorReportPayload } from "./director_reports.shared";
import {
  mapToFinanceRow,
  normalizeFinSpendRows,
  type FinanceRow,
  type FinSpendRow,
} from "../../screens/director/director.finance";

const DIRECTOR_FINANCE_PDF_SOURCE_RPC_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_FINANCE_PDF_SOURCE_RPC_V1 ?? "",
)
  .trim()
  .toLowerCase();
const DIRECTOR_PRODUCTION_PDF_SOURCE_RPC_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_PRODUCTION_PDF_SOURCE_RPC_V1 ?? "",
)
  .trim()
  .toLowerCase();
const DIRECTOR_SUBCONTRACT_PDF_SOURCE_RPC_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_SUBCONTRACT_PDF_SOURCE_RPC_V1 ?? "",
)
  .trim()
  .toLowerCase();

const DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID: PdfRpcRolloutId = "director_finance_source_v1";
const DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID: PdfRpcRolloutId = "director_production_source_v1";
const DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID: PdfRpcRolloutId = "director_subcontract_source_v1";

const DIRECTOR_FINANCE_PDF_RPC_MODE: PdfRpcRolloutMode = resolvePdfRpcRolloutMode(
  DIRECTOR_FINANCE_PDF_SOURCE_RPC_V1_MODE_RAW,
);
const DIRECTOR_PRODUCTION_PDF_RPC_MODE: PdfRpcRolloutMode = resolvePdfRpcRolloutMode(
  DIRECTOR_PRODUCTION_PDF_SOURCE_RPC_V1_MODE_RAW,
);
const DIRECTOR_SUBCONTRACT_PDF_RPC_MODE: PdfRpcRolloutMode = resolvePdfRpcRolloutMode(
  DIRECTOR_SUBCONTRACT_PDF_SOURCE_RPC_V1_MODE_RAW,
);
const DIRECTOR_PDF_SOURCE_IS_DEV = typeof __DEV__ !== "undefined" && __DEV__ === true;

registerPdfRpcRolloutPath(DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID, DIRECTOR_FINANCE_PDF_RPC_MODE);
registerPdfRpcRolloutPath(DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID, DIRECTOR_PRODUCTION_PDF_RPC_MODE);
registerPdfRpcRolloutPath(DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID, DIRECTOR_SUBCONTRACT_PDF_RPC_MODE);

type DirectorPdfRecord = Record<string, unknown>;

type DirectorFinanceSourceEnvelopeV1 = {
  document_type: "director_finance_report";
  version: "v1";
  finance_rows: unknown[];
  spend_rows: unknown[];
};

type DirectorFinanceSourceEnvelopeV2 = {
  document_type: "director_finance_report";
  version: "v2";
  metrics: Record<string, unknown>;
  kind_rows: unknown[];
  spend_supplier_rows: unknown[];
  summary: unknown;
};

type DirectorProductionSourceEnvelopeV1 = {
  document_type: "director_production_report";
  version: "v1";
  report_payload: unknown;
  discipline_payload: unknown;
};

type DirectorSubcontractSourceEnvelopeV1 = {
  document_type: "director_subcontract_report";
  version: "v1";
  rows: unknown[];
};

export type DirectorPdfPriceStage = "base" | "priced";

export type DirectorFinancePdfSource = {
  financeRows: FinanceRow[];
  spendRows: FinSpendRow[];
  source: string;
  branchMeta: PdfRpcRolloutBranchMeta;
};

export type DirectorProductionPdfSource = {
  repData: DirectorReportPayload;
  repDiscipline: DirectorDisciplinePayload;
  source: string;
  branchMeta: PdfRpcRolloutBranchMeta;
  priceStage: DirectorPdfPriceStage;
  reportMeta: DirectorReportFetchMeta | null;
  disciplineMeta: DirectorReportFetchMeta | null;
};

export type DirectorSubcontractPdfSourceRow = Record<string, unknown>;

export type DirectorSubcontractPdfSource = {
  rows: DirectorSubcontractPdfSourceRow[];
  source: string;
  branchMeta: PdfRpcRolloutBranchMeta;
};

class DirectorPdfSourceValidationError extends Error {
  reason: Extract<PdfRpcRolloutFallbackReason, "invalid_payload" | "missing_fields">;

  constructor(
    reason: Extract<PdfRpcRolloutFallbackReason, "invalid_payload" | "missing_fields">,
    message: string,
  ) {
    super(message);
    this.name = "DirectorPdfSourceValidationError";
    this.reason = reason;
  }
}

class DirectorPdfSourceRpcError extends Error {
  code?: string;
  disableForSession: boolean;

  constructor(message: string, options?: { code?: string; disableForSession?: boolean }) {
    super(message);
    this.name = "DirectorPdfSourceRpcError";
    this.code = options?.code;
    this.disableForSession = options?.disableForSession === true;
  }
}

const asArrayOfRecords = (value: unknown): DirectorPdfRecord[] =>
  Array.isArray(value)
    ? value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as DirectorPdfRecord)
          : {},
      )
    : [];

const toText = (value: unknown) => String(value ?? "").trim();

const requireNonEmptyString = (value: unknown, field: string, functionName: string) => {
  const text = toText(value);
  if (!text) {
    throw new DirectorPdfSourceValidationError(
      "missing_fields",
      `${functionName} missing ${field}`,
    );
  }
  return text;
};

const requireRecord = (value: unknown, field: string, functionName: string) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DirectorPdfSourceValidationError(
      "missing_fields",
      `${functionName} missing ${field}`,
    );
  }
  return value as DirectorPdfRecord;
};

const requireArray = (value: unknown, field: string, functionName: string) => {
  if (!Array.isArray(value)) {
    throw new DirectorPdfSourceValidationError(
      "missing_fields",
      `${functionName} missing ${field}`,
    );
  }
  return value;
};

const shouldDisableDirectorPdfRpcForSession = (
  functionName: string,
  errorCode: unknown,
  errorMessage: unknown,
) => {
  const code = String(errorCode ?? "").trim().toUpperCase();
  const message = String(errorMessage ?? "").toLowerCase();
  if (code === "PGRST202") return true;
  if (message.includes("could not find the function")) return true;
  if (message.includes("schema cache")) return true;
  if (message.includes(`function public.${functionName}`)) return true;
  return false;
};

const getFallbackReasonForRpcError = (
  error: unknown,
): PdfRpcRolloutFallbackReason => {
  if (error instanceof DirectorPdfSourceValidationError) return error.reason;
  return "rpc_error";
};

const logDirectorPdfSourceBranch = (
  id: PdfRpcRolloutId,
  source: string,
  branchMeta: PdfRpcRolloutBranchMeta,
  extra?: Record<string, unknown>,
) => {
  recordPdfRpcRolloutBranch(id, {
    source,
    branchMeta,
  });
  if (!DIRECTOR_PDF_SOURCE_IS_DEV) return;
  if (__DEV__) console.info("[director-pdf-source]", {
    id,
    source,
    sourceBranch: branchMeta.sourceBranch,
    fallbackReason: branchMeta.fallbackReason ?? null,
    rpcVersion: branchMeta.rpcVersion ?? null,
    payloadShapeVersion: branchMeta.payloadShapeVersion ?? null,
    ...extra,
  });
};

const assertDirectorPdfRpcPrimary = (
  id: PdfRpcRolloutId,
  rpcMode: PdfRpcRolloutMode,
  functionName: string,
) => {
  if (rpcMode === "force_off") {
    throw new DirectorPdfSourceRpcError(
      `${functionName} is force_off but legacy fallback branches were removed`,
    );
  }
  if (rpcMode === "auto" && getPdfRpcRolloutAvailability(id) === "missing") {
    throw new DirectorPdfSourceRpcError(
      `${functionName} unavailable in this session and legacy fallback branches were removed`,
    );
  }
};

const recordDirectorPdfRpcFailure = (
  id: PdfRpcRolloutId,
  rpcMode: PdfRpcRolloutMode,
  tag: string,
  extra: Record<string, unknown>,
  error: unknown,
) => {
  const failureReason = getFallbackReasonForRpcError(error);
  if (
    rpcMode === "auto" &&
    error instanceof DirectorPdfSourceRpcError &&
    error.disableForSession
  ) {
    setPdfRpcRolloutAvailability(id, "missing", {
      errorMessage: error.message,
    });
  }
  recordCatchDiscipline({
    screen: "director",
    surface: "director_pdf_source",
    event: "director_pdf_source_failed",
    kind: "critical_fail",
    error,
    sourceKind: `rpc:${id}`,
    errorStage: "source_load",
    extra: {
      pdfSourceFamily: id,
      failureReason,
      rpcMode,
      rpcAvailability: getPdfRpcRolloutAvailability(id),
      publishState: "error",
      fallbackUsed: false,
      ...extra,
    },
  });
  if (!DIRECTOR_PDF_SOURCE_IS_DEV) return;
  if (__DEV__) console.warn(tag, {
    failureReason,
    rpcMode,
    errorMessage: error instanceof Error ? error.message : String(error),
    ...extra,
  });
};

const coerceFinanceRows = (rawRows: unknown[]): FinanceRow[] =>
  rawRows
    .map(mapToFinanceRow)
    .filter((row) => !!row && !!row.id)
    .filter((row) => Number.isFinite(Number(row.amount)));

function validateDirectorFinanceSourceV1(value: unknown): DirectorFinanceSourceEnvelopeV1 {
  const root = requireRecord(value, "root", "pdf_director_finance_source_v1");
  const documentType = requireNonEmptyString(
    root.document_type,
    "document_type",
    "pdf_director_finance_source_v1",
  );
  if (documentType !== "director_finance_report") {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      `pdf_director_finance_source_v1 invalid document_type: ${documentType}`,
    );
  }
  const version = requireNonEmptyString(root.version, "version", "pdf_director_finance_source_v1");
  if (version !== "v1") {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      `pdf_director_finance_source_v1 invalid version: ${version}`,
    );
  }
  return {
    document_type: "director_finance_report",
    version: "v1",
    finance_rows: requireArray(root.finance_rows, "finance_rows", "pdf_director_finance_source_v1"),
    spend_rows: requireArray(root.spend_rows, "spend_rows", "pdf_director_finance_source_v1"),
  };
}

function validateDirectorFinanceSourceV2(value: unknown): DirectorFinanceSourceEnvelopeV2 {
  const root = requireRecord(value, "root", "pdf_director_finance_source_v2");
  const documentType = requireNonEmptyString(
    root.document_type,
    "document_type",
    "pdf_director_finance_source_v2",
  );
  if (documentType !== "director_finance_report") {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      `pdf_director_finance_source_v2 invalid document_type: ${documentType}`,
    );
  }
  const version = requireNonEmptyString(root.version, "version", "pdf_director_finance_source_v2");
  if (version !== "v2") {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      `pdf_director_finance_source_v2 invalid version: ${version}`,
    );
  }
  return {
    document_type: "director_finance_report",
    version: "v2",
    metrics: requireRecord(root.metrics, "metrics", "pdf_director_finance_source_v2"),
    kind_rows: requireArray(root.kind_rows, "kind_rows", "pdf_director_finance_source_v2"),
    spend_supplier_rows: requireArray(root.spend_supplier_rows, "spend_supplier_rows", "pdf_director_finance_source_v2"),
    summary: root.summary,
  };
}

function validateDirectorProductionSourceV1(value: unknown): DirectorProductionSourceEnvelopeV1 {
  const root = requireRecord(value, "root", "pdf_director_production_source_v1");
  const documentType = requireNonEmptyString(
    root.document_type,
    "document_type",
    "pdf_director_production_source_v1",
  );
  if (documentType !== "director_production_report") {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      `pdf_director_production_source_v1 invalid document_type: ${documentType}`,
    );
  }
  const version = requireNonEmptyString(root.version, "version", "pdf_director_production_source_v1");
  if (version !== "v1") {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      `pdf_director_production_source_v1 invalid version: ${version}`,
    );
  }
  return {
    document_type: "director_production_report",
    version: "v1",
    report_payload: requireRecord(root.report_payload, "report_payload", "pdf_director_production_source_v1"),
    discipline_payload: requireRecord(
      root.discipline_payload,
      "discipline_payload",
      "pdf_director_production_source_v1",
    ),
  };
}

function validateDirectorSubcontractSourceV1(value: unknown): DirectorSubcontractSourceEnvelopeV1 {
  const root = requireRecord(value, "root", "pdf_director_subcontract_source_v1");
  const documentType = requireNonEmptyString(
    root.document_type,
    "document_type",
    "pdf_director_subcontract_source_v1",
  );
  if (documentType !== "director_subcontract_report") {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      `pdf_director_subcontract_source_v1 invalid document_type: ${documentType}`,
    );
  }
  const version = requireNonEmptyString(root.version, "version", "pdf_director_subcontract_source_v1");
  if (version !== "v1") {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      `pdf_director_subcontract_source_v1 invalid version: ${version}`,
    );
  }
  return {
    document_type: "director_subcontract_report",
    version: "v1",
    rows: requireArray(root.rows, "rows", "pdf_director_subcontract_source_v1"),
  };
}

async function fetchDirectorFinancePdfSourceViaRpc(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<DirectorFinancePdfSource> {
  const { data, error } = await supabase.rpc("pdf_director_finance_source_v1", {
    p_from: args.periodFrom ?? null,
    p_to: args.periodTo ?? null,
    p_due_days: args.dueDaysDefault ?? 7,
    p_critical_days: args.criticalDays ?? 14,
  });

  if (error) {
    throw new DirectorPdfSourceRpcError(
      `pdf_director_finance_source_v1 failed: ${error.message}`,
      {
        code: "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
        disableForSession: shouldDisableDirectorPdfRpcForSession(
          "pdf_director_finance_source_v1",
          "code" in error ? (error as { code?: unknown }).code : undefined,
          "message" in error ? (error as { message?: unknown }).message : undefined,
        ),
      },
    );
  }

  const envelope = validateDirectorFinanceSourceV1(data);

  return {
    financeRows: coerceFinanceRows(envelope.finance_rows),
    spendRows: normalizeFinSpendRows(envelope.spend_rows),
    source: "rpc:pdf_director_finance_source_v1",
    branchMeta: {
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    },
  };
}

export type DirectorFinancePdfSourceV2 = {
  metrics: Record<string, unknown>;
  kindRows: unknown[];
  spendSupplierRows: unknown[];
  summary: unknown;
  source: string;
  branchMeta: PdfRpcRolloutBranchMeta;
};

async function fetchDirectorFinancePdfSourceViaRpcV2(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<DirectorFinancePdfSourceV2> {
  const { data, error } = await supabase.rpc("pdf_director_finance_source_v2", {
    p_from: args.periodFrom ?? null,
    p_to: args.periodTo ?? null,
    p_due_days: args.dueDaysDefault ?? 7,
    p_critical_days: args.criticalDays ?? 14,
  });

  if (error) {
    throw new DirectorPdfSourceRpcError(
      `pdf_director_finance_source_v2 failed: ${error.message}`,
      {
        code: "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
        disableForSession: shouldDisableDirectorPdfRpcForSession(
          "pdf_director_finance_source_v2",
          "code" in error ? (error as { code?: unknown }).code : undefined,
          "message" in error ? (error as { message?: unknown }).message : undefined,
        ),
      },
    );
  }

  const envelope = validateDirectorFinanceSourceV2(data);

  return {
    metrics: envelope.metrics,
    kindRows: envelope.kind_rows,
    spendSupplierRows: envelope.spend_supplier_rows,
    summary: envelope.summary,
    source: "rpc:pdf_director_finance_source_v2",
    branchMeta: {
      sourceBranch: "rpc_v2",
      rpcVersion: "v2",
      payloadShapeVersion: "v2",
    },
  };
}

// D-BACKEND-PDF: Short-lived cache for finance PDF source RPC results.
// Avoids re-fetching identical data when the user taps the management report
// PDF button multiple times within the TTL window.
const FINANCE_PDF_SOURCE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
type FinancePdfSourceCacheEntry = { ts: number; value: DirectorFinancePdfSource };
const financePdfSourceCache = new Map<string, FinancePdfSourceCacheEntry>();

const buildFinancePdfSourceCacheKey = (args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}) =>
  [
    String(args.periodFrom ?? ""),
    String(args.periodTo ?? ""),
    String(args.dueDaysDefault ?? 7),
    String(args.criticalDays ?? 14),
  ].join("|");

export async function getDirectorFinancePdfSource(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<DirectorFinancePdfSource> {
  // D-BACKEND-PDF: Check short-lived cache first.
  const cacheKey = buildFinancePdfSourceCacheKey(args);
  const cached = financePdfSourceCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < FINANCE_PDF_SOURCE_CACHE_TTL_MS) {
    return cached.value;
  }
  // Expired entry — clean up.
  if (cached) financePdfSourceCache.delete(cacheKey);

  const rpcMode = DIRECTOR_FINANCE_PDF_RPC_MODE;
  const observation = beginPdfLifecycleObservation({
    screen: "director",
    surface: "director_pdf_source",
    event: "director_finance_pdf_source_load",
    stage: "source_load",
    sourceKind: "rpc:pdf_director_finance_source_v1",
    context: {
      documentFamily: "director_finance_pdf",
      documentType: "director_report",
      source: "rpc:pdf_director_finance_source_v1",
    },
  });
  try {
    assertDirectorPdfRpcPrimary(
      DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      "pdf_director_finance_source_v1",
    );
    const rpcSource = await fetchDirectorFinancePdfSourceViaRpc(args);
    if (rpcMode === "auto") {
      setPdfRpcRolloutAvailability(DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID, "available");
    }
    logDirectorPdfSourceBranch(DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID, rpcSource.source, rpcSource.branchMeta, {
      periodFrom: args.periodFrom ?? null,
      periodTo: args.periodTo ?? null,
      financeRows: rpcSource.financeRows.length,
      spendRows: rpcSource.spendRows.length,
    });
    observation.success({
      sourceKind: rpcSource.source,
      rowCount: rpcSource.financeRows.length + rpcSource.spendRows.length,
      extra: {
        sourceBranch: rpcSource.branchMeta.sourceBranch,
      },
    });
    // D-BACKEND-PDF: Cache the successful result.
    financePdfSourceCache.set(cacheKey, { ts: Date.now(), value: rpcSource });
    return rpcSource;
  } catch (error) {
    recordDirectorPdfRpcFailure(
      DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      "[director-finance-pdf-source] rpc_v1 failed",
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
      },
      error,
    );
    throw observation.error(error, {
      fallbackMessage: "Director finance PDF source load failed",
      extra: {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        rpcMode,
        fallbackUsed: false,
      },
    });
  }
}

export async function getDirectorFinancePdfSourceV2(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<DirectorFinancePdfSourceV2> {
  const rpcMode = DIRECTOR_FINANCE_PDF_RPC_MODE;
  const observation = beginPdfLifecycleObservation({
    screen: "director",
    surface: "director_pdf_source",
    event: "director_finance_pdf_source_load_v2",
    stage: "source_load",
    sourceKind: "rpc:pdf_director_finance_source_v2",
    context: {
      documentFamily: "director_finance_pdf",
      documentType: "director_report",
      source: "rpc:pdf_director_finance_source_v2",
    },
  });
  try {
    const rpcSource = await fetchDirectorFinancePdfSourceViaRpcV2(args);
    logDirectorPdfSourceBranch(DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID, rpcSource.source, rpcSource.branchMeta, {
      periodFrom: args.periodFrom ?? null,
      periodTo: args.periodTo ?? null,
    });
    observation.success({
      sourceKind: rpcSource.source,
      rowCount: rpcSource.kindRows.length + rpcSource.spendSupplierRows.length,
      extra: {
        sourceBranch: rpcSource.branchMeta.sourceBranch,
      },
    });
    return rpcSource;
  } catch (error) {
    recordDirectorPdfRpcFailure(
      DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      "[director-finance-pdf-source] rpc_v2 failed",
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
      },
      error,
    );
    throw observation.error(error, {
      fallbackMessage: "Director finance PDF source v2 load failed",
      extra: {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        rpcMode,
        fallbackUsed: false,
      },
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchDirectorProductionPdfSourceViaRpc(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
  priceStage: DirectorPdfPriceStage;
}): Promise<DirectorProductionPdfSource> {
  const { data, error } = await supabase.rpc("pdf_director_production_source_v1", {
    p_from: args.periodFrom ?? null,
    p_to: args.periodTo ?? null,
    p_object_name: args.objectName ?? null,
    p_include_costs: args.priceStage !== "base",
  });

  if (error) {
    throw new DirectorPdfSourceRpcError(
      `pdf_director_production_source_v1 failed: ${error.message}`,
      {
        code: "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
        disableForSession: shouldDisableDirectorPdfRpcForSession(
          "pdf_director_production_source_v1",
          "code" in error ? (error as { code?: unknown }).code : undefined,
          "message" in error ? (error as { message?: unknown }).message : undefined,
        ),
      },
    );
  }

  const envelope = validateDirectorProductionSourceV1(data);
  const repData = adaptCanonicalMaterialsPayload(envelope.report_payload);
  if (!repData) {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      "pdf_director_production_source_v1 invalid report_payload",
    );
  }
  const repDiscipline = adaptCanonicalWorksPayload(envelope.discipline_payload);
  if (!repDiscipline) {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      "pdf_director_production_source_v1 invalid discipline_payload",
    );
  }

  return {
    repData,
    repDiscipline,
    source: "rpc:pdf_director_production_source_v1",
    branchMeta: {
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    },
    priceStage: args.priceStage,
    reportMeta: null,
    disciplineMeta: null,
  };
}

export async function getDirectorProductionPdfSource(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
  fallbackRepData?: unknown;
  fallbackRepDiscipline?: unknown;
  preferPriceStage?: DirectorPdfPriceStage;
}): Promise<DirectorProductionPdfSource> {
  const priceStage = args.preferPriceStage === "base" ? "base" : "priced";
  const rpcMode = DIRECTOR_PRODUCTION_PDF_RPC_MODE;
  const observation = beginPdfLifecycleObservation({
    screen: "director",
    surface: "director_pdf_source",
    event: "director_production_pdf_source_load",
    stage: "source_load",
    sourceKind: "rpc:pdf_director_production_source_v1",
    context: {
      documentFamily: "director_production_pdf",
      documentType: "director_report",
      source: "rpc:pdf_director_production_source_v1",
    },
  });
  try {
    assertDirectorPdfRpcPrimary(
      DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      "pdf_director_production_source_v1",
    );
    const transportSource = await loadDirectorReportTransportScope({
      from: args.periodFrom ?? "",
      to: args.periodTo ?? "",
      objectName: args.objectName ?? null,
      includeDiscipline: true,
      skipDisciplinePrices: priceStage === "base",
      // D-BACKEND-PDF: Reuse the 5-minute transport scope cache.
      // The data used for PDF is the same data displayed on the reports screen.
      // Bypassing cache was causing a redundant 2-5s RPC on every PDF tap.
      bypassCache: false,
    });
    if (!transportSource.report || !transportSource.discipline) {
      throw new DirectorPdfSourceValidationError(
        "invalid_payload",
        "director production pdf source missing transport report/discipline payload",
      );
    }
    const rpcSource: DirectorProductionPdfSource = {
      repData: transportSource.report,
      repDiscipline: transportSource.discipline,
      source: transportSource.source,
      branchMeta: {
        sourceBranch: "rpc_v1",
        rpcVersion: transportSource.branchMeta.rpcVersion ?? "v1",
        payloadShapeVersion: "v1",
      },
      priceStage,
      reportMeta: transportSource.reportMeta,
      disciplineMeta: transportSource.disciplineMeta,
    };
    if (rpcMode === "auto") {
      setPdfRpcRolloutAvailability(DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID, "available");
    }
    logDirectorPdfSourceBranch(
      DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID,
      rpcSource.source,
      rpcSource.branchMeta,
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        priceStage,
        materialsRows: rpcSource.repData.rows?.length ?? 0,
        disciplineWorks: rpcSource.repDiscipline.works?.length ?? 0,
      },
    );
    observation.success({
      sourceKind: rpcSource.source,
      rowCount: (rpcSource.repData.rows?.length ?? 0) + (rpcSource.repDiscipline.works?.length ?? 0),
      extra: {
        sourceBranch: rpcSource.branchMeta.sourceBranch,
        objectName: args.objectName ?? null,
        priceStage,
      },
    });
    return rpcSource;
  } catch (error) {
    recordDirectorPdfRpcFailure(
      DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      "[director-production-pdf-source] rpc_v1 failed",
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        priceStage,
      },
      error,
    );
    throw observation.error(error, {
      fallbackMessage: "Director production PDF source load failed",
      extra: {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        priceStage,
        rpcMode,
        fallbackUsed: false,
      },
    });
  }
}

async function fetchDirectorSubcontractPdfSourceViaRpc(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
}): Promise<DirectorSubcontractPdfSource> {
  const { data, error } = await supabase.rpc("pdf_director_subcontract_source_v1", {
    p_from: args.periodFrom ?? null,
    p_to: args.periodTo ?? null,
    p_object_name: args.objectName ?? null,
  });

  if (error) {
    throw new DirectorPdfSourceRpcError(
      `pdf_director_subcontract_source_v1 failed: ${error.message}`,
      {
        code: "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
        disableForSession: shouldDisableDirectorPdfRpcForSession(
          "pdf_director_subcontract_source_v1",
          "code" in error ? (error as { code?: unknown }).code : undefined,
          "message" in error ? (error as { message?: unknown }).message : undefined,
        ),
      },
    );
  }

  const envelope = validateDirectorSubcontractSourceV1(data);
  return {
    rows: asArrayOfRecords(envelope.rows),
    source: "rpc:pdf_director_subcontract_source_v1",
    branchMeta: {
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    },
  };
}

export async function getDirectorSubcontractPdfSource(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
}): Promise<DirectorSubcontractPdfSource> {
  const rpcMode = DIRECTOR_SUBCONTRACT_PDF_RPC_MODE;
  const observation = beginPdfLifecycleObservation({
    screen: "director",
    surface: "director_pdf_source",
    event: "director_subcontract_pdf_source_load",
    stage: "source_load",
    sourceKind: "rpc:pdf_director_subcontract_source_v1",
    context: {
      documentFamily: "director_subcontract_pdf",
      documentType: "director_report",
      source: "rpc:pdf_director_subcontract_source_v1",
    },
  });
  try {
    assertDirectorPdfRpcPrimary(
      DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      "pdf_director_subcontract_source_v1",
    );
    const rpcSource = await fetchDirectorSubcontractPdfSourceViaRpc(args);
    if (rpcMode === "auto") {
      setPdfRpcRolloutAvailability(DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID, "available");
    }
    logDirectorPdfSourceBranch(
      DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID,
      rpcSource.source,
      rpcSource.branchMeta,
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        rows: rpcSource.rows.length,
      },
    );
    observation.success({
      sourceKind: rpcSource.source,
      rowCount: rpcSource.rows.length,
      extra: {
        sourceBranch: rpcSource.branchMeta.sourceBranch,
        objectName: args.objectName ?? null,
      },
    });
    return rpcSource;
  } catch (error) {
    recordDirectorPdfRpcFailure(
      DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID,
      rpcMode,
      "[director-subcontract-pdf-source] rpc_v1 failed",
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
      },
      error,
    );
    throw observation.error(error, {
      fallbackMessage: "Director subcontract PDF source load failed",
      extra: {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        rpcMode,
        fallbackUsed: false,
      },
    });
  }
}
