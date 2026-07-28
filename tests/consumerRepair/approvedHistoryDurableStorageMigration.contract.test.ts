import { Platform } from "react-native";

import {
  type ConsumerRepairDraftBundle,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
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
  saveConsumerRepairBundle,
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
  CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD,
  isLargeConsumerRepairRevisionBundle,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
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

function installQuotaLocalStorageMock(): InstalledQuotaStorage {
  const originalPlatformOs = Platform.OS;
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    get: () => "web",
  });
  const values = new Map<string, string>();
  let quotaBytes = Number.POSITIVE_INFINITY;
  const totalBytesWith = (key: string, value: string) => {
    const next = new Map(values);
    next.set(key, value);
    return Array.from(next).reduce((sum, [entryKey, entryValue]) => sum + entryKey.length + entryValue.length, 0);
  };
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      if (totalBytesWith(key, value) > quotaBytes) {
        throw new Error(`QuotaExceeded:${key}`);
      }
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  return {
    values,
    seedBypassQuota: (key, value) => values.set(key, value),
    setQuota: (maxBytes) => {
      quotaBytes = maxBytes;
    },
    totalBytes: () =>
      Array.from(values).reduce((sum, [entryKey, entryValue]) => sum + entryKey.length + entryValue.length, 0),
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
  const created = createConsumerRepairRequestDraft({
    consumerUserId: input.userId,
    problemText: input.problemText,
    contactPhone: CONSUMER_REPAIR_VALID_PHONE,
    city: CONSUMER_REPAIR_VALID_CITY,
    addressText: CONSUMER_REPAIR_VALID_ADDRESS,
    preferredTimeText: "Сегодня",
    repairType: "flooring",
    aiDraft: buildConsumerRepairAiDraft(input.problemText),
  });
  const inflated = saveConsumerRepairBundle(inflateBundleItems(created, input.rowCount));
  attachConsumerRepairMedia({ requestDraftId: inflated.draft.id, mediaKind: "photo" });
  return approveConsumerRepairRequestDraft({
    requestDraftId: inflated.draft.id,
    userId: input.userId,
  });
}

