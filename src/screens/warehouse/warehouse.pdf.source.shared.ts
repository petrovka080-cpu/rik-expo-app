import {
  getPdfRpcRolloutAvailability,
  recordPdfRpcRolloutBranch,
  setPdfRpcRolloutAvailability,
  type PdfRpcRolloutBranchMeta,
  type PdfRpcRolloutFallbackReason,
  type PdfRpcRolloutId,
  type PdfRpcRolloutMode,
} from "../../lib/documents/pdfRpcRollout";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";

const WAREHOUSE_PDF_SOURCE_IS_DEV = typeof __DEV__ !== "undefined" && __DEV__ === true;

export const assertWarehousePdfRpcPrimary = (
  id: PdfRpcRolloutId,
  rpcMode: PdfRpcRolloutMode,
  functionName: string,
) => {
  if (rpcMode === "force_off") {
    throw new Error(`${functionName} is force_off but legacy fallback branches were removed`);
  }
  if (rpcMode === "auto" && getPdfRpcRolloutAvailability(id) === "missing") {
    throw new Error(
      `${functionName} unavailable in this session and legacy fallback branches were removed`,
    );
  }
};

export const logWarehousePdfSourceBranch = (args: {
  id: PdfRpcRolloutId;
  source: string;
  branchMeta: PdfRpcRolloutBranchMeta;
  extra?: Record<string, unknown>;
}) => {
  recordPdfRpcRolloutBranch(args.id, {
    source: args.source,
    branchMeta: args.branchMeta,
  });
  if (!WAREHOUSE_PDF_SOURCE_IS_DEV) return;
  if (__DEV__) console.info("[warehouse-pdf-source]", {
    id: args.id,
    source: args.source,
    sourceBranch: args.branchMeta.sourceBranch,
    fallbackReason: args.branchMeta.fallbackReason ?? null,
    rpcVersion: args.branchMeta.rpcVersion ?? null,
    payloadShapeVersion: args.branchMeta.payloadShapeVersion ?? null,
    ...args.extra,
  });
};

const shouldDisableWarehousePdfRpcForSession = (error: unknown) =>
  !!(
    error &&
    typeof error === "object" &&
    "disableForSession" in error &&
    (error as { disableForSession?: unknown }).disableForSession === true
  );

export const recordWarehousePdfRpcFailure = (args: {
  id: PdfRpcRolloutId;
  rpcMode: PdfRpcRolloutMode;
  sourceKind: string;
  tag: string;
  error: unknown;
  failureReason: PdfRpcRolloutFallbackReason;
  extra?: Record<string, unknown>;
}) => {
  if (args.rpcMode === "auto" && shouldDisableWarehousePdfRpcForSession(args.error)) {
    setPdfRpcRolloutAvailability(args.id, "missing", {
      errorMessage: args.error instanceof Error ? args.error.message : String(args.error),
    });
  }

  recordCatchDiscipline({
    screen: "warehouse",
    surface: "warehouse_pdf_source",
    event: "warehouse_pdf_source_failed",
    kind: "critical_fail",
    error: args.error,
    sourceKind: args.sourceKind,
    errorStage: "source_load",
    extra: {
      pdfSourceFamily: args.id,
      failureReason: args.failureReason,
      rpcMode: args.rpcMode,
      rpcAvailability: getPdfRpcRolloutAvailability(args.id),
      publishState: "error",
      fallbackUsed: false,
      ...args.extra,
    },
  });

  if (!WAREHOUSE_PDF_SOURCE_IS_DEV) return;
  if (__DEV__) console.warn(args.tag, {
    failureReason: args.failureReason,
    rpcMode: args.rpcMode,
    rpcAvailability: getPdfRpcRolloutAvailability(args.id),
    errorMessage: args.error instanceof Error ? args.error.message : String(args.error),
    ...args.extra,
  });
};
