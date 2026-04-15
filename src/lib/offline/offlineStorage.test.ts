import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  configureOfflineStorageTestHarness,
  createDefaultOfflineStorage,
  readJsonFromStorage,
} from "./offlineStorage";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";

jest.mock("../logError", () => ({
  logError: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

type RuntimeWithDev = typeof globalThis & {
  __DEV__?: boolean;
  localStorage?: Storage;
};

const runtime = globalThis as RuntimeWithDev;
const asyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

const setLocalStorage = (value: Storage | undefined) => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value,
  });
};

const setThrowingLocalStorageGetter = (error: Error) => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw error;
    },
  });
};

const buildLocalStorage = (overrides?: Partial<Storage>): Storage =>
  ({
    length: 0,
    clear: jest.fn(),
    key: jest.fn(() => null),
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    ...overrides,
  }) as unknown as Storage;

describe("offlineStorage", () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

  beforeEach(() => {
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
    jest.clearAllMocks();
    setLocalStorage(undefined);
    configureOfflineStorageTestHarness({
      loadAsyncStorageBridge: async () => asyncStorage,
    });
  });

  afterAll(() => {
    configureOfflineStorageTestHarness();
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", originalLocalStorageDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("reads successfully from web localStorage without changing semantics", async () => {
    const localStorage = buildLocalStorage({
      getItem: jest.fn(() => "cached-value"),
    });
    setLocalStorage(localStorage);
    const storage = createDefaultOfflineStorage();

    await expect(storage.getItem("queue-key")).resolves.toBe("cached-value");
    expect(localStorage.getItem).toHaveBeenCalledWith("queue-key");
    expect(asyncStorage.getItem).not.toHaveBeenCalled();
    expect(getPlatformObservabilityEvents()).toEqual([]);
  });

  it("reports web localStorage read failures and still returns null", async () => {
    const localStorage = buildLocalStorage({
      getItem: jest.fn(() => {
        throw new Error("web read exploded");
      }),
    });
    setLocalStorage(localStorage);
    const storage = createDefaultOfflineStorage();

    await expect(storage.getItem("queue-key")).resolves.toBeNull();
    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        screen: "global_busy",
        surface: "offline_storage",
        event: "read_failed",
        result: "error",
        sourceKind: "web_local_storage",
        errorStage: "read",
        fallbackUsed: true,
        errorMessage: "web read exploded",
        extra: expect.objectContaining({
          key: "queue-key",
          scope: "offlineStorage.read",
        }),
      }),
    ]);
  });

  it("reports web storage probe failures and preserves async fallback behavior", async () => {
    asyncStorage.getItem.mockResolvedValue("native-value");
    setThrowingLocalStorageGetter(new Error("probe exploded"));
    const storage = createDefaultOfflineStorage();

    await expect(storage.getItem("queue-key")).resolves.toBe("native-value");
    expect(asyncStorage.getItem).toHaveBeenCalledWith("queue-key");
    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        event: "web_storage_probe_failed",
        sourceKind: "web_local_storage",
        errorStage: "probe",
        fallbackUsed: true,
        errorMessage: "probe exploded",
        extra: expect.objectContaining({
          scope: "offlineStorage.webProbe",
        }),
      }),
    ]);
  });

  it("reports async read failures and still returns null", async () => {
    asyncStorage.getItem.mockRejectedValue(new Error("async read exploded"));
    const storage = createDefaultOfflineStorage();

    await expect(storage.getItem("queue-key")).resolves.toBeNull();
    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        event: "read_failed",
        sourceKind: "async_storage",
        errorStage: "read",
        fallbackUsed: true,
        errorMessage: "async read exploded",
        extra: expect.objectContaining({
          key: "queue-key",
          scope: "offlineStorage.read",
        }),
      }),
    ]);
  });

  it("writes successfully through async storage when web storage is unavailable", async () => {
    asyncStorage.setItem.mockResolvedValue();
    const storage = createDefaultOfflineStorage();

    await expect(storage.setItem("queue-key", "payload")).resolves.toBeUndefined();
    expect(asyncStorage.setItem).toHaveBeenCalledWith("queue-key", "payload");
    expect(getPlatformObservabilityEvents()).toEqual([]);
  });

  it("reports async write failures without becoming fatal", async () => {
    asyncStorage.setItem.mockRejectedValue(new Error("async write exploded"));
    const storage = createDefaultOfflineStorage();

    await expect(storage.setItem("queue-key", "payload")).resolves.toBeUndefined();
    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        event: "write_failed",
        sourceKind: "async_storage",
        errorStage: "write",
        errorMessage: "async write exploded",
        extra: expect.objectContaining({
          key: "queue-key",
          scope: "offlineStorage.write",
        }),
      }),
    ]);
  });

  it("removes successfully through async storage when web storage is unavailable", async () => {
    asyncStorage.removeItem.mockResolvedValue();
    const storage = createDefaultOfflineStorage();

    await expect(storage.removeItem("queue-key")).resolves.toBeUndefined();
    expect(asyncStorage.removeItem).toHaveBeenCalledWith("queue-key");
    expect(getPlatformObservabilityEvents()).toEqual([]);
  });

  it("reports async remove failures without becoming fatal", async () => {
    asyncStorage.removeItem.mockRejectedValue(new Error("async remove exploded"));
    const storage = createDefaultOfflineStorage();

    await expect(storage.removeItem("queue-key")).resolves.toBeUndefined();
    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        event: "remove_failed",
        sourceKind: "async_storage",
        errorStage: "remove",
        errorMessage: "async remove exploded",
        extra: expect.objectContaining({
          key: "queue-key",
          scope: "offlineStorage.remove",
        }),
      }),
    ]);
  });

  it("reports JSON parse failures and preserves null fallback semantics", async () => {
    const storage = {
      getItem: jest.fn(async () => "{broken"),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    await expect(readJsonFromStorage<{ ok: boolean }>(storage, "draft-key")).resolves.toBeNull();
    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        event: "read_json_parse_failed",
        sourceKind: "json",
        errorStage: "parse",
        fallbackUsed: true,
        extra: expect.objectContaining({
          key: "draft-key",
          scope: "offlineStorage.readJson.parse",
        }),
      }),
    ]);
  });
});
