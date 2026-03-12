import { Platform } from "react-native";
import * as FileSystemModule from "expo-file-system";
import type { DocumentDescriptor } from "./pdfDocument";
import { normalizePdfFileName } from "./pdfDocument";
import { getFileSystemPaths } from "../fileSystemPaths";
import { getUriScheme, hashString32, isHttpUri, normalizeLocalFileUri } from "../pdfFileContract";
const FileSystemCompat = FileSystemModule as any;

export type DocumentAsset = {
  assetId: string;
  uri: string;
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

const isFileUri = (uri: string) => /^file:\/\//i.test(String(uri || "").trim());

function logMaterializeStage(
  stage: string,
  payload: {
    uri?: string | null;
    exists?: boolean;
    size?: number;
    sourceKind: "remote" | "local";
    fileName?: string;
    documentType?: string;
    originModule?: string;
  },
) {
  console.info(`[pdf-document-sessions] ${stage}`, {
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

async function getFileInfo(uri: string) {
  if (!FileSystemCompat?.getInfoAsync) return null;
  try {
    return await FileSystemCompat.getInfoAsync(uri);
  } catch {
    return null;
  }
}

async function ensureLocalPdfUri(uri: string, fileName: string): Promise<{ uri: string; sizeBytes?: number }> {
  if (!FileSystemCompat) {
    throw new Error("Mobile PDF materialization requires expo-file-system");
  }

  const normalizedName = normalizePdfFileName(fileName, "document");
  const paths = getFileSystemPaths();
  const cacheDir = paths.cacheDir;
  const hash = hashString32(uri);
  const targetName = `pdf_${hash}_${sanitizeStem(normalizedName, "document.pdf")}`;
  const targetUri = `${cacheDir}${targetName}`;
  logMaterializeStage("pdf_source_received", {
    uri,
    sourceKind: isHttpUri(uri) ? "remote" : "local",
    fileName,
  });

  if (isHttpUri(uri)) {
    logMaterializeStage("pdf_source_classified_remote", {
      uri,
      sourceKind: "remote",
      fileName,
    });
    logMaterializeStage("pdf_download_started", {
      uri: targetUri,
      sourceKind: "remote",
      fileName,
    });
    const downloaded = await FileSystemCompat.downloadAsync(uri, targetUri);
    const downloadedUri = normalizeLocalFileUri(String(downloaded?.uri || targetUri));
    logMaterializeStage("pdf_download_done", {
      uri: downloadedUri,
      sourceKind: "local",
      fileName,
    });
    const info = await getFileInfo(downloadedUri);
    const exists = Boolean(info?.exists);
    logMaterializeStage(exists ? "pdf_download_exists_yes" : "pdf_download_exists_no", {
      uri: downloadedUri,
      exists,
      size: Number.isFinite(Number(info?.size)) ? Number(info.size) : undefined,
      sourceKind: "local",
      fileName,
    });
    if (!exists) throw new Error("Downloaded PDF file is missing after materialization");
    return {
      uri: downloadedUri,
      sizeBytes: Number.isFinite(Number(info.size)) ? Number(info.size) : undefined,
    };
  }

  logMaterializeStage("pdf_source_classified_local", {
    uri,
    sourceKind: "local",
    fileName,
  });
  const normalizedSourceUri = normalizeLocalFileUri(uri);
  logMaterializeStage("pdf_local_uri_normalized", {
    uri: normalizedSourceUri,
    sourceKind: "local",
    fileName,
  });

  const info = await getFileInfo(normalizedSourceUri);
  const sourceExists = Boolean(info?.exists);
  logMaterializeStage(sourceExists ? "pdf_materialize_exists_yes" : "pdf_materialize_exists_no", {
    uri: normalizedSourceUri,
    exists: sourceExists,
    size: Number.isFinite(Number(info?.size)) ? Number(info.size) : undefined,
    sourceKind: "local",
    fileName,
  });
  if (!sourceExists) {
    throw new Error(`Local PDF file does not exist: ${normalizedSourceUri.slice(-100)}`);
  }

  const sourceUri = normalizedSourceUri;
  const keepAsIs =
    isFileUri(sourceUri) &&
    normalizedName.toLowerCase().endsWith(".pdf") &&
    sourceUri.toLowerCase().endsWith(".pdf");

  if (keepAsIs) {
    return {
      uri: sourceUri,
      sizeBytes: Number.isFinite(Number(info.size)) ? Number(info.size) : undefined,
    };
  }

  logMaterializeStage("pdf_materialize_started", {
    uri: sourceUri,
    sourceKind: "local",
    fileName,
  });
  await FileSystemCompat.copyAsync({ from: sourceUri, to: targetUri });
  const copiedInfo = await getFileInfo(targetUri);
  const copiedExists = Boolean(copiedInfo?.exists);
  logMaterializeStage("pdf_materialize_done", {
    uri: targetUri,
    sourceKind: "local",
    fileName,
  });
  logMaterializeStage(copiedExists ? "pdf_materialize_exists_yes" : "pdf_materialize_exists_no", {
    uri: targetUri,
    exists: copiedExists,
    size: Number.isFinite(Number(copiedInfo?.size)) ? Number(copiedInfo?.size) : undefined,
    sourceKind: "local",
    fileName,
  });
  if (!copiedExists) throw new Error("Materialized local PDF file is missing");
  return {
    uri: targetUri,
    sizeBytes: Number.isFinite(Number(copiedInfo.size)) ? Number(copiedInfo.size) : undefined,
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
  const rawUri = String(doc.uri || "").trim();
  const rawScheme = getUriScheme(rawUri);
  if (!rawUri) throw new Error("Document asset URI is empty");

  let finalUri = rawUri;
  let sizeBytes: number | undefined;

  if (Platform.OS !== "web") {
    if (rawScheme === "blob" || rawScheme === "data") {
      throw new Error("Mobile preview cannot use blob/data URI; expected a local PDF file");
    }

    const materialized = await ensureLocalPdfUri(rawUri, doc.fileName);
    finalUri = materialized.uri;
    sizeBytes = materialized.sizeBytes;

    if (getUriScheme(finalUri) !== "file") {
      throw new Error("Mobile preview session requires a local file:// PDF asset");
    }

    const finalInfo = await getFileInfo(finalUri);
    if (!finalInfo?.exists) {
      logMaterializeStage("pdf_session_asset_exists_no", {
        uri: finalUri,
        exists: false,
        size: Number.isFinite(Number(finalInfo?.size)) ? Number(finalInfo?.size) : undefined,
        sourceKind: "local",
        fileName: doc.fileName,
        documentType: doc.documentType,
        originModule: doc.originModule,
      });
      throw new Error("Mobile preview local PDF asset is missing");
    }
    logMaterializeStage("pdf_session_asset_exists_yes", {
      uri: finalUri,
      exists: true,
      size: Number.isFinite(Number(finalInfo?.size)) ? Number(finalInfo?.size) : undefined,
      sourceKind: "local",
      fileName: doc.fileName,
      documentType: doc.documentType,
      originModule: doc.originModule,
    });
  }

  const assetId = makeId("asset");
  const asset: DocumentAsset = {
    assetId,
    uri: finalUri,
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
    sourceKind: "local",
    fileName: asset.fileName,
    documentType: asset.documentType,
    originModule: asset.originModule,
  });
  console.info("[pdf-document-sessions] materialized_asset", {
    platform: Platform.OS,
    documentType: asset.documentType,
    originModule: asset.originModule,
    source: asset.source,
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
