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
import { supabase } from "../supabaseClient";
import { listAccountantInbox } from "./accountant";
import {
  fetchDirectorWarehouseReportDisciplineTracked,
  fetchDirectorWarehouseReportOptionsTracked,
  fetchDirectorWarehouseReportTracked,
  type DirectorReportFetchMeta,
} from "./director_reports";
import { adaptCanonicalMaterialsPayload, adaptCanonicalWorksPayload } from "./director_reports.adapters";
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
  if (!__DEV__) return;
  console.info("[director-pdf-source]", {
    id,
    source,
    sourceBranch: branchMeta.sourceBranch,
    fallbackReason: branchMeta.fallbackReason ?? null,
    rpcVersion: branchMeta.rpcVersion ?? null,
    payloadShapeVersion: branchMeta.payloadShapeVersion ?? null,
    ...extra,
  });
};

const coerceFinanceRows = (rawRows: unknown[]): FinanceRow[] =>
  rawRows
    .map(mapToFinanceRow)
    .filter((row) => !!row && !!row.id)
    .filter((row) => Number.isFinite(Number(row.amount)));

const ensureDirectorReportPayload = (value: unknown): DirectorReportPayload => {
  const payload = value as DirectorReportPayload;
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.rows)) {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      "director production fallback missing report rows",
    );
  }
  return payload;
};

const ensureDirectorDisciplinePayload = (value: unknown): DirectorDisciplinePayload => {
  const payload = value as DirectorDisciplinePayload;
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.works)) {
    throw new DirectorPdfSourceValidationError(
      "invalid_payload",
      "director production fallback missing discipline works",
    );
  }
  return payload;
};

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

