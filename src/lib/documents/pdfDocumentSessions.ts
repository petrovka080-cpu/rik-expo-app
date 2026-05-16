import { Platform } from "react-native";
import * as FileSystemModule from "expo-file-system/legacy";
import type { DocumentDescriptor } from "./pdfDocument";
import {
  createPdfSource,
  getUriScheme,
  type PdfSource,
  type PdfSourceKind,
} from "../pdfFileContract";
import { recordPdfCrashBreadcrumb } from "../pdf/pdfCrashBreadcrumbs";
import { createCancellableDelay } from "../async/mapWithConcurrencyLimit";
import {
  ensurePdfInstantCacheAsset,
  getPdfInstantCacheStatus,
} from "../pdf/pdfInstantCache";
import { redactSensitiveText } from "../security/redaction";
import type { FileInfo } from "expo-file-system/legacy";

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
    uri: payload.uri ? redactSensitiveText(payload.uri) : null,
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
): void {
  // PDF-PERF: materialization breadcrumbs are diagnostic only; AsyncStorage
  // writes must not sit on the mobile PDF open critical path.
  recordPdfCrashBreadcrumb({
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
      if (attempt > 1) await createCancellableDelay(100 * attempt).promise;
      const info = await FileSystemModule.getInfoAsync(uri);
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

const makeId = (prefix: string) => {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
};

function createAssetForLocalUri(
  doc: DocumentDescriptor,
  localUri: string,
  sizeBytes?: number,
): DocumentAsset {
  const assetId = makeId("asset");
  return {
    assetId,
    uri: localUri,
    fileSource: {
      kind: "local-file",
      uri: localUri,
    },
    sourceKind: "local-file",
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
}

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
    persistMaterializeBreadcrumb("viewer_materialize_start", {
      screen: doc.originModule,
      documentType: doc.documentType,
      originModule: doc.originModule,
      sourceKind: rawSource.kind,
      uri: rawUri,
      fileName: doc.fileName,
      entityId: doc.entityId,
    });
    if (rawSource.kind === "blob") {
      persistMaterializeBreadcrumb("viewer_materialize_error", {
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
      const materialized = await ensurePdfInstantCacheAsset({
        ...doc,
        uri: rawUri,
        fileSource: rawSource,
      });
      finalUri = materialized.localUri;
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
      persistMaterializeBreadcrumb("viewer_materialize_success", {
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
      persistMaterializeBreadcrumb("viewer_materialize_error", {
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
    rawUri: redactSensitiveText(rawUri),
    rawScheme,
    finalUri: redactSensitiveText(asset.uri),
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

export function createPreparingDocumentPreviewSession(
  doc: Pick<
    DocumentDescriptor,
    "documentType" | "originModule" | "fileName"
  > & Partial<Pick<DocumentDescriptor, "uri" | "fileSource">>,
): { session: DocumentSession; asset: null } {
  cleanupExpiredDocumentSessions();
  const pendingAssetId = makeId("pending_asset");
  const now = nowIso();
  const session: DocumentSession = {
    sessionId: makeId("session"),
    assetId: pendingAssetId,
    status: "preparing",
    createdAt: now,
    lastAccessAt: now,
  };
  sessions.set(session.sessionId, session);
  logMaterializeStage("pdf_session_preparing_created", {
    uri: doc.uri,
    sourceKind: doc.fileSource?.kind ?? "remote-url",
    fileName: doc.fileName,
    documentType: doc.documentType,
    originModule: doc.originModule,
  });
  return { session, asset: null };
}

export function completeDocumentPreviewSessionAsset(
  sessionId: string,
  asset: DocumentAsset,
): void {
  const key = String(sessionId || "").trim();
  const session = sessions.get(key);
  if (!session) return;
  assets.set(asset.assetId, asset);
  session.assetId = asset.assetId;
  session.status = "ready";
  session.errorMessage = undefined;
  session.lastAccessAt = nowIso();
  sessions.set(key, session);
}

export async function materializeDocumentPreviewSessionAsset(
  sessionId: string,
  doc: DocumentDescriptor,
): Promise<DocumentAsset> {
  try {
    const asset = await materializePdfAsset(doc);
    completeDocumentPreviewSessionAsset(sessionId, asset);
    return asset;
  } catch (error) {
    failDocumentSession(
      sessionId,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
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

export async function createInstantDocumentPreviewSession(
  doc: DocumentDescriptor,
): Promise<{
  session: DocumentSession;
  asset: DocumentAsset | null;
  materializationMode: "cache_hit" | "background_fetch" | "joined_inflight" | "web_ready";
}> {
  if (Platform.OS === "web") {
    const ready = await createDocumentPreviewSession(doc);
    return {
      ...ready,
      materializationMode: "web_ready",
    };
  }

  const cacheStatus = await getPdfInstantCacheStatus(doc);
  if (cacheStatus.status === "ready" && cacheStatus.localUri) {
    const asset = createAssetForLocalUri(doc, cacheStatus.localUri, cacheStatus.sizeBytes);
    assets.set(asset.assetId, asset);
    return {
      session: createDocumentSession(asset, "ready"),
      asset,
      materializationMode: "cache_hit",
    };
  }

  const preparing = createPreparingDocumentPreviewSession(doc);
  void materializeDocumentPreviewSessionAsset(preparing.session.sessionId, doc).catch(() => {
    // materializeDocumentPreviewSessionAsset already records the redacted session error.
  });
  return {
    ...preparing,
    materializationMode:
      cacheStatus.status === "fetching" ? "joined_inflight" : "background_fetch",
  };
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
