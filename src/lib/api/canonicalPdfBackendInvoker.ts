import { createPdfSource, type PdfSource } from "../pdfFileContract";
import { Platform } from "react-native";
import { fetchWithRequestTimeout } from "../requestTimeoutPolicy";
import { isAbortError, throwIfAborted } from "../requestCancellation";
import { redactSensitiveText } from "../security/redaction";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "../supabaseClient";
import {
  refreshCanonicalPdfSessionOnce,
  resolveEdgeFunctionAccessToken,
} from "./canonicalPdfAuth.transport";
import {
  extractCanonicalPdfErrorPayload,
  normalizeCanonicalPdfSuccessPayload,
  type CanonicalPdfBackendDocumentType,
  type CanonicalPdfBackendRenderer,
  type CanonicalPdfBackendRole,
} from "../pdf/canonicalPdfPlatformContract";

export type CanonicalPdfInvokePayload = Record<string, unknown>;

export type CanonicalPdfInvokePayloadContract =
  | {
      kind: "missing";
      reason: "missing_payload";
      errorMessage: "Canonical PDF backend payload is missing";
    }
  | {
      kind: "invalid";
      reason: "invalid_payload_shape";
      errorMessage: "Canonical PDF backend payload must be an object";
    }
  | {
      kind: "ready";
      payload: CanonicalPdfInvokePayload;
      payloadState: "empty" | "non_empty";
    };

type InvokeCanonicalPdfBackendArgs = {
  functionName: string;
  payload: CanonicalPdfInvokePayload;
  expectedRole: CanonicalPdfBackendRole;
  expectedDocumentType: CanonicalPdfBackendDocumentType;
  expectedRenderBranch: string;
  errorPrefix: string;
  signal?: AbortSignal | null;
};

export type CanonicalPdfInvokeSuccess = {
  source: PdfSource;
  signedUrl: string;
  bucketId: string;
  storagePath: string;
  fileName: string;
  mimeType: "application/pdf";
  generatedAt: string;
  version: "v1";
  renderBranch: string;
  renderer: CanonicalPdfBackendRenderer;
  sourceKind: "remote-url";
  role: CanonicalPdfBackendRole;
  documentType: CanonicalPdfBackendDocumentType;
  telemetry: Record<string, unknown> | null;
};

type CanonicalPdfTransport =
  | "supabase_functions_invoke"
  | "direct_fetch";

export class CanonicalPdfTransportError extends Error {
  functionName: string;
  code: string;
  httpStatus: number | null;
  transport: CanonicalPdfTransport;
  detail: string | null;

  constructor(
    message: string,
    options: {
      functionName: string;
      code: string;
      httpStatus?: number | null;
      transport?: CanonicalPdfTransport;
      detail?: string | null;
    },
  ) {
    super(message);
    this.name = "CanonicalPdfTransportError";
    this.functionName = options.functionName;
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.transport = options.transport ?? "supabase_functions_invoke";
    this.detail = trimText(redactSensitiveText(options.detail)) || null;
  }
}

const trimText = (value: unknown) => String(value ?? "").trim();
const isNativeRuntime = () => Platform.OS !== "web";

