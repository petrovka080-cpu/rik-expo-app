// src/screens/warehouse/warehouse.utils.ts
import { Alert, Platform } from "react-native";

export const nz = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const pickErr = (e: any) =>
  String(e?.message || e?.error_description || e?.hint || JSON.stringify(e) || "Ошибка");

export const showErr = (e: any) => Alert.alert("Ошибка", pickErr(e));

export const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();

export const parseNum = (v: any, d = 0): number => {
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
  let t: any;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(s),
  );

export const webUnstickPress = () => {
  if (Platform.OS !== "web") return;
  try {
    const el: any = (document as any)?.activeElement;
    el?.blur?.();
  } catch {}
};

export const safeAlert = (title: string, msg?: string) => {
  if (Platform.OS === "web") (window as any).alert([title, msg].filter(Boolean).join("\n"));
  else Alert.alert(title, msg ?? "");
};

// ---------- storage (web localStorage / native AsyncStorage) ----------
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

export async function saveJson(key: string, value: any): Promise<void> {
  try {
    await saveString(key, JSON.stringify(value));
  } catch {}
}

/**
 * ✅ Канонизация material code для склада/выдачи:
 * - кириллическая П -> латинская P
 * - дефисы нормализуем
 * - лишние пробелы режем
 */
export const normMatCode = (raw: any) => {
  const s = String(raw ?? "").trim();
  return s
    .replace(/[Пп]/g, "P")
    .replace(/[—–−]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

/**
 * ✅ RU -> LAT для поиска.
 * Этого достаточно, чтобы "бетон" находил "BETON".
 */
export const ruToLat = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/ж/g, "zh")
    .replace(/ч/g, "ch")
    .replace(/ш/g, "sh")
    .replace(/щ/g, "sch")
    .replace(/ю/g, "yu")
    .replace(/я/g, "ya")
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

/**
 * ✅ Умный поиск:
 * - ищем обычным norm()
 * - если не нашли — ищем по ru->lat версии
 */
export const matchQuerySmart = (hay: string, q: string) => {
  const qq = norm(q);
  if (!qq) return true;

  const h1 = norm(hay);
  if (h1.includes(qq)) return true;

  const h2 = norm(ruToLat(hay));
  const q2 = norm(ruToLat(q));
  return h2.includes(q2);
};
export const normUomId = (raw: any) => {
  const s = String(raw ?? "").trim();
  if (s === "м") return "m";
  if (s === "м²" || s === "м2") return "m2";
  if (s === "м³" || s === "м3") return "m3";
  return s;
};
