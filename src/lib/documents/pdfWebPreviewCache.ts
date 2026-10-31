import { createPdfDocumentDescriptor,canonicalPdfRecoveryReferenceFromDescriptor,canonicalPdfContentIdentityMatches,canonicalPdfRecoveryReferencesMatch,parseCanonicalPdfRecoveryReference,type DocumentDescriptor,type CanonicalPdfRecoveryReference } from "./pdfDocument";
import {
  getDocumentSessionSnapshot,
  restoreInMemoryDocumentPreviewSession,
  discardDocumentSession,
  type DocumentAsset,
  type DocumentSession,
} from "./pdfDocumentSessions";
import {
  buildWebPdfPreviewCacheKey,
  buildWebPdfPreviewPrincipalKey,
  canonicalWebPdfPreviewCacheIdentity,
  normalizeWebPdfPreviewCacheIdentity,
  type WebPdfPreviewCacheIdentity,
} from "./pdfWebPreviewIdentity";

type PersistedPdfAsset = {
  cacheKey: string;
  identityCanonical: string;
  principalKey: string;
  blob: Blob;
  sizeBytes: number;
  createdAt: string;
  lastAccessAt: string;
};

type PersistedPdfSession = {
  sessionId: string;
  cacheKey: string;
  identityCanonical: string;
  principalKey: string;
  fileName: string;
  title: string;
  documentType: DocumentAsset["documentType"];
  originModule: DocumentAsset["originModule"];
  source: DocumentAsset["source"];
  entityId?: string;
  assetCreatedAt: string;
  sessionCreatedAt: string;
  lastAccessAt: string;
  namespace?:string;
  contentIdentity?:DocumentDescriptor["contentIdentity"];
};

const DB_NAME = "rik-pdf-preview-cache";
const DB_VERSION = 2;
const ASSET_STORE = "assets";
const SESSION_STORE = "sessions";
const SESSION_TTL_MS = 20 * 60 * 1000;
const MAX_PERSISTED_SESSIONS = 40;
const MAX_PERSISTED_BYTES = 64 * 1024 * 1024;
const ACTIVE_PRINCIPAL_STORAGE_KEY = "rik.pdf-preview.active-principal.v2";

let databasePromise: Promise<IDBDatabase> | null = null;
let activePrincipalKey: string | null = null;
let principalEpoch = 0;

function canUsePersistentWebCache(): boolean {
  return (
    typeof document !== "undefined"
    && typeof indexedDB !== "undefined"
    && typeof Blob !== "undefined"
    && typeof URL !== "undefined"
    && typeof URL.createObjectURL === "function"
  );
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("PDF preview cache request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("PDF preview cache transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("PDF preview cache transaction was aborted."));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        database.createObjectStore(ASSET_STORE, { keyPath: "cacheKey" });
      }
      if (!database.objectStoreNames.contains(SESSION_STORE)) {
        database.createObjectStore(SESSION_STORE, { keyPath: "sessionId" });
      }
      if ((event as IDBVersionChangeEvent).oldVersion < 2) {
        request.transaction?.objectStore(ASSET_STORE).clear();
        request.transaction?.objectStore(SESSION_STORE).clear();
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("PDF preview cache could not be opened."));
    };
  });
  return databasePromise;
}

function readBrowserActivePrincipal(): string | null {
  if (activePrincipalKey) return activePrincipalKey;
  try {
    activePrincipalKey = globalThis.sessionStorage?.getItem(ACTIVE_PRINCIPAL_STORAGE_KEY) ?? null;
  } catch {
    activePrincipalKey = null;
  }
  return activePrincipalKey;
}

function activatePrincipal(identity: WebPdfPreviewCacheIdentity): string {
  const principalKey = buildWebPdfPreviewPrincipalKey(identity);
  const current = readBrowserActivePrincipal();
  if (current && current !== principalKey) {
    throw new Error("PDF preview cache principal boundary changed without lifecycle reset.");
  }
  activePrincipalKey = principalKey;
  try {
    globalThis.sessionStorage?.setItem(ACTIVE_PRINCIPAL_STORAGE_KEY, principalKey);
  } catch {
    // In private/restricted mode the in-memory boundary remains fail-closed.
  }
  return principalKey;
}

function isExpired(lastAccessAt: string): boolean {
  const timestamp = Date.parse(lastAccessAt);
  return !Number.isFinite(timestamp) || Date.now() - timestamp > SESSION_TTL_MS;
}

