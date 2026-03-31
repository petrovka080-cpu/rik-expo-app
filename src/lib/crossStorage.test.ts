import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  crossStorageGet,
  crossStorageSet,
} from "./crossStorage";

type AsyncStorageMock = {
  clear?: () => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

const storage = AsyncStorage as unknown as AsyncStorageMock;

describe("crossStorage", () => {
  beforeEach(async () => {
    await storage.clear?.();
  });

  it("wraps protected accountant keys with retention envelope", async () => {
    await crossStorageSet("acc_fio", "Accountant User");

    const loaded = await crossStorageGet("acc_fio");
    const raw = await storage.getItem("acc_fio");
    const envelope = JSON.parse(String(raw));

    expect(loaded).toBe("Accountant User");
    expect(envelope.__rikPersisted).toBe(true);
    expect(typeof envelope.expiresAt).toBe("number");
  });

  it("keeps legacy plaintext keys readable", async () => {
    await storage.setItem("legacy_key", "legacy-value");

    await expect(crossStorageGet("legacy_key")).resolves.toBe("legacy-value");
  });
});
