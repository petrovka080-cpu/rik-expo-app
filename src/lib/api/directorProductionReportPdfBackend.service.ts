import { resolvePdfRenderRolloutMode, type PdfRenderRolloutMode } from "../documents/pdfRenderRollout";
import type { PdfSource } from "../pdfFileContract";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabaseClient";
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
  if (!shouldUseBackendRollout()) {
    throw new DirectorProductionReportPdfBackendError(
      "director production report pdf backend rollout is disabled",
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new DirectorProductionReportPdfBackendError(
      "director production report pdf backend missing Supabase env",
    );
  }

  const payload = normalizeDirectorProductionReportPdfRequest(input);
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
    throw new DirectorProductionReportPdfBackendError(
      error instanceof Error ? error.message : "director production report pdf backend failed",
    );
  }

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
