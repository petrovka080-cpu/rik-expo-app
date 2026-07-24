import type { ConsumerRepairDraftBundle } from "../consumerRequests/consumerRequestTypes";
import { createEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.factory";
import {
  serializeRevisionBundle,
  type DurableWriteResult,
  type EstimateRevisionDurableStore,
} from "./estimateRevisionDurableStore.contract";

export const CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX =
  "rik.consumer_repair.transactional_revision_pointer.v1:";

const LARGE_REVISION_ROW_THRESHOLD = 500;
// Keep the historical synchronous path for ordinary (<500-row) estimates.
// Four megabytes leaves margin below the common ~5 MiB Web Storage quota,
// while the row threshold always routes the 702-row maximum to durable storage.
const LARGE_REVISION_SERIALIZED_THRESHOLD = 4_000_000;
const FORBIDDEN_DURABLE_KEYS = /^(?:base64|binary|bytes|blob|dataUrl|privateUrl|signedUrl|accessToken|refreshToken|secret)$/i;
const PRIVATE_URL = /^(?:data:|blob:|https?:\/\/)|[?&](?:token|signature|sig|x-amz-credential)=/i;

let storeOverride: EstimateRevisionDurableStore | null = null;
let runtimeStore: EstimateRevisionDurableStore | null = null;
const writeQueues = new Map<string, Promise<DurableWriteResult>>();

function activeStore(): EstimateRevisionDurableStore {
  if (storeOverride) return storeOverride;
  runtimeStore ??= createEstimateRevisionDurableStore();
  return runtimeStore;
}

function pointerKey(requestDraftId: string): string {
  return `${CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX}${encodeURIComponent(requestDraftId)}`;
}

function sanitizeDurableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeDurableValue);
  if (!value || typeof value !== "object") return value;
  const sanitized: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (FORBIDDEN_DURABLE_KEYS.test(key)) continue;
    if (
      typeof entryValue === "string" &&
      PRIVATE_URL.test(entryValue) &&
      /(?:reference|url|uri)$/i.test(key)
    ) {
      sanitized[key] = key === "storageReference"
        ? "redacted://private-reference-removed"
        : null;
      continue;
    }
    sanitized[key] = sanitizeDurableValue(entryValue);
  }
  return sanitized;
}

export function sanitizeConsumerRepairTransactionalBundle(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDraftBundle {
  return sanitizeDurableValue(bundle) as ConsumerRepairDraftBundle;
}

export function isLargeConsumerRepairRevisionBundle(
  bundle: ConsumerRepairDraftBundle,
): boolean {
  const currentRevision = bundle.estimateDraftRevisionState?.revisions.find((revision) =>
    revision.revisionId === bundle.estimateDraftRevisionState?.currentRevisionId
  );
  if ((currentRevision?.boq.rows.length ?? bundle.items.length) >= LARGE_REVISION_ROW_THRESHOLD) {
    return true;
  }
  try {
    return JSON.stringify(bundle).length >= LARGE_REVISION_SERIALIZED_THRESHOLD;
  } catch {
    return true;
  }
}

export function listTransactionalConsumerRepairBundleIds(storage: Storage): string[] {
  const ids: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX)) continue;
    try {
      ids.push(decodeURIComponent(key.slice(CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX.length)));
    } catch {
      // Malformed metadata is ignored; the durable payload is not deleted.
    }
  }
  return ids;
}

export async function listTransactionalConsumerRepairDurableBundleIds(): Promise<string[]> {
  return activeStore().listKeys();
}

export async function readTransactionalConsumerRepairBundle(
  requestDraftId: string,
): Promise<ConsumerRepairDraftBundle | null> {
  return activeStore().recoverLastValid(requestDraftId);
}

export function queueTransactionalConsumerRepairBundleWrite(input: {
  bundle: ConsumerRepairDraftBundle;
  storage: Pick<Storage, "setItem"> | null;
  onCommitted?: (result: Extract<DurableWriteResult, { status: "WRITTEN" | "UNCHANGED" }>) => void;
  onFailed?: (result: Extract<DurableWriteResult, { status: "FAILED" }>) => void;
}): Promise<DurableWriteResult> {
  const key = input.bundle.draft.id;
  const previousQueue = writeQueues.get(key) ?? Promise.resolve({
    status: "UNCHANGED",
    version: "",
    previousVersion: null,
    checksum: "",
  } satisfies DurableWriteResult);
  const next = previousQueue.then(async () => {
    const store = activeStore();
    const current = await store.readBundle(key);
    const expectedVersion = current
      ? serializeRevisionBundle(current).version
      : null;
    const durableBundle = sanitizeConsumerRepairTransactionalBundle(input.bundle);
    const result = await store.writeBundleAtomically(key, expectedVersion, durableBundle);
    if (result.status === "FAILED") {
      input.onFailed?.(result);
      return result;
    }
    input.storage?.setItem(pointerKey(key), JSON.stringify({
      schemaVersion: "consumer_repair_transactional_pointer_v1",
      migrationState: "complete",
      currentVersion: result.version,
      recoveryVersion: result.previousVersion,
      checksum: result.checksum,
    }));
    input.onCommitted?.(result);
    return result;
  }).catch((error: unknown): DurableWriteResult => {
    const result: Extract<DurableWriteResult, { status: "FAILED" }> = {
      status: "FAILED",
      version: null,
      error: {
        code: "TRANSACTION_FAILED",
        message: error instanceof Error ? error.message : String(error),
        currentVersion: null,
      },
    };
    input.onFailed?.(result);
    return result;
  });
  writeQueues.set(key, next);
  void next.finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  });
  return next;
}

export async function flushTransactionalConsumerRepairWrites(): Promise<void> {
  await Promise.all([...writeQueues.values()]);
}

export function setConsumerRepairTransactionalStoreForTests(
  store: EstimateRevisionDurableStore | null,
): void {
  storeOverride = store;
  runtimeStore = null;
  writeQueues.clear();
}