async function readAsset(
  database: IDBDatabase,
  cacheKey: string,
): Promise<PersistedPdfAsset | undefined> {
  const transaction = database.transaction(ASSET_STORE, "readonly");
  return requestResult(
    transaction.objectStore(ASSET_STORE).get(cacheKey) as IDBRequest<
      PersistedPdfAsset | undefined
    >,
  );
}

async function fetchPdfBlob(uri: string): Promise<Blob> {
  if (typeof fetch !== "function") {
    throw new Error("PDF preview cache cannot read the browser PDF blob.");
  }
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`PDF preview cache read failed (${response.status}).`);
  }
  const blob = await response.blob();
  if (blob.type && blob.type !== "application/pdf") {
    throw new Error("PDF preview cache rejected a non-PDF asset.");
  }
  return blob.type === "application/pdf"
    ? blob
    : new Blob([blob], { type: "application/pdf" });
}

async function prunePersistentSessions(database: IDBDatabase): Promise<void> {
  const readTransaction = database.transaction([SESSION_STORE, ASSET_STORE], "readonly");
  const sessions = await requestResult(
    readTransaction.objectStore(SESSION_STORE).getAll() as IDBRequest<
      PersistedPdfSession[]
    >,
  );
  const assets = await requestResult(
    readTransaction.objectStore(ASSET_STORE).getAll() as IDBRequest<PersistedPdfAsset[]>,
  );
  const assetByKey = new Map(assets.map((asset) => [asset.cacheKey, asset]));
  const sorted = sessions.filter((session) => !isExpired(session.lastAccessAt)).sort(
    (left, right) =>
      Date.parse(right.lastAccessAt) - Date.parse(left.lastAccessAt),
  );
  const keptSessionIds = new Set<string>();
  const keptAssetKeys = new Set<string>();
  let keptBytes = 0;
  for (const session of sorted) {
    if (keptSessionIds.size >= MAX_PERSISTED_SESSIONS) continue;
    const asset = assetByKey.get(session.cacheKey);
    if (!asset) continue;
    const additionalBytes = keptAssetKeys.has(asset.cacheKey) ? 0 : asset.sizeBytes;
    if (keptBytes + additionalBytes > MAX_PERSISTED_BYTES) continue;
    keptSessionIds.add(session.sessionId);
    keptAssetKeys.add(asset.cacheKey);
    keptBytes += additionalBytes;
  }
  const deleteTransaction = database.transaction([SESSION_STORE, ASSET_STORE], "readwrite");
  const sessionStore = deleteTransaction.objectStore(SESSION_STORE);
  const assetStore = deleteTransaction.objectStore(ASSET_STORE);
  for (const session of sessions) {
    if (!keptSessionIds.has(session.sessionId)) sessionStore.delete(session.sessionId);
  }
  for (const asset of assets) {
    if (!keptAssetKeys.has(asset.cacheKey)) assetStore.delete(asset.cacheKey);
  }
  await transactionDone(deleteTransaction);
}

