export type OfflineStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type MemoryOfflineStorageAdapter = OfflineStorageAdapter & {
  dump: () => Record<string, string>;
};

const hasWebLocalStorage = () => {
  try {
    return typeof globalThis !== "undefined" && "localStorage" in globalThis && globalThis.localStorage != null;
  } catch {
    return false;
  }
};

type AsyncStorageBridge = Pick<OfflineStorageAdapter, "getItem" | "setItem" | "removeItem">;

const getAsyncStorage = async (): Promise<AsyncStorageBridge> => {
  const module = await import("@react-native-async-storage/async-storage");
  return (module.default ?? module) as AsyncStorageBridge;
};

export const createDefaultOfflineStorage = (): OfflineStorageAdapter => ({
  async getItem(key) {
    if (hasWebLocalStorage()) {
      try {
        return globalThis.localStorage.getItem(key);
      } catch {
        return null;
      }
    }

    try {
      const storage = await getAsyncStorage();
      return await storage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    if (hasWebLocalStorage()) {
      try {
        globalThis.localStorage.setItem(key, value);
      } catch {}
      return;
    }

    try {
      const storage = await getAsyncStorage();
      await storage.setItem(key, value);
    } catch {}
  },
  async removeItem(key) {
    if (hasWebLocalStorage()) {
      try {
        globalThis.localStorage.removeItem(key);
      } catch {}
      return;
    }

    try {
      const storage = await getAsyncStorage();
      await storage.removeItem(key);
    } catch {}
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
  } catch {
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
