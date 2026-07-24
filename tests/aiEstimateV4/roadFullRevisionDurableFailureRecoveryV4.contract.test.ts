import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  applyConsumerRepairDraftRevisionParamBatchPatch,
  commitPreparedConsumerRepairRequestBundle,
  getConsumerRepairRequest,
  selectConsumerRepairRoadScopeV4,
} from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX,
  CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX,
  CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX,
  hydrateTransactionalConsumerRepairRequestStore,
  setConsumerRepairTransactionalDurableStoreForTests,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX,
  flushTransactionalConsumerRepairWrites,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import {
  InMemoryEstimateRevisionDurableStore,
  type DurableFailurePoint,
} from "../../src/lib/platform/estimateRevisionDurableStore";

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
  return { storage, values, rejectWrites: (next: typeof reject) => { reject = next; } };
}

function createFullRoad() {
  const pending = buildConsumerRepairSelectedWorkDraftBundle({
    consumerUserId: "full-road-durable-user",
    problemText: "Асфальтирование дороги длиной 100 м и шириной 10 м",
    repairType: "road_construction",
    city: "Бишкек",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    selectedWork: null,
  }).bundle;
  return selectConsumerRepairRoadScopeV4({
    requestDraftId: pending.draft.id,
    userId: pending.draft.consumerUserId,
    selectedScope: "FULL_ROAD_INFRASTRUCTURE",
    expectedRevisionId: null,
    createdAt: "2026-07-24T05:00:00.000Z",
  });
}

