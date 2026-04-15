import { Platform } from "react-native";
import * as FileSystemModule from "expo-file-system/legacy";
import type { DocumentDescriptor } from "./pdfDocument";
import { normalizePdfFileName } from "./pdfDocument";
import { getFileSystemPaths } from "../fileSystemPaths";
import {
  createPdfSource,
  getUriScheme,
  hashString32,
  normalizeLocalFileUri,
  type PdfSource,
  type PdfSourceKind,
} from "../pdfFileContract";
import { recordPdfCrashBreadcrumbAsync } from "../pdf/pdfCrashBreadcrumbs";
import type {
  FileInfo,
  FileSystemDownloadResult,
  RelocatingOptions,
} from "expo-file-system/legacy";

type FileSystemCompatBoundary = {
  getInfoAsync(fileUri: string): Promise<FileInfo>;
  downloadAsync(uri: string, fileUri: string): Promise<FileSystemDownloadResult>;
  copyAsync(options: RelocatingOptions): Promise<void>;
};

const fileSystemCompat: FileSystemCompatBoundary = {
  getInfoAsync: FileSystemModule.getInfoAsync,
  downloadAsync: FileSystemModule.downloadAsync,
  copyAsync: FileSystemModule.copyAsync,
};

export type DocumentAsset = {
  assetId: string;
  uri: string;
  fileSource: PdfSource;
  sourceKind: PdfSourceKind;
  fileName: string;
  title: string;
  mimeType: "application/pdf";
  documentType: DocumentDescriptor["documentType"];
  originModule: DocumentDescriptor["originModule"];
  source: "generated" | "attachment";
  createdAt: string;
  sizeBytes?: number;
  expiresAt?: string;
  entityId?: string;
};

export type DocumentSessionStatus = "preparing" | "ready" | "error";

export type DocumentSession = {
  sessionId: string;
  assetId: string;
  status: DocumentSessionStatus;
  errorMessage?: string;
  createdAt: string;
  lastAccessAt?: string;
};

type RegistrySnapshot = {
  session: DocumentSession | null;
  asset: DocumentAsset | null;
};

type FileInfoBoundary =
  | FileInfo
  | {
      exists: false;
      error: unknown;
    };

const SESSION_TTL_MS = 20 * 60 * 1000;
const MAX_SESSIONS = 40;
const MAX_ASSETS = 40;

const sessions = new Map<string, DocumentSession>();
const assets = new Map<string, DocumentAsset>();

let seq = 0;

const nowIso = () => new Date().toISOString();

const sanitizeStem = (value: string, fallback: string) =>
  (String(value || "").trim() || fallback)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || fallback;

function logMaterializeStage(
  stage: string,
  payload: {
    uri?: string | null;
    exists?: boolean;
    size?: number;
    sourceKind: PdfSourceKind;
    fileName?: string;
    documentType?: string;
    originModule?: string;
  },
) {
  if (__DEV__) console.info(`[pdf-document-sessions] ${stage}`, {
    stage,
    uri: payload.uri ?? null,
    scheme: getUriScheme(payload.uri),
    exists: payload.exists,
    sizeBytes: payload.size,
    sourceKind: payload.sourceKind,
    fileName: payload.fileName ?? null,
    documentType: payload.documentType ?? null,
    originModule: payload.originModule ?? null,
  });
}

function persistMaterializeBreadcrumb(
  marker: string,
  input: {
    screen: DocumentDescriptor["originModule"];
    documentType: DocumentDescriptor["documentType"];
    originModule: DocumentDescriptor["originModule"];
    sourceKind: PdfSourceKind;
    uri?: string | null;
    fileName?: string;
    entityId?: string;
    fileExists?: boolean;
    fileSizeBytes?: number;
    errorMessage?: string;
  },
) {
  return recordPdfCrashBreadcrumbAsync({
    marker,
    screen: input.screen,
    documentType: input.documentType,
    originModule: input.originModule,
    sourceKind: input.sourceKind,
    uri: input.uri,
    uriKind: getUriScheme(input.uri),
    fileName: input.fileName,
    entityId: input.entityId,
    fileExists: input.fileExists,
    fileSizeBytes: input.fileSizeBytes,
    errorMessage: input.errorMessage,
    previewPath: "materialize_local_pdf_asset",
  });
}

