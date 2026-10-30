import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { OfflineStorageAdapter } from "../offline/offlineStorage";
import { requireExplicitRequestCompany } from "./requestCompanyScope";

export type RequestCreationIntent = Readonly<{
  version: 1; id: string; scope: string; actorId: string; companyId: string;
  /** Exact normalized RPC arguments, excluding this intent ID. */
  payload: string;
}>;
// Never use the best-effort offline adapter: creation requires durable readback.
const strictStorage: OfflineStorageAdapter = {
  getItem: key => Platform.OS === "web" ? Promise.resolve(globalThis.localStorage.getItem(key)) : AsyncStorage.getItem(key),
  setItem: (key, value) => Platform.OS === "web" ? Promise.resolve(globalThis.localStorage.setItem(key, value)) : AsyncStorage.setItem(key, value),
  removeItem: key => Platform.OS === "web" ? Promise.resolve(globalThis.localStorage.removeItem(key)) : AsyncStorage.removeItem(key),
};

export class RequestCreationOwnershipError extends Error {
  readonly recoverable = true;
  constructor(readonly code: "REQUEST_CREATION_WEB_LOCKS_REQUIRED" | "REQUEST_CREATION_OWNERSHIP_TIMEOUT" | "REQUEST_CREATION_OWNERSHIP_UNAVAILABLE") {
    super(code);
    this.name = "RequestCreationOwnershipError";
  }
}
type CreationWebLocks = {
  request<T>(name: string, options: { mode: "exclusive"; signal: AbortSignal }, work: () => Promise<T>): Promise<T>;
};
const nativeOwners = new WeakMap<OfflineStorageAdapter, Map<string, Promise<void>>>();

