import * as FileSystemModule from "expo-file-system/legacy";

import type { DocumentDescriptor, PdfDocumentType, PdfOriginModule } from "../documents/pdfDocument";
import { normalizePdfFileName } from "../documents/pdfDocument";
import { getFileSystemPaths } from "../fileSystemPaths";
import {
  createPdfSource,
  getUriScheme,
  hashString32,
  normalizeLocalFileUri,
  type PdfSource,
} from "../pdfFileContract";
import { redactSensitiveRecord, redactSensitiveText } from "../security/redaction";
import { recordPlatformObservability } from "../observability/platformObservability";

type FileSystemCompatBoundary = typeof FileSystemModule & {
  deleteAsync?: (uri: string, options?: { idempotent?: boolean }) => Promise<void>;
};

const FileSystemCompat = FileSystemModule as FileSystemCompatBoundary;

export type PdfInstantCacheStatus = "missing" | "fetching" | "ready" | "stale" | "failed";

export type PdfInstantCacheLookup = {
  status: PdfInstantCacheStatus;
  cacheKey: string;
  targetUri: string;
  localUri?: string;
  sizeBytes?: number;
};

export type PdfInstantCacheMaterialization = {
  status: "ready";
  cacheKey: string;
  localUri: string;
  sizeBytes?: number;
  sourceKind: "local-file";
};

const activeFetches = new Map<string, Promise<PdfInstantCacheMaterialization>>();

const trimText = (value: unknown) => String(value ?? "").trim();

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

function normalizeCacheScreen(originModule: PdfOriginModule) {
  switch (originModule) {
    case "foreman":
    case "buyer":
    case "accountant":
    case "director":
    case "warehouse":
    case "contractor":
    case "reports":
      return originModule;
    default:
      return "reports";
  }
}

function stableJsonStringify(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(trimText(value));
}

function stripRemoteVolatileParts(uri: string): string {
  const value = trimText(uri);
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value.split("?")[0].split("#")[0];
  }
}

function sanitizeStem(value: string, fallback: string) {
  return (trimText(value) || fallback)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || fallback;
}

function getDescriptorSource(doc: DocumentDescriptor): PdfSource {
  return doc.fileSource ?? createPdfSource(doc.uri);
}

function getFileSize(info: Awaited<ReturnType<typeof FileSystemCompat.getInfoAsync>> | null | undefined) {
  if (!info || !("size" in info)) return undefined;
  const value = Number(info.size);
  return Number.isFinite(value) ? value : undefined;
}

async function safeDelete(uri: string) {
  if (typeof FileSystemCompat.deleteAsync !== "function") return;
  try {
    await FileSystemCompat.deleteAsync(uri, { idempotent: true });
  } catch {
    // Cleanup-only. A stale tmp file is harmless and must not block PDF open.
  }
}

export function buildPdfInstantCacheKey(doc: Pick<DocumentDescriptor, "documentType" | "originModule" | "entityId" | "fileName" | "createdAt" | "uri" | "fileSource">) {
  const source = doc.fileSource ?? createPdfSource(doc.uri);
  const sourceFingerprint =
    source.kind === "remote-url"
      ? stripRemoteVolatileParts(source.uri)
      : source.uri;
  return hashString32(stableJsonStringify({
    version: "pdf_instant_cache_v1",
    documentType: doc.documentType as PdfDocumentType,
    originModule: doc.originModule as PdfOriginModule,
    entityId: trimText(doc.entityId) || null,
    fileName: normalizePdfFileName(doc.fileName, "document"),
    sourceKind: source.kind,
    sourceFingerprint,
  }));
}

export function getPdfInstantCacheTarget(doc: DocumentDescriptor) {
  const paths = getFileSystemPaths();
  const cacheKey = buildPdfInstantCacheKey(doc);
  const fileName = sanitizeStem(normalizePdfFileName(doc.fileName, "document"), "document.pdf");
  return {
    cacheKey,
    targetUri: `${paths.cacheDir}pdf_instant_${cacheKey}_${fileName}`,
  };
}