async function getFileInfo(uri: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) await new Promise((r) => setTimeout(r, 100 * attempt));
      const info = await fileSystemCompat.getInfoAsync(uri);
      if (info) return info;
    } catch (e) {
      lastError = e;
    }
  }
  return { exists: false, error: lastError } as FileInfoBoundary;
}

const getFileSize = (info: FileInfoBoundary | null | undefined) =>
  info?.exists && "size" in info && Number.isFinite(Number(info.size))
    ? Number(info.size)
    : undefined;

async function ensureLocalPdfUri(
  source: PdfSource,
  fileName: string,
): Promise<{ uri: string; sizeBytes?: number; sourceKind: "local-file" }> {
  const normalizedName = normalizePdfFileName(fileName, "document");
  const paths = getFileSystemPaths();
  const cacheDir = paths.cacheDir;
  const hash = hashString32(source.uri);
  const targetName = `pdf_${hash}_${sanitizeStem(normalizedName, "document.pdf")}`;
  const targetUri = `${cacheDir}${targetName}`;
  
  logMaterializeStage("pdf_source_received", {
    uri: source.uri,
    sourceKind: source.kind,
    fileName,
  });

  if (source.kind === "blob") {
    throw new Error("Mobile PDF materialization cannot use blob/data source");
  }

  if (source.kind === "remote-url") {
    logMaterializeStage("pdf_download_started", {
      uri: targetUri,
      sourceKind: "remote-url",
      fileName,
    });
    const downloaded = await fileSystemCompat.downloadAsync(source.uri, targetUri);
    const downloadedUri = normalizeLocalFileUri(String(downloaded?.uri || targetUri));
    
    const info = await getFileInfo(downloadedUri);
    const exists = Boolean(info?.exists);
    if (!exists) throw new Error("Downloaded PDF file is missing after materialization");
    
    return {
      uri: downloadedUri,
      sourceKind: "local-file",
      sizeBytes: getFileSize(info),
    };
  }

  // Local file materialization (e.g. from Library/Caches/Print/)
  const sourceUri = normalizeLocalFileUri(source.uri);
  const info = await getFileInfo(sourceUri);
  const sourceExists = Boolean(info?.exists);

  if (!sourceExists) {
    throw new Error(`PDF source not found: ${sourceUri.slice(-60)}`);
  }

  // Even if keepAsIs could be true, on iOS 18 it's safer to always copy to our own controlled cache
  // if the file is in a volatile location like /Print/
  const isVolatile = sourceUri.includes("/Caches/Print/") || sourceUri.includes("/T/");
  
  if (isVolatile || sourceUri !== targetUri) {
    logMaterializeStage("pdf_materialize_copy_started", {
      uri: sourceUri,
      sourceKind: "local-file",
      fileName,
    });
    await fileSystemCompat.copyAsync({ from: sourceUri, to: targetUri });
    const copiedInfo = await getFileInfo(targetUri);
    if (!copiedInfo?.exists) throw new Error("Materialized local PDF file is missing after copy");
    
    return {
      uri: targetUri,
      sourceKind: "local-file",
      sizeBytes: getFileSize(copiedInfo),
    };
  }

  return {
    uri: sourceUri,
    sourceKind: "local-file",
    sizeBytes: getFileSize(info),
  };
}

const makeId = (prefix: string) => {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
};

const isExpired = (iso?: string | null) => {
  if (!iso) return false;
  const ts = Date.parse(String(iso));
  return Number.isFinite(ts) && ts <= Date.now();
};

const sessionExpired = (session: DocumentSession) => {
  const ts = Date.parse(session.lastAccessAt || session.createdAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts > SESSION_TTL_MS;
};

const evictSession = (sessionId: string) => {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);
  const assetId = session.assetId;
  const assetStillUsed = Array.from(sessions.values()).some((row) => row.assetId === assetId);
  if (!assetStillUsed) assets.delete(assetId);
};

