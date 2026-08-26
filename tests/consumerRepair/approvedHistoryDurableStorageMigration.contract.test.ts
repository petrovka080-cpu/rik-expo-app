import { Platform } from "react-native";

import {
  type ConsumerRepairDraftBundle,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  ConsumerRepairValidationError,
  prepareConsumerRepairRequestItemQuantityUpdate,
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
  listConsumerRepairApprovedHistory,
  updateConsumerRepairRequestItemQuantity,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX,
  CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY,
  CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY,
  CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX,
  CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX,
  saveConsumerRepairBundle,
  setConsumerRepairTransactionalDurableStoreForTests,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import { safeJsonStringify } from "../../src/lib/format";
import {
  compactConsumerRepairBundleForDurableStorage,
  compactConsumerRepairBundleForEmergencyDurableStorage,
  compactConsumerRepairSourceParameters,
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../../src/lib/platform/compactConsumerRepairDurableState";
import {
  CONSUMER_REPAIR_DURABLE_SAVE_DIAGNOSTIC_EVENT,
  getConsumerRepairDurableSaveDiagnosticsForTests,
  resetConsumerRepairDurableSaveDiagnosticsForTests,
} from "../../src/lib/platform/consumerRepairDurableSavePolicy";
import {
  CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX,
  CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD,
  CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD,
  flushTransactionalConsumerRepairWrites,
  isLargeConsumerRepairRevisionBundle,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import type { EstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore";
import {
  CONSUMER_REPAIR_VALID_ADDRESS,
  CONSUMER_REPAIR_VALID_CITY,
  CONSUMER_REPAIR_VALID_PHONE,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

type InstalledQuotaStorage = {
  values: Map<string, string>;
  seedBypassQuota: (key: string, value: string) => void;
  setQuota: (maxBytes: number) => void;
  totalBytes: () => number;
  cleanup: () => void;
};

const LOCAL_STORAGE_HISTORY_ROW_COUNT =
  CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD - 1;
const LOCAL_STORAGE_EDIT_HISTORY_ROW_COUNT = 200;

// This suite owns the localStorage summary/compaction boundary. Full
// transactional payload integrity, rollback, crash recovery and adapters are
// covered by the dedicated 22-case durable-store suites; avoid serializing 80
// unrelated 499-row full snapshots while constructing summary fixtures here.
const approvedHistorySummaryTransactionalStore: EstimateRevisionDurableStore = {
  readBundle: async () => null,
  writeBundleAtomically: async (_key, expectedVersion, bundle) => ({
    status: "WRITTEN",
    version: bundle.estimateRevisionState?.current_revision_id
      ?? `approved-summary:${bundle.draft.id}`,
    previousVersion: expectedVersion,
    checksum: "approved-history-summary-fixture",
  }),
  recoverLastValid: async () => null,
  deleteOrphans: async () => undefined,
  listKeys: async () => [],
};

function installQuotaLocalStorageMock(): InstalledQuotaStorage {
  const originalPlatformOs = Platform.OS;
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    get: () => "web",
  });
  const values = new Map<string, string>();
  let quotaBytes = Number.POSITIVE_INFINITY;
  let usedBytes = 0;
  const entryBytes = (key: string, value: string) => key.length + value.length;
  const totalBytesWith = (key: string, value: string) => {
    const existing = values.get(key);
    return usedBytes - (existing == null ? 0 : entryBytes(key, existing)) + entryBytes(key, value);
  };
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => {
      values.clear();
      usedBytes = 0;
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      const existing = values.get(key);
      if (existing != null) usedBytes -= entryBytes(key, existing);
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      const projectedBytes = totalBytesWith(key, value);
      if (projectedBytes > quotaBytes) {
        throw new Error(`QuotaExceeded:${key}`);
      }
      values.set(key, value);
      usedBytes = projectedBytes;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  return {
    values,
    seedBypassQuota: (key, value) => {
      if (values.size === 0) usedBytes = 0;
      usedBytes = totalBytesWith(key, value);
      values.set(key, value);
    },
    setQuota: (maxBytes) => {
      quotaBytes = maxBytes;
    },
    totalBytes: () => usedBytes,
    cleanup: () => {
      delete (globalThis as { localStorage?: Storage }).localStorage;
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        get: () => originalPlatformOs,
      });
    },
  };
}

function withLegacyPayloadInflation(bundle: unknown, index: number): unknown {
  return {
    ...(bundle as Record<string, unknown>),
    structuredEstimatePayload: {
      version: "legacy-heavy-v1",
      estimateId: `legacy_estimate_${index}`,
      workKey: "legacy_heavy_work",
      locale: { city: "Bishkek" },
      sourceEstimate: {
        prompt: "legacy approved history payload",
        duplicatedPayload: "x".repeat(120_000),
      },
    },
  };
}

function inflateBundleItems(bundle: ConsumerRepairDraftBundle, rowCount: number): ConsumerRepairDraftBundle {
  const baseItem = bundle.items[0];
  if (!baseItem) return bundle;
  const now = bundle.draft.updatedAt ?? bundle.draft.approvedAt ?? bundle.draft.createdAt;
  return {
    ...bundle,
    draft: {
      ...bundle.draft,
      updatedAt: now,
    },
    items: Array.from({ length: rowCount }, (_, index) => ({
      ...baseItem,
      id: `${baseItem.id}_heavy_${index}`,
      itemType: index % 3 === 0 ? "material" : "work",
      titleRu: `${baseItem.titleRu} ${index + 1}`,
      quantity: index + 1,
      unitPrice: 10,
      totalPrice: (index + 1) * 10,
      createdAt: now,
    })),
    editableEstimateSnapshot: null,
    estimateRevisionState: null,
    estimateDraftRevisionState: null,
  };
}

function createHeavyApprovedConsumerRepairRequest(input: {
  userId: string;
  problemText: string;
  rowCount: number;
}): ConsumerRepairDraftBundle {
  const revisionId = "c3333333-4444-4555-8666-777777777777";
  const releaseId = "c4444444-5555-4666-8777-888888888888";
  const canonicalDraft = buildConsumerRepairAiDraft(input.problemText);
  const created = createConsumerRepairRequestDraft({
    consumerUserId: input.userId,
    problemText: input.problemText,
    contactPhone: CONSUMER_REPAIR_VALID_PHONE,
    city: CONSUMER_REPAIR_VALID_CITY,
    addressText: CONSUMER_REPAIR_VALID_ADDRESS,
    preferredTimeText: "Сегодня",
    repairType: "flooring",
    aiDraft: {
      ...canonicalDraft,
      items: canonicalDraft.items.map((item, index) => ({
        ...item,
        sourceParameters: {
          ...item.sourceParameters,
          canonicalBackendRevisionId: revisionId,
          canonicalBackendReleaseId: releaseId,
          canonicalBackendRowId: `canonical-heavy-history-row-${index + 1}`,
        },
      })),
    },
  });
  const inflated = saveConsumerRepairBundle(inflateBundleItems(created, input.rowCount));
  attachConsumerRepairMedia({ requestDraftId: inflated.draft.id, mediaKind: "photo" });
  return approveConsumerRepairRequestDraft({
    requestDraftId: inflated.draft.id,
    userId: input.userId,
    canonicalArtifact: {
      artifactId: `canonical-heavy-history-pdf:${inflated.draft.id}`,
      revisionId,
      releaseId,
      status: "ready",
      sha256: "d".repeat(64),
    },
  });
}

describe("approved history durable storage migration", () => {
  let storage: InstalledQuotaStorage | null = null;

  beforeEach(() => {
    storage = installQuotaLocalStorageMock();
    __resetConsumerRepairRequestStoreForTests();
    setConsumerRepairTransactionalDurableStoreForTests(
      approvedHistorySummaryTransactionalStore,
    );
  });

  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    storage?.cleanup();
    storage = null;
    jest.useRealTimers();
  });

  it("preserves minimal passport-backed BOQ provenance during durable compaction", () => {
    const compact = compactConsumerRepairSourceParameters({
      passportBackedNaturalLanguageIngress: true,
      sourceApplicabilityStatus: "natural_language_resolver_selected_exact_passport",
      templateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      workKey: "demolition_interior_tile_remove_standard",
      familyId: "demolition",
      professionalBoqRuntimeContract: "professional_boq_runtime_contract_v1",
      professionalBoqRuntimeRowIndex: 12,
      oversizedRuntimeTrace: "x".repeat(20_000),
    });

    expect(compact).toMatchObject({
      passportBackedNaturalLanguageIngress: true,
      sourceApplicabilityStatus: "natural_language_resolver_selected_exact_passport",
      templateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      workKey: "demolition_interior_tile_remove_standard",
      familyId: "demolition",
      professionalBoqRuntimeContract: "professional_boq_runtime_contract_v1",
      professionalBoqRuntimeRowIndex: 12,
    });
    expect(compact).not.toHaveProperty("oversizedRuntimeTrace");
  });

  it("stores active estimate snapshots once and restores them from the current durable revision", () => {
    const problemText = "Нужно уложить ламинат на 100 кв м в комнате";
    const created = createConsumerRepairRequestDraft({
      consumerUserId: "active-durable-snapshot-once",
      problemText,
      aiDraft: buildConsumerRepairAiDraft(problemText),
    });
    const recordKey = `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(created.draft.id)}`;
    const stored = JSON.parse(storage?.values.get(recordKey) ?? "{}");
    const decoded = decodeConsumerRepairBundleFromDurableStorage(stored);
    const storedCurrentRevision = stored.estimateRevisionState?.revisions?.find((revision: { revision_id?: string }) =>
      revision.revision_id === stored.estimateRevisionState?.current_revision_id
    );
    const decodedCurrentRevision = decoded?.estimateRevisionState?.revisions.find((revision) =>
      revision.revision_id === decoded.estimateRevisionState?.current_revision_id
    );
    expect(stored.items).toBeUndefined();
    expect(stored.itemsCompactV1).toBeTruthy();
    expect(stored.editableEstimateSnapshot).toBeNull();
    expect(storedCurrentRevision?.editable_estimate_snapshot?.hash).toBe(created.editableEstimateSnapshot?.hash);
    expect(decoded?.editableEstimateSnapshot?.hash).toBe(decodedCurrentRevision?.editable_estimate_snapshot.hash);
    expect(decoded?.editableEstimateSnapshot?.rows).toHaveLength(
      created.editableEstimateSnapshot?.rows.length ?? 0,
    );
    expect(decoded?.estimateDraftRevisionState).toBeNull();
    // Canonical backend revisions own immutable history. The durable consumer
    // projection must not retain a second legacy session copy.
    expect(decoded?.estimateDraftSession).toBeNull();
  });

  it("updates a 1.7 MiB draft atomically without requiring three full localStorage copies", () => {
    const userId = "durable-v3-large-update-two-generation-budget";
    const problemText = "large canonical draft must retain one recovery generation";
    const created = createConsumerRepairRequestDraft({
      consumerUserId: userId,
      problemText,
      aiDraft: buildConsumerRepairAiDraft(problemText),
    });
    const heavy = saveConsumerRepairBundle({
      ...inflateBundleItems(created, 213),
      items: inflateBundleItems(created, 213).items.map((item) => ({
        ...item,
        calculationTrace: `${item.calculationTrace ?? ""}:${"trace".repeat(1_400)}`,
      })),
    });
    const recordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(heavy.draft.id)}`;
    const pointerKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX}${encodeURIComponent(heavy.draft.id)}`;
    const snapshotPrefix =
      `${CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX}${encodeURIComponent(heavy.draft.id)}:`;
    const currentRaw = storage?.values.get(recordKey) ?? "";
    const edited = {
      ...heavy,
      items: heavy.items.map((item, index) => index === 0
        ? { ...item, quantity: (item.quantity ?? 0) + 1 }
        : item),
    };
    const editedRaw = safeJsonStringify(
      encodeConsumerRepairBundleForDurableStorage(
        compactConsumerRepairBundleForDurableStorage(edited),
      ),
      "",
    );
    const twoGenerationBudget =
      Math.max(currentRaw.length, editedRaw.length) * 2 + 100_000;
    const threeGenerationFootprint =
      currentRaw.length * 2 + editedRaw.length;

    expect(currentRaw.length).toBeGreaterThan(1_500_000);
    expect(threeGenerationFootprint).toBeGreaterThan(twoGenerationBudget);
    storage?.setQuota(twoGenerationBudget);
    resetConsumerRepairDurableSaveDiagnosticsForTests();

    const saved = saveConsumerRepairBundle(edited);
    const snapshotKeys = Array.from(storage?.values.keys() ?? [])
      .filter((key) => key.startsWith(snapshotPrefix));
    const pointer = JSON.parse(storage?.values.get(pointerKey) ?? "null") as {
      currentChecksum?: string;
      previousChecksum?: string | null;
    } | null;

    expect(saved.events.some((event) =>
      String(event.payload?.reason ?? "").includes("memory_only")
    )).toBe(false);
    expect(pointer?.currentChecksum).toBeTruthy();
    expect(pointer?.previousChecksum).toBeTruthy();
    expect(snapshotKeys).toHaveLength(2);

    __simulateConsumerRepairRequestStoreReloadForTests();
    const rehydrated = getConsumerRepairRequest(heavy.draft.id);

    expect(rehydrated.items).toHaveLength(213);
    expect(rehydrated.items[0]?.quantity).toBe(edited.items[0]?.quantity);
  });

  it("routes a compact record above the two-generation Web Storage budget transactionally", () => {
    const problemText = "large canonical revision must not enter localStorage";
    const created = createConsumerRepairRequestDraft({
      consumerUserId: "durable-transactional-two-generation-budget",
      problemText,
      aiDraft: buildConsumerRepairAiDraft(problemText),
    });
    const base = inflateBundleItems(created, 213);
    const baseLength = safeJsonStringify(
      encodeConsumerRepairBundleForDurableStorage(
        compactConsumerRepairBundleForDurableStorage(base),
      ),
      "",
    ).length;
    const paddingPerRow = Math.ceil(
      (CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD + 50_000 - baseLength) /
        base.items.length,
    );
    const pressureBundle = {
      ...base,
      items: base.items.map((item) => ({
        ...item,
        calculationTrace: `${item.calculationTrace ?? ""}:${"x".repeat(paddingPerRow)}`,
      })),
    };
    const serializedLength = safeJsonStringify(
      encodeConsumerRepairBundleForDurableStorage(
        compactConsumerRepairBundleForDurableStorage(pressureBundle),
      ),
      "",
    ).length;

    expect(pressureBundle.items).toHaveLength(213);
    expect(serializedLength).toBeGreaterThanOrEqual(
      CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD,
    );
    expect(serializedLength).toBeLessThan(
      CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD + 300_000,
    );
    expect(isLargeConsumerRepairRevisionBundle(pressureBundle)).toBe(true);
  });

  it("migrates a legacy 13-record store and persists newly approved estimates after reload", () => {
    jest.useFakeTimers();
    const userId = "approved-history-legacy-13-migration";

    for (let index = 0; index < 13; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 8, 12, 0, index)));
      createApprovedConsumerRepairRequest({ userId });
    }
    const legacyItems = listConsumerRepairApprovedHistory(userId, { limit: 20 }).items;
    const compactLegacyBytes = JSON.stringify(
      legacyItems.map((bundle) => ({ ...bundle, structuredEstimatePayload: null })),
    ).length;
    const legacyRaw = JSON.stringify(legacyItems.map(withLegacyPayloadInflation));

    expect(legacyItems).toHaveLength(13);
    expect(legacyRaw.length).toBeGreaterThan(compactLegacyBytes);

    storage?.values.clear();
    storage?.seedBypassQuota(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY, legacyRaw);
    storage?.setQuota(compactLegacyBytes + 300_000);

    __simulateConsumerRepairRequestStoreReloadForTests();
    expect(listConsumerRepairApprovedHistory(userId, { limit: 20 }).totalApprovedCount).toBe(13);

    for (let index = 13; index < 15; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 8, 12, 0, index)));
      createApprovedConsumerRepairRequest({ userId });
    }

    __simulateConsumerRepairRequestStoreReloadForTests();
    const afterReload = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    const durableRecordKeys = Array.from(storage?.values.keys() ?? [])
      .filter((key) => key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX));
    type StoredDurableRecord = {
      structuredEstimatePayload?: unknown;
      items?: unknown;
      itemsCompactV1?: { fields?: string[] };
      durableHistorySummary?: { fullSnapshotAvailable?: boolean } | null;
    };
    const durableRecords = durableRecordKeys.map((key) =>
      JSON.parse(storage?.values.get(key) ?? "{}") as StoredDurableRecord
    );
    const sampleSummaryRecord = durableRecords.find(
      (record) => record.durableHistorySummary?.fullSnapshotAvailable === false,
    );
    const sampleFullRecord = durableRecords.find(
      (record) => record.durableHistorySummary?.fullSnapshotAvailable === true,
    );

    expect(afterReload.totalApprovedCount).toBe(15);
    expect(afterReload.items).toHaveLength(15);
    expect(afterReload.totalCountSource).toBe("durable_store");
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY)).toBe(false);
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY)).toBe(true);
    expect(durableRecordKeys.length).toBeGreaterThanOrEqual(15);
    expect(sampleSummaryRecord?.structuredEstimatePayload).toBeNull();
    expect(sampleSummaryRecord?.items).toBeUndefined();
    expect(sampleSummaryRecord?.itemsCompactV1).toBeTruthy();
    expect(sampleSummaryRecord?.itemsCompactV1?.fields).toContain("titleRu");
    expect(sampleSummaryRecord?.itemsCompactV1?.fields).toContain("quantity");
    expect(sampleSummaryRecord?.itemsCompactV1?.fields).not.toContain("catalogItemId");
    expect(sampleSummaryRecord?.itemsCompactV1?.fields).not.toContain("priceSourceId");
    expect(sampleFullRecord?.itemsCompactV1?.fields).toContain("catalogItemId");
    expect(sampleFullRecord?.itemsCompactV1?.fields).toContain("priceSourceId");
  });

  it("surfaces a localStorage quota failure without crashing when pruning cannot make the new record fit", () => {
    const userId = "durable-quota-prunes-drafts";
    for (let index = 0; index < 6; index += 1) {
      createConsumerRepairRequestDraft({
        consumerUserId: userId,
        problemText: `old durable draft ${index + 1}`,
      });
    }
    const totalBytes = Array.from(storage?.values ?? [])
      .reduce((sum, [key, value]) => sum + key.length + value.length, 0);
    storage?.setQuota(totalBytes + 10);

    const created = createConsumerRepairRequestDraft({
      consumerUserId: userId,
      problemText: "new request should prune old draft cache instead of crashing",
    });
    const durableRecordKeys = Array.from(storage?.values.keys() ?? [])
      .filter((key) => key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX));

    expect(created.draft.id).toBeTruthy();
    expect(storage?.values.has(`${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(created.draft.id)}`)).toBe(false);
    expect(durableRecordKeys.length).toBeLessThan(7);
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY)).toBe(true);
  });

  it("preserves the last valid current draft record when browser storage is fragmented", () => {
    const userId = "durable-quota-emergency-compact";
    storage?.seedBypassQuota("external.browser.cache", "x".repeat(12_000));
    const aiDraft = buildConsumerRepairAiDraft(
      "Нужно уложить ламинат на 100 кв м в комнате",
    );
    const inflatedAiDraft = {
      ...aiDraft,
      items: aiDraft.items.map((item, index) => ({
        ...item,
        sourceParameters: {
          ...(item.sourceParameters ?? {}),
          oversizedRuntimeTrace: "z".repeat(index === 0 ? 80_000 : 10_000),
        },
        calculationTrace: `${item.calculationTrace ?? ""} ${"trace".repeat(1200)}`,
      })),
    };

    const created = createConsumerRepairRequestDraft({
      consumerUserId: userId,
      problemText: "Нужно уложить ламинат на 100 кв м в комнате",
      aiDraft: inflatedAiDraft,
    });
    const recordKey = `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(created.draft.id)}`;
    const pressureBundle = getConsumerRepairRequest(created.draft.id);
    expect(isLargeConsumerRepairRevisionBundle(pressureBundle)).toBe(false);
    const normalCompactRaw = safeJsonStringify(
      encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(pressureBundle)),
      "",
    );
    const emergencyCompactRaw = safeJsonStringify(
      encodeConsumerRepairBundleForDurableStorage(
        compactConsumerRepairBundleForEmergencyDurableStorage(pressureBundle, {
          createdAt: "2026-07-09T10:10:01.000Z",
        }),
      ),
      "",
    );
    resetConsumerRepairDurableSaveDiagnosticsForTests();
    const currentRaw = storage?.values.get(recordKey) ?? "";
    const currentTotalBytes = storage?.totalBytes() ?? 0;
    const normalProjectedBytes =
      currentTotalBytes - recordKey.length - currentRaw.length + recordKey.length + normalCompactRaw.length;
    const emergencyProjectedBytes =
      currentTotalBytes - recordKey.length - currentRaw.length + recordKey.length + emergencyCompactRaw.length;
    const pressureQuotaBytes =
      emergencyProjectedBytes + Math.max(1, Math.floor((normalProjectedBytes - emergencyProjectedBytes) / 2));

    expect(emergencyProjectedBytes).toBeLessThan(normalProjectedBytes);
    storage?.setQuota(pressureQuotaBytes);
    saveConsumerRepairBundle(pressureBundle);

    const stored = storage?.values.get(recordKey) ?? "";
    const diagnostics = getConsumerRepairDurableSaveDiagnosticsForTests();

    expect(created.draft.id).toBeTruthy();
    expect(storage?.values.has(recordKey)).toBe(true);
    expect(diagnostics.some((event) => event.eventType === CONSUMER_REPAIR_DURABLE_SAVE_DIAGNOSTIC_EVENT)).toBe(true);
    expect(stored).toBe(currentRaw);
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY)).toBe(true);
  });

  it("keeps the last valid revision durable when quota pressure rejects the edited revision", () => {
    const userId = "durable-quota-edit-revision-chain";
    const aiDraft = buildConsumerRepairAiDraft(
      "РІРµРЅС‚С„Р°СЃР°Рґ РїРѕРґ РєР»СЋС‡ 1500 РєРІ РјРµС‚СЂРѕРІ РІС‹СЃРѕС‚Р° 40 Рј СѓС‚РµРїР»РµРЅРёРµ 100 РјРј",
    );
    const inflatedAiDraft = {
      ...aiDraft,
      items: aiDraft.items.map((item, index) => ({
        ...item,
        sourceParameters: {
          ...(item.sourceParameters ?? {}),
          oversizedRuntimeTrace: "q".repeat(index === 0 ? 80_000 : 12_000),
        },
        calculationTrace: `${item.calculationTrace ?? ""} ${"trace".repeat(1400)}`,
      })),
    };

    const created = createConsumerRepairRequestDraft({
      consumerUserId: userId,
      problemText: "РІРµРЅС‚С„Р°СЃР°Рґ РїРѕРґ РєР»СЋС‡ 1500 РєРІ РјРµС‚СЂРѕРІ",
      aiDraft: inflatedAiDraft,
    });
    const edited = updateConsumerRepairRequestItemQuantity({
      requestDraftId: created.draft.id,
      itemId: created.items[0]!.id,
      quantity: (created.items[0]!.quantity ?? 0) + 1,
    });
    const recordKey = `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(created.draft.id)}`;
    const normalCompactRaw = safeJsonStringify(
      encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(edited)),
      "",
    );
    const emergencyCompactRaw = safeJsonStringify(
      encodeConsumerRepairBundleForDurableStorage(
        compactConsumerRepairBundleForEmergencyDurableStorage(edited, {
          createdAt: "2026-07-09T10:10:02.000Z",
        }),
      ),
      "",
    );
    resetConsumerRepairDurableSaveDiagnosticsForTests();
    const currentRaw = storage?.values.get(recordKey) ?? "";
    const lastValid = decodeConsumerRepairBundleFromDurableStorage(JSON.parse(currentRaw));
    const currentTotalBytes = storage?.totalBytes() ?? 0;
    const normalProjectedBytes =
      currentTotalBytes - recordKey.length - currentRaw.length + recordKey.length + normalCompactRaw.length;
    const emergencyProjectedBytes =
      currentTotalBytes - recordKey.length - currentRaw.length + recordKey.length + emergencyCompactRaw.length;
    const pressureQuotaBytes =
      emergencyProjectedBytes + Math.max(1, Math.floor((normalProjectedBytes - emergencyProjectedBytes) / 2));

    expect(edited.estimateRevisionState?.current_revision_id).not.toBe(created.estimateRevisionState?.current_revision_id);
    expect(emergencyProjectedBytes).toBeLessThan(normalProjectedBytes);

    storage?.setQuota(pressureQuotaBytes);
    saveConsumerRepairBundle(edited);

    const stored = storage?.values.get(recordKey) ?? "";
    const decoded = decodeConsumerRepairBundleFromDurableStorage(JSON.parse(stored));
    const decodedCurrentRevision = decoded?.estimateRevisionState?.revisions.find((revision) =>
      revision.revision_id === decoded.estimateRevisionState?.current_revision_id
    );

    expect(stored).toBe(currentRaw);
    expect(decoded?.items[0]?.quantity).toBe(lastValid?.items[0]?.quantity);
    expect(decoded?.estimateRevisionState?.current_revision_id).toBe(lastValid?.estimateRevisionState?.current_revision_id);
    expect(decoded?.estimateRevisionState?.revisions.length).toBe(lastValid?.estimateRevisionState?.revisions.length);
    expect(decodedCurrentRevision?.rows_hash).toBe(lastValid?.estimateRevisionState?.revisions.at(-1)?.rows_hash);
    expect(decodedCurrentRevision?.editable_estimate_snapshot.rows[0]?.quantity).toBe(lastValid?.items[0]?.quantity);

    __simulateConsumerRepairRequestStoreReloadForTests();
    const rehydrated = getConsumerRepairRequest(created.draft.id);

    expect(rehydrated.items[0]?.quantity).toBe(lastValid?.items[0]?.quantity);
    expect(rehydrated.estimateRevisionState?.current_revision_id).toBe(lastValid?.estimateRevisionState?.current_revision_id);
    expect(rehydrated.estimateRevisionState?.revisions.at(-1)?.rows_hash).toBe(
      lastValid?.estimateRevisionState?.revisions.at(-1)?.rows_hash,
    );
  });

  it("keeps a quantity edit durable after proactive approved history snapshot compaction", () => {
    jest.useFakeTimers();
    const userId = "approved-history-summary-pressure-edit";
    const approvedDraftIds: string[] = [];

    for (let index = 0; index < 30; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 9, 11, 0, index)));
      const approved = createHeavyApprovedConsumerRepairRequest({
        userId,
        problemText: `Нужно уложить ламинат на ${100 + index} кв м в комнате`,
        rowCount: LOCAL_STORAGE_HISTORY_ROW_COUNT,
      });
      approvedDraftIds.push(approved.draft.id);
      __simulateConsumerRepairRequestStoreReloadForTests();
    }

    jest.setSystemTime(new Date(Date.UTC(2026, 6, 9, 12, 0, 0)));
    const active = createConsumerRepairRequestDraft({
      consumerUserId: userId,
      problemText: "Нужно уложить ламинат на 220 кв м в комнате",
      aiDraft: buildConsumerRepairAiDraft("Нужно уложить ламинат на 220 кв м в комнате"),
    });
    const activeHeavy = saveConsumerRepairBundle(
      inflateBundleItems(active, LOCAL_STORAGE_EDIT_HISTORY_ROW_COUNT),
    );
    const preparedEdit = prepareConsumerRepairRequestItemQuantityUpdate({
      requestDraftId: activeHeavy.draft.id,
      itemId: activeHeavy.items[0]!.id,
      quantity: (activeHeavy.items[0]!.quantity ?? 0) + 1,
      operationId: "quota-pressure-edit-op",
      source: "stepper",
    });
    expect(isLargeConsumerRepairRevisionBundle(preparedEdit)).toBe(false);
    const activeRecordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(activeHeavy.draft.id)}`;
    const oldestRecordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(approvedDraftIds[0]!)}`;
    resetConsumerRepairDurableSaveDiagnosticsForTests();

    expect(approvedDraftIds).toHaveLength(30);
    expect(decodeConsumerRepairBundleFromDurableStorage(
      JSON.parse(storage?.values.get(oldestRecordKey) ?? "{}"),
    )?.durableHistorySummary?.fullSnapshotAvailable).toBe(false);

    const edited = saveConsumerRepairBundle(preparedEdit);
    const storedActive = JSON.parse(storage?.values.get(activeRecordKey) ?? "{}");
    const decodedActive = decodeConsumerRepairBundleFromDurableStorage(storedActive);
    const decodedOldest = decodeConsumerRepairBundleFromDurableStorage(
      JSON.parse(storage?.values.get(oldestRecordKey) ?? "{}"),
    );
    const diagnostics = getConsumerRepairDurableSaveDiagnosticsForTests();
    const preparedEditedItem = preparedEdit.items[0];
    const decodedEditedItem = decodedActive?.items.find(
      (item) => item.id === preparedEditedItem?.id,
    );

    expect(edited.events.some((event) =>
      String(event.payload?.reason ?? "").includes("memory_only")
    )).toBe(false);
    expect(decodedEditedItem?.quantity).toBe(preparedEditedItem?.quantity);
    expect(decodedActive?.estimateRevisionState?.current_revision_id)
      .toBe(preparedEdit.estimateRevisionState?.current_revision_id);
    expect(decodedOldest?.items).toHaveLength(0);
    expect(decodedOldest?.durableHistorySummary?.rowCount).toBe(
      LOCAL_STORAGE_HISTORY_ROW_COUNT,
    );
    expect(decodedOldest?.durableHistorySummary?.fullSnapshotAvailable).toBe(false);
    expect(diagnostics.some((event) =>
      String(event.reason).includes("memory_only")
    )).toBe(false);

    __simulateConsumerRepairRequestStoreReloadForTests();
    const history = listConsumerRepairApprovedHistory(userId, { limit: 20 });

    expect(history.totalApprovedCount).toBe(30);
    expect(history.records[0]?.rowCount).toBe(LOCAL_STORAGE_HISTORY_ROW_COUNT);
    expect(history.records.at(-1)?.rowCount).toBe(
      LOCAL_STORAGE_HISTORY_ROW_COUNT,
    );
    expect(history.totalCountSource).toBe("durable_store");
  });

  it("keeps a heavy approved canonical revision immutable after many history compactions", () => {
    jest.useFakeTimers();
    const userId = "approved-history-pressure-approved-edit";
    let latestApproved: ConsumerRepairDraftBundle | null = null;

    for (let index = 0; index < 40; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 9, 14, 0, index)));
      latestApproved = createHeavyApprovedConsumerRepairRequest({
        userId,
        problemText: `РќСѓР¶РЅР° СЃРјРµС‚Р° РґР»СЏ С‚СЏР¶РµР»РѕР№ РёСЃС‚РѕСЂРёРё ${index}`,
        rowCount: LOCAL_STORAGE_HISTORY_ROW_COUNT,
      });
      if (index < 39) {
        __simulateConsumerRepairRequestStoreReloadForTests();
      }
    }

    if (!latestApproved?.items[0]) throw new Error("latest approved fixture missing");
    const item = latestApproved.items[0];
    const recordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(latestApproved.draft.id)}`;

    jest.setSystemTime(new Date(Date.UTC(2026, 6, 9, 15, 0, 0)));
    const mutate = () => updateConsumerRepairRequestItemQuantity({
      requestDraftId: latestApproved.draft.id,
      itemId: item.id,
      quantity: (item.quantity ?? 0) + 1,
    });
    expect(mutate).toThrow(ConsumerRepairValidationError);
    try {
      mutate();
    } catch (error) {
      expect((error as ConsumerRepairValidationError).errors.map((entry) => entry.code))
        .toContain("CANONICAL_ESTIMATE_BACKEND_REQUIRED");
    }
    const decodedPreserved = decodeConsumerRepairBundleFromDurableStorage(
      JSON.parse(storage?.values.get(recordKey) ?? "{}"),
    );
    const history = listConsumerRepairApprovedHistory(userId, { limit: 40 });

    expect(decodedPreserved?.draft.status).toBe("consumer_approved");
    expect(decodedPreserved?.draft.approvedAt).toBeTruthy();
    expect(decodedPreserved?.items).toHaveLength(0);
    expect(decodedPreserved?.durableHistorySummary?.rowCount).toBe(LOCAL_STORAGE_HISTORY_ROW_COUNT);
    const preserved = getConsumerRepairRequest(latestApproved.draft.id);
    expect(preserved.draft.status).toBe("consumer_approved");
    expect(preserved.items[0]?.quantity).toBe(item.quantity);
    expect(history.totalApprovedCount).toBe(40);
  });

  it("proactively compacts old heavy approved snapshots before Android startup hydration pressure", async () => {
    jest.useFakeTimers();
    const userId = "approved-history-proactive-summary-window";
    const approvedDraftIds: string[] = [];

    for (let index = 0; index < 10; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 9, 13, 0, index)));
      const approved = createHeavyApprovedConsumerRepairRequest({
        userId,
        problemText: `РќСѓР¶РЅРѕ СЃРѕС…СЂР°РЅРёС‚СЊ Android history snapshot ${index}`,
        rowCount: LOCAL_STORAGE_HISTORY_ROW_COUNT,
      });
      approvedDraftIds.push(approved.draft.id);
      __simulateConsumerRepairRequestStoreReloadForTests();
    }
    await flushTransactionalConsumerRepairWrites();

    const oldestRecordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(approvedDraftIds[0]!)}`;
    const newestRecordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(approvedDraftIds.at(-1)!)}`;
    const decodedOldest = decodeConsumerRepairBundleFromDurableStorage(
      JSON.parse(storage?.values.get(oldestRecordKey) ?? "{}"),
    );
    const decodedNewest = decodeConsumerRepairBundleFromDurableStorage(
      JSON.parse(storage?.values.get(newestRecordKey) ?? "{}"),
    );

    expect(decodedOldest?.items).toHaveLength(0);
    expect(decodedOldest?.durableHistorySummary?.rowCount).toBe(
      LOCAL_STORAGE_HISTORY_ROW_COUNT,
    );
    expect(decodedOldest?.durableHistorySummary?.fullSnapshotAvailable).toBe(false);
    expect(decodedNewest?.items).toHaveLength(0);
    expect(decodedNewest?.durableHistorySummary?.rowCount).toBe(
      LOCAL_STORAGE_HISTORY_ROW_COUNT,
    );
    expect(decodedNewest?.durableHistorySummary?.fullSnapshotAvailable).toBe(false);
    expect(storage?.values.has(
      `${CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX}${encodeURIComponent(approvedDraftIds.at(-1)!)}`,
    )).toBe(true);

    __simulateConsumerRepairRequestStoreReloadForTests();
    const history = listConsumerRepairApprovedHistory(userId, { limit: 10 });

    expect(history.totalApprovedCount).toBe(10);
    expect(history.records[0]?.rowCount).toBe(LOCAL_STORAGE_HISTORY_ROW_COUNT);
    expect(history.records.at(-1)?.rowCount).toBe(
      LOCAL_STORAGE_HISTORY_ROW_COUNT,
    );
  });
});