export async function persistWebPdfPreviewSession(input: {
  session: DocumentSession;
  asset: DocumentAsset;
  namespace: string;
  identity: WebPdfPreviewCacheIdentity;
  assertCurrentPrincipal?: () => Promise<void>;
}): Promise<boolean> {
  if (!canUsePersistentWebCache()) return false;
  const epoch = principalEpoch;
  const identity = normalizeWebPdfPreviewCacheIdentity(input.identity);
  const identityCanonical = canonicalWebPdfPreviewCacheIdentity(identity);
  const principalKey = activatePrincipal(identity);
  const cacheKey = buildWebPdfPreviewCacheKey({
    namespace: input.namespace,
    identity,
  });

  const database = await openDatabase();
  let persistedAsset = await readAsset(database, cacheKey);
  const now = new Date().toISOString();
  if (!persistedAsset) {
    const blob = await fetchPdfBlob(input.asset.uri);
    persistedAsset = {
      cacheKey,
      identityCanonical,
      principalKey,
      blob,
      sizeBytes: blob.size,
      createdAt: now,
      lastAccessAt: now,
    };
  } else {
    if (
      persistedAsset.identityCanonical !== identityCanonical
      || persistedAsset.principalKey !== principalKey
    ) {
      throw new Error("PDF preview cache identity collision was rejected.");
    }
    persistedAsset = {
      ...persistedAsset,
      lastAccessAt: now,
    };
  }

  await input.assertCurrentPrincipal?.();
  if (epoch !== principalEpoch || readBrowserActivePrincipal() !== principalKey) {
    throw Object.assign(new Error("PDF cache principal changed during persistence"), { name: "AbortError" });
  }

  const persistedSession: PersistedPdfSession = {
    sessionId: input.session.sessionId,
    namespace:input.namespace,
    contentIdentity:input.asset.contentIdentity?{...input.asset.contentIdentity}:undefined,
    cacheKey,
    identityCanonical,
    principalKey,
    fileName: input.asset.fileName,
    title: input.asset.title,
    documentType: input.asset.documentType,
    originModule: input.asset.originModule,
    source: input.asset.source,
    entityId: input.asset.entityId,
    assetCreatedAt: input.asset.createdAt,
    sessionCreatedAt: input.session.createdAt,
    lastAccessAt: now,
  };
  const transaction = database.transaction(
    [ASSET_STORE, SESSION_STORE],
    "readwrite",
  );
  transaction.objectStore(ASSET_STORE).put(persistedAsset);
  transaction.objectStore(SESSION_STORE).put(persistedSession);
  await transactionDone(transaction);
  if (epoch !== principalEpoch) {
    throw Object.assign(new Error("PDF cache principal changed during persistence"), { name: "AbortError" });
  }
  void prunePersistentSessions(database).catch(() => {
    // Cache pruning is best-effort and never blocks a valid PDF open.
  });
  return true;
}

export type WebPdfPreviewRestoreReason =
  |'STORAGE_UNAVAILABLE'|'MISSING_SESSION'|'EXPIRED_SESSION'|'MISSING_ASSET'
  |'PRINCIPAL_UNAVAILABLE'|'PRINCIPAL_MISMATCH'|'IDENTITY_MISMATCH'
  |'CANONICAL_AUTHORIZATION_REQUIRED'|'AUTHORIZATION_CHANGED'|'FILE_SHA_MISMATCH'|'REFERENCE_MISMATCH';
export type WebPdfPreviewRestoreResult =
  |{restored:true}
  |{restored:false;reason:WebPdfPreviewRestoreReason;canonicalRecovery?:CanonicalPdfRecoveryReference|null};
export type CanonicalWebPdfRestoreAuthorization=Readonly<{
  identity:WebPdfPreviewCacheIdentity;
  contentIdentity:NonNullable<DocumentDescriptor['contentIdentity']>;
  assertCurrentPrincipal:()=>Promise<void>;
}>;

/** Legacy cache identities contain only a locator, never current authority. */
function persistedCanonicalRecovery(session:PersistedPdfSession):CanonicalPdfRecoveryReference|null{
  const typed=canonicalPdfRecoveryReferenceFromDescriptor({documentType:session.documentType,source:session.source,contentIdentity:session.contentIdentity});
  if(typed)return typed;
  try{
    const values:unknown=JSON.parse(session.identityCanonical);
    if(!Array.isArray(values)||values[1]!=='canonical-estimate'||typeof values[2]!=='string'||typeof values[6]!=='string')return null;
    const snapshot:unknown=JSON.parse(values[6]);
    if(!Array.isArray(snapshot)||snapshot.length!==5)return null;
    return parseCanonicalPdfRecoveryReference({contractVersion:'canonical-pdf-recovery/v1',revisionId:values[5],releaseId:snapshot[0],
      definitionVersionId:snapshot[1],checksumSha256:snapshot[2],issuancePurpose:snapshot[3],documentProfile:'professional_v1',
      organizationId:values[2].startsWith('consumer:')?null:values[2]});
  }catch{return null;}
}

