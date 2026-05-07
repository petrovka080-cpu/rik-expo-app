import { beginCanonicalPdfBoundary } from "../pdf/canonicalPdfObservability";
import {
  buildWarehouseIssueRegisterManifestContract,
  buildWarehouseIncomingRegisterManifestContract,
  normalizeWarehousePdfRequest,
  type WarehousePdfRequest,
} from "../pdf/warehousePdf.shared";
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "../storage/classifiedStorage";
import { isAbortError, throwIfAborted } from "../requestCancellation";
import { invokeCanonicalPdfBackend } from "./canonicalPdfBackendInvoker";

const FUNCTION_NAME = "warehouse-pdf";
const RENDER_BRANCH = "backend_warehouse_pdf_v1";

export type WarehousePdfBackendResult = {
  source: Awaited<ReturnType<typeof invokeCanonicalPdfBackend>>["source"];
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  fileName: string;
  mimeType: "application/pdf";
  generatedAt: string;
  version: "v1";
  renderBranch: typeof RENDER_BRANCH;
  renderer: "browserless_puppeteer" | "local_browser_puppeteer" | "artifact_cache";
  sourceKind: "remote-url";
  telemetry: Record<string, unknown> | null;
};

const WAREHOUSE_PDF_CLIENT_CACHE_TTL_MS = 30 * 60 * 1000;
const WAREHOUSE_PDF_CLIENT_CACHE_MAX = 20;

type WarehousePdfClientCacheEntry = {
  ts: number;
  value: WarehousePdfBackendResult;
  sourceVersion: string | null;
};

type WarehousePdfStoredCacheEntry = {
  version: 1;
  sourceVersion: string;
  value: WarehousePdfBackendResult;
};

type WarehousePdfBackendOptions = {
  signal?: AbortSignal | null;
};

const warehousePdfClientCache = new Map<string, WarehousePdfClientCacheEntry>();
const warehousePdfClientInFlight = new Map<string, Promise<WarehousePdfBackendResult>>();

const normalizeCachePart = (value: unknown) => String(value ?? "").trim();

function buildWarehousePdfClientCacheKey(payload: WarehousePdfRequest) {
  return [
    payload.version,
    payload.role,
    payload.documentType,
    payload.documentKind,
    normalizeCachePart(payload.companyName),
    normalizeCachePart(payload.warehouseName),
    normalizeCachePart(payload.generatedBy),
    "periodFrom" in payload ? normalizeCachePart(payload.periodFrom) : "",
    "periodTo" in payload ? normalizeCachePart(payload.periodTo) : "",
    "dayLabel" in payload ? normalizeCachePart(payload.dayLabel) : "",
    "issueId" in payload ? normalizeCachePart(payload.issueId) : "",
    "incomingId" in payload ? normalizeCachePart(payload.incomingId) : "",
    "objectId" in payload ? normalizeCachePart(payload.objectId) : "",
    normalizeCachePart(payload.clientSourceFingerprint),
  ].join("|");
}

function canUseWarehouseRegisterHotCache(payload: WarehousePdfRequest) {
  return (
    (payload.documentKind === "incoming_register" || payload.documentKind === "issue_register") &&
    Boolean(payload.clientSourceFingerprint)
  );
}

function getWarehousePdfClientCache(key: string): WarehousePdfClientCacheEntry | null {
  const hit = warehousePdfClientCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= WAREHOUSE_PDF_CLIENT_CACHE_TTL_MS) {
    warehousePdfClientCache.delete(key);
    return null;
  }
  warehousePdfClientCache.delete(key);
  warehousePdfClientCache.set(key, hit);
  return hit;
}

function setWarehousePdfClientCache(
  key: string,
  value: WarehousePdfBackendResult,
  sourceVersion?: string | null,
) {
  if (warehousePdfClientCache.has(key)) warehousePdfClientCache.delete(key);
  warehousePdfClientCache.set(key, { ts: Date.now(), value, sourceVersion: sourceVersion ?? null });
  while (warehousePdfClientCache.size > WAREHOUSE_PDF_CLIENT_CACHE_MAX) {
    const oldestKey = warehousePdfClientCache.keys().next().value;
    if (!oldestKey) break;
    warehousePdfClientCache.delete(oldestKey);
  }
}

function hashWarehousePdfCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildWarehousePdfStoredCacheKey(
  cacheKey: string,
  documentKind: WarehousePdfRequest["documentKind"],
) {
  const prefix =
    documentKind === "incoming_register"
      ? "pdf.z3.warehouse.incoming_register.v1"
      : "pdf.final.warehouse.issue_register.v1";
  return `${prefix}.${hashWarehousePdfCacheKey(cacheKey)}`;
}

function isWarehousePdfStoredCacheEntry(value: unknown): value is WarehousePdfStoredCacheEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<WarehousePdfStoredCacheEntry>;
  return record.version === 1 &&
    typeof record.sourceVersion === "string" &&
    Boolean(record.value) &&
    typeof record.value === "object";
}

async function readWarehousePdfStoredCache(
  cacheKey: string,
  documentKind: WarehousePdfRequest["documentKind"],
  sourceVersion: string | null,
): Promise<WarehousePdfClientCacheEntry | null> {
  if (!sourceVersion) return null;
  const storageKey = buildWarehousePdfStoredCacheKey(cacheKey, documentKind);
  const stored = await readStoredJson<WarehousePdfStoredCacheEntry>({
    screen: "warehouse",
    surface: "warehouse_pdf_backend",
    key: storageKey,
  });
  if (!isWarehousePdfStoredCacheEntry(stored)) return null;
  if (stored.sourceVersion !== sourceVersion) {
    await removeStoredValue({
      screen: "warehouse",
      surface: "warehouse_pdf_backend",
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

async function writeWarehousePdfStoredCache(
  cacheKey: string,
  documentKind: WarehousePdfRequest["documentKind"],
  value: WarehousePdfBackendResult,
  sourceVersion: string | null,
) {
  if (!sourceVersion) return;
  await writeStoredJson<WarehousePdfStoredCacheEntry>(
    {
      screen: "warehouse",
      surface: "warehouse_pdf_backend",
      key: buildWarehousePdfStoredCacheKey(cacheKey, documentKind),
      ttlMs: WAREHOUSE_PDF_CLIENT_CACHE_TTL_MS,
    },
    {
      version: 1,
      sourceVersion,
      value,
    },
  );
}

async function invokeWarehousePdfBackend(
  payload: WarehousePdfRequest,
  options?: WarehousePdfBackendOptions,
): Promise<WarehousePdfBackendResult> {
  throwIfAborted(options?.signal);
  const result = await invokeCanonicalPdfBackend({
    functionName: FUNCTION_NAME,
    payload,
    expectedRole: "warehouse",
    expectedDocumentType: payload.documentType,
    expectedRenderBranch: RENDER_BRANCH,
    errorPrefix: "warehouse pdf backend failed",
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

export async function generateWarehousePdfViaBackend(
  input: WarehousePdfRequest,
  options?: WarehousePdfBackendOptions,
): Promise<WarehousePdfBackendResult> {
  throwIfAborted(options?.signal);
  const payload = normalizeWarehousePdfRequest(input);
  throwIfAborted(options?.signal);
  const boundary = beginCanonicalPdfBoundary({
    screen: "warehouse",
    surface: "warehouse_pdf_backend",
    role: "warehouse",
    documentType: payload.documentType,
    sourceKind: "backend_payload",
    fallbackUsed: false,
  });

  boundary.success("payload_ready", {
    sourceKind: "backend_payload",
    extra: {
      documentKind: payload.documentKind,
      issueId: "issueId" in payload ? payload.issueId : null,
      incomingId: "incomingId" in payload ? payload.incomingId : null,
      periodFrom: "periodFrom" in payload ? payload.periodFrom ?? null : null,
      periodTo: "periodTo" in payload ? payload.periodTo ?? null : null,
      dayLabel: "dayLabel" in payload ? payload.dayLabel ?? null : null,
      objectId: "objectId" in payload ? payload.objectId ?? null : null,
      clientSourceFingerprint: payload.clientSourceFingerprint ?? null,
    },
  });

  const cacheKey = buildWarehousePdfClientCacheKey(payload);
  const canUseClientHotCache = canUseWarehouseRegisterHotCache(payload);
  const alreadyInFlight = warehousePdfClientInFlight.get(cacheKey);
  if (alreadyInFlight) {
    const result = await alreadyInFlight;
    throwIfAborted(options?.signal);
    return result;
  }

  let task: Promise<WarehousePdfBackendResult>;
  task = Promise.resolve().then(async (): Promise<WarehousePdfBackendResult> => {
    throwIfAborted(options?.signal);
    let manifestSourceVersion: string | null = null;
    if (canUseClientHotCache) {
      try {
        const manifest =
          payload.documentKind === "issue_register"
            ? await buildWarehouseIssueRegisterManifestContract({
                periodFrom: "periodFrom" in payload ? payload.periodFrom : null,
                periodTo: "periodTo" in payload ? payload.periodTo : null,
                companyName: payload.companyName,
                warehouseName: payload.warehouseName,
                clientSourceFingerprint: payload.clientSourceFingerprint,
              })
            : await buildWarehouseIncomingRegisterManifestContract({
                periodFrom: "periodFrom" in payload ? payload.periodFrom : null,
                periodTo: "periodTo" in payload ? payload.periodTo : null,
                companyName: payload.companyName,
                warehouseName: payload.warehouseName,
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
            documentKind: payload.documentKind,
          },
        });
      }
    }

    if (canUseClientHotCache) {
      throwIfAborted(options?.signal);
      const cached = getWarehousePdfClientCache(cacheKey);
      if (cached) {
        throwIfAborted(options?.signal);
        const isVersionMatch =
          manifestSourceVersion !== null && cached.sourceVersion === manifestSourceVersion;
        const cacheStatus = isVersionMatch ? "manifest_version_hit" : "client_hot_hit";
        boundary.success("backend_invoke_success", {
          sourceKind: "remote-url",
          extra: {
            functionName: FUNCTION_NAME,
            documentKind: payload.documentKind,
            renderBranch: cached.value.renderBranch,
            renderer: cached.value.renderer,
            cacheStatus,
            manifestSourceVersion: manifestSourceVersion ?? null,
          },
        });
        boundary.success("signed_url_received", {
          sourceKind: "remote-url",
          extra: {
            documentKind: payload.documentKind,
            fileName: cached.value.fileName,
            cacheStatus,
          },
        });
        return cached.value;
      }

      const stored = await readWarehousePdfStoredCache(
        cacheKey,
        payload.documentKind,
        manifestSourceVersion,
      );
      throwIfAborted(options?.signal);
      if (stored) {
        setWarehousePdfClientCache(cacheKey, stored.value, stored.sourceVersion);
        boundary.success("backend_invoke_success", {
          sourceKind: "remote-url",
          extra: {
            functionName: FUNCTION_NAME,
            documentKind: payload.documentKind,
            renderBranch: stored.value.renderBranch,
            renderer: stored.value.renderer,
            cacheStatus: "persistent_manifest_hit",
            manifestSourceVersion: stored.sourceVersion,
          },
        });
        boundary.success("signed_url_received", {
          sourceKind: "remote-url",
          extra: {
            documentKind: payload.documentKind,
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
        documentKind: payload.documentKind,
      },
    });

    let result: WarehousePdfBackendResult;
    try {
      result = await invokeWarehousePdfBackend(payload, options);
      throwIfAborted(options?.signal);
      if (canUseClientHotCache) {
        setWarehousePdfClientCache(cacheKey, result, manifestSourceVersion);
        await writeWarehousePdfStoredCache(
          cacheKey,
          payload.documentKind,
          result,
          manifestSourceVersion,
        );
        throwIfAborted(options?.signal);
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      boundary.error("backend_invoke_failure", error, {
        sourceKind: "backend_invoke",
        errorStage: "backend_invoke",
        extra: {
          functionName: FUNCTION_NAME,
          documentKind: payload.documentKind,
        },
      });
      throw error instanceof Error
        ? error
        : new Error("warehouse pdf backend failed");
    }

    boundary.success("backend_invoke_success", {
      sourceKind: result.sourceKind,
      extra: {
        functionName: FUNCTION_NAME,
        documentKind: payload.documentKind,
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
        documentKind: payload.documentKind,
        fileName: result.fileName,
      },
    });

    return result;
  }).finally(() => {
    if (warehousePdfClientInFlight.get(cacheKey) === task) {
      warehousePdfClientInFlight.delete(cacheKey);
    }
  });
  warehousePdfClientInFlight.set(cacheKey, task);
  return await task;
}
