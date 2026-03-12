import { Platform } from "react-native";
import type { DocumentDescriptor } from "./pdfDocument";
import { normalizePdfFileName } from "./pdfDocument";

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
let FileSystem: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystem = Platform.OS === "web" ? null : require("expo-file-system/legacy");
} catch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    FileSystem = require("expo-file-system");
  } catch {
    FileSystem = null;
  }
}

const nowIso = () => new Date().toISOString();

const getUriScheme = (uri: string) => {
  const value = String(uri || "").trim();
  const match = value.match(/^([a-z0-9+.-]+):/i);
  return match?.[1]?.toLowerCase() || "";
};

const sanitizeStem = (value: string, fallback: string) =>
  (String(value || "").trim() || fallback)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || fallback;

const isHttpUri = (uri: string) => /^https?:\/\//i.test(String(uri || "").trim());
const isFileUri = (uri: string) => /^file:\/\//i.test(String(uri || "").trim());

async function getFileInfo(uri: string) {
  if (!FileSystem?.getInfoAsync) return null;
  try {
    return await FileSystem.getInfoAsync(uri);
  } catch {
    return null;
  }
}

async function ensureLocalPdfUri(uri: string, fileName: string): Promise<{ uri: string; sizeBytes?: number }> {
  if (!FileSystem) {
    throw new Error("Mobile PDF materialization requires expo-file-system");
  }

  const normalizedName = normalizePdfFileName(fileName, "document");
  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!cacheDir) throw new Error("FileSystem cacheDirectory is unavailable");
  const targetName = `${Date.now()}_${sanitizeStem(normalizedName, "document.pdf")}`;
  const targetUri = `${cacheDir}${targetName}`;

  if (isHttpUri(uri)) {
    const downloaded = await FileSystem.downloadAsync(uri, targetUri);
    const downloadedUri = String(downloaded?.uri || targetUri);
    const info = await getFileInfo(downloadedUri);
    if (!info?.exists) throw new Error("Downloaded PDF file is missing after materialization");
    return {
      uri: downloadedUri,
      sizeBytes: Number.isFinite(Number(info.size)) ? Number(info.size) : undefined,
    };
  }

  const info = await getFileInfo(uri);
  if (!info?.exists) {
    throw new Error("Local PDF file does not exist");
  }

  const sourceUri = String(uri || "").trim();
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

  await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
  const copiedInfo = await getFileInfo(targetUri);
  if (!copiedInfo?.exists) throw new Error("Materialized local PDF file is missing");
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
      throw new Error("Mobile preview local PDF asset is missing");
    }
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