// localStorage read/write/readback is NOT compare-and-swap. All browser contexts
// must use the same origin/partition's Web Locks owner. Unsupported/insecure
// origins fail closed, retaining drafts and intents; no lease/unlocked fallback.
// Locks cover storage only, never RPC/company selection work.
async function withStorageOwnership<T>(key: string, storage: OfflineStorageAdapter, work: () => Promise<T>): Promise<T> {
  if (Platform.OS === "web") {
    const locks = (globalThis as unknown as { navigator?: { locks?: CreationWebLocks } }).navigator?.locks;
    if (!locks || typeof locks.request !== "function") throw new RequestCreationOwnershipError("REQUEST_CREATION_WEB_LOCKS_REQUIRED");
    const controller = new AbortController();
    let entered = false;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 5000);
    try {
      return await locks.request(`office-request-creation-v4:${key}`, { mode: "exclusive", signal: controller.signal }, async () => {
        entered = true;
        clearTimeout(timeout);
        return work();
      });
    } catch (error) {
      if (entered) throw error;
      if (timedOut) throw new RequestCreationOwnershipError("REQUEST_CREATION_OWNERSHIP_TIMEOUT");
      throw new RequestCreationOwnershipError("REQUEST_CREATION_OWNERSHIP_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }
  // Native supports the existing single application JS runtime. AsyncStorage
  // provides no cross-runtime CAS/lock; this is not multi-process native safety.
  let owners = nativeOwners.get(storage);
  if (!owners) { owners = new Map(); nativeOwners.set(storage, owners); }
  const scopeOwners = owners;
  const previous = scopeOwners.get(key) ?? Promise.resolve();
  const result = previous.then(work);
  const tail = result.then(() => {}, () => {});
  scopeOwners.set(key, tail);
  void tail.then(() => { if (scopeOwners.get(key) === tail) scopeOwners.delete(key); });
  return result;
}
const keyFor = (scope: string) => {
  if (!scope || scope.length > 180) throw new Error("REQUEST_CREATION_INTENT_SCOPE_REQUIRED");
  return `office_request_creation_intent_v4:${encodeURIComponent(scope)}`;
};
function parseIntent(raw: string | null, scope: string): RequestCreationIntent | null {
  if (raw === null) return null;
  let row: RequestCreationIntent;
  try { row = JSON.parse(raw) as RequestCreationIntent; } catch { throw new Error("REQUEST_CREATION_INTENT_DURABILITY_CONFLICT"); }
  if (!row || Array.isArray(row) || row.version !== 1 || row.scope !== scope || row.id !== `v4:${scope}` || typeof row.actorId !== "string" || !row.actorId || typeof row.payload !== "string") {
    throw new Error("REQUEST_CREATION_INTENT_DURABILITY_CONFLICT");
  }
  requireExplicitRequestCompany(row.companyId);
  return row;
}
async function readIntent(scope: string, actorId: string, storage: OfflineStorageAdapter): Promise<RequestCreationIntent | null> {
  if (!actorId) throw new Error("REQUEST_CREATION_INTENT_ACTOR_CONFLICT");
  const intent = parseIntent(await storage.getItem(keyFor(scope)), scope);
  if (intent && intent.actorId !== actorId) throw new Error("REQUEST_CREATION_INTENT_ACTOR_CONFLICT");
  return intent;
}
export async function loadRequestCreationIntent(scope: string, actorId: string, storage = strictStorage): Promise<RequestCreationIntent | null> {
  return withStorageOwnership(keyFor(scope), storage, () => readIntent(scope, actorId, storage));
}
export async function persistRequestCreationIntent(params: {
  scope: string; actorId: string; companyId: string; args: Record<string, unknown>;
}, storage = strictStorage): Promise<RequestCreationIntent> {
  return withStorageOwnership(keyFor(params.scope), storage, async () => {
    const companyId = requireExplicitRequestCompany(params.companyId);
    const payload = JSON.stringify(params.args);
    const previous = await readIntent(params.scope, params.actorId, storage);
    if (previous) {
      if (previous.companyId !== companyId || previous.payload !== payload) {
        // Never overwrite an unknown first commit with another payload/company.
        throw new Error("REQUEST_CREATION_INTENT_RECONCILE_REQUIRED");
      }
      return previous;
    }
    // Scope is a deliberately created durable operation, not a content hash.
    const intent: RequestCreationIntent = { version: 1, id: `v4:${params.scope}`, scope: params.scope,
      actorId: params.actorId, companyId, payload };
    const raw = JSON.stringify(intent);
    await storage.setItem(keyFor(params.scope), raw);
    if (await storage.getItem(keyFor(params.scope)) !== raw) throw new Error("REQUEST_CREATION_INTENT_NOT_DURABLE");
    return intent;
  });
}

// Form-derived draftScopeKey is not an operation identity. Only explicit
// new-flow selection rotates a completed operation; unknown outcomes stay put.
export type RequestCreationScopeSnapshot = Readonly<{ version: 1; actorId: string; scope: string; completed: boolean; requestId: string | null }>;
type CreationScope = RequestCreationScopeSnapshot;
const scopeKeyFor = (lane: string, actorId: string) => {
  if (!lane || !actorId || lane.length > 180 || actorId.length > 180) throw new Error("REQUEST_CREATION_INTENT_SCOPE_REQUIRED");
  return `office_request_creation_scope_v4:${encodeURIComponent(`${actorId}:${lane}`)}`;
};
function parseScope(raw: string | null, actorId: string): CreationScope | null {
  if (raw === null) return null;
  let row: CreationScope;
  try { row = JSON.parse(raw) as CreationScope; } catch { throw new Error("REQUEST_CREATION_INTENT_SCOPE_CONFLICT"); }
  if (row && row.actorId !== actorId) throw new Error("REQUEST_CREATION_INTENT_ACTOR_CONFLICT");
  if (!row || Array.isArray(row) || row.version !== 1 || typeof row.scope !== "string" || !row.scope || row.scope.length > 180
    || typeof row.completed !== "boolean" || !(row.requestId === null || (typeof row.requestId === "string" && !!row.requestId.trim()))
    || row.completed !== (row.requestId !== null)) throw new Error("REQUEST_CREATION_INTENT_SCOPE_CONFLICT");
  return row;
}
export async function loadRequestCreationScope(lane: string, actorId: string, storage = strictStorage): Promise<RequestCreationScopeSnapshot | null> {
  const key = scopeKeyFor(lane, actorId);
  // One whole-record read is only an advisory selection snapshot. Mutations
  // revalidate it under ownership; read-only linked history needs no Web Lock.
  const snapshot = parseScope(await storage.getItem(key), actorId);
  return snapshot ? Object.freeze(snapshot) : null;
}
export async function resolveRequestCreationScope(lane: string, actorId: string, beginNew: RequestCreationScopeSnapshot | false = false, storage = strictStorage): Promise<string> {
  const key = scopeKeyFor(lane, actorId);
  return withStorageOwnership(key, storage, async () => {
    const previous = parseScope(await storage.getItem(key), actorId);
    // A delayed selection cannot rotate a completion it never observed. Two
    // selections of the same completed predecessor also rotate only once.
    if (previous && (!beginNew || !beginNew.completed || beginNew.actorId !== actorId || !previous.completed
      || previous.scope !== beginNew.scope || previous.requestId !== beginNew.requestId)) return previous.scope;
    if (!previous && beginNew) throw new Error("REQUEST_CREATION_INTENT_SCOPE_CONFLICT");
    const next: CreationScope = { version: 1, actorId, scope: `subcontract:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}:${Math.random().toString(36).slice(2)}`,
      completed: false, requestId: null };
    const encoded = JSON.stringify(next);
    await storage.setItem(key, encoded);
    if (await storage.getItem(key) !== encoded) throw new Error("REQUEST_CREATION_INTENT_NOT_DURABLE");
    return next.scope;
  });
}
export async function acknowledgeRequestCreationScope(lane: string, actorId: string, scope: string, requestId: string, storage = strictStorage): Promise<void> {
  const key = scopeKeyFor(lane, actorId);
  return withStorageOwnership(key, storage, async () => {
    const previous = parseScope(await storage.getItem(key), actorId);
    if (!previous || previous.scope !== scope || !requestId.trim() || (previous.requestId !== null && previous.requestId !== requestId)) throw new Error("REQUEST_CREATION_INTENT_SCOPE_CONFLICT");
    const encoded = JSON.stringify({ ...previous, completed: true, requestId });
    await storage.setItem(key, encoded);
    if (await storage.getItem(key) !== encoded) throw new Error("REQUEST_CREATION_INTENT_NOT_DURABLE");
  });
}
