import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  crossStorageGet,
  crossStorageSet,
} from "./crossStorage";
import {
  safeJsonParse,
  safeJsonParseValue,
  safeJsonStringify,
} from "./format";

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

describe("safeJson", () => {
  it("parses valid objects, arrays, and scalar values", () => {
    expect(safeJsonParseValue('{"ok":true}', { ok: false })).toEqual({ ok: true });
    expect(safeJsonParseValue("[1,2]", [])).toEqual([1, 2]);
    expect(safeJsonParseValue('"ready"', "")).toBe("ready");
    expect(safeJsonParseValue("42", 0)).toBe(42);
  });

  it("returns typed fallbacks for nullish, empty, and invalid JSON without throwing", () => {
    expect(safeJsonParseValue(null, { fallback: true })).toEqual({ fallback: true });
    expect(safeJsonParseValue(undefined, ["fallback"])).toEqual(["fallback"]);
    expect(safeJsonParseValue("", 7)).toBe(7);
    expect(() => safeJsonParseValue("{broken", null)).not.toThrow();
    expect(safeJsonParseValue("{broken", [])).toEqual([]);
  });

  it("returns ok=false with the parse error on invalid JSON", () => {
    const result = safeJsonParse("{broken", { fallback: true });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.value).toEqual({ fallback: true });
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  it("stringifies values and returns fallback for circular structures", () => {
    expect(safeJsonStringify({ ok: true })).toBe('{"ok":true}');

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(safeJsonStringify(circular, "fallback-json")).toBe("fallback-json");
  });
});