function isCanonicalPdfInvokePayload(
  value: unknown,
): value is CanonicalPdfInvokePayload {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function resolveCanonicalPdfInvokePayloadContract(
  value: unknown,
): CanonicalPdfInvokePayloadContract {
  if (value == null) {
    return {
      kind: "missing",
      reason: "missing_payload",
      errorMessage: "Canonical PDF backend payload is missing",
    };
  }

  if (!isCanonicalPdfInvokePayload(value)) {
    return {
      kind: "invalid",
      reason: "invalid_payload_shape",
      errorMessage: "Canonical PDF backend payload must be an object",
    };
  }

  return {
    kind: "ready",
    payload: value,
    payloadState: Object.keys(value).length === 0 ? "empty" : "non_empty",
  };
}

export function normalizeCanonicalPdfInvokePayload(
  value: unknown,
): CanonicalPdfInvokePayload {
  const contract = resolveCanonicalPdfInvokePayloadContract(value);
  if (contract.kind !== "ready") {
    throw new Error(contract.errorMessage);
  }

  return contract.payload;
}

function logCanonicalPdfBoundaryDiagnostic(
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  if (!__DEV__) return;

  console.warn(`[canonical-pdf-backend] ${event}`, {
    platform: Platform.OS,
    detail: extractTransportErrorDetail(error),
    ...extra,
  });
}

function extractTransportErrorDetail(error: unknown): string | null {
  const parts = new Set<string>();

  const push = (value: unknown) => {
    const text = trimText(value);
    if (!text || text === "[object Object]") return;
    parts.add(text);
  };

  if (error instanceof Error) {
    push(error.message);
    push(error.cause);
  } else {
    push(error);
  }

  if (error && typeof error === "object") {
    const maybeError = error as {
      context?: unknown;
      cause?: unknown;
      originalError?: unknown;
      message?: unknown;
      stack?: unknown;
    };
    push(maybeError.message);
    push(maybeError.cause);
    push(maybeError.originalError);

    const nested = [maybeError.context, maybeError.cause, maybeError.originalError];
    for (const entry of nested) {
      if (!entry || typeof entry !== "object") continue;
      push((entry as { message?: unknown }).message);
      push((entry as { code?: unknown }).code);
      push((entry as { status?: unknown }).status);
      push((entry as { description?: unknown }).description);
    }
  }

  const values = [...parts];
  return values.length > 0 ? redactSensitiveText(values.join(" | ")) : null;
}

function summarizeFunctionResponse(value: unknown): string | null {
  if (typeof value === "string") return redactSensitiveText(trimText(value)) || null;
  if (!value || typeof value !== "object") return null;

  const candidate = value as {
    error?: unknown;
    message?: unknown;
    errorCode?: unknown;
    detail?: unknown;
  };
  const parts = [
    trimText(candidate.error),
    trimText(candidate.message),
    trimText(candidate.errorCode),
    trimText(candidate.detail),
  ].filter(Boolean);

  if (parts.length > 0) return redactSensitiveText(parts.join(" | "));

  try {
    return redactSensitiveText(JSON.stringify(value));
  } catch (error) {
    logCanonicalPdfBoundaryDiagnostic(
      "function_response_summary_failed",
      error,
      { valueType: typeof value },
    );
    return null;
  }
}

async function invokeOnce(args: InvokeCanonicalPdfBackendArgs) {
  throwIfAborted(args.signal);
  const result = await supabase.functions.invoke<unknown>(args.functionName, {
    body: args.payload,
    headers: {
      Accept: "application/json",
    },
  });
  throwIfAborted(args.signal);
  return result;
}

async function readFunctionResponseBody(response: Response, signal?: AbortSignal | null) {
  throwIfAborted(signal);
  const contentType = trimText(response.headers.get("Content-Type")).toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      throwIfAborted(signal);
      return data;
    } catch (error) {
      if (isAbortError(error)) throw error;
      logCanonicalPdfBoundaryDiagnostic(
        "read_json_response_failed",
        error,
        { httpStatus: response.status },
      );
      return null;
    }
  }
  try {
    const text = await response.text();
    throwIfAborted(signal);
    return trimText(text) || null;
  } catch (error) {
    if (isAbortError(error)) throw error;
    logCanonicalPdfBoundaryDiagnostic(
      "read_text_response_failed",
      error,
      { httpStatus: response.status },
    );
    return null;
  }
}