export async function getPdfInstantCacheStatus(doc: DocumentDescriptor): Promise<PdfInstantCacheLookup> {
  const startedAt = nowMs();
  const { cacheKey, targetUri } = getPdfInstantCacheTarget(doc);
  recordPdfInstantCacheEvent({
    doc,
    event: "PDF_CACHE_LOOKUP_START",
    result: "success",
    cacheKey,
    sourceKind: getDescriptorSource(doc).kind,
  });
  if (activeFetches.has(cacheKey)) {
    recordPdfInstantCacheEvent({
      doc,
      event: "PDF_CACHE_LOOKUP_END",
      result: "joined_inflight",
      durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
      cacheKey,
      sourceKind: getDescriptorSource(doc).kind,
      extra: {
        cacheStatus: "fetching",
      },
    });
    return {
      status: "fetching",
      cacheKey,
      targetUri,
    };
  }

  try {
    const info = await FileSystemCompat.getInfoAsync(targetUri);
    if (info?.exists) {
      recordPdfInstantCacheEvent({
        doc,
        event: "PDF_CACHE_LOOKUP_END",
        result: "cache_hit",
        durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
        cacheKey,
        sourceKind: "local-file",
        sizeBytes: getFileSize(info),
        extra: {
          cacheStatus: "ready",
        },
      });
      return {
        status: "ready",
        cacheKey,
        targetUri,
        localUri: normalizeLocalFileUri(targetUri),
        sizeBytes: getFileSize(info),
      };
    }
    recordPdfInstantCacheEvent({
      doc,
      event: "PDF_PREFETCH_MISS",
      result: "success",
      durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
      cacheKey,
      sourceKind: getDescriptorSource(doc).kind,
      extra: {
        cacheStatus: "missing",
      },
    });
    return {
      status: "missing",
      cacheKey,
      targetUri,
    };
  } catch {
    recordPdfInstantCacheEvent({
      doc,
      event: "PDF_CACHE_LOOKUP_END",
      result: "error",
      durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
      cacheKey,
      sourceKind: getDescriptorSource(doc).kind,
      extra: {
        cacheStatus: "failed",
      },
    });
    return {
      status: "failed",
      cacheKey,
      targetUri,
    };
  }
}

function recordPdfInstantCacheEvent(args: {
  doc: DocumentDescriptor;
  event: string;
  result: "success" | "error" | "cache_hit" | "joined_inflight";
  durationMs?: number;
  cacheKey: string;
  sourceKind: string;
  sizeBytes?: number;
  error?: unknown;
  extra?: Record<string, unknown>;
}) {
  const error = args.error instanceof Error ? args.error : null;
  recordPlatformObservability({
    screen: normalizeCacheScreen(args.doc.originModule),
    surface: "pdf_instant_cache",
    category: "fetch",
    event: args.event,
    result: args.result,
    durationMs: args.durationMs,
    sourceKind: args.sourceKind,
    errorStage: args.error ? args.event : undefined,
    errorClass: error?.name,
    errorMessage: error?.message ? redactSensitiveText(error.message) : undefined,
    extra: redactSensitiveRecord({
      cacheKey: args.cacheKey,
      documentType: args.doc.documentType,
      originModule: args.doc.originModule,
      entityId: trimText(args.doc.entityId) || null,
      fileName: args.doc.fileName,
      uriKind: getUriScheme(args.doc.fileSource?.uri ?? args.doc.uri),
      sizeBytes: args.sizeBytes ?? null,
      ...(args.extra ?? {}),
    }) ?? {},
  });
}

