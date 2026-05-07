import { beginCanonicalPdfBoundary } from "../pdf/canonicalPdfObservability";
import {
  buildForemanRequestManifestContract,
  normalizeForemanRequestPdfRequest,
  type ForemanRequestPdfRequest,
} from "../pdf/foremanRequestPdf.shared";
import type { CanonicalPdfBackendRenderer } from "../pdf/canonicalPdfPlatformContract";
import type { PdfSource } from "../pdfFileContract";
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "../storage/classifiedStorage";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabaseClient";
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

const FOREMAN_REQUEST_PDF_CLIENT_CACHE_TTL_MS = 30 * 60 * 1000;
const FOREMAN_REQUEST_PDF_CLIENT_CACHE_MAX = 20;

type ForemanRequestPdfClientCacheEntry = {
  ts: number;
  value: ForemanRequestPdfBackendResult;
  sourceVersion: string | null;
};

type ForemanRequestPdfStoredCacheEntry = {
  version: 1;
  sourceVersion: string;
  value: ForemanRequestPdfBackendResult;
};

type ForemanRequestPdfBackendOptions = {
  signal?: AbortSignal | null;
};

const foremanRequestPdfClientCache = new Map<string, ForemanRequestPdfClientCacheEntry>();
const foremanRequestPdfClientInFlight = new Map<string, Promise<ForemanRequestPdfBackendResult>>();

const normalizeCachePart = (value: unknown) => String(value ?? "").trim();

function buildForemanRequestPdfClientCacheKey(payload: ForemanRequestPdfRequest) {
  return [
    payload.version,
    payload.role,
    payload.documentType,
    normalizeCachePart(payload.requestId),
    normalizeCachePart(payload.clientSourceFingerprint),
  ].join("|");
}

function hashForemanRequestPdfCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildForemanRequestPdfStoredCacheKey(cacheKey: string) {
  return `pdf.z4.foreman.request.v1.${hashForemanRequestPdfCacheKey(cacheKey)}`;
}

function isForemanRequestPdfStoredCacheEntry(
  value: unknown,
): value is ForemanRequestPdfStoredCacheEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ForemanRequestPdfStoredCacheEntry>;
  return record.version === 1 &&
    typeof record.sourceVersion === "string" &&
    Boolean(record.value) &&
    typeof record.value === "object";
}

function getForemanRequestPdfClientCache(key: string): ForemanRequestPdfClientCacheEntry | null {
  const hit = foremanRequestPdfClientCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= FOREMAN_REQUEST_PDF_CLIENT_CACHE_TTL_MS) {
    foremanRequestPdfClientCache.delete(key);
    return null;
  }
  foremanRequestPdfClientCache.delete(key);
  foremanRequestPdfClientCache.set(key, hit);
  return hit;
}

function setForemanRequestPdfClientCache(
  key: string,
  value: ForemanRequestPdfBackendResult,
  sourceVersion?: string | null,
) {
  if (foremanRequestPdfClientCache.has(key)) foremanRequestPdfClientCache.delete(key);
  foremanRequestPdfClientCache.set(key, { ts: Date.now(), value, sourceVersion: sourceVersion ?? null });
  while (foremanRequestPdfClientCache.size > FOREMAN_REQUEST_PDF_CLIENT_CACHE_MAX) {
    const oldestKey = foremanRequestPdfClientCache.keys().next().value;
    if (!oldestKey) break;
    foremanRequestPdfClientCache.delete(oldestKey);
  }
}

async function readForemanRequestPdfStoredCache(
  cacheKey: string,
  sourceVersion: string | null,
): Promise<ForemanRequestPdfClientCacheEntry | null> {
  if (!sourceVersion) return null;
  const storageKey = buildForemanRequestPdfStoredCacheKey(cacheKey);
  const stored = await readStoredJson<ForemanRequestPdfStoredCacheEntry>({
    screen: "foreman",
    surface: "foreman_pdf_backend",
    key: storageKey,
  });
  if (!isForemanRequestPdfStoredCacheEntry(stored)) return null;
  if (stored.sourceVersion !== sourceVersion) {
    await removeStoredValue({
      screen: "foreman",
      surface: "foreman_pdf_backend",
      key: storageKey,
    });
    return null;
  }
  return {
    ts: Date.now(),
    value: stored.value,
    sourceVersion: stored.sourceVersion,
  };
}

