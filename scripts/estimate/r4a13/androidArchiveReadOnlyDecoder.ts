import { createHash } from "node:crypto";
import { AsyncStorageEstimateRevisionDurableStore, type AsyncKeyValueStorage } from "../../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";
import { durablePointerRecordKey, type RevisionBundle } from "../../../src/lib/platform/estimateRevisionDurableStore.contract";

const prefix = "rik.estimate_revision_durable.v1:";
const digest = (key: string) => createHash("sha256").update(key).digest("hex");

function bundleCounts(bundle: RevisionBundle | null) {
  if (!bundle) return null;
  const state = bundle.estimateDraftRevisionState;
  const revisions = Array.isArray(state?.revisions) ? state.revisions : null;
  const items = Array.isArray(bundle.items) ? bundle.items : null;
  return {
    decodedRevisionCount: revisions?.length ?? 0,
    currentRevisionPresent: state && revisions ? revisions.some(r => r?.revisionId === state.currentRevisionId) : null,
    decodedItemCount: items?.length ?? 0,
    shapeIssue: !items || (state != null && !revisions),
  };
}

/** Audit using the product decoder, never recoverLastValid (which repairs the
 * device pointer). Previous versions are selected only in an in-memory view.
 * Receipts contain hashes/counts, not draft text, identities or revision bodies.
 */
export async function auditAndroidLogicalBundlesReadOnly(storage: AsyncKeyValueStorage) {
  let mutationAttempts = 0;
  const denyWrite = async (): Promise<never> => {
    mutationAttempts += 1;
    throw new Error("S2728_ARCHIVE_AUDIT_WRITE_FORBIDDEN");
  };
  const readonlyStorage: AsyncKeyValueStorage = {
    getItem: key => storage.getItem(key),
    ...(storage.multiGet ? { multiGet: keys => storage.multiGet!(keys) } : {}),
    setItem: denyWrite, removeItem: denyWrite, multiSet: denyWrite, multiRemove: denyWrite,
  };
  const store = new AsyncStorageEstimateRevisionDurableStore(readonlyStorage);
  const keys = await store.listKeys();
  const records = [];
  for (const key of keys) {
    const head = bundleCounts(await store.readBundle(key));
    const pointerKey = `${prefix}${durablePointerRecordKey(key)}`;
    let previous: ReturnType<typeof bundleCounts> = null;
    let previousDeclared = false;
    let indexedNonHeadVersions: number | null = null;
    try {
      const pointer = JSON.parse(await storage.getItem(pointerKey) ?? "null");
      if (pointer?.schemaVersion === "estimate_revision_durable_pointer_v1"
        && typeof pointer.previousVersion === "string" && pointer.previousVersion) {
        previousDeclared = true;
        const previousStore = new AsyncStorageEstimateRevisionDurableStore({
          ...readonlyStorage,
          getItem: recordKey => recordKey === pointerKey
            ? Promise.resolve(JSON.stringify({ ...pointer, currentVersion: pointer.previousVersion, previousVersion: null }))
            : readonlyStorage.getItem(recordKey),
        });
        previous = bundleCounts(await previousStore.readBundle(key));
      }
      const index = JSON.parse(await storage.getItem(`${prefix}__revision_index__:${encodeURIComponent(key)}`) ?? "null");
      if (index?.schemaVersion === "estimate_revision_durable_revision_index_v1" && Array.isArray(index.versions)) {
        indexedNonHeadVersions = index.versions.filter((version: unknown) =>
          version !== pointer?.currentVersion && version !== pointer?.previousVersion).length;
      }
    } catch {
      // A bad neighbor is a per-key result, not permission to abort good keys.
    }
    records.push({ keySha256: digest(key), head, previousDeclared, previous, indexedNonHeadVersions });
  }
  return {
    logicalKeyCount: keys.length,
    validHeadCount: records.filter(record => record.head != null).length,
    invalidHeadCount: records.filter(record => record.head == null).length,
    validPreviousCount: records.filter(record => record.previous != null).length,
    invalidDeclaredPreviousCount: records.filter(record => record.previousDeclared && record.previous == null).length,
    headDecodedRevisionCount: records.reduce((sum, record) => sum + (record.head?.decodedRevisionCount ?? 0), 0),
    headWithMissingCurrentRevisionCount: records.filter(record => record.head?.currentRevisionPresent === false).length,
    headShapeIssueCount: records.filter(record => record.head?.shapeIssue).length,
    mutationAttempts,
    records,
  };
}
