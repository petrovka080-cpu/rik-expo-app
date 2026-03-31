import { resolvePdfRenderRolloutMode, type PdfRenderRolloutMode } from "../documents/pdfRenderRollout";
import type { PdfSource } from "../pdfFileContract";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabaseClient";
import {
  normalizeDirectorSubcontractReportPdfRequest,
  type DirectorSubcontractReportPdfRequest,
} from "../pdf/directorSubcontractReport.shared";
import { invokeDirectorPdfBackend } from "./directorPdfBackendInvoker";

const FUNCTION_NAME = "director-subcontract-report-pdf";
const MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_SUBCONTRACT_REPORT_PDF_BACKEND_V1 ??
    process.env.EXPO_PUBLIC_DIRECTOR_PDF_RENDER_OFFLOAD_V1 ??
    "",
)
  .trim()
  .toLowerCase();
const MODE: PdfRenderRolloutMode = resolvePdfRenderRolloutMode(MODE_RAW);

type DirectorSubcontractReportPdfBackendResult = {
  source: PdfSource;
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  renderBranch: "backend_subcontract_report_v1";
  renderVersion: "v1";
  renderer: "browserless_puppeteer" | "local_browser_puppeteer";
  fileName: string;
  expiresInSeconds: number | null;
};

class DirectorSubcontractReportPdfBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectorSubcontractReportPdfBackendError";
  }
}

const shouldUseBackendRollout = () => MODE !== "force_off";

export function getDirectorSubcontractReportPdfBackendMode() {
  return MODE;
}

export function setDirectorSubcontractReportPdfFunctionUrlOverrideForDev(_functionUrl: string | null) {
  // Director PDF backend now uses one canonical Supabase Edge transport boundary.
}

export async function generateDirectorSubcontractReportPdfViaBackend(
  input: DirectorSubcontractReportPdfRequest,
): Promise<DirectorSubcontractReportPdfBackendResult> {
  if (!shouldUseBackendRollout()) {
    throw new DirectorSubcontractReportPdfBackendError(
      "director subcontract report pdf backend rollout is disabled",
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new DirectorSubcontractReportPdfBackendError(
      "director subcontract report pdf backend missing Supabase env",
    );
  }

  const payload = normalizeDirectorSubcontractReportPdfRequest(input);
  let result;
  try {
    result = await invokeDirectorPdfBackend({
      functionName: FUNCTION_NAME,
      payload,
      expectedDocumentKind: "subcontract_report",
      expectedRenderBranch: "backend_subcontract_report_v1",
      allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer"],
      errorPrefix: "director subcontract report pdf backend failed",
    });
  } catch (error) {
    throw new DirectorSubcontractReportPdfBackendError(
      error instanceof Error ? error.message : "director subcontract report pdf backend failed",
    );
  }

  if (__DEV__) {
    console.info(
      `[director-subcontract-report-pdf-backend] ${JSON.stringify({
        companyName: payload.companyName ?? null,
        generatedBy: payload.generatedBy ?? null,
        periodFrom: payload.periodFrom ?? null,
        periodTo: payload.periodTo ?? null,
        objectName: payload.objectName ?? null,
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
    renderBranch: "backend_subcontract_report_v1",
    renderVersion: "v1",
    renderer: result.renderer,
    fileName: result.fileName,
    expiresInSeconds: result.expiresInSeconds,
  };
}
