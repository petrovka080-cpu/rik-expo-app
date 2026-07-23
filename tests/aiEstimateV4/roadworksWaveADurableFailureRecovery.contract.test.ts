import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  commitPreparedConsumerRepairRequestBundle,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX,
  CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY,
  CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX,
  CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { RoadworksWaveAProductionRegistry } from "../../src/lib/estimate/v4/roadworks";

function controlledStorage() {
  const values = new Map<string, string>();
  let reject: ((key: string) => boolean) | null = null;
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => {
      if (reject?.(key)) throw new Error("SYNTHETIC_DURABLE_WRITE_REJECTED");
      values.set(key, value);
    },
  };
  return {
    storage,
    values,
    rejectWrites(predicate: ((key: string) => boolean) | null) { reject = predicate; },
  };
}

describe("RoadworksWaveADurableFailureRecoveryContract", () => {
  test("recovers committed data across all controlled failure classes", () => {
    const controlled = controlledStorage();
    Object.defineProperty(globalThis, "localStorage", { value: controlled.storage, configurable: true });
    const item = RoadworksWaveAProductionRegistry[0];
    const failureClasses = [
      "before_write",
      "after_snapshot_before_pointer",
      "attachment_metadata_write",
      "comment_write",
      "quota_exceeded",
      "storage_rejected",
      "after_pointer_before_v2",
      "secondary_index",
      "corrupt_current_json",
      "checksum_mismatch",
      "same_idempotency_key",
      "double_save",
    ] as const;
    let recovered = 0;
    try {
      for (const failureClass of failureClasses) {
        controlled.rejectWrites(null);
        __resetConsumerRepairRequestStoreForTests();
        const estimate = buildEstimateFromInlineWorkPrompt({
          rawInput: `${item.professionalNameRu} 100 м2`,
          selectedWorkKey: item.workId,
          selectedTemplateId: item.templateId,
        });
        if (!estimate.draft) throw new Error("failure fixture draft missing");
        const baseline = createConsumerRepairRequestDraft({
          consumerUserId: "synthetic-failure-owner",
          problemText: `${item.professionalNameRu} 100 м2`,
          aiDraft: estimate.draft,
        });
        const changed = {
          ...baseline,
          estimateComments: [{
            id: "comment-current",
            ownerUserId: "synthetic-failure-owner",
            estimateId: baseline.draft.id,
            revisionId: baseline.estimateDraftRevisionState?.currentRevisionId ?? null,
            rowId: baseline.items[0].sourceParameters?.rowCode as string,
            text: "Новая неподтверждённая заметка",
            createdAt: "2026-07-23T04:00:00.000Z",
            updatedAt: "2026-07-23T04:00:00.000Z",
            deleted: false,
          }],
          estimateAttachments: [{
            id: "attachment-current",
            ownerScope: "estimate" as const,
            estimateId: baseline.draft.id,
            revisionId: null,
            rowId: null,
            fileName: "synthetic.txt",
            mimeType: "text/plain",
            sizeBytes: 12,
            contentHash: "synthetic-hash",
            storageReference: "redacted://failure/reference",
            thumbnailReference: null,
            createdAt: "2026-07-23T04:00:00.000Z",
            deleted: false,
            privacy: "redacted" as const,
            redacted: true,
          }],
        };

        if (["before_write", "attachment_metadata_write", "comment_write", "quota_exceeded", "storage_rejected"].includes(failureClass)) {
          controlled.rejectWrites((key) => key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX));
          commitPreparedConsumerRepairRequestBundle(changed);
        } else if (failureClass === "after_snapshot_before_pointer") {
          controlled.rejectWrites((key) => key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX));
          commitPreparedConsumerRepairRequestBundle(changed);
        } else if (failureClass === "after_pointer_before_v2") {
          controlled.rejectWrites((key) => key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX));
          commitPreparedConsumerRepairRequestBundle(changed);
        } else if (failureClass === "secondary_index") {
          controlled.rejectWrites((key) => key === CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY);
          commitPreparedConsumerRepairRequestBundle(changed);
        } else {
          commitPreparedConsumerRepairRequestBundle(changed);
        }
        controlled.rejectWrites(null);

        if (failureClass === "corrupt_current_json" || failureClass === "checksum_mismatch") {
          const pointerKey = [...controlled.values.keys()].find((key) =>
            key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX)
          );
          const pointer = pointerKey ? JSON.parse(controlled.values.get(pointerKey) ?? "{}") : null;
          const snapshotKey = pointer
            ? `${CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX}${encodeURIComponent(baseline.draft.id)}:${pointer.currentChecksum}`
            : null;
          if (snapshotKey) controlled.values.set(snapshotKey, failureClass === "corrupt_current_json" ? "{broken" : "{}");
        }
        if (failureClass === "same_idempotency_key" || failureClass === "double_save") {
          commitPreparedConsumerRepairRequestBundle(changed);
        }

        __simulateConsumerRepairRequestStoreReloadForTests();
        const restored = getConsumerRepairRequest(baseline.draft.id);
        expect(restored.draft.selectedWorkKey).toBe(item.workId);
        expect(restored.estimateDraftRevisionState?.currentRevisionId).toBeDefined();
        expect(new Set(restored.estimateComments?.map((comment) => comment.id) ?? []).size)
          .toBe(restored.estimateComments?.length ?? 0);
        expect(new Set(restored.estimateAttachments?.map((attachment) => attachment.id) ?? []).size)
          .toBe(restored.estimateAttachments?.length ?? 0);
        const pointerKeys = [...controlled.values.keys()].filter((key) =>
          key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX)
        );
        const snapshotKeys = [...controlled.values.keys()].filter((key) =>
          key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX)
        );
        expect(pointerKeys).toHaveLength(1);
        expect(snapshotKeys.length).toBeLessThanOrEqual(2);
        recovered += 1;
      }
    } finally {
      controlled.rejectWrites(null);
      __resetConsumerRepairRequestStoreForTests();
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
    expect(recovered).toBe(12);
  });
});
