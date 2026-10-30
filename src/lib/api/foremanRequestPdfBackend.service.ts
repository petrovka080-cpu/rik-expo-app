import { withPdfActorBoundary } from "../pdf/withPdfActorBoundary";
import { beginCanonicalPdfBoundary } from "../pdf/canonicalPdfObservability";
import {
  normalizeForemanRequestPdfRequest,
  type ForemanRequestPdfRequest,
} from "../pdf/foremanRequestPdf.shared";
import type { CanonicalPdfBackendRenderer } from "../pdf/canonicalPdfPlatformContract";
import type { PdfSource } from "../pdfFileContract";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "../supabaseClient";
import { isAbortError, throwIfAborted } from "../requestCancellation";
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
  renderer: CanonicalPdfBackendRenderer;
  sourceKind: "remote-url";
  telemetry: Record<string, unknown> | null;
};

type ForemanRequestPdfBackendOptions = {
  signal?: AbortSignal | null;
};

async function invokeForemanRequestPdfBackend(
  payload: ForemanRequestPdfRequest,
  options?: ForemanRequestPdfBackendOptions,
): Promise<ForemanRequestPdfBackendResult> {
  throwIfAborted(options?.signal);
  const result = await invokeCanonicalPdfBackend({
    functionName: FUNCTION_NAME,
    payload,
    expectedRole: "foreman",
    expectedDocumentType: "request",
    expectedRenderBranch: RENDER_BRANCH,
    errorPrefix: "foreman request pdf backend failed",
    signal: options?.signal,
  });
  throwIfAborted(options?.signal);

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
}

export async function generateForemanRequestPdfViaBackend(
  input: ForemanRequestPdfRequest,
  options?: ForemanRequestPdfBackendOptions,
): Promise<ForemanRequestPdfBackendResult> {
  throwIfAborted(options?.signal);
  const boundary = beginCanonicalPdfBoundary({
    screen: "foreman",
    surface: "foreman_pdf_backend",
    role: "foreman",
    documentType: "request",
    sourceKind: "backend_payload",
    fallbackUsed: false,
  });

  const payload = normalizeForemanRequestPdfRequest(input);
  throwIfAborted(options?.signal);
  boundary.success("payload_ready", {
    sourceKind: "backend_payload",
    extra: {
      requestId: payload.requestId,
      generatedBy: payload.generatedBy ?? null,
      clientSourceFingerprint: payload.clientSourceFingerprint ?? null,
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

  // A signed URL or client fingerprint is not current document authority.
  // Every open reaches the authenticated Edge; artifact bytes remain reusable
  // in its server cache only after fresh target-company/MFA authorization.
  boundary.success("backend_invoke_start", {
    sourceKind: "backend_invoke",
    extra: {
      functionName: FUNCTION_NAME,
      requestId: payload.requestId,
    },
  });

  let result: ForemanRequestPdfBackendResult;
  try {
    result = await withPdfActorBoundary(supabase.auth, () => invokeForemanRequestPdfBackend(payload, options));
    throwIfAborted(options?.signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    boundary.error("backend_invoke_failure", error, {
      sourceKind: "backend_invoke",
      errorStage: "backend_invoke",
    });
    throw error instanceof Error
      ? error
      : new Error("foreman request pdf backend failed");
  }

  boundary.success("backend_invoke_success", {
    sourceKind: result.sourceKind,
    extra: {
      functionName: FUNCTION_NAME,
      renderBranch: result.renderBranch,
      renderer: result.renderer,
      cacheStatus: result.telemetry?.cacheStatus ?? null,
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

  return result;
}