export async function restoreWebPdfPreviewSessionDetailed(
  sessionIdInput:string,
  authorization?:CanonicalWebPdfRestoreAuthorization,
):Promise<WebPdfPreviewRestoreResult>{
  const unavailable=(reason:WebPdfPreviewRestoreReason,canonicalRecovery?:CanonicalPdfRecoveryReference|null):WebPdfPreviewRestoreResult=>({restored:false,reason,...(canonicalRecovery?{canonicalRecovery}:{})});
  const sessionId=String(sessionIdInput||'').trim();
  if(!sessionId)return unavailable('MISSING_SESSION');
  const epoch=principalEpoch;
  const memory=getDocumentSessionSnapshot(sessionId);
  if(memory.session&&memory.asset){
    const canonical=canonicalPdfRecoveryReferenceFromDescriptor(memory.asset);
    if(authorization||canonical||memory.asset.contentIdentity?.issuancePurpose){
      if(authorization&&!canonical)return unavailable('REFERENCE_MISMATCH');
      if(!authorization)return unavailable('CANONICAL_AUTHORIZATION_REQUIRED',canonical);
      if(memory.asset.contentIdentity?.ownerUserId&&memory.asset.contentIdentity.ownerUserId!==authorization.contentIdentity.ownerUserId)return unavailable('REFERENCE_MISMATCH',canonical);
      if(!canonicalPdfContentIdentityMatches(memory.asset.contentIdentity,authorization.contentIdentity))return unavailable('IDENTITY_MISMATCH',canonical);
      if(memory.asset.fileSource.kind==='remote-url')return unavailable('MISSING_ASSET',canonical); // Signed URLs must be renewed from the fresh artifact.
      try{await authorization.assertCurrentPrincipal();}catch{return unavailable('AUTHORIZATION_CHANGED',canonical);}
      if(epoch!==principalEpoch)return unavailable('AUTHORIZATION_CHANGED',canonical);
    }
    return {restored:true};
  }
  if(!canUsePersistentWebCache())return unavailable('STORAGE_UNAVAILABLE');
  let objectUrl:string|undefined,committed=false,validating=false;
  let recovery:CanonicalPdfRecoveryReference|null=null;
  try{
    const database=await openDatabase();
    const readTransaction=database.transaction(SESSION_STORE,'readonly');
    const persistedSession=await requestResult(readTransaction.objectStore(SESSION_STORE).get(sessionId) as IDBRequest<PersistedPdfSession|undefined>);
    if(!persistedSession)return unavailable('MISSING_SESSION');
    recovery=persistedCanonicalRecovery(persistedSession);
    if(authorization&&!recovery)return unavailable('REFERENCE_MISMATCH');
    if(authorization&&recovery&&!canonicalPdfRecoveryReferencesMatch(recovery,canonicalPdfRecoveryReferenceFromDescriptor({documentType:'request',source:'generated',contentIdentity:authorization.contentIdentity})))
      return unavailable('REFERENCE_MISMATCH',recovery);
    if(isExpired(persistedSession.lastAccessAt))return unavailable('EXPIRED_SESSION',recovery);
    const canonical=Boolean(authorization)||persistedSession.namespace==='canonical-professional-pdf'
      ||persistedSession.cacheKey.split(':')[1]===encodeURIComponent('canonical-professional-pdf')||recovery!==null;
    if(canonical&&!authorization)return unavailable('CANONICAL_AUTHORIZATION_REQUIRED',recovery);
    const activePrincipal=readBrowserActivePrincipal();
    if(!activePrincipal)return unavailable('PRINCIPAL_UNAVAILABLE',recovery);
    if(persistedSession.principalKey!==activePrincipal)return unavailable('PRINCIPAL_MISMATCH',recovery);
    if(canonical&&authorization){
      if(persistedSession.contentIdentity?.ownerUserId&&persistedSession.contentIdentity.ownerUserId!==authorization.contentIdentity.ownerUserId)
        return unavailable('REFERENCE_MISMATCH',recovery);
      const expectedReference=canonicalPdfRecoveryReferenceFromDescriptor({documentType:'request',source:'generated',contentIdentity:authorization.contentIdentity});
      if(recovery&&!canonicalPdfRecoveryReferencesMatch(recovery,expectedReference))return unavailable('REFERENCE_MISMATCH',recovery);
      const expected=canonicalWebPdfPreviewCacheIdentity(authorization.identity);
      if(persistedSession.identityCanonical!==expected
        ||buildWebPdfPreviewPrincipalKey(authorization.identity)!==activePrincipal
        ||persistedSession.contentIdentity&&!canonicalPdfContentIdentityMatches(persistedSession.contentIdentity,authorization.contentIdentity))
        return unavailable('IDENTITY_MISMATCH',recovery);
    }
    const persistedAsset=await readAsset(database,persistedSession.cacheKey);
    if(!persistedAsset?.blob)return unavailable('MISSING_ASSET',recovery);
    if(persistedAsset.principalKey!==activePrincipal||persistedAsset.identityCanonical!==persistedSession.identityCanonical)
      return unavailable('IDENTITY_MISMATCH',recovery);
    if(canonical&&authorization){
      // A current metadata match does not excuse damaged cached file bytes.
      if(!globalThis.crypto?.subtle||typeof persistedAsset.blob.arrayBuffer!=='function')return unavailable('STORAGE_UNAVAILABLE',recovery);
      const digest=await globalThis.crypto.subtle.digest('SHA-256',await persistedAsset.blob.arrayBuffer());
      const hex=Array.from(new Uint8Array(digest)).map(value=>value.toString(16).padStart(2,'0')).join('');
      validating=true;await authorization.assertCurrentPrincipal();validating=false;
      if(epoch!==principalEpoch||readBrowserActivePrincipal()!==activePrincipal)return unavailable('AUTHORIZATION_CHANGED',recovery);
      if(hex.toLowerCase()!==authorization.contentIdentity.artifactSha256?.toLowerCase()){
        // Drop only the damaged disposable asset, so the existing persistence
        // path can fetch the newly authorized exact bytes instead of reusing it.
        try{const invalidation=database.transaction(ASSET_STORE,'readwrite');invalidation.objectStore(ASSET_STORE).delete(persistedSession.cacheKey);await transactionDone(invalidation);}catch{}
        return unavailable('FILE_SHA_MISMATCH',recovery);
      }
    }
    if(epoch!==principalEpoch||readBrowserActivePrincipal()!==activePrincipal)return unavailable('AUTHORIZATION_CHANGED',recovery);
    try{
      const now=new Date().toISOString(),writeTransaction=database.transaction([ASSET_STORE,SESSION_STORE],'readwrite');
      writeTransaction.objectStore(ASSET_STORE).put({...persistedAsset,lastAccessAt:now} satisfies PersistedPdfAsset);
      writeTransaction.objectStore(SESSION_STORE).put({...persistedSession,lastAccessAt:now} satisfies PersistedPdfSession);
      await transactionDone(writeTransaction);
    }catch{/* Cache timestamps grant no access. Fresh authorization below remains mandatory. */}
    if(canonical&&authorization){validating=true;await authorization.assertCurrentPrincipal();validating=false;}
    if(epoch!==principalEpoch||readBrowserActivePrincipal()!==activePrincipal){
      return unavailable('AUTHORIZATION_CHANGED',recovery);
    }
    objectUrl=URL.createObjectURL(persistedAsset.blob);
    restoreInMemoryDocumentPreviewSession({sessionId,sessionCreatedAt:persistedSession.sessionCreatedAt,
      doc:createPdfDocumentDescriptor({uri:objectUrl,objectUrlOwnership:'document-session',title:persistedSession.title,fileName:persistedSession.fileName,
        documentType:persistedSession.documentType,originModule:persistedSession.originModule,source:persistedSession.source,
        createdAt:persistedSession.assetCreatedAt,entityId:persistedSession.entityId,
        contentIdentity:canonical?{...authorization!.contentIdentity}:persistedSession.contentIdentity})});
    committed=true;
    return {restored:true};
  }catch{
    if(committed)discardDocumentSession(sessionId);
    else if(objectUrl)URL.revokeObjectURL(objectUrl);
    return unavailable(validating?'AUTHORIZATION_CHANGED':'STORAGE_UNAVAILABLE',recovery);
  }
}

/** Generic compatibility entry; canonical bytes additionally require fresh authority. */
export async function restoreWebPdfPreviewSession(sessionIdInput:string):Promise<boolean>{
  return (await restoreWebPdfPreviewSessionDetailed(sessionIdInput)).restored;
}

export async function clearWebPdfPreviewCacheForSessionBoundary(): Promise<void> {
  principalEpoch += 1;
  activePrincipalKey = null;
  try {
    globalThis.sessionStorage?.removeItem(ACTIVE_PRINCIPAL_STORAGE_KEY);
  } catch {
    // Restricted storage is already inaccessible.
  }
  if (databasePromise) {
    const database = await databasePromise.catch(() => null);
    database?.close();
    databasePromise = null;
  }
  if (typeof indexedDB === "undefined") return;
  await requestResult(indexedDB.deleteDatabase(DB_NAME)).catch(() => undefined);
}

export async function __resetWebPdfPreviewCacheForTests(): Promise<void> {
  await clearWebPdfPreviewCacheForSessionBoundary();
}
