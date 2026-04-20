export const DIRECTOR_PDF_CORS_HEADERS = Object.freeze({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin, Access-Control-Request-Headers, Access-Control-Request-Method",
});

export type DirectorPdfDocumentKind =
  | "finance_preview"
  | "management_report"
  | "supplier_summary"
  | "production_report"
  | "subcontract_report";

export type DirectorPdfRenderBranch =
  | "edge_render_v1"
  | "backend_supplier_summary_v1"
  | "backend_production_report_v1"
  | "backend_subcontract_report_v1";

export type DirectorPdfRenderer = "browserless_puppeteer" | "local_browser_puppeteer" | "artifact_cache";

export type DirectorPdfServerErrorCode =
  | "auth_failed"
  | "validation_failed"
  | "backend_pdf_failed";

export type DirectorPdfTransportErrorCode =
  | "cors_preflight_failed"
  | "edge_function_unreachable"
  | "edge_function_http_error"
  | "auth_failed"
  | "backend_pdf_failed"
  | "invalid_response"
  | "open_failed"
  | "unsupported_source";

export type DirectorPdfSuccessPayload = {
  ok: true;
  renderVersion: "v1";
  renderBranch: DirectorPdfRenderBranch;
  renderer: DirectorPdfRenderer;
  sourceKind: "remote-url";
  documentKind: DirectorPdfDocumentKind;
  signedUrl: string;
  bucketId: string;
  storagePath: string;
  fileName: string;
  expiresInSeconds: number;
  telemetry?: Record<string, unknown> | null;
};

export type DirectorPdfErrorPayload = {
  ok: false;
  renderVersion: "v1";
  errorCode: DirectorPdfServerErrorCode;
  error: string;
  documentKind?: DirectorPdfDocumentKind;
  renderBranch?: DirectorPdfRenderBranch;
};

type JsonEnvelope = Record<string, unknown>;

export function createDirectorPdfOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: DIRECTOR_PDF_CORS_HEADERS,
  });
}

export function createDirectorPdfJsonResponse(status: number, body: JsonEnvelope) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...DIRECTOR_PDF_CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function createDirectorPdfErrorResponse(args: {
  status: number;
  errorCode: DirectorPdfServerErrorCode;
  error: string;
  documentKind?: DirectorPdfDocumentKind;
  renderBranch?: DirectorPdfRenderBranch;
}) {
  return createDirectorPdfJsonResponse(args.status, {
    ok: false,
    renderVersion: "v1",
    errorCode: args.errorCode,
    error: String(args.error || "").trim() || "Director PDF request failed.",
    ...(args.documentKind ? { documentKind: args.documentKind } : {}),
    ...(args.renderBranch ? { renderBranch: args.renderBranch } : {}),
  } satisfies DirectorPdfErrorPayload);
}

export function createDirectorPdfSuccessResponse(payload: DirectorPdfSuccessPayload) {
  return createDirectorPdfJsonResponse(200, payload);
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
}

export function extractDirectorPdfErrorPayload(value: unknown): DirectorPdfErrorPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (payload.ok !== false) return null;
  const renderVersion = toText(payload.renderVersion);
  const errorCode = toText(payload.errorCode);
  const error = toText(payload.error);

  if (renderVersion !== "v1" || !error) return null;
  if (
    errorCode !== "auth_failed"
    && errorCode !== "validation_failed"
    && errorCode !== "backend_pdf_failed"
  ) {
    return null;
  }

  const documentKind = toText(payload.documentKind);
  const renderBranch = toText(payload.renderBranch);

  return {
    ok: false,
    renderVersion: "v1",
    errorCode,
    error,
    ...(documentKind ? { documentKind: documentKind as DirectorPdfDocumentKind } : {}),
    ...(renderBranch ? { renderBranch: renderBranch as DirectorPdfRenderBranch } : {}),
  };
}