describe("full-road normalized durable failure recovery V4", () => {
  test("moves the 702-row R1/R2 flow off localStorage and reloads it through the transactional bridge", async () => {
    const controlled = controlledStorage();
    const durableStore = new InMemoryEstimateRevisionDurableStore();
    Object.defineProperty(globalThis, "localStorage", {
      value: controlled.storage,
      configurable: true,
    });
    try {
      __resetConsumerRepairRequestStoreForTests();
      setConsumerRepairTransactionalDurableStoreForTests(durableStore);
      const baseline = createFullRoad();
      const enriched = commitPreparedConsumerRepairRequestBundle({
        ...baseline,
        items: baseline.items.map((item, index) => ({
          ...item,
          unitPrice: index + 0.25,
          priceEditedByConsumer: true,
          priceStatus: "USER_ENTERED_PRICE" as const,
          priceSource: "user" as const,
          priceSourceLabel: "Цена введена пользователем",
        })),
        estimateComments: Array.from({ length: 24 }, (_, index) => ({
          id: `transactional-comment-${index}`,
          ownerUserId: baseline.draft.consumerUserId,
          estimateId: baseline.draft.id,
          revisionId: baseline.estimateDraftRevisionState?.currentRevisionId ?? null,
          rowId: baseline.items[index]?.sourceParameters?.rowCode as string,
          text: `Комментарий ${index + 1}`,
          createdAt: "2026-07-24T05:01:00.000Z",
          updatedAt: "2026-07-24T05:01:00.000Z",
          deleted: false,
        })),
        estimateAttachments: Array.from({ length: 8 }, (_, index) => ({
          id: `transactional-attachment-${index}`,
          ownerScope: "estimate" as const,
          estimateId: baseline.draft.id,
          revisionId: baseline.estimateDraftRevisionState?.currentRevisionId ?? null,
          rowId: baseline.items[index]?.sourceParameters?.rowCode as string,
          fileName: `road-specification-${index + 1}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: 1024 + index,
          contentHash: `transactional-road-specification-${index + 1}`,
          storageReference: `redacted://road/specification/${index + 1}`,
          thumbnailReference: null,
          createdAt: "2026-07-24T05:01:00.000Z",
          deleted: false,
          privacy: "redacted" as const,
          redacted: true,
        })),
      });
      const revised = applyConsumerRepairDraftRevisionParamBatchPatch({
        requestDraftId: enriched.draft.id,
        userId: enriched.draft.consumerUserId,
        patches: [{ operation: "update_param", paramKey: "width_m", rawValue: "30" }],
      });
      await flushTransactionalConsumerRepairWrites();

      const encodedId = encodeURIComponent(baseline.draft.id);
      expect([...controlled.values.keys()].some((key) =>
        key === `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodedId}` ||
        key === `${CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX}${encodedId}` ||
        key.startsWith(`${CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX}${encodedId}:`)
      )).toBe(false);
      expect(controlled.values.has(
        `${CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX}${encodedId}`,
      )).toBe(true);

      // Native force-stop recovery cannot depend on Web localStorage metadata.
      controlled.values.delete(
        `${CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX}${encodedId}`,
      );
      __simulateConsumerRepairRequestStoreReloadForTests();
      await hydrateTransactionalConsumerRepairRequestStore();
      const restored = getConsumerRepairRequest(baseline.draft.id);
      expect(restored.estimateDraftRevisionState?.currentRevisionId)
        .toBe(revised.estimateDraftRevisionState?.currentRevisionId);
      expect(restored.estimateDraftRevisionState?.revisions).toHaveLength(2);
      expect(restored.items.filter((item) => item.unitPrice != null)).toHaveLength(702);
      expect(restored.estimateComments).toHaveLength(24);
      expect(restored.estimateAttachments).toHaveLength(8);
      expect(durableStore.revisionCount(baseline.draft.id)).toBe(2);
    } finally {
      __resetConsumerRepairRequestStoreForTests();
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });

  test("persists R1 and R2 outside browser quota-limited localStorage", async () => {
    const values = new Map<string, string>();
    const quotaBytes = 5 * 1024 * 1024;
    const storage: Storage = {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => Array.from(values.keys())[index] ?? null,
      removeItem: (key) => { values.delete(key); },
      setItem: (key, value) => {
        const nextBytes = [...values.entries()].reduce(
          (total, [storedKey, storedValue]) => total + (storedKey === key ? 0 : storedValue.length),
          value.length,
        );
        if (nextBytes > quotaBytes) throw new Error("SYNTHETIC_BROWSER_QUOTA_EXCEEDED");
        values.set(key, value);
      },
    };
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
    try {
      __resetConsumerRepairRequestStoreForTests();
      const durableStore = new InMemoryEstimateRevisionDurableStore();
      setConsumerRepairTransactionalDurableStoreForTests(durableStore);
      const baseline = createFullRoad();
      const enriched = commitPreparedConsumerRepairRequestBundle({
        ...baseline,
        items: baseline.items.map((item, index) => ({
          ...item,
          unitPrice: index + 0.25,
          priceEditedByConsumer: true,
          priceStatus: "USER_ENTERED_PRICE" as const,
          priceSource: "user" as const,
          priceSourceLabel: "Цена введена пользователем",
        })),
        estimateComments: Array.from({ length: 24 }, (_, index) => ({
          id: `quota-comment-${index}`,
          ownerUserId: baseline.draft.consumerUserId,
          estimateId: baseline.draft.id,
          revisionId: baseline.estimateDraftRevisionState?.currentRevisionId ?? null,
          rowId: baseline.items[index]?.sourceParameters?.rowCode as string,
          text: `Комментарий к строке ${index + 1}`,
          createdAt: "2026-07-24T05:01:00.000Z",
          updatedAt: "2026-07-24T05:01:00.000Z",
          deleted: false,
        })),
        estimateAttachments: Array.from({ length: 8 }, (_, index) => ({
          id: `quota-attachment-${index}`,
          ownerScope: "estimate" as const,
          estimateId: baseline.draft.id,
          revisionId: baseline.estimateDraftRevisionState?.currentRevisionId ?? null,
          rowId: baseline.items[index]?.sourceParameters?.rowCode as string,
          fileName: `road-specification-${index + 1}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: 1024 + index,
          contentHash: `road-specification-${index + 1}`,
          storageReference: `redacted://road/specification/${index + 1}`,
          thumbnailReference: null,
          createdAt: "2026-07-24T05:01:00.000Z",
          deleted: false,
          privacy: "redacted" as const,
          redacted: true,
        })),
      });
      const recordPrefix = encodeURIComponent(baseline.draft.id);
      const revised = applyConsumerRepairDraftRevisionParamBatchPatch({
        requestDraftId: enriched.draft.id,
        userId: enriched.draft.consumerUserId,
        patches: [{ operation: "update_param", paramKey: "width_m", rawValue: "30" }],
      });
      await flushTransactionalConsumerRepairWrites();
      expect([...values.keys()].some((key) =>
        key === `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${recordPrefix}` ||
        key === `${CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX}${recordPrefix}` ||
        key.startsWith(`${CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX}${recordPrefix}:`)
      )).toBe(false);

      __simulateConsumerRepairRequestStoreReloadForTests();
      await hydrateTransactionalConsumerRepairRequestStore();
      const restored = getConsumerRepairRequest(baseline.draft.id);
      expect(restored.estimateDraftRevisionState?.currentRevisionId)
        .toBe(revised.estimateDraftRevisionState?.currentRevisionId);
      expect(restored.estimateDraftRevisionState?.revisions).toHaveLength(2);
      expect(restored.estimateDraftRevisionState?.revisions.at(-1)?.boq.rows).toHaveLength(702);
      expect(restored.items.every((item) => item.unitPrice != null)).toBe(true);
      expect(restored.estimateComments ?? []).toHaveLength(24);
      expect(restored.estimateAttachments ?? []).toHaveLength(8);
      const durableCodeUnits = [...values.entries()].reduce(
        (total, [key, value]) => total + key.length + value.length,
        0,
      );
      expect(durableCodeUnits).toBeLessThanOrEqual(quotaBytes);
    } finally {
      __resetConsumerRepairRequestStoreForTests();
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });

  test("recovers a 702-row revision through 12 controlled failure classes", async () => {
    const controlled = controlledStorage();
    Object.defineProperty(globalThis, "localStorage", { value: controlled.storage, configurable: true });
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
        const durableStore = new InMemoryEstimateRevisionDurableStore();
        setConsumerRepairTransactionalDurableStoreForTests(durableStore);
        const baseline = createFullRoad();
        await flushTransactionalConsumerRepairWrites();
        const revisionId = baseline.estimateDraftRevisionState?.currentRevisionId ?? null;
        const changed = {
          ...baseline,
          estimateComments: [{
            id: "full-road-comment",
            ownerUserId: baseline.draft.consumerUserId,
            estimateId: baseline.draft.id,
            revisionId,
            rowId: baseline.items[0]?.sourceParameters?.rowCode as string,
            text: "Сохранённый комментарий",
            createdAt: "2026-07-24T05:01:00.000Z",
            updatedAt: "2026-07-24T05:01:00.000Z",
            deleted: false,
          }],
          estimateAttachments: [{
            id: "full-road-attachment",
            ownerScope: "estimate" as const,
            estimateId: baseline.draft.id,
            revisionId,
            rowId: null,
            fileName: "road-specification.pdf",
            mimeType: "application/pdf",
            sizeBytes: 1024,
            contentHash: "road-specification-v1",
            storageReference: "redacted://road/specification",
            thumbnailReference: null,
            createdAt: "2026-07-24T05:01:00.000Z",
            deleted: false,
            privacy: "redacted" as const,
            redacted: true,
          }],
        };
        const injectedPointByClass: Partial<Record<typeof failureClass, DurableFailurePoint>> = {
          before_write: "before_write",
          after_snapshot_before_pointer: "before_pointer_switch",
          attachment_metadata_write: "after_revision_write",
          comment_write: "before_read_back",
          quota_exceeded: "before_write",
          storage_rejected: "after_revision_write",
          after_pointer_before_v2: "after_pointer_switch",
          secondary_index: "before_orphan_cleanup",
        };
        const injectedPoint = injectedPointByClass[failureClass];
        durableStore.setFailureInjector(injectedPoint
          ? (point) => {
            if (point === injectedPoint) throw new Error(`INJECTED:${failureClass}`);
          }
          : null);
        commitPreparedConsumerRepairRequestBundle(changed);
        await flushTransactionalConsumerRepairWrites();
        durableStore.setFailureInjector(null);

        if (failureClass === "corrupt_current_json" || failureClass === "checksum_mismatch") {
          durableStore.corruptCurrentForTests(baseline.draft.id);
        }
        if (failureClass === "same_idempotency_key" || failureClass === "double_save") {
          commitPreparedConsumerRepairRequestBundle(changed);
          await flushTransactionalConsumerRepairWrites();
        }
        __simulateConsumerRepairRequestStoreReloadForTests();
        await hydrateTransactionalConsumerRepairRequestStore();
        const restored = getConsumerRepairRequest(baseline.draft.id);
        expect(restored.estimateDraftRevisionState?.revisions.at(-1)?.boq.rows).toHaveLength(702);
        expect(new Set(restored.estimateDraftRevisionState?.revisions.map((revision) => revision.revisionId)).size)
          .toBe(restored.estimateDraftRevisionState?.revisions.length);
        expect(new Set(restored.estimateComments?.map((comment) => comment.id) ?? []).size)
          .toBe(restored.estimateComments?.length ?? 0);
        expect(new Set(restored.estimateAttachments?.map((attachment) => attachment.id) ?? []).size)
          .toBe(restored.estimateAttachments?.length ?? 0);
        expect(durableStore.revisionCount(baseline.draft.id)).toBeLessThanOrEqual(2);
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
