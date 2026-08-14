import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  CanonicalEstimateCreateRequest,
  CanonicalEstimateRecalculateRequest,
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "./contracts";

const CACHE_KEY = "@estimate-platform/canonical-cache/v2";
const OUTBOX_KEY = "@estimate-platform/canonical-outbox/v2";
const MAX_CACHED_REVISIONS = 5;
const MAX_CACHED_ROWS_PER_REVISION = 200;
const MAX_CACHE_BYTES = 2 * 1024 * 1024;
const MAX_OUTBOX_ENTRIES = 50;
const MAX_OUTBOX_BYTES = 512 * 1024;
const MAX_SINGLE_REQUEST_BYTES = 64 * 1024;

type CachedRevision = {
  ownerUserId: string;
  revision: CanonicalEstimateRevisionView;
  rows: CanonicalEstimateRevisionRowView[];
  rowsComplete: boolean;
  cachedAt: string;
};

type CacheEnvelope = { version: 2; revisions: CachedRevision[] };

type PendingCompileCommand = {
  operation: "compile";
  request: CanonicalEstimateCreateRequest;
  baseRevisionId: null;
  baseRevisionChecksumSha256: null;
};

type PendingRecalculateCommand = {
  operation: "recalculate";
  request: CanonicalEstimateRecalculateRequest;
  baseRevisionId: string;
  baseRevisionChecksumSha256: string;
};

export type PendingCanonicalEstimateAdmission = (PendingCompileCommand | PendingRecalculateCommand) & {
  ownerUserId: string;
  expectedReleaseId: string;
  localAdmissionId: string;
  status: "PENDING_SERVER_ADMISSION" | "CONFLICT";
  createdAt: string;
  attempt: number;
  lastErrorCode: string | null;
};

type OutboxEnvelope = { version: 2; entries: PendingCanonicalEstimateAdmission[] };