export function normalizeDirectorPdfSuccessPayload(args: {
  value: unknown;
  expectedDocumentKind: DirectorPdfDocumentKind;
  expectedRenderBranch: DirectorPdfRenderBranch;
  allowedRenderers: readonly DirectorPdfRenderer[];
}) {
  if (!args.value || typeof args.value !== "object" || Array.isArray(args.value)) {
    throw new Error("director pdf backend returned non-object payload");
  }

  const payload = args.value as Record<string, unknown>;
  if (payload.ok !== true) {
    throw new Error("director pdf backend returned non-success payload");
  }

  const renderVersion = toText(payload.renderVersion);
  const renderBranch = toText(payload.renderBranch);
  const renderer = toText(payload.renderer);
  const sourceKind = toText(payload.sourceKind);
  const documentKind = toText(payload.documentKind);
  const signedUrl = toText(payload.signedUrl);
  const bucketId = toText(payload.bucketId);
  const storagePath = toText(payload.storagePath);
  const fileName = toText(payload.fileName);
  const expiresInSeconds = toInteger(payload.expiresInSeconds);

  if (renderVersion !== "v1") {
    throw new Error(`director pdf backend invalid renderVersion: ${renderVersion || "<empty>"}`);
  }
  if (renderBranch !== args.expectedRenderBranch) {
    throw new Error(`director pdf backend invalid renderBranch: ${renderBranch || "<empty>"}`);
  }
  if (!args.allowedRenderers.includes(renderer as DirectorPdfRenderer)) {
    throw new Error(`director pdf backend invalid renderer: ${renderer || "<empty>"}`);
  }
  if (sourceKind !== "remote-url") {
    throw new Error(`director pdf backend invalid sourceKind: ${sourceKind || "<empty>"}`);
  }
  if (documentKind !== args.expectedDocumentKind) {
    throw new Error(`director pdf backend invalid documentKind: ${documentKind || "<empty>"}`);
  }
  if (!signedUrl) {
    throw new Error("director pdf backend missing signedUrl");
  }
  if (!bucketId || !storagePath || !fileName) {
    throw new Error("director pdf backend missing storage metadata");
  }

  return {
    ok: true as const,
    renderVersion: "v1" as const,
    renderBranch: args.expectedRenderBranch,
    renderer: renderer as DirectorPdfRenderer,
    sourceKind: "remote-url" as const,
    documentKind: args.expectedDocumentKind,
    signedUrl,
    bucketId,
    storagePath,
    fileName,
    expiresInSeconds: expiresInSeconds ?? 0,
    telemetry:
      payload.telemetry && typeof payload.telemetry === "object" && !Array.isArray(payload.telemetry)
        ? (payload.telemetry as Record<string, unknown>)
        : null,
  };
}

export async function resolveDirectorPdfInvokeErrorDetails(error: unknown): Promise<{
  message: string;
  status: number | null;
  serverErrorCode: DirectorPdfServerErrorCode | null;
}> {
  const directStatus =
    error && typeof error === "object" && "status" in error
      ? toInteger((error as { status?: unknown }).status)
      : null;
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : null;
  const contextStatus =
    context && typeof context === "object" && "status" in context
      ? toInteger((context as { status?: unknown }).status)
      : null;

  const baseMessage =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : toText(error);

  if (context && typeof (context as { text?: unknown }).text === "function") {
    try {
      const response = context as {
        clone?: () => { text: () => Promise<string> };
        text: () => Promise<string>;
      };
      const text = await (typeof response.clone === "function" ? response.clone().text() : response.text());
      const raw = toText(text);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const payload = extractDirectorPdfErrorPayload(parsed);
          if (payload) {
            return {
              message: payload.error,
              status: directStatus ?? contextStatus,
              serverErrorCode: payload.errorCode,
            };
          }

          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const nestedMessage = toText((parsed as Record<string, unknown>).error);
            if (nestedMessage) {
              return {
                message: nestedMessage,
                status: directStatus ?? contextStatus,
                serverErrorCode: null,
              };
            }
          }
        } catch {
          return {
            message: raw,
            status: directStatus ?? contextStatus,
            serverErrorCode: null,
          };
        }
      }
    } catch {
      // ignore response body parsing failures
    }
  }

  return {
    message: baseMessage || "Director PDF request failed.",
    status: directStatus ?? contextStatus,
    serverErrorCode: null,
  };
}

export function classifyDirectorPdfTransportError(args: {
  message: string;
  status: number | null;
  serverErrorCode: DirectorPdfServerErrorCode | null;
  isWeb?: boolean;
}): DirectorPdfTransportErrorCode {
  const message = toText(args.message).toLowerCase();
  const status = args.status;
  const serverErrorCode = args.serverErrorCode;
  const isWeb = args.isWeb === true;

  if (serverErrorCode === "auth_failed" || status === 401 || status === 403) {
    return "auth_failed";
  }
  if (serverErrorCode === "backend_pdf_failed" || (status != null && status >= 500)) {
    return "backend_pdf_failed";
  }
  if (message.includes("cors") || message.includes("preflight")) {
    return "cors_preflight_failed";
  }
  if (
    isWeb
    && status == null
    && (
      message.includes("failed to fetch")
      || message.includes("network request failed")
      || message.includes("failed to send a request to the edge function")
    )
  ) {
    return "cors_preflight_failed";
  }
  if (status != null) {
    return "edge_function_http_error";
  }
  if (serverErrorCode === "validation_failed") {
    return "edge_function_http_error";
  }
  return "edge_function_unreachable";
}