async function invokeDirectFetchOnce(args: InvokeCanonicalPdfBackendArgs) {
  throwIfAborted(args.signal);
  const accessToken = await resolveEdgeFunctionAccessToken({
    signal: args.signal,
    onDiagnostic: logCanonicalPdfBoundaryDiagnostic,
  });
  const url = `${SUPABASE_URL}/functions/v1/${args.functionName}`;

  if (__DEV__) console.info("[canonical-pdf-backend] native_fetch_start", {
    functionName: args.functionName,
    platform: Platform.OS,
    hasAccessToken: Boolean(accessToken),
    url: redactSensitiveText(url),
  });

  try {
    const response = await fetchWithRequestTimeout(
      url,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          "x-client-info": "rik-expo-app",
        },
        body: JSON.stringify(args.payload),
        signal: args.signal ?? undefined,
      },
      {
        fetchImpl: fetch,
        requestClass: "heavy_report_or_pdf_or_storage",
        screen: "request",
        surface: "supabase_transport",
        owner: "canonical_pdf_backend",
        operation: args.functionName,
        sourceKind: "canonical_pdf_function:native",
      },
    );

    if (__DEV__) console.info("[canonical-pdf-backend] native_response_received", {
      functionName: args.functionName,
      platform: Platform.OS,
      httpStatus: response.status,
      ok: response.ok,
      contentType: trimText(response.headers?.get?.("Content-Type")),
    });

    let data: unknown;
    try {
      data = await readFunctionResponseBody(response, args.signal);
    } catch (parseError) {
      if (__DEV__) console.error("[canonical-pdf-backend] native_parse_failed", {
        functionName: args.functionName,
        platform: Platform.OS,
        httpStatus: response.status,
        parseError: redactSensitiveText(parseError instanceof Error ? parseError.message : String(parseError)),
      });
      throw parseError;
    }

    if (__DEV__) console.info("[canonical-pdf-backend] native_parse_success", {
      functionName: args.functionName,
      platform: Platform.OS,
      httpStatus: response.status,
      hasData: data != null,
      dataType: typeof data,
      dataOk: data && typeof data === "object" && "ok" in data ? (data as { ok?: unknown }).ok : undefined,
    });

    return {
      data,
      status: response.status,
      response,
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    const detail = extractTransportErrorDetail(error);
    if (__DEV__) console.error("[canonical-pdf-backend] direct_fetch_failed", {
      functionName: args.functionName,
      platform: Platform.OS,
      detail,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: redactSensitiveText(error instanceof Error ? error.message : String(error)),
    });
    throw new CanonicalPdfTransportError(
      `${args.errorPrefix}: Failed to send a request to the Edge Function`,
      {
        functionName: args.functionName,
        code: "transport_error",
        transport: "direct_fetch",
        detail,
      },
    );
  }
}

function normalizeCanonicalPdfResult(
  data: unknown,
  args: InvokeCanonicalPdfBackendArgs,
): CanonicalPdfInvokeSuccess {
  const payloadError = extractCanonicalPdfErrorPayload(data);
  if (payloadError) {
    throw new CanonicalPdfTransportError(`${args.errorPrefix}: ${redactSensitiveText(payloadError.error)}`, {
      functionName: args.functionName,
      code: payloadError.errorCode,
    });
  }

  const normalized = normalizeCanonicalPdfSuccessPayload({
    value: data,
    expectedRole: args.expectedRole,
    expectedDocumentType: args.expectedDocumentType,
    expectedRenderBranch: args.expectedRenderBranch,
  });

  return {
    source: createPdfSource(normalized.signedUrl),
    signedUrl: normalized.signedUrl,
    bucketId: normalized.bucketId,
    storagePath: normalized.storagePath,
    fileName: normalized.fileName,
    mimeType: normalized.mimeType,
    generatedAt: normalized.generatedAt,
    version: normalized.version,
    renderBranch: normalized.renderBranch,
    renderer: normalized.renderer,
    sourceKind: normalized.sourceKind,
    role: normalized.role,
    documentType: normalized.documentType,
    telemetry: normalized.telemetry,
  };
}

async function invokeCanonicalPdfBackendViaDirectFetch(
  args: InvokeCanonicalPdfBackendArgs,
): Promise<CanonicalPdfInvokeSuccess> {
  throwIfAborted(args.signal);
  let attempt = await invokeDirectFetchOnce(args);
  throwIfAborted(args.signal);
  let payloadError = extractCanonicalPdfErrorPayload(attempt.data);
  const detail = summarizeFunctionResponse(attempt.data);
  const authLikeDetail = (detail ?? "").toLowerCase();
  const shouldRetryAuth =
    attempt.status === 401 ||
    attempt.status === 403 ||
    payloadError?.errorCode === "auth_failed" ||
    authLikeDetail.includes("auth") ||
    authLikeDetail.includes("forbidden") ||
    authLikeDetail.includes("unauthorized") ||
    authLikeDetail.includes("permission");

  if (
    shouldRetryAuth &&
    (await refreshCanonicalPdfSessionOnce({
      signal: args.signal,
      onDiagnostic: logCanonicalPdfBoundaryDiagnostic,
    }))
  ) {
    throwIfAborted(args.signal);
    attempt = await invokeDirectFetchOnce(args);
    throwIfAborted(args.signal);
    payloadError = extractCanonicalPdfErrorPayload(attempt.data);
  }

  if (!attempt.response.ok) {
    const detail = summarizeFunctionResponse(attempt.data);
    if (__DEV__) console.error("[canonical-pdf-backend] direct_fetch_http_failure", {
      functionName: args.functionName,
      platform: Platform.OS,
      httpStatus: attempt.status,
      detail,
    });
    if (payloadError) {
      throw new CanonicalPdfTransportError(`${args.errorPrefix}: ${redactSensitiveText(payloadError.error)}`, {
        functionName: args.functionName,
        code: payloadError.errorCode,
        httpStatus: attempt.status,
        transport: "direct_fetch",
        detail,
      });
    }
    throw new CanonicalPdfTransportError(
      `${args.errorPrefix}: Edge Function returned a non-2xx status code`,
      {
        functionName: args.functionName,
        code: attempt.status === 401 ? "auth_failed" : "transport_error",
        httpStatus: attempt.status,
        transport: "direct_fetch",
        detail,
      },
    );
  }

  return normalizeCanonicalPdfResult(attempt.data, args);
}