describe("approved history durable storage migration", () => {
  let storage: InstalledQuotaStorage | null = null;

  beforeEach(() => {
    storage = installQuotaLocalStorageMock();
    __resetConsumerRepairRequestStoreForTests();
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
    const createdDraftRevision = created.estimateDraftRevisionState?.revisions.find((revision) =>
      revision.revisionId === created.estimateDraftRevisionState?.currentRevisionId
    );
    const draftRevision = decoded?.estimateDraftRevisionState?.revisions.find((revision) =>
      revision.revisionId === decoded.estimateDraftRevisionState?.currentRevisionId
    );

    expect(stored.items).toBeUndefined();
    expect(stored.itemsCompactV1).toBeTruthy();
    expect(stored.editableEstimateSnapshot).toBeNull();
    expect(storedCurrentRevision?.editable_estimate_snapshot?.hash).toBe(created.editableEstimateSnapshot?.hash);
    expect(decoded?.editableEstimateSnapshot?.hash).toBe(decodedCurrentRevision?.editable_estimate_snapshot.hash);
    expect(draftRevision?.boq.rows).toHaveLength(createdDraftRevision?.boq.rows.length ?? 0);
    expect(draftRevision?.trace.rows).toEqual([]);
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
    const sampleDurableRecord = JSON.parse(storage?.values.get(durableRecordKeys[0] ?? "") ?? "{}") as {
      structuredEstimatePayload?: unknown;
      items?: unknown;
      itemsCompactV1?: { fields?: string[] };
    };

    expect(afterReload.totalApprovedCount).toBe(15);
    expect(afterReload.items).toHaveLength(15);
    expect(afterReload.totalCountSource).toBe("durable_store");
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY)).toBe(false);
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY)).toBe(true);
    expect(durableRecordKeys.length).toBeGreaterThanOrEqual(15);
    expect(sampleDurableRecord.structuredEstimatePayload).toBeNull();
    expect(sampleDurableRecord.items).toBeUndefined();
    expect(sampleDurableRecord.itemsCompactV1).toBeTruthy();
    expect(sampleDurableRecord.itemsCompactV1?.fields).toContain("titleRu");
    expect(sampleDurableRecord.itemsCompactV1?.fields).toContain("quantity");
    expect(sampleDurableRecord.itemsCompactV1?.fields).not.toContain("catalogItemId");
    expect(sampleDurableRecord.itemsCompactV1?.fields).not.toContain("priceSourceId");
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
    const approvedBundles: ConsumerRepairDraftBundle[] = [];

    for (let index = 0; index < 30; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 9, 11, 0, index)));
      const approved = createHeavyApprovedConsumerRepairRequest({
        userId,
        problemText: `Нужно уложить ламинат на ${100 + index} кв м в комнате`,
        rowCount: LOCAL_STORAGE_HISTORY_ROW_COUNT,
      });
      approvedBundles.push(approved);
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
    const oldestApproved = approvedBundles[0]!;
    const oldestRecordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(oldestApproved.draft.id)}`;
    resetConsumerRepairDurableSaveDiagnosticsForTests();

    expect(approvedBundles).toHaveLength(30);
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

  it("reopens a heavy approved estimate edit after many approved history compactions", () => {
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
    }

    if (!latestApproved?.items[0]) throw new Error("latest approved fixture missing");
    const item = latestApproved.items[0];
    const recordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(latestApproved.draft.id)}`;

    jest.setSystemTime(new Date(Date.UTC(2026, 6, 9, 15, 0, 0)));
    const edited = updateConsumerRepairRequestItemQuantity({
      requestDraftId: latestApproved.draft.id,
      itemId: item.id,
      quantity: (item.quantity ?? 0) + 1,
    });
    const decodedEdited = decodeConsumerRepairBundleFromDurableStorage(
      JSON.parse(storage?.values.get(recordKey) ?? "{}"),
    );
    const history = listConsumerRepairApprovedHistory(userId, { limit: 40 });

    expect(edited.draft.status).toBe("draft");
    expect(edited.draft.approvedAt).toBeNull();
    expect(decodedEdited?.draft.status).toBe("draft");
    expect(decodedEdited?.draft.approvedAt).toBeNull();
    expect(decodedEdited?.items[0]?.quantity).toBe((item.quantity ?? 0) + 1);
    expect(decodedEdited?.estimateRevisionState?.current_revision_id)
      .toBe(edited.estimateRevisionState?.current_revision_id);
    expect(getConsumerRepairRequest(latestApproved.draft.id).draft.status).toBe("draft");
    expect(history.totalApprovedCount).toBe(39);
  });

  it("proactively compacts old heavy approved snapshots before Android startup hydration pressure", () => {
    jest.useFakeTimers();
    const userId = "approved-history-proactive-summary-window";
    const approvedBundles: ConsumerRepairDraftBundle[] = [];

    for (let index = 0; index < 10; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 9, 13, 0, index)));
      approvedBundles.push(createHeavyApprovedConsumerRepairRequest({
        userId,
        problemText: `РќСѓР¶РЅРѕ СЃРѕС…СЂР°РЅРёС‚СЊ Android history snapshot ${index}`,
        rowCount: LOCAL_STORAGE_HISTORY_ROW_COUNT,
      }));
    }

    const oldestRecordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(approvedBundles[0]!.draft.id)}`;
    const newestRecordKey =
      `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(approvedBundles.at(-1)!.draft.id)}`;
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
    expect(decodedNewest?.items).toHaveLength(LOCAL_STORAGE_HISTORY_ROW_COUNT);

    __simulateConsumerRepairRequestStoreReloadForTests();
    const history = listConsumerRepairApprovedHistory(userId, { limit: 10 });

    expect(history.totalApprovedCount).toBe(10);
    expect(history.records[0]?.rowCount).toBe(LOCAL_STORAGE_HISTORY_ROW_COUNT);
    expect(history.records.at(-1)?.rowCount).toBe(
      LOCAL_STORAGE_HISTORY_ROW_COUNT,
    );
  });
});
