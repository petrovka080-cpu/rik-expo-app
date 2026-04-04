import { beginCanonicalPdfBoundary } from "../pdf/canonicalPdfObservability";
import {
  normalizeForemanRequestPdfRequest,
  type ForemanRequestPdfRequest,
} from "../pdf/foremanRequestPdf.shared";
import type { PdfSource } from "../pdfFileContract";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabaseClient";
import { invokeCanonicalPdfBackend } from "./canonicalPdfBackendInvoker";

const FUNCTION_NAME = "foreman-request-pdf";
const RENDER_BRANCH = "backend_foreman_request_v1";

export type ForemanRequestPdfBackendResult = {
  source: PdfSource;
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  fileName: string;
  mimeType: "application/pdf";
  generatedAt: string;
  version: "v1";
  renderBranch: typeof RENDER_BRANCH;
  renderer: "browserless_puppeteer" | "local_browser_puppeteer";
  sourceKind: "remote-url";
  telemetry: Record<string, unknown> | null;
};

export async function generateForemanRequestPdfViaBackend(
  input: ForemanRequestPdfRequest,
): Promise<ForemanRequestPdfBackendResult> {
  const boundary = beginCanonicalPdfBoundary({
    screen: "foreman",
    surface: "foreman_pdf_backend",
    role: "foreman",
    documentType: "request",
    sourceKind: "backend_payload",
    fallbackUsed: false,
  });

  const payload = normalizeForemanRequestPdfRequest(input);
  boundary.success("payload_ready", {
    sourceKind: "backend_payload",
    extra: {
      requestId: payload.requestId,
      generatedBy: payload.generatedBy ?? null,
    },
  });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const error = new Error("foreman request pdf backend missing Supabase env");
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
    });
    throw error;
  }

  boundary.success("backend_invoke_start", {
    sourceKind: "backend_invoke",
    extra: {
      functionName: FUNCTION_NAME,
      requestId: payload.requestId,
    },
  });

  try {
    const result = await invokeCanonicalPdfBackend({
      functionName: FUNCTION_NAME,
      payload,
      expectedRole: "foreman",
      expectedDocumentType: "request",
      expectedRenderBranch: RENDER_BRANCH,
      errorPrefix: "foreman request pdf backend failed",
    });

    boundary.success("backend_invoke_success", {
      sourceKind: result.sourceKind,
      extra: {
        functionName: FUNCTION_NAME,
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

    return {
      source: result.source,
      bucketId: result.bucketId,
      storagePath: result.storagePath,
      signedUrl: result.signedUrl,
      fileName: result.fileName,
      mimeType: result.mimeType,
      generatedAt: result.generatedAt,
      version: result.version,
      renderBranch: RENDER_BRANCH,
      renderer: result.renderer,
      sourceKind: result.sourceKind,
      telemetry: result.telemetry,
    };
  } catch (error) {
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
    });
    throw error instanceof Error
      ? error
      : new Error("foreman request pdf backend failed");
  }
}