export function cleanupExpiredDocumentSessions() {
  for (const [sessionId, session] of sessions.entries()) {
    const asset = assets.get(session.assetId);
    if (sessionExpired(session) || (asset && isExpired(asset.expiresAt))) {
      evictSession(sessionId);
    }
  }

  while (sessions.size > MAX_SESSIONS) {
    const oldest = Array.from(sessions.values()).sort((a, b) =>
      Date.parse(a.lastAccessAt || a.createdAt) - Date.parse(b.lastAccessAt || b.createdAt),
    )[0];
    if (!oldest) break;
    evictSession(oldest.sessionId);
  }

  while (assets.size > MAX_ASSETS) {
    const unusedAsset = Array.from(assets.values()).find(
      (asset) => !Array.from(sessions.values()).some((session) => session.assetId === asset.assetId),
    );
    if (!unusedAsset) break;
    assets.delete(unusedAsset.assetId);
  }
}

export function clearDocumentSessions() {
  sessions.clear();
  assets.clear();
}

export async function materializePdfAsset(doc: DocumentDescriptor): Promise<DocumentAsset> {
  cleanupExpiredDocumentSessions();
  const rawSource = doc.fileSource ?? createPdfSource(doc.uri);
  const rawUri = String(rawSource.uri || "").trim();
  const rawScheme = getUriScheme(rawUri);
  if (!rawUri) throw new Error("Document asset URI is empty");

  let finalUri = rawUri;
  let finalSourceKind: PdfSourceKind = rawSource.kind;
  let sizeBytes: number | undefined;

  if (Platform.OS !== "web") {
    await persistMaterializeBreadcrumb("viewer_materialize_start", {
      screen: doc.originModule,
      documentType: doc.documentType,
      originModule: doc.originModule,
      sourceKind: rawSource.kind,
      uri: rawUri,
      fileName: doc.fileName,
      entityId: doc.entityId,
    });
    if (rawSource.kind === "blob") {
      await persistMaterializeBreadcrumb("viewer_materialize_error", {
        screen: doc.originModule,
        documentType: doc.documentType,
        originModule: doc.originModule,
        sourceKind: rawSource.kind,
        uri: rawUri,
        fileName: doc.fileName,
        entityId: doc.entityId,
        errorMessage: "Mobile preview cannot use blob/data URI; expected a local PDF file",
      });
      throw new Error("Mobile preview cannot use blob/data URI; expected a local PDF file");
    }
    try {
      const materialized = await ensureLocalPdfUri(rawSource, doc.fileName);
      finalUri = materialized.uri;
      finalSourceKind = materialized.sourceKind;
      sizeBytes = materialized.sizeBytes;

      if (getUriScheme(finalUri) !== "file") {
        throw new Error("Mobile preview session requires a local file:// PDF asset");
      }

      const finalInfo = await getFileInfo(finalUri);
      if (!finalInfo?.exists) {
        logMaterializeStage("pdf_session_asset_exists_no", {
          uri: finalUri,
          exists: false,
          size: getFileSize(finalInfo),
          sourceKind: "local-file",
          fileName: doc.fileName,
          documentType: doc.documentType,
          originModule: doc.originModule,
        });
        throw new Error("Mobile preview local PDF asset is missing");
      }
      logMaterializeStage("pdf_session_asset_exists_yes", {
        uri: finalUri,
        exists: true,
        size: getFileSize(finalInfo),
        sourceKind: "local-file",
        fileName: doc.fileName,
        documentType: doc.documentType,
        originModule: doc.originModule,
      });
      await persistMaterializeBreadcrumb("viewer_materialize_success", {
        screen: doc.originModule,
        documentType: doc.documentType,
        originModule: doc.originModule,
        sourceKind: materialized.sourceKind,
        uri: finalUri,
        fileName: doc.fileName,
        entityId: doc.entityId,
        fileExists: true,
        fileSizeBytes: getFileSize(finalInfo),
      });
    } catch (error) {
      await persistMaterializeBreadcrumb("viewer_materialize_error", {
        screen: doc.originModule,
        documentType: doc.documentType,
        originModule: doc.originModule,
        sourceKind: rawSource.kind,
        uri: finalUri || rawUri,
        fileName: doc.fileName,
        entityId: doc.entityId,
        fileSizeBytes: sizeBytes,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  const assetId = makeId("asset");
  const asset: DocumentAsset = {
    assetId,
    uri: finalUri,
    fileSource: {
      kind: finalSourceKind,
      uri: finalUri,
    },
    sourceKind: finalSourceKind,
    fileName: doc.fileName,
    title: doc.title,
    mimeType: doc.mimeType,
    documentType: doc.documentType,
    originModule: doc.originModule,
    source: doc.source,
    createdAt: doc.createdAt || nowIso(),
    entityId: doc.entityId,
    sizeBytes,
  };
  assets.set(assetId, asset);
  logMaterializeStage("pdf_session_asset_written", {
    uri: asset.uri,
    exists: typeof asset.sizeBytes === "number" ? true : undefined,
    size: asset.sizeBytes,
    sourceKind: asset.sourceKind,
    fileName: asset.fileName,
    documentType: asset.documentType,
    originModule: asset.originModule,
  });
  if (__DEV__) console.info("[pdf-document-sessions] materialized_asset", {
    platform: Platform.OS,
    documentType: asset.documentType,
    originModule: asset.originModule,
    source: asset.source,
    sourceKind: asset.sourceKind,
    rawUri,
    rawScheme,
    finalUri: asset.uri,
    finalScheme: getUriScheme(asset.uri),
    fileName: asset.fileName,
    exists: typeof asset.sizeBytes === "number" ? true : undefined,
    sizeBytes: asset.sizeBytes,
  });
  return asset;
}

export function createDocumentSession(asset: DocumentAsset, status: DocumentSessionStatus = "ready"): DocumentSession {
  cleanupExpiredDocumentSessions();
  const sessionId = makeId("session");
  const now = nowIso();
  const session: DocumentSession = {
    sessionId,
    assetId: asset.assetId,
    status,
    createdAt: now,
    lastAccessAt: now,
  };
  sessions.set(sessionId, session);
  return session;
}

export function createInMemoryDocumentPreviewSession(
  doc: DocumentDescriptor,
): { session: DocumentSession; asset: DocumentAsset } {
  cleanupExpiredDocumentSessions();
  const assetId = makeId("asset");
  const asset: DocumentAsset = {
    assetId,
    uri: doc.uri,
    fileSource: doc.fileSource,
    sourceKind: doc.fileSource.kind,
    fileName: doc.fileName,
    title: doc.title,
    mimeType: doc.mimeType,
    documentType: doc.documentType,
    originModule: doc.originModule,
    source: doc.source,
    createdAt: doc.createdAt || nowIso(),
    entityId: doc.entityId,
  };
  assets.set(assetId, asset);
  const session = createDocumentSession(asset, "ready");
  return { session, asset };
}

export async function createDocumentPreviewSession(doc: DocumentDescriptor): Promise<{ session: DocumentSession; asset: DocumentAsset }> {
  const asset = await materializePdfAsset(doc);
  const session = createDocumentSession(asset, "ready");
  return { session, asset };
}

export function getDocumentSession(sessionId: string): DocumentSession | null {
  cleanupExpiredDocumentSessions();
  const session = sessions.get(String(sessionId || "").trim());
  if (!session) return null;
  return { ...session };
}

export function getDocumentAsset(assetId: string): DocumentAsset | null {
  cleanupExpiredDocumentSessions();
  const asset = assets.get(String(assetId || "").trim());
  if (!asset) return null;
  return { ...asset };
}

export function getDocumentSessionSnapshot(sessionId: string): RegistrySnapshot {
  const session = getDocumentSession(sessionId);
  if (!session) return { session: null, asset: null };
  const asset = getDocumentAsset(session.assetId);
  return { session, asset };
}

export function touchDocumentSession(sessionId: string): void {
  const key = String(sessionId || "").trim();
  if (!key) return;
  const session = sessions.get(key);
  if (!session) return;
  session.lastAccessAt = nowIso();
  sessions.set(key, session);
  cleanupExpiredDocumentSessions();
}

export function failDocumentSession(sessionId: string, errorMessage: string): void {
  const key = String(sessionId || "").trim();
  if (!key) return;
  const session = sessions.get(key);
  if (!session) return;
  session.status = "error";
  session.errorMessage = errorMessage;
  session.lastAccessAt = nowIso();
  sessions.set(key, session);
}