async function invokeCanonicalPdfBackendViaSupabase(
  args: InvokeCanonicalPdfBackendArgs,
): Promise<CanonicalPdfInvokeSuccess> {
  throwIfAborted(args.signal);
  let attempt = await invokeOnce(args);
  throwIfAborted(args.signal);

  const firstPayloadError = extractCanonicalPdfErrorPayload(attempt.data);
  if (firstPayloadError?.errorCode === "auth_failed") {
    const refreshed = await refreshCanonicalPdfSessionOnce({
      signal: args.signal,
      onDiagnostic: logCanonicalPdfBoundaryDiagnostic,
    });
    throwIfAborted(args.signal);
    if (refreshed) {
      attempt = await invokeOnce(args);
      throwIfAborted(args.signal);
    }
  } else if (attempt.error) {
    const message = trimText(attempt.error.message);
    const status = Number((attempt.error as { context?: { status?: unknown } }).context?.status ?? NaN);
    const lower = message.toLowerCase();
    if (
      status === 401 ||
      status === 403 ||
      lower.includes("auth") ||
      lower.includes("forbidden") ||
      lower.includes("unauthorized") ||
      lower.includes("permission")
    ) {
      const refreshed = await refreshCanonicalPdfSessionOnce({
        signal: args.signal,
        onDiagnostic: logCanonicalPdfBoundaryDiagnostic,
      });
      throwIfAborted(args.signal);
      if (refreshed) {
        attempt = await invokeOnce(args);
        throwIfAborted(args.signal);
      }
    }
  }

  if (attempt.error) {
    const message = redactSensitiveText(trimText(attempt.error.message) || "canonical pdf backend invoke failed");
    const status = Number((attempt.error as { context?: { status?: unknown } }).context?.status ?? NaN);
    const detail = extractTransportErrorDetail(attempt.error);
    if (__DEV__) console.error("[canonical-pdf-backend] supabase_invoke_failed", {
      functionName: args.functionName,
      platform: Platform.OS,
      httpStatus: Number.isFinite(status) ? status : null,
      detail,
    });
    throw new CanonicalPdfTransportError(`${args.errorPrefix}: ${message}`, {
      functionName: args.functionName,
      code: Number.isFinite(status) && (status === 401 || status === 403) ? "auth_failed" : "transport_error",
      httpStatus: Number.isFinite(status) ? status : null,
      transport: "supabase_functions_invoke",
      detail,
    });
  }

  return normalizeCanonicalPdfResult(attempt.data, args);
}

function normalizeCanonicalPdfInvokeArgs(
  args: InvokeCanonicalPdfBackendArgs,
): InvokeCanonicalPdfBackendArgs {
  try {
    return {
      ...args,
      payload: normalizeCanonicalPdfInvokePayload(args.payload),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Canonical PDF backend payload is invalid";
    throw new Error(`${args.errorPrefix}: ${message}`);
  }
}

export async function invokeCanonicalPdfBackend(
  args: InvokeCanonicalPdfBackendArgs,
): Promise<CanonicalPdfInvokeSuccess> {
  const normalizedArgs = normalizeCanonicalPdfInvokeArgs(args);
  throwIfAborted(normalizedArgs.signal);
  if (isNativeRuntime()) {
    return await invokeCanonicalPdfBackendViaDirectFetch(normalizedArgs);
  }

  return await invokeCanonicalPdfBackendViaSupabase(normalizedArgs);
}
