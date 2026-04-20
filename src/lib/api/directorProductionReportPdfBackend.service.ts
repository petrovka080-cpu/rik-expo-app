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
  renderer: "browserless_puppeteer" | "local_browser_puppeteer" | "artifact_cache";
  fileName: string;
  expiresInSeconds: number | null;
  sourceKind: "remote-url";
  telemetry: Record<string, unknown> | null;
};

class DirectorProductionReportPdfBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectorProductionReportPdfBackendError";
  }
}

const shouldUseBackendRollout = () => MODE !== "force_off";

const PRODUCTION_PDF_CLIENT_CACHE_TTL_MS = 30 * 60 * 1000;
const PRODUCTION_PDF_CLIENT_CACHE_MAX = 20;

type ProductionPdfClientCacheEntry = {
  ts: number;
  value: DirectorProductionReportPdfBackendResult;
};

const productionPdfClientCache = new Map<string, ProductionPdfClientCacheEntry>();
const productionPdfClientInFlight = new Map<string, Promise<DirectorProductionReportPdfBackendResult>>();

const normalizeCachePart = (value: unknown) => String(value ?? "").trim();

function buildProductionPdfClientCacheKey(payload: DirectorProductionReportPdfRequest) {
  return [
    payload.version,
    normalizeCachePart(payload.companyName),
    normalizeCachePart(payload.generatedBy),
    normalizeCachePart(payload.periodFrom),
    normalizeCachePart(payload.periodTo),
    normalizeCachePart(payload.objectName),
    payload.preferPriceStage === "base" ? "base" : "priced",
    normalizeCachePart(payload.clientSourceFingerprint),
  ].join("|");
}

function getProductionPdfClientCache(key: string): DirectorProductionReportPdfBackendResult | null {
  const hit = productionPdfClientCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts >= PRODUCTION_PDF_CLIENT_CACHE_TTL_MS) {
    productionPdfClientCache.delete(key);
    return null;
  }
  productionPdfClientCache.delete(key);
  productionPdfClientCache.set(key, hit);
  return hit.value;
}

function setProductionPdfClientCache(key: string, value: DirectorProductionReportPdfBackendResult) {
  if (productionPdfClientCache.has(key)) productionPdfClientCache.delete(key);
  productionPdfClientCache.set(key, { ts: Date.now(), value });
  while (productionPdfClientCache.size > PRODUCTION_PDF_CLIENT_CACHE_MAX) {
    const oldestKey = productionPdfClientCache.keys().next().value;
    if (!oldestKey) break;
    productionPdfClientCache.delete(oldestKey);
  }
}

async function invokeProductionReportBackend(
  payload: DirectorProductionReportPdfRequest,
): Promise<DirectorProductionReportPdfBackendResult> {
  const result = await invokeDirectorPdfBackend({
    functionName: FUNCTION_NAME,
    payload,
    expectedDocumentKind: "production_report",
    expectedRenderBranch: "backend_production_report_v1",
    allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer", "artifact_cache"],
    errorPrefix: "director production report pdf backend failed",
  });

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
    sourceKind: result.sourceKind,
    telemetry: result.telemetry,
  };
}

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
      clientSourceFingerprint: payload.clientSourceFingerprint ?? null,
    },
  });

  const cacheKey = buildProductionPdfClientCacheKey(payload);
  const canUseClientHotCache = Boolean(payload.clientSourceFingerprint);
  if (canUseClientHotCache) {
    const cached = getProductionPdfClientCache(cacheKey);
    if (cached) {
      boundary.success("backend_invoke_success", {
        sourceKind: "remote-url",
        extra: {
          functionName: FUNCTION_NAME,
          documentKind: "production_report",
          renderBranch: cached.renderBranch,
          renderer: cached.renderer,
          cacheStatus: "client_hot_hit",
        },
      });
      boundary.success("signed_url_received", {
        sourceKind: "remote-url",
        extra: {
          fileName: cached.fileName,
          cacheStatus: "client_hot_hit",
        },
      });
      return cached;
    }
  }

  const inFlight = productionPdfClientInFlight.get(cacheKey);
  if (inFlight) {
    return await inFlight;
  }

  boundary.success("backend_invoke_start", {
    sourceKind: "backend_invoke",
    extra: {
      functionName: FUNCTION_NAME,
      documentKind: "production_report",
    },
  });
  let result: DirectorProductionReportPdfBackendResult;
  try {
    const task = invokeProductionReportBackend(payload);
    productionPdfClientInFlight.set(cacheKey, task);
    result = await task;
    if (canUseClientHotCache) {
      setProductionPdfClientCache(cacheKey, result);
    }
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
  } finally {
    productionPdfClientInFlight.delete(cacheKey);
  }

  boundary.success("backend_invoke_success", {
    sourceKind: result.sourceKind,
    extra: {
      functionName: FUNCTION_NAME,
      documentKind: "production_report",
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

  if (__DEV__) {
    console.info(
      `[director-production-report-pdf-backend] ${JSON.stringify({
        companyName: payload.companyName ?? null,
        generatedBy: payload.generatedBy ?? null,
        periodFrom: payload.periodFrom ?? null,
        periodTo: payload.periodTo ?? null,
        objectName: payload.objectName ?? null,
        preferPriceStage: payload.preferPriceStage ?? "priced",
        clientSourceFingerprint: payload.clientSourceFingerprint ?? null,
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
    sourceKind: result.sourceKind,
    telemetry: result.telemetry,
  };
}