async function loadLegacyDirectorFinanceSpendRows(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
}): Promise<FinSpendRow[]> {
  let query = supabase
    .from("v_director_finance_spend_kinds_v3" as never)
    .select(
      "proposal_id,proposal_no,supplier,kind_code,kind_name,approved_alloc,paid_alloc,paid_alloc_cap,overpay_alloc,director_approved_at",
    );
  if (args.periodFrom) query = query.gte("director_approved_at", args.periodFrom);
  if (args.periodTo) query = query.lte("director_approved_at", args.periodTo);

  const { data, error } = await query;
  if (error) throw new Error(`v_director_finance_spend_kinds_v3 failed: ${error.message}`);
  return normalizeFinSpendRows(data);
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

async function buildDirectorFinancePdfFallbackSource(
  args: {
    periodFrom?: string | null;
    periodTo?: string | null;
    fallbackFinanceRows?: FinanceRow[] | null;
    fallbackSpendRows?: FinSpendRow[] | null;
  },
  fallbackReason: PdfRpcRolloutFallbackReason = "rpc_error",
): Promise<DirectorFinancePdfSource> {
  const financeRows =
    Array.isArray(args.fallbackFinanceRows)
      ? args.fallbackFinanceRows
      : coerceFinanceRows(await listAccountantInbox());
  const spendRows =
    Array.isArray(args.fallbackSpendRows)
      ? args.fallbackSpendRows
      : await loadLegacyDirectorFinanceSpendRows({
          periodFrom: args.periodFrom,
          periodTo: args.periodTo,
        });

  return {
    financeRows,
    spendRows,
    source:
      Array.isArray(args.fallbackFinanceRows) || Array.isArray(args.fallbackSpendRows)
        ? "legacy:director_finance_ui_payload"
        : "legacy:listAccountantInbox",
    branchMeta: {
      sourceBranch: "legacy_fallback",
      fallbackReason,
      payloadShapeVersion: "v1",
    },
  };
}

export async function getDirectorFinancePdfSource(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
  fallbackFinanceRows?: FinanceRow[] | null;
  fallbackSpendRows?: FinSpendRow[] | null;
}): Promise<DirectorFinancePdfSource> {
  const rpcMode = DIRECTOR_FINANCE_PDF_RPC_MODE;

  if (rpcMode === "force_off") {
    const legacySource = await buildDirectorFinancePdfFallbackSource(args, "disabled");
    logDirectorPdfSourceBranch(DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID, legacySource.source, legacySource.branchMeta, {
      periodFrom: args.periodFrom ?? null,
      periodTo: args.periodTo ?? null,
    });
    return legacySource;
  }

  if (
    rpcMode === "auto" &&
    getPdfRpcRolloutAvailability(DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID) === "missing"
  ) {
    const legacySource = await buildDirectorFinancePdfFallbackSource(args, "disabled");
    logDirectorPdfSourceBranch(DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID, legacySource.source, legacySource.branchMeta, {
      periodFrom: args.periodFrom ?? null,
      periodTo: args.periodTo ?? null,
    });
    return legacySource;
  }

  try {
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
    return rpcSource;
  } catch (error) {
    const fallbackReason = getFallbackReasonForRpcError(error);
    if (
      rpcMode === "auto" &&
      error instanceof DirectorPdfSourceRpcError &&
      error.disableForSession
    ) {
      setPdfRpcRolloutAvailability(DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID, "missing", {
        errorMessage: error.message,
      });
    }
    if (__DEV__) {
      console.warn("[director-finance-pdf-source] rpc_v1 fallback", {
        fallbackReason,
        rpcMode,
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    const legacySource = await buildDirectorFinancePdfFallbackSource(args, fallbackReason);
    logDirectorPdfSourceBranch(DIRECTOR_FINANCE_PDF_RPC_ROLLOUT_ID, legacySource.source, legacySource.branchMeta, {
      periodFrom: args.periodFrom ?? null,
      periodTo: args.periodTo ?? null,
      financeRows: legacySource.financeRows.length,
      spendRows: legacySource.spendRows.length,
    });
    return legacySource;
  }
}

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

async function buildDirectorProductionPdfFallbackSource(
  args: {
    periodFrom?: string | null;
    periodTo?: string | null;
    objectName?: string | null;
    fallbackRepData?: unknown;
    fallbackRepDiscipline?: unknown;
    priceStage: DirectorPdfPriceStage;
  },
  fallbackReason: PdfRpcRolloutFallbackReason = "rpc_error",
): Promise<DirectorProductionPdfSource> {
  const fallbackRepData =
    args.fallbackRepData != null ? ensureDirectorReportPayload(args.fallbackRepData) : null;
  const fallbackRepDiscipline =
    args.fallbackRepDiscipline != null
      ? ensureDirectorDisciplinePayload(args.fallbackRepDiscipline)
      : null;

  if (fallbackRepData && fallbackRepDiscipline) {
    return {
      repData: fallbackRepData,
      repDiscipline: fallbackRepDiscipline,
      source: "legacy:director_reports_ui_payload",
      branchMeta: {
        sourceBranch: "legacy_fallback",
        fallbackReason,
        payloadShapeVersion: "v1",
      },
      priceStage: args.priceStage,
      reportMeta: null,
      disciplineMeta: null,
    };
  }

  const optionsResult = await fetchDirectorWarehouseReportOptionsTracked({
    from: args.periodFrom ?? "",
    to: args.periodTo ?? "",
  });
  const objectIdByName = optionsResult.payload.objectIdByName ?? {};
  const [reportResult, disciplineResult] = await Promise.all([
    fetchDirectorWarehouseReportTracked({
      from: args.periodFrom ?? "",
      to: args.periodTo ?? "",
      objectName: args.objectName ?? null,
      objectIdByName,
    }),
    fetchDirectorWarehouseReportDisciplineTracked(
      {
        from: args.periodFrom ?? "",
        to: args.periodTo ?? "",
        objectName: args.objectName ?? null,
        objectIdByName,
      },
      { skipPrices: args.priceStage === "base" },
    ),
  ]);

  return {
    repData: ensureDirectorReportPayload(reportResult.payload),
    repDiscipline: ensureDirectorDisciplinePayload(disciplineResult.payload),
    source: "legacy:director_reports_tracked",
    branchMeta: {
      sourceBranch: "legacy_fallback",
      fallbackReason,
      payloadShapeVersion: "v1",
    },
    priceStage: args.priceStage,
    reportMeta: reportResult.meta,
    disciplineMeta: disciplineResult.meta,
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

  if (rpcMode === "force_off") {
    const legacySource = await buildDirectorProductionPdfFallbackSource(
      { ...args, priceStage },
      "disabled",
    );
    logDirectorPdfSourceBranch(
      DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID,
      legacySource.source,
      legacySource.branchMeta,
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        priceStage,
        reportBranch: legacySource.reportMeta?.branch ?? null,
        disciplineBranch: legacySource.disciplineMeta?.branch ?? null,
      },
    );
    return legacySource;
  }

  if (
    rpcMode === "auto" &&
    getPdfRpcRolloutAvailability(DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID) === "missing"
  ) {
    const legacySource = await buildDirectorProductionPdfFallbackSource(
      { ...args, priceStage },
      "disabled",
    );
    logDirectorPdfSourceBranch(
      DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID,
      legacySource.source,
      legacySource.branchMeta,
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        priceStage,
        reportBranch: legacySource.reportMeta?.branch ?? null,
        disciplineBranch: legacySource.disciplineMeta?.branch ?? null,
      },
    );
    return legacySource;
  }

  try {
    const rpcSource = await fetchDirectorProductionPdfSourceViaRpc({
      periodFrom: args.periodFrom,
      periodTo: args.periodTo,
      objectName: args.objectName,
      priceStage,
    });
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
    return rpcSource;
  } catch (error) {
    const fallbackReason = getFallbackReasonForRpcError(error);
    if (
      rpcMode === "auto" &&
      error instanceof DirectorPdfSourceRpcError &&
      error.disableForSession
    ) {
      setPdfRpcRolloutAvailability(DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID, "missing", {
        errorMessage: error.message,
      });
    }
    if (__DEV__) {
      console.warn("[director-production-pdf-source] rpc_v1 fallback", {
        fallbackReason,
        rpcMode,
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        priceStage,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    const legacySource = await buildDirectorProductionPdfFallbackSource(
      { ...args, priceStage },
      fallbackReason,
    );
    logDirectorPdfSourceBranch(
      DIRECTOR_PRODUCTION_PDF_RPC_ROLLOUT_ID,
      legacySource.source,
      legacySource.branchMeta,
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        priceStage,
        reportBranch: legacySource.reportMeta?.branch ?? null,
        disciplineBranch: legacySource.disciplineMeta?.branch ?? null,
      },
    );
    return legacySource;
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

async function buildDirectorSubcontractPdfFallbackSource(
  args: {
    periodFrom?: string | null;
    periodTo?: string | null;
    objectName?: string | null;
  },
  fallbackReason: PdfRpcRolloutFallbackReason = "rpc_error",
): Promise<DirectorSubcontractPdfSource> {
  let query = supabase
    .from("subcontracts" as never)
    .select(
      "id,display_no,status,object_name,work_type,contractor_org,total_price,approved_at,submitted_at,rejected_at,director_comment",
    )
    .order("approved_at", { ascending: false, nullsFirst: false });

  if (args.periodFrom) query = query.gte("created_at", `${args.periodFrom}T00:00:00.000Z`);
  if (args.periodTo) query = query.lte("created_at", `${args.periodTo}T23:59:59.999Z`);
  if (args.objectName) query = query.eq("object_name", args.objectName);

  const { data, error } = await query;
  if (error) throw new Error(`subcontracts lookup failed: ${error.message}`);

  return {
    rows: asArrayOfRecords(data),
    source: "legacy:subcontracts_query",
    branchMeta: {
      sourceBranch: "legacy_fallback",
      fallbackReason,
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

  if (rpcMode === "force_off") {
    const legacySource = await buildDirectorSubcontractPdfFallbackSource(args, "disabled");
    logDirectorPdfSourceBranch(
      DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID,
      legacySource.source,
      legacySource.branchMeta,
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        rows: legacySource.rows.length,
      },
    );
    return legacySource;
  }

  if (
    rpcMode === "auto" &&
    getPdfRpcRolloutAvailability(DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID) === "missing"
  ) {
    const legacySource = await buildDirectorSubcontractPdfFallbackSource(args, "disabled");
    logDirectorPdfSourceBranch(
      DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID,
      legacySource.source,
      legacySource.branchMeta,
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        rows: legacySource.rows.length,
      },
    );
    return legacySource;
  }

  try {
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
    return rpcSource;
  } catch (error) {
    const fallbackReason = getFallbackReasonForRpcError(error);
    if (
      rpcMode === "auto" &&
      error instanceof DirectorPdfSourceRpcError &&
      error.disableForSession
    ) {
      setPdfRpcRolloutAvailability(DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID, "missing", {
        errorMessage: error.message,
      });
    }
    if (__DEV__) {
      console.warn("[director-subcontract-pdf-source] rpc_v1 fallback", {
        fallbackReason,
        rpcMode,
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    const legacySource = await buildDirectorSubcontractPdfFallbackSource(args, fallbackReason);
    logDirectorPdfSourceBranch(
      DIRECTOR_SUBCONTRACT_PDF_RPC_ROLLOUT_ID,
      legacySource.source,
      legacySource.branchMeta,
      {
        periodFrom: args.periodFrom ?? null,
        periodTo: args.periodTo ?? null,
        objectName: args.objectName ?? null,
        rows: legacySource.rows.length,
      },
    );
    return legacySource;
  }
}
