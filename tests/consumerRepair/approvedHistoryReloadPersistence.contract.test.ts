import { Platform } from "react-native";

import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

function installLocalStorageMock(): () => void {
  const originalPlatformOs = Platform.OS;
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    get: () => "web",
  });
  const values = new Map<string, string>();
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
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  return () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
  };
}

describe("approved history reload persistence", () => {
  let cleanupLocalStorage: (() => void) | null = null;

  beforeEach(() => {
    cleanupLocalStorage = installLocalStorageMock();
    __resetConsumerRepairRequestStoreForTests();
  });
  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    cleanupLocalStorage?.();
    cleanupLocalStorage = null;
    jest.useRealTimers();
  });

  it("hydrates approved history from durable storage after an app reload", () => {
    jest.useFakeTimers();
    const userId = "approved-history-reload-consumer";

    for (let index = 0; index < 25; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 8, 11, 0, index)));
      createApprovedConsumerRepairRequest({ userId });
    }
    const beforeReload = listConsumerRepairApprovedHistory(userId, { limit: 20 });

    __simulateConsumerRepairRequestStoreReloadForTests();

    const afterReload = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    const afterReloadSecondPage = listConsumerRepairApprovedHistory(userId, {
      limit: 20,
      cursorCreatedAt: afterReload.nextCursorCreatedAt,
    });

    expect(beforeReload.totalApprovedCount).toBe(25);
    expect(afterReload.totalApprovedCount).toBe(25);
    expect(afterReload.totalCountSource).toBe("durable_store");
    expect(afterReload.items.map((bundle) => bundle.draft.id)).toEqual(
      beforeReload.items.map((bundle) => bundle.draft.id),
    );
    expect(afterReloadSecondPage.items).toHaveLength(5);
    expect(afterReload.records.every((record) => record.pdfArtifactId)).toBe(true);
  });
});
