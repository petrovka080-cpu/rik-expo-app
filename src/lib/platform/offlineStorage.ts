import { createDefaultOfflineStorage, type OfflineStorageAdapter } from "../offline/offlineStorage";
import {
  recordPlatformStorageSoftFailure,
  type PlatformStorageWriteResult,
} from "./observabilityStorage";

export type PlatformOfflineStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItemSoft: (key: string, value: string) => Promise<PlatformStorageWriteResult>;
  removeItemSoft: (key: string) => Promise<PlatformStorageWriteResult>;
};

const success: PlatformStorageWriteResult = {
  ok: true,
  softFailure: false,
};

export function createPlatformOfflineStorage(
  storage: OfflineStorageAdapter = createDefaultOfflineStorage(),
): PlatformOfflineStorage {
  return {
    getItem(key) {
      return storage.getItem(key);
    },
    async setItemSoft(key, value) {
      try {
        await storage.setItem(key, value);
        return success;
      } catch (error) {
        return recordPlatformStorageSoftFailure({
          scope: "platform.offlineStorage.setItemSoft",
          surface: "offline_storage",
          key,
          error,
        });
      }
    },
    async removeItemSoft(key) {
      try {
        await storage.removeItem(key);
        return success;
      } catch (error) {
        return recordPlatformStorageSoftFailure({
          scope: "platform.offlineStorage.removeItemSoft",
          surface: "offline_storage",
          key,
          error,
        });
      }
    },
  };
}
