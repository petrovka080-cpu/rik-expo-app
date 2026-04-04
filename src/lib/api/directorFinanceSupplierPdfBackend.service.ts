import { resolvePdfRenderRolloutMode, type PdfRenderRolloutMode } from "../documents/pdfRenderRollout";
import type { PdfSource } from "../pdfFileContract";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabaseClient";
import { beginCanonicalPdfBoundary } from "../pdf/canonicalPdfObservability";
import {
  normalizeDirectorFinanceSupplierSummaryPdfRequest,
  type DirectorFinanceSupplierSummaryPdfRequest,
} from "../pdf/directorSupplierSummary.shared";
import { invokeDirectorPdfBackend } from "./directorPdfBackendInvoker";

const FUNCTION_NAME = "director-finance-supplier-summary-pdf";
const MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_FINANCE_SUPPLIER_PDF_BACKEND_V1 ??
    process.env.EXPO_PUBLIC_DIRECTOR_PDF_RENDER_OFFLOAD_V1 ??
    "",
)
  .trim()
  .toLowerCase();
const MODE: PdfRenderRolloutMode = resolvePdfRenderRolloutMode(MODE_RAW);

export type DirectorFinanceSupplierPdfBackendTelemetry = {
  documentKind: "director_finance_supplier_summary";
  sourceKind: "remote-url";
  fetchSourceName: "pdf_director_finance_source_v1";
  financeRows: number;
  spendRows: number;
  detailRows: number;
  kindRows: number;
  fetchDurationMs: number | null;
  renderDurationMs: number | null;
  totalDurationMs: number | null;
  htmlLengthEstimate: number | null;
  payloadSizeEstimate: number | null;
  fallbackUsed: false;
  openStrategy: "remote-url";
  materializationStrategy: "viewer_remote";
};

type DirectorFinanceSupplierPdfBackendResult = {
  source: PdfSource;
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  renderBranch: "backend_supplier_summary_v1";
  renderVersion: "v1";
  renderer: "browserless_puppeteer" | "local_browser_puppeteer";
  fileName: string;
  expiresInSeconds: number | null;
  telemetry: DirectorFinanceSupplierPdfBackendTelemetry | null;
};

class DirectorFinanceSupplierPdfBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectorFinanceSupplierPdfBackendError";
  }
}

const shouldUseBackendPilot = () => MODE !== "force_off";

export function getDirectorFinanceSupplierPdfBackendMode() {
  return MODE;
}

export function setDirectorFinanceSupplierPdfFunctionUrlOverrideForDev(_functionUrl: string | null) {
  // Director PDF backend now uses one canonical Supabase Edge transport boundary.
}

