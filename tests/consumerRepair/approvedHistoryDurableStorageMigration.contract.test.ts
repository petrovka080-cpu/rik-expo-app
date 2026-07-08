import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX,
  CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY,
  CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

type InstalledQuotaStorage = {
  values: Map<string, string>;
  seedBypassQuota: (key: string, value: string) => void;
  setQuota: (maxBytes: number) => void;
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
});
