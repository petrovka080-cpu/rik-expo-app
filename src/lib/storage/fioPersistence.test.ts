import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  loadStoredFioState,
  saveStoredFioState,
} from "./fioPersistence";

type AsyncStorageMock = {
  clear?: () => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const storage = AsyncStorage as unknown as AsyncStorageMock;

describe("fioPersistence", () => {
  beforeEach(async () => {
    await storage.clear?.();
  });

  it("loads merged history from legacy current key", async () => {
    await storage.setItem("buyer_fio", "Legacy User");
    await storage.setItem("buyer_history_v1", JSON.stringify(["Another User"]));
    await storage.setItem("buyer_confirm_ts", "2026-03-31T00:00:00.000Z");

    const result = await loadStoredFioState({
      screen: "buyer",
      surface: "buyer_fio_confirm",
      keys: {
        currentKey: "buyer_fio",
        confirmKey: "buyer_confirm_ts",
        historyKey: "buyer_history_v1",
      },
    });

    expect(result.currentFio).toBe("Another User");
    expect(result.history).toEqual(["Another User", "Legacy User"]);
    expect(result.lastConfirmIso).toBe("2026-03-31T00:00:00.000Z");
  });

  it("stores history as bounded envelope and removes legacy current key", async () => {
    const nextHistory = await saveStoredFioState({
      screen: "warehouse",
      surface: "warehouseman_fio",
      keys: {
        currentKey: "wh_warehouseman_fio",
        confirmKey: "wh_warehouseman_confirm_ts",
        historyKey: "wh_warehouseman_history_v1",
      },
      fio: "Warehouse User",
      history: ["Older User"],
      confirmedAtIso: "2026-03-31T08:30:00.000Z",
    });

    expect(nextHistory).toEqual(["Older User", "Warehouse User"]);

    const rawHistory = await storage.getItem("wh_warehouseman_history_v1");
    const rawConfirm = await storage.getItem("wh_warehouseman_confirm_ts");
    const legacyCurrent = await storage.getItem("wh_warehouseman_fio");

    expect(legacyCurrent).toBeNull();
    expect(rawHistory).not.toBeNull();
    expect(rawConfirm).not.toBeNull();

    const historyEnvelope = JSON.parse(String(rawHistory));
    const confirmEnvelope = JSON.parse(String(rawConfirm));

    expect(historyEnvelope.__rikPersisted).toBe(true);
    expect(historyEnvelope.value).toEqual(["Older User", "Warehouse User"]);
    expect(typeof historyEnvelope.expiresAt).toBe("number");
    expect(confirmEnvelope.value).toBe("2026-03-31T08:30:00.000Z");
  });
});