async function materializeToCache(doc: DocumentDescriptor): Promise<PdfInstantCacheMaterialization> {
  const startedAt = nowMs();
  const source = getDescriptorSource(doc);
  const { cacheKey, targetUri } = getPdfInstantCacheTarget(doc);

  const existing = await getPdfInstantCacheStatus(doc);
  if (existing.status === "ready" && existing.localUri) {
    recordPdfInstantCacheEvent({
      doc,
      event: "PDF_PREFETCH_HIT",
      result: "cache_hit",
      durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
      cacheKey,
      sourceKind: "local-file",
      sizeBytes: existing.sizeBytes,
    });
    return {
      status: "ready",
      cacheKey,
      localUri: existing.localUri,
      sizeBytes: existing.sizeBytes,
      sourceKind: "local-file",
    };
  }

  if (source.kind === "blob") {
    throw new Error("PDF instant cache cannot materialize blob/data source");
  }

  const tmpUri = `${targetUri}.tmp-${Date.now().toString(36)}`;
  try {
    recordPdfInstantCacheEvent({
      doc,
      event: "PDF_DOWNLOAD_START",
      result: "success",
      cacheKey,
      sourceKind: source.kind,
    });

    if (source.kind === "remote-url") {
      await FileSystemCompat.downloadAsync(source.uri, tmpUri);
    } else {
      const sourceUri = normalizeLocalFileUri(source.uri);
      const sourceInfo = await FileSystemCompat.getInfoAsync(sourceUri);
      if (!sourceInfo?.exists) throw new Error("PDF source file is missing");
      if (sourceUri === targetUri) {
        const sizeBytes = getFileSize(sourceInfo);
        return {
          status: "ready",
          cacheKey,
          localUri: sourceUri,
          sizeBytes,
          sourceKind: "local-file",
        };
      }
      await FileSystemCompat.copyAsync({ from: sourceUri, to: tmpUri });
    }

    const tmpInfo = await FileSystemCompat.getInfoAsync(tmpUri);
    if (!tmpInfo?.exists) throw new Error("PDF cache tmp file is missing after materialization");

    await FileSystemCompat.copyAsync({ from: tmpUri, to: targetUri });
    const finalInfo = await FileSystemCompat.getInfoAsync(targetUri);
    if (!finalInfo?.exists) throw new Error("PDF cache target file is missing after atomic write");

    const sizeBytes = getFileSize(finalInfo);
    recordPdfInstantCacheEvent({
      doc,
      event: "PDF_DOWNLOAD_END",
      result: "success",
      durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
      cacheKey,
      sourceKind: "local-file",
      sizeBytes,
    });
    return {
      status: "ready",
      cacheKey,
      localUri: normalizeLocalFileUri(targetUri),
      sizeBytes,
      sourceKind: "local-file",
    };
  } catch (error) {
    recordPdfInstantCacheEvent({
      doc,
      event: "PDF_OPEN_FAILED_REDACTED",
      result: "error",
      durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
      cacheKey,
      sourceKind: source.kind,
      error,
    });
    throw error;
  } finally {
    await safeDelete(tmpUri);
  }
}

export async function ensurePdfInstantCacheAsset(
  doc: DocumentDescriptor,
): Promise<PdfInstantCacheMaterialization> {
  const { cacheKey } = getPdfInstantCacheTarget(doc);
  const existing = activeFetches.get(cacheKey);
  if (existing) {
    recordPdfInstantCacheEvent({
      doc,
      event: "PDF_PREFETCH_HIT",
      result: "joined_inflight",
      cacheKey,
      sourceKind: getDescriptorSource(doc).kind,
      extra: {
        cacheStatus: "fetching",
      },
    });
    return await existing;
  }

  const task = materializeToCache(doc).finally(() => {
    if (activeFetches.get(cacheKey) === task) {
      activeFetches.delete(cacheKey);
    }
  });
  activeFetches.set(cacheKey, task);
  return await task;
}

export function prefetchPdfInstantCache(doc: DocumentDescriptor): Promise<PdfInstantCacheMaterialization> {
  return ensurePdfInstantCacheAsset(doc);
}

export function clearPdfInstantCacheStateForTests() {
  activeFetches.clear();
}
