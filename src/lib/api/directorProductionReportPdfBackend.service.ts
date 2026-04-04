import { resolvePdfRenderRolloutMode, type PdfRenderRolloutMode } from "../documents/pdfRenderRollout";
import type { PdfSource } from "../pdfFileContract";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabaseClient";
import { beginCanonicalPdfBoundary } from "../pdf/canonicalPdfObservability";
import {
  normalizeDirectorProductionReportPdfRequest,
  type DirectorProductionReportPdfRequest,
} from "../pdf/directorProductionReport.shared";
import { invokeDirectorPdfBackend } from "./directorPdfBackendInvoker";

const FUNCTION_NAME = "director-production-report-pdf";
const MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_PRODUCTION_REPORT_PDF_BACKEND_V1 ??
    process.env.EXPO_PUBLIC_DIRECTOR_PDF_RENDER_OFFLOAD_V1 ??
    "",
)
  .trim()
  .toLowerCase();
const MODE: PdfRenderRolloutMode = resolvePdfRenderRolloutMode(MODE_RAW);

type DirectorProductionReportPdfBackendResult = {
  source: PdfSource;
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  renderBranch: "backend_production_report_v1";
  renderVersion: "v1";
  renderer: "browserless_puppeteer" | "local_browser_puppeteer";
  fileName: string;
  expiresInSeconds: number | null;
};

class DirectorProductionReportPdfBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectorProductionReportPdfBackendError";
  }
}

const shouldUseBackendRollout = () => MODE !== "force_off";

export function getDirectorProductionReportPdfBackendMode() {
  return MODE;
}

export function setDirectorProductionReportPdfFunctionUrlOverrideForDev(_functionUrl: string | null) {
  // Director PDF backend now uses one canonical Supabase Edge transport boundary.
}

export async function generateDirectorProductionReportPdfViaBackend(
  input: DirectorProductionReportPdfRequest,
): Promise<DirectorProductionReportPdfBackendResult> {
  const boundary = beginCanonicalPdfBoundary({
    screen: "director",
    surface: "director_pdf_backend",
    role: "director",
    documentType: "director_report",
    sourceKind: "backend_payload",
    fallbackUsed: false,
  });

  if (!shouldUseBackendRollout()) {
    const error = new DirectorProductionReportPdfBackendError(
      "director production report pdf backend rollout is disabled",
    );
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
      extra: {
        functionName: FUNCTION_NAME,
        documentKind: "production_report",
      },
    });
    throw error;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const error = new DirectorProductionReportPdfBackendError(
      "director production report pdf backend missing Supabase env",
    );
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
      extra: {
        functionName: FUNCTION_NAME,
        documentKind: "production_report",
      },
    });
    throw error;
  }

  const payload = normalizeDirectorProductionReportPdfRequest(input);
  boundary.success("payload_ready", {
    sourceKind: "backend_payload",
    extra: {
      documentKind: "production_report",
      companyName: payload.companyName ?? null,
      generatedBy: payload.generatedBy ?? null,
      periodFrom: payload.periodFrom ?? null,
      periodTo: payload.periodTo ?? null,
      objectName: payload.objectName ?? null,
      preferPriceStage: payload.preferPriceStage ?? "priced",
    },
  });
  boundary.success("backend_invoke_start", {
    sourceKind: "backend_invoke",
    extra: {
      functionName: FUNCTION_NAME,
      documentKind: "production_report",
    },
  });
  let result;
  try {
    result = await invokeDirectorPdfBackend({
      functionName: FUNCTION_NAME,
      payload,
      expectedDocumentKind: "production_report",
      expectedRenderBranch: "backend_production_report_v1",
      allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer"],
      errorPrefix: "director production report pdf backend failed",
    });
  } catch (error) {
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
      extra: {
        functionName: FUNCTION_NAME,
        documentKind: "production_report",
      },
    });
    throw new DirectorProductionReportPdfBackendError(
      error instanceof Error ? error.message : "director production report pdf backend failed",
    );
  }

  boundary.success("backend_invoke_success", {
    sourceKind: result.sourceKind,
    extra: {
      functionName: FUNCTION_NAME,
      documentKind: "production_report",
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
      `[director-production-report-pdf-backend] ${JSON.stringify({
        companyName: payload.companyName ?? null,
        generatedBy: payload.generatedBy ?? null,
        periodFrom: payload.periodFrom ?? null,
        periodTo: payload.periodTo ?? null,
        objectName: payload.objectName ?? null,
        preferPriceStage: payload.preferPriceStage ?? "priced",
        transport: "supabase_functions",
        functionName: FUNCTION_NAME,
        renderBranch: result.renderBranch,
        renderVersion: result.renderVersion,
        renderer: result.renderer,
        signedUrl: result.signedUrl,
        bucketId: result.bucketId,
        storagePath: result.storagePath,
      })}`,
    );
  }

  return {
    source: result.source,
    bucketId: result.bucketId,
    storagePath: result.storagePath,
    signedUrl: result.signedUrl,
    renderBranch: "backend_production_report_v1",
    renderVersion: "v1",
    renderer: result.renderer,
    fileName: result.fileName,
    expiresInSeconds: result.expiresInSeconds,
  };
}
