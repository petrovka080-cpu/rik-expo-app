// src/screens/warehouse/warehouse.utils.ts
import { Alert, Platform } from "react-native";
import type { ReqHeaderContext } from "./warehouse.types";

export const nz = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const pickErr = (e: unknown) => {
  const err = e as { message?: string; error_description?: string; hint?: string } | null;
  return String(err?.message || err?.error_description || err?.hint || JSON.stringify(e) || "ќшибка");
};

export const showErr = (e: unknown) => Alert.alert("ќшибка", pickErr(e));

export const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/Є/g, "е")
    .replace(/\s+/g, " ")
    .trim();

export const parseNum = (v: unknown, d = 0): number => {
  if (v == null) return d;
  const s = String(v).trim();
  if (s === "") return d;
  const cleaned = s.replace(/[^\d,\.\-]+/g, "").replace(",", ".").replace(/\s+/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : d;
};

export const parseQty = (s: string | undefined | null, left: number) => {
  if (s == null || String(s).trim() === "") return Math.max(0, left);
  const t = String(s).replace(",", ".").replace(/\s+/g, "").trim();
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, Math.max(0, left));
};

export const parseQtySelected = (s: string | undefined | null, left: number) => {
  if (s == null || String(s).trim() === "") return 0;
  const t = String(s).replace(",", ".").replace(/\s+/g, "").replace(/\u00a0/g, "").trim();
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, Math.max(0, left));
};

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (t) clearTimeout(t);
  });
}

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(s),
  );

export const webUnstickPress = () => {
  if (Platform.OS !== "web") return;
  try {
    const el = document.activeElement as HTMLElement | null;
    el?.blur?.();
  } catch {}
};

export const safeAlert = (title: string, msg?: string) => {
  if (Platform.OS === "web") window.alert([title, msg].filter(Boolean).join("\n"));
  else Alert.alert(title, msg ?? "");
};

export async function loadString(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") return window.localStorage.getItem(key);
    const mod = await import("@react-native-async-storage/async-storage");
    return await mod.default.getItem(key);
  } catch {
    return null;
  }
}

export async function saveString(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(key, value);
      return;
    }
    const mod = await import("@react-native-async-storage/async-storage");
    await mod.default.setItem(key, value);
  } catch {}
}

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await loadString(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    await saveString(key, JSON.stringify(value));
  } catch {}
}

export const normMatCode = (raw: unknown) => {
  const s = String(raw ?? "").trim();
  return s
    .replace(/[ѕп]/g, "P")
    .replace(/[ЧЦ?]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

export const ruToLat = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/Є/g, "е")
    .replace(/ж/g, "zh")
    .replace(/ч/g, "ch")
    .replace(/ш/g, "sh")
    .replace(/щ/g, "sch")
    .replace(/ю/g, "yu")
    .replace(/€/g, "ya")
    .replace(/а/g, "a")
    .replace(/б/g, "b")
    .replace(/в/g, "v")
    .replace(/г/g, "g")
    .replace(/д/g, "d")
    .replace(/е/g, "e")
    .replace(/з/g, "z")
    .replace(/и/g, "i")
    .replace(/й/g, "y")
    .replace(/к/g, "k")
    .replace(/л/g, "l")
    .replace(/м/g, "m")
    .replace(/н/g, "n")
    .replace(/о/g, "o")
    .replace(/п/g, "p")
    .replace(/р/g, "r")
    .replace(/с/g, "s")
    .replace(/т/g, "t")
    .replace(/у/g, "u")
    .replace(/ф/g, "f")
    .replace(/х/g, "h")
    .replace(/ц/g, "ts")
    .replace(/ъ/g, "")
    .replace(/ы/g, "y")
    .replace(/ь/g, "")
    .replace(/э/g, "e");

export const matchQuerySmart = (hay: string, q: string) => {
  const qq = norm(q);
  if (!qq) return true;

  const h1 = norm(hay);
  if (h1.includes(qq)) return true;

  const h2 = norm(ruToLat(hay));
  const q2 = norm(ruToLat(q));
  return h2.includes(q2);
};

export const normUomId = (raw: unknown) => {
  const s = String(raw ?? "").trim();
  if (s === "м") return "m";
  if (s === "м?" || s === "м2") return "m2";
  if (s === "м?" || s === "м3") return "m3";
  return s;
};

export function parseReqHeaderContext(rawParts: Array<string | null | undefined>): ReqHeaderContext {
  const out: ReqHeaderContext = {
    contractor: "",
    phone: "",
    volume: "",
  };
  const put = (key: keyof ReqHeaderContext, value: string) => {
    const next = value.trim();
    if (!next || out[key]) return;
    out[key] = next;
  };

  for (const raw of rawParts) {
    const lines = String(raw || "")
      .split(/[\r\n;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!match) continue;
      const key = String(match[1] || "").trim().toLowerCase();
      const value = String(match[2] || "").trim();
      if (!value) continue;

      if (
        !out.contractor &&
        (key.includes("подр€д") || key.includes("contractor") || key.includes("наименование организации") || key.includes("организац"))
      ) {
        put("contractor", value);
      } else if (!out.phone && (key.includes("тел") || key.includes("phone"))) {
        put("phone", value);
      } else if (!out.volume && (key.includes("объ") || key.includes("volume"))) {
        put("volume", value);
      }
    }
  }

  return out;
}