export async function generateDirectorFinanceSupplierSummaryPdfViaBackend(
  input: DirectorFinanceSupplierSummaryPdfRequest,
): Promise<DirectorFinanceSupplierPdfBackendResult> {
  const boundary = beginCanonicalPdfBoundary({
    screen: "director",
    surface: "director_pdf_backend",
    role: "director",
    documentType: "supplier_summary",
    sourceKind: "backend_payload",
    fallbackUsed: false,
  });

  if (!shouldUseBackendPilot()) {
    const error = new DirectorFinanceSupplierPdfBackendError(
      "director finance supplier pdf backend pilot is disabled",
    );
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
      extra: {
        functionName: FUNCTION_NAME,
        documentKind: "supplier_summary",
      },
    });
    throw error;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const error = new DirectorFinanceSupplierPdfBackendError(
      "director finance supplier pdf backend missing Supabase env",
    );
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
      extra: {
        functionName: FUNCTION_NAME,
        documentKind: "supplier_summary",
      },
    });
    throw error;
  }

  const payload = normalizeDirectorFinanceSupplierSummaryPdfRequest(input);
  boundary.success("payload_ready", {
    sourceKind: "backend_payload",
    extra: {
      documentKind: "supplier_summary",
      supplier: payload.supplier,
      kindName: payload.kindName ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
    },
  });
  boundary.success("backend_invoke_start", {
    sourceKind: "backend_invoke",
    extra: {
      functionName: FUNCTION_NAME,
      documentKind: "supplier_summary",
    },
  });
  let result;
  try {
    result = await invokeDirectorPdfBackend({
      functionName: FUNCTION_NAME,
      payload,
      expectedDocumentKind: "supplier_summary",
      expectedRenderBranch: "backend_supplier_summary_v1",
      allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer"],
      errorPrefix: "director finance supplier pdf backend failed",
    });
  } catch (error) {
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
      extra: {
        functionName: FUNCTION_NAME,
        documentKind: "supplier_summary",
      },
    });
    throw new DirectorFinanceSupplierPdfBackendError(
      error instanceof Error ? error.message : "director finance supplier pdf backend failed",
    );
  }

  boundary.success("backend_invoke_success", {
    sourceKind: result.sourceKind,
    extra: {
      functionName: FUNCTION_NAME,
      documentKind: "supplier_summary",
      renderBranch: result.renderBranch,
      renderer: result.renderer,
    },
  });
  boundary.success("pdf_storage_uploaded", {
    sourceKind: result.sourceKind,
    extra: {
      bucketId: result.bucketId,
      storagePath: result.storagePath,
    },
  });
  boundary.success("signed_url_received", {
    sourceKind: result.sourceKind,
    extra: {
      fileName: result.fileName,
    },
  });

  if (__DEV__) {
    console.info(
      `[director-finance-supplier-pdf-backend] ${JSON.stringify({
        supplier: payload.supplier,
        kindName: payload.kindName ?? null,
        periodFrom: payload.periodFrom ?? null,
        periodTo: payload.periodTo ?? null,
        transport: "supabase_functions",
        functionName: FUNCTION_NAME,
        renderBranch: result.renderBranch,
        renderVersion: result.renderVersion,
        renderer: result.renderer,
        signedUrl: result.signedUrl,
        bucketId: result.bucketId,
        storagePath: result.storagePath,
        telemetry: result.telemetry,
      })}`,
    );
  }

  const telemetry = result.telemetry;

  return {
    source: result.source,
    bucketId: result.bucketId,
    storagePath: result.storagePath,
    signedUrl: result.signedUrl,
    renderBranch: "backend_supplier_summary_v1",
    renderVersion: "v1",
    renderer: result.renderer,
    fileName: result.fileName,
    expiresInSeconds: result.expiresInSeconds,
    telemetry:
      telemetry &&
      String(telemetry.documentKind ?? "").trim() === "director_finance_supplier_summary" &&
      String(telemetry.sourceKind ?? "").trim() === "remote-url"
        ? {
            documentKind: "director_finance_supplier_summary",
            sourceKind: "remote-url",
            fetchSourceName: "pdf_director_finance_source_v1",
            financeRows: Number.isFinite(Number(telemetry.financeRows)) ? Math.max(0, Math.trunc(Number(telemetry.financeRows))) : 0,
            spendRows: Number.isFinite(Number(telemetry.spendRows)) ? Math.max(0, Math.trunc(Number(telemetry.spendRows))) : 0,
            detailRows: Number.isFinite(Number(telemetry.detailRows)) ? Math.max(0, Math.trunc(Number(telemetry.detailRows))) : 0,
            kindRows: Number.isFinite(Number(telemetry.kindRows)) ? Math.max(0, Math.trunc(Number(telemetry.kindRows))) : 0,
            fetchDurationMs: Number.isFinite(Number(telemetry.fetchDurationMs))
              ? Math.max(0, Math.trunc(Number(telemetry.fetchDurationMs)))
              : null,
            renderDurationMs: Number.isFinite(Number(telemetry.renderDurationMs))
              ? Math.max(0, Math.trunc(Number(telemetry.renderDurationMs)))
              : null,
            totalDurationMs: Number.isFinite(Number(telemetry.totalDurationMs))
              ? Math.max(0, Math.trunc(Number(telemetry.totalDurationMs)))
              : null,
            htmlLengthEstimate: Number.isFinite(Number(telemetry.htmlLengthEstimate))
              ? Math.max(0, Math.trunc(Number(telemetry.htmlLengthEstimate)))
              : null,
            payloadSizeEstimate: Number.isFinite(Number(telemetry.payloadSizeEstimate))
              ? Math.max(0, Math.trunc(Number(telemetry.payloadSizeEstimate)))
              : null,
            fallbackUsed: false,
            openStrategy: "remote-url",
            materializationStrategy: "viewer_remote",
          }
        : null,
  };
}
