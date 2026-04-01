import { reportAndSwallow } from "../observability/catchDiscipline";

export type OfflineStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type MemoryOfflineStorageAdapter = OfflineStorageAdapter & {
  dump: () => Record<string, string>;
};

type OfflineStorageFailureParams = {
  error: unknown;
  event: "web_storage_probe_failed" | "read_failed" | "write_failed" | "remove_failed" | "read_json_parse_failed";
  scope:
    | "offlineStorage.webProbe"
    | "offlineStorage.read"
    | "offlineStorage.write"
    | "offlineStorage.remove"
    | "offlineStorage.readJson.parse";
  key?: string;
  sourceKind: "web_local_storage" | "async_storage" | "json";
  errorStage:
    | "probe"
    | "read"
    | "write"
    | "remove"
    | "parse";
  kind?: "soft_failure" | "degraded_fallback";
};

const reportOfflineStorageFailure = (params: OfflineStorageFailureParams) => {
  reportAndSwallow({
    screen: "global_busy",
    surface: "offline_storage",
    category: "fetch",
    event: params.event,
    scope: params.scope,
    error: params.error,
    errorStage: params.errorStage,
    sourceKind: params.sourceKind,
    kind: params.kind ?? "soft_failure",
    extra: {
      key: params.key ?? null,
      storageKind: params.sourceKind,
    },
  });
};

const getWebLocalStorage = () => {
  try {
    if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
    return globalThis.localStorage ?? null;
  } catch (error) {
    reportOfflineStorageFailure({
      error,
      event: "web_storage_probe_failed",
      scope: "offlineStorage.webProbe",
      sourceKind: "web_local_storage",
      errorStage: "probe",
      kind: "degraded_fallback",
    });
    return null;
  }
};

type AsyncStorageBridge = Pick<OfflineStorageAdapter, "getItem" | "setItem" | "removeItem">;

const loadDefaultAsyncStorage = async (): Promise<AsyncStorageBridge> => {
  const module = await import("@react-native-async-storage/async-storage");
  return (module.default ?? module) as AsyncStorageBridge;
};

let loadAsyncStorageBridge: () => Promise<AsyncStorageBridge> = loadDefaultAsyncStorage;

export const configureOfflineStorageTestHarness = (params?: {
  loadAsyncStorageBridge?: () => Promise<AsyncStorageBridge>;
}) => {
  loadAsyncStorageBridge = params?.loadAsyncStorageBridge ?? loadDefaultAsyncStorage;
};

const getAsyncStorage = async (): Promise<AsyncStorageBridge> => loadAsyncStorageBridge();

export const createDefaultOfflineStorage = (): OfflineStorageAdapter => ({
  async getItem(key) {
    const webLocalStorage = getWebLocalStorage();
    if (webLocalStorage) {
      try {
        return webLocalStorage.getItem(key);
      } catch (error) {
        reportOfflineStorageFailure({
          error,
          event: "read_failed",
          scope: "offlineStorage.read",
          key,
          sourceKind: "web_local_storage",
          errorStage: "read",
          kind: "degraded_fallback",
        });
        return null;
      }
    }

    try {
      const storage = await getAsyncStorage();
      return await storage.getItem(key);
    } catch (error) {
      reportOfflineStorageFailure({
        error,
        event: "read_failed",
        scope: "offlineStorage.read",
        key,
        sourceKind: "async_storage",
        errorStage: "read",
        kind: "degraded_fallback",
      });
      return null;
    }
  },
  async setItem(key, value) {
    const webLocalStorage = getWebLocalStorage();
    if (webLocalStorage) {
      try {
        webLocalStorage.setItem(key, value);
      } catch (error) {
        reportOfflineStorageFailure({
          error,
          event: "write_failed",
          scope: "offlineStorage.write",
          key,
          sourceKind: "web_local_storage",
          errorStage: "write",
        });
      }
      return;
    }

    try {
      const storage = await getAsyncStorage();
      await storage.setItem(key, value);
    } catch (error) {
      reportOfflineStorageFailure({
        error,
        event: "write_failed",
        scope: "offlineStorage.write",
        key,
        sourceKind: "async_storage",
        errorStage: "write",
      });
    }
  },
  async removeItem(key) {
    const webLocalStorage = getWebLocalStorage();
    if (webLocalStorage) {
      try {
        webLocalStorage.removeItem(key);
      } catch (error) {
        reportOfflineStorageFailure({
          error,
          event: "remove_failed",
          scope: "offlineStorage.remove",
          key,
          sourceKind: "web_local_storage",
          errorStage: "remove",
        });
      }
      return;
    }

    try {
      const storage = await getAsyncStorage();
      await storage.removeItem(key);
    } catch (error) {
      reportOfflineStorageFailure({
        error,
        event: "remove_failed",
        scope: "offlineStorage.remove",
        key,
        sourceKind: "async_storage",
        errorStage: "remove",
      });
    }
  },
});

export const createMemoryOfflineStorage = (
  seed?: Record<string, string>,
): MemoryOfflineStorageAdapter => {
  const map = new Map(Object.entries(seed ?? {}));

  return {
    async getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
};

export const readJsonFromStorage = async <T,>(
  storage: OfflineStorageAdapter,
  key: string,
): Promise<T | null> => {
  const raw = await storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    reportOfflineStorageFailure({
      error,
      event: "read_json_parse_failed",
      scope: "offlineStorage.readJson.parse",
      key,
      sourceKind: "json",
      errorStage: "parse",
      kind: "degraded_fallback",
    });
    return null;
  }
};

export const writeJsonToStorage = async (
  storage: OfflineStorageAdapter,
  key: string,
  value: unknown,
): Promise<void> => {
  await storage.setItem(key, JSON.stringify(value));
};