function requiredIdentity(value: string, field: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${field.toUpperCase()}_REQUIRED`);
  return normalized;
}

function parseEnvelope<T extends { version: number }>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.version === fallback.version ? parsed as T : fallback;
  } catch {
    return fallback;
  }
}

function encodedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function trimCache(envelope: CacheEnvelope): CacheEnvelope {
  const revisions = envelope.revisions.slice(0, MAX_CACHED_REVISIONS);
  while (revisions.length > 0 && encodedBytes({ version: 2, revisions }) > MAX_CACHE_BYTES) revisions.pop();
  return { version: 2, revisions };
}

export async function cacheCanonicalEstimateRevision(input: {
  ownerUserId: string;
  revision: CanonicalEstimateRevisionView;
  rows: CanonicalEstimateRevisionRowView[];
}) {
  const ownerUserId = requiredIdentity(input.ownerUserId, "ownerUserId");
  const envelope = parseEnvelope<CacheEnvelope>(await AsyncStorage.getItem(CACHE_KEY), { version: 2, revisions: [] });
  const entry: CachedRevision = {
    ownerUserId,
    revision: input.revision,
    rows: input.rows.slice(0, MAX_CACHED_ROWS_PER_REVISION),
    rowsComplete: input.rows.length === input.revision.rowCount && input.rows.length <= MAX_CACHED_ROWS_PER_REVISION,
    cachedAt: new Date().toISOString(),
  };
  const next = trimCache({
    version: 2,
    // A successful authenticated write is also the tenant-switch boundary:
    // private snapshots from another user are not retained in this cache.
    revisions: [entry, ...envelope.revisions.filter((item) =>
      item.ownerUserId === ownerUserId && item.revision.revisionId !== input.revision.revisionId
    )],
  });
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
}

export async function readCachedCanonicalEstimateRevision(
  ownerUserIdInput: string,
  revisionId: string,
): Promise<CachedRevision | null> {
  const ownerUserId = requiredIdentity(ownerUserIdInput, "ownerUserId");
  const envelope = parseEnvelope<CacheEnvelope>(await AsyncStorage.getItem(CACHE_KEY), { version: 2, revisions: [] });
  return envelope.revisions.find((entry) =>
    entry.ownerUserId === ownerUserId && entry.revision.revisionId === revisionId
  ) ?? null;
}

async function queueCommand(
  command: Omit<PendingCanonicalEstimateAdmission, "localAdmissionId" | "status" | "createdAt" | "attempt" | "lastErrorCode">,
): Promise<PendingCanonicalEstimateAdmission> {
  const ownerUserId = requiredIdentity(command.ownerUserId, "ownerUserId");
  const expectedReleaseId = requiredIdentity(command.expectedReleaseId, "expectedReleaseId");
  if (encodedBytes(command.request) > MAX_SINGLE_REQUEST_BYTES) throw new Error("OFFLINE_ESTIMATE_REQUEST_TOO_LARGE");
  const envelope = parseEnvelope<OutboxEnvelope>(await AsyncStorage.getItem(OUTBOX_KEY), { version: 2, entries: [] });
  const ownEntries = envelope.entries.filter((entry) => entry.ownerUserId === ownerUserId);
  const duplicate = ownEntries.find((entry) =>
    entry.operation === command.operation && entry.request.idempotencyKey === command.request.idempotencyKey
  );
  if (duplicate) return duplicate;
  const entry: PendingCanonicalEstimateAdmission = {
    ...command,
    ownerUserId,
    expectedReleaseId,
    localAdmissionId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    status: "PENDING_SERVER_ADMISSION",
    createdAt: new Date().toISOString(),
    attempt: 0,
    lastErrorCode: null,
  } as PendingCanonicalEstimateAdmission;
  const entries = [...ownEntries, entry].slice(-MAX_OUTBOX_ENTRIES);
  const next = { version: 2 as const, entries };
  if (encodedBytes(next) > MAX_OUTBOX_BYTES) throw new Error("OFFLINE_ESTIMATE_OUTBOX_FULL");
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
  return entry;
}

export function queuePendingCanonicalEstimateAdmission(input: {
  ownerUserId: string;
  expectedReleaseId: string;
  request: CanonicalEstimateCreateRequest;
}): Promise<PendingCanonicalEstimateAdmission> {
  return queueCommand({
    operation: "compile",
    ownerUserId: input.ownerUserId,
    expectedReleaseId: input.expectedReleaseId,
    request: input.request,
    baseRevisionId: null,
    baseRevisionChecksumSha256: null,
  });
}

export function queuePendingCanonicalEstimateRecalculation(input: {
  ownerUserId: string;
  expectedReleaseId: string;
  baseRevisionChecksumSha256: string;
  request: CanonicalEstimateRecalculateRequest;
}): Promise<PendingCanonicalEstimateAdmission> {
  return queueCommand({
    operation: "recalculate",
    ownerUserId: input.ownerUserId,
    expectedReleaseId: input.expectedReleaseId,
    request: input.request,
    baseRevisionId: requiredIdentity(input.request.parentRevisionId, "baseRevisionId"),
    baseRevisionChecksumSha256: requiredIdentity(input.baseRevisionChecksumSha256, "baseRevisionChecksumSha256"),
  });
}

export async function listPendingCanonicalEstimateAdmissions(
  ownerUserIdInput: string,
): Promise<PendingCanonicalEstimateAdmission[]> {
  const ownerUserId = requiredIdentity(ownerUserIdInput, "ownerUserId");
  const envelope = parseEnvelope<OutboxEnvelope>(await AsyncStorage.getItem(OUTBOX_KEY), { version: 2, entries: [] });
  return envelope.entries.filter((entry) => entry.ownerUserId === ownerUserId);
}

export async function removePendingCanonicalEstimateAdmission(
  ownerUserIdInput: string,
  localAdmissionId: string,
): Promise<void> {
  const ownerUserId = requiredIdentity(ownerUserIdInput, "ownerUserId");
  const envelope = parseEnvelope<OutboxEnvelope>(await AsyncStorage.getItem(OUTBOX_KEY), { version: 2, entries: [] });
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify({
    version: 2,
    entries: envelope.entries.filter((entry) =>
      entry.ownerUserId === ownerUserId ? entry.localAdmissionId !== localAdmissionId : false
    ),
  }));
}

export async function recordPendingCanonicalEstimateFailure(
  ownerUserIdInput: string,
  localAdmissionId: string,
  errorCode: string,
  conflict = false,
): Promise<void> {
  const ownerUserId = requiredIdentity(ownerUserIdInput, "ownerUserId");
  const envelope = parseEnvelope<OutboxEnvelope>(await AsyncStorage.getItem(OUTBOX_KEY), { version: 2, entries: [] });
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify({
    version: 2,
    entries: envelope.entries
      .filter((entry) => entry.ownerUserId === ownerUserId)
      .map((entry) => entry.localAdmissionId === localAdmissionId
        ? { ...entry, status: conflict ? "CONFLICT" as const : entry.status, attempt: entry.attempt + 1, lastErrorCode: errorCode.slice(0, 100) }
        : entry),
  }));
}

export async function clearCanonicalEstimatePrivateOfflineState(): Promise<void> {
  await Promise.all([AsyncStorage.removeItem(CACHE_KEY), AsyncStorage.removeItem(OUTBOX_KEY)]);
}
