import { createPdfSource, type PdfSource } from "../pdfFileContract";
import { supabase } from "../supabaseClient";
import {
  classifyDirectorPdfTransportError,
  extractDirectorPdfErrorPayload,
  normalizeDirectorPdfSuccessPayload,
  resolveDirectorPdfInvokeErrorDetails,
  type DirectorPdfDocumentKind,
  type DirectorPdfRenderBranch,
  type DirectorPdfRenderer,
  type DirectorPdfServerErrorCode,
  type DirectorPdfTransportErrorCode,
} from "../pdf/directorPdfPlatformContract";

type DirectorPdfInvokeArgs<TPayload> = {
  functionName: string;
  payload: TPayload;
  expectedDocumentKind: DirectorPdfDocumentKind;
  expectedRenderBranch: DirectorPdfRenderBranch;
  allowedRenderers: readonly DirectorPdfRenderer[];
  errorPrefix: string;
};

export type DirectorPdfInvokeSuccess = {
  source: PdfSource;
  signedUrl: string;
  bucketId: string;
  storagePath: string;
  fileName: string;
  expiresInSeconds: number | null;
  renderVersion: "v1";
  renderBranch: DirectorPdfRenderBranch;
  renderer: DirectorPdfRenderer;
  sourceKind: "remote-url";
  documentKind: DirectorPdfDocumentKind;
  telemetry: Record<string, unknown> | null;
};

export class DirectorPdfTransportError extends Error {
  code: DirectorPdfTransportErrorCode;
  functionName: string;
  httpStatus: number | null;
  serverErrorCode: DirectorPdfServerErrorCode | null;

  constructor(
    message: string,
    options: {
      code: DirectorPdfTransportErrorCode;
      functionName: string;
      httpStatus?: number | null;
      serverErrorCode?: DirectorPdfServerErrorCode | null;
    },
  ) {
    super(message);
    this.name = "DirectorPdfTransportError";
    this.code = options.code;
    this.functionName = options.functionName;
    this.httpStatus = options.httpStatus ?? null;
    this.serverErrorCode = options.serverErrorCode ?? null;
  }
}

async function refreshDirectorPdfSessionOnce() {
  try {
    if (!supabase?.auth || typeof supabase.auth.getSession !== "function") return false;
    const sessionResult = await supabase.auth.getSession();
    if (!sessionResult.data.session) return false;
    if (typeof supabase.auth.refreshSession !== "function") return false;
    const refreshResult = await supabase.auth.refreshSession();
    return Boolean(refreshResult.data.session && !refreshResult.error);
  } catch {
    return false;
  }
}

async function invokeDirectorPdfBackendOnce<TPayload>(args: DirectorPdfInvokeArgs<TPayload>) {
  return await supabase.functions.invoke<unknown>(args.functionName, {
    body: args.payload,
    headers: {
      Accept: "application/json",
    },
  });
}

export async function invokeDirectorPdfBackend<TPayload>(
  args: DirectorPdfInvokeArgs<TPayload>,
): Promise<DirectorPdfInvokeSuccess> {
  let attempt = await invokeDirectorPdfBackendOnce(args);

  const firstErrorPayload = extractDirectorPdfErrorPayload(attempt.data);
  if (firstErrorPayload?.errorCode === "auth_failed") {
    const refreshed = await refreshDirectorPdfSessionOnce();
    if (refreshed) {
      attempt = await invokeDirectorPdfBackendOnce(args);
    }
  } else if (attempt.error) {
    const details = await resolveDirectorPdfInvokeErrorDetails(attempt.error);
    const code = classifyDirectorPdfTransportError({
      message: details.message,
      status: details.status,
      serverErrorCode: details.serverErrorCode,
      isWeb: typeof window !== "undefined" && typeof document !== "undefined",
    });
    if (code === "auth_failed") {
      const refreshed = await refreshDirectorPdfSessionOnce();
      if (refreshed) {
        attempt = await invokeDirectorPdfBackendOnce(args);
      }
    }
  }

  const { data, error } = attempt;

  if (error) {
    const details = await resolveDirectorPdfInvokeErrorDetails(error);
    throw new DirectorPdfTransportError(
      `${args.errorPrefix}: ${details.message}`,
      {
        code: classifyDirectorPdfTransportError({
          message: details.message,
          status: details.status,
          serverErrorCode: details.serverErrorCode,
          isWeb: typeof window !== "undefined" && typeof document !== "undefined",
        }),
        functionName: args.functionName,
        httpStatus: details.status,
        serverErrorCode: details.serverErrorCode,
      },
    );
  }

  const errorPayload = extractDirectorPdfErrorPayload(data);
  if (errorPayload) {
    throw new DirectorPdfTransportError(
      `${args.errorPrefix}: ${errorPayload.error}`,
      {
        code: classifyDirectorPdfTransportError({
          message: errorPayload.error,
          status: null,
          serverErrorCode: errorPayload.errorCode,
          isWeb: typeof window !== "undefined" && typeof document !== "undefined",
        }),
        functionName: args.functionName,
        httpStatus: null,
        serverErrorCode: errorPayload.errorCode,
      },
    );
  }

  let normalized;
  try {
    normalized = normalizeDirectorPdfSuccessPayload({
      value: data,
      expectedDocumentKind: args.expectedDocumentKind,
      expectedRenderBranch: args.expectedRenderBranch,
      allowedRenderers: args.allowedRenderers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "invalid response");
    throw new DirectorPdfTransportError(
      `${args.errorPrefix}: ${message}`,
      {
        code: "invalid_response",
        functionName: args.functionName,
      },
    );
  }

  return {
    source: createPdfSource(normalized.signedUrl),
    signedUrl: normalized.signedUrl,
    bucketId: normalized.bucketId,
    storagePath: normalized.storagePath,
    fileName: normalized.fileName,
    expiresInSeconds: normalized.expiresInSeconds,
    renderVersion: normalized.renderVersion,
    renderBranch: normalized.renderBranch,
    renderer: normalized.renderer,
    sourceKind: normalized.sourceKind,
    documentKind: normalized.documentKind,
    telemetry: normalized.telemetry,
  };
}
