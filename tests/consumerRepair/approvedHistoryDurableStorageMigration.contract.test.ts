import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
  listConsumerRepairApprovedHistory,
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
} from "../../src/lib/platform/compactConsumerRepairDurableState";
import {
  CONSUMER_REPAIR_DURABLE_SAVE_DIAGNOSTIC_EVENT,
  getConsumerRepairDurableSaveDiagnosticsForTests,
  resetConsumerRepairDurableSaveDiagnosticsForTests,
} from "../../src/lib/platform/consumerRepairDurableSavePolicy";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

type InstalledQuotaStorage = {
  values: Map<string, string>;
  seedBypassQuota: (key: string, value: string) => void;
  setQuota: (maxBytes: number) => void;
  totalBytes: () => number;
  cleanup: () => void;
};

function installQuotaLocalStorageMock(): InstalledQuotaStorage {
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
    };

    expect(afterReload.totalApprovedCount).toBe(15);
    expect(afterReload.items).toHaveLength(15);
    expect(afterReload.totalCountSource).toBe("durable_store");
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY)).toBe(false);
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY)).toBe(true);
    expect(durableRecordKeys.length).toBeGreaterThanOrEqual(15);
    expect(sampleDurableRecord.structuredEstimatePayload).toBeNull();
  });

  it("prunes old durable draft cache records before surfacing a localStorage quota failure", () => {
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
    expect(storage?.values.has(`${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(created.draft.id)}`)).toBe(true);
    expect(durableRecordKeys.length).toBeLessThan(7);
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY)).toBe(true);
  });

  it("uses an emergency compact current draft record instead of crashing when browser storage is fragmented", () => {
    const userId = "durable-quota-emergency-compact";
    storage?.seedBypassQuota("external.browser.cache", "x".repeat(12_000));
    const aiDraft = buildConsumerRepairAiDraft(
      "вентфасад под ключ 1500 кв метров высота 40 м утепление 100 мм",
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
      problemText: "вентфасад под ключ 1500 кв метров",
      aiDraft: inflatedAiDraft,
    });
    const recordKey = `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(created.draft.id)}`;
    const pressureBundle = getConsumerRepairRequest(created.draft.id);
    const normalCompactRaw = safeJsonStringify(compactConsumerRepairBundleForDurableStorage(pressureBundle), "");
    const emergencyCompactRaw = safeJsonStringify(
      compactConsumerRepairBundleForEmergencyDurableStorage(pressureBundle, {
        createdAt: "2026-07-09T10:10:01.000Z",
      }),
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
    expect(stored).not.toContain("oversizedRuntimeTrace");
    expect(storage?.values.has(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY)).toBe(true);
  });
});