async function writeForemanRequestPdfStoredCache(
  cacheKey: string,
  value: ForemanRequestPdfBackendResult,
  sourceVersion: string | null,
) {
  if (!sourceVersion) return;
  await writeStoredJson<ForemanRequestPdfStoredCacheEntry>(
    {
      screen: "foreman",
      surface: "foreman_pdf_backend",
      key: buildForemanRequestPdfStoredCacheKey(cacheKey),
      ttlMs: FOREMAN_REQUEST_PDF_CLIENT_CACHE_TTL_MS,
    },
    {
      version: 1,
      sourceVersion,
      value,
    },
  );
}

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

  const cacheKey = buildForemanRequestPdfClientCacheKey(payload);
  const canUseClientHotCache = Boolean(payload.clientSourceFingerprint);
  const alreadyInFlight = foremanRequestPdfClientInFlight.get(cacheKey);
  if (alreadyInFlight) {
    const result = await alreadyInFlight;
    throwIfAborted(options?.signal);
    return result;
  }

  let task: Promise<ForemanRequestPdfBackendResult>;
  task = Promise.resolve().then(async (): Promise<ForemanRequestPdfBackendResult> => {
    throwIfAborted(options?.signal);
    let manifestSourceVersion: string | null = null;
    if (canUseClientHotCache) {
      try {
        const manifest = await buildForemanRequestManifestContract({
          requestId: payload.requestId,
          clientSourceFingerprint: payload.clientSourceFingerprint,
        });
        throwIfAborted(options?.signal);
        manifestSourceVersion = manifest.sourceVersion;
      } catch (error) {
        if (isAbortError(error)) throw error;
        boundary.error("backend_invoke_failure", error, {
          sourceKind: "backend_invoke",
          errorStage: "manifest_source_version",
          extra: {
            functionName: FUNCTION_NAME,
            requestId: payload.requestId,
          },
        });
      }
    }

    if (canUseClientHotCache) {
      throwIfAborted(options?.signal);
      const cached = getForemanRequestPdfClientCache(cacheKey);
      if (cached) {
        throwIfAborted(options?.signal);
        const isVersionMatch =
          manifestSourceVersion !== null && cached.sourceVersion === manifestSourceVersion;
        const cacheStatus = isVersionMatch ? "manifest_version_hit" : "client_hot_hit";
        boundary.success("backend_invoke_success", {
          sourceKind: "remote-url",
          extra: {
            functionName: FUNCTION_NAME,
            requestId: payload.requestId,
            renderBranch: cached.value.renderBranch,
            renderer: cached.value.renderer,
            cacheStatus,
            manifestSourceVersion: manifestSourceVersion ?? null,
          },
        });
        boundary.success("signed_url_received", {
          sourceKind: "remote-url",
          extra: {
            fileName: cached.value.fileName,
            cacheStatus,
          },
        });
        return cached.value;
      }

      const stored = await readForemanRequestPdfStoredCache(cacheKey, manifestSourceVersion);
      throwIfAborted(options?.signal);
      if (stored) {
        setForemanRequestPdfClientCache(cacheKey, stored.value, stored.sourceVersion);
        boundary.success("backend_invoke_success", {
          sourceKind: "remote-url",
          extra: {
            functionName: FUNCTION_NAME,
            requestId: payload.requestId,
            renderBranch: stored.value.renderBranch,
            renderer: stored.value.renderer,
            cacheStatus: "persistent_manifest_hit",
            manifestSourceVersion: stored.sourceVersion,
          },
        });
        boundary.success("signed_url_received", {
          sourceKind: "remote-url",
          extra: {
            fileName: stored.value.fileName,
            cacheStatus: "persistent_manifest_hit",
          },
        });
        return stored.value;
      }
    }

    boundary.success("backend_invoke_start", {
      sourceKind: "backend_invoke",
      extra: {
        functionName: FUNCTION_NAME,
        requestId: payload.requestId,
      },
    });

    let result: ForemanRequestPdfBackendResult;
    try {
      result = await invokeForemanRequestPdfBackend(payload, options);
      throwIfAborted(options?.signal);
      if (canUseClientHotCache) {
        setForemanRequestPdfClientCache(cacheKey, result, manifestSourceVersion);
        await writeForemanRequestPdfStoredCache(cacheKey, result, manifestSourceVersion);
        throwIfAborted(options?.signal);
      }
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
        manifestSourceVersion: manifestSourceVersion ?? null,
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
  }).finally(() => {
    if (foremanRequestPdfClientInFlight.get(cacheKey) === task) {
      foremanRequestPdfClientInFlight.delete(cacheKey);
    }
  });
  foremanRequestPdfClientInFlight.set(cacheKey, task);
  return await task;
}
