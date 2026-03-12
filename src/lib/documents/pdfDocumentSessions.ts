import { Platform } from "react-native";
import type { DocumentDescriptor } from "./pdfDocument";

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

const getUriScheme = (uri: string) => {
  const value = String(uri || "").trim();
  const match = value.match(/^([a-z0-9+.-]+):/i);
  return match?.[1]?.toLowerCase() || "";
};

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

export function materializePdfAsset(doc: DocumentDescriptor): DocumentAsset {
  cleanupExpiredDocumentSessions();
  const uri = String(doc.uri || "").trim();
  const scheme = getUriScheme(uri);
  if (!uri) throw new Error("Document asset URI is empty");
  if (Platform.OS !== "web" && scheme === "blob") {
    throw new Error("Mobile preview cannot use blob URI; expected file:// or https://");
  }
  const assetId = makeId("asset");
  const asset: DocumentAsset = {
    assetId,
    uri,
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

export function createDocumentPreviewSession(doc: DocumentDescriptor): { session: DocumentSession; asset: DocumentAsset } {
  const asset = materializePdfAsset(doc);
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
