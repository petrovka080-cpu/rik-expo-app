import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabaseClient";
import type { CalcRow, PickedRow } from "./foreman.types";

export const FOREMAN_HISTORY_KEY = "foreman_name_history_v1";
export const DISPLAY_NUMBER_RE = /^(REQ-\d{4}\/\d{4}|[A-ZА-Я]-\d{4,})$/i;

const DRAFT_STATUS_KEYS = new Set(["draft", "черновик", ""]);
export const isDraftLikeStatus = (value?: string | null) =>
  DRAFT_STATUS_KEYS.has(String(value ?? "").trim().toLowerCase());

export const shortId = (rid: string | number | null | undefined) => {
  const s = String(rid ?? "");
  if (!s) return "";
  return /^\d+$/.test(s) ? s : s.slice(0, 8);
};

const toRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

// UI-only normalization for readable material names.
export function ruName(it: unknown): string {
  const row = toRecord(it);
  const direct = row.name_ru ?? row.name_human_ru ?? row.display_name ?? row.alias_ru ?? row.name_human;
  if (direct && String(direct).trim()) return String(direct).trim();

  const code: string = String(row.rik_code ?? row.code ?? "").toUpperCase();
  if (!code) return "";

  const dict: Record<string, string> = {
    MAT: "",
    WRK: "",
    SRV: "",
    BETON: "Бетон",
    CONC: "Бетон",
    MORTAR: "Раствор",
    ROOF: "Кровля",
    TILE: "Плитка",
    FOUND: "Фундамент",
    WALL: "Стена",
    FLOOR: "Пол",
    STEEL: "Сталь",
    METAL: "Металл",
    FRAME: "Каркас",
    FORM: "Опалубка",
    POUR: "Заливка",
    CURE: "Уход",
    EXT: "Наружн.",
    INT: "Внутр.",
  };

  const parts = code
    .split(/[-_]/g)
    .filter(Boolean)
    .map((t) => dict[t] ?? t)
    .filter(Boolean);

  const human = parts.join(" ").replace(/\s+/g, " ").trim();
  return human ? human[0].toUpperCase() + human.slice(1) : code;
}

export async function requestItemAddOrIncAndPatchMeta(
  rid: string,
  rik_code: string,
  qtyAdd: number,
  meta?: {
    note?: string | null;
    app_code?: string | null;
    kind?: string | null;
    name_human?: string | null;
    uom?: string | null;
  },
): Promise<string> {
  if (!rik_code) throw new Error("rik_code is empty");
  const q = Number(qtyAdd);
  if (!Number.isFinite(q) || q <= 0) throw new Error("qty must be > 0");

  const { data: id, error } = await supabase.rpc("request_item_add_or_inc", {
    p_request_id: rid,
    p_rik_code: rik_code,
    p_qty_add: q,
  });

  if (error) throw error;
  const itemId = String(id ?? "").trim();
  if (!itemId) throw new Error("request_item_add_or_inc returned empty id");

  const patch: Record<string, string | number | null> = {};
  if (meta) {
    if (Object.prototype.hasOwnProperty.call(meta, "note")) patch.note = meta.note ?? null;
    if (Object.prototype.hasOwnProperty.call(meta, "app_code")) patch.app_code = meta.app_code ?? null;
    if (Object.prototype.hasOwnProperty.call(meta, "kind")) patch.kind = meta.kind ?? null;
    if (Object.prototype.hasOwnProperty.call(meta, "name_human") && meta.name_human) patch.name_human = meta.name_human;
    if (Object.prototype.hasOwnProperty.call(meta, "uom")) patch.uom = meta.uom ?? null;
  }
  patch.status = "Черновик";

  if (Object.keys(patch).length) {
    try {
      await supabase.from("request_items").update(patch).eq("id", itemId);
    } catch {
      // no-op: metadata update is best-effort
    }
  }

  return itemId;
}

export function aggCalcRows(rows: CalcRow[]) {
  const map = new Map<
    string,
    {
      rik_code: string;
      qty: number;
      uom_code?: string | null;
      name_human?: string | null;
      item_name_ru?: string | null;
      name_ru?: string | null;
      name?: string | null;
    }
  >();

  for (const r of rows || []) {
    const code = String(r?.rik_code ?? "").trim();
    if (!code) continue;

    const q = Number(r?.qty ?? 0);
    if (!Number.isFinite(q) || q <= 0) continue;

    const prev = map.get(code);
    if (!prev) {
      map.set(code, {
        rik_code: code,
        qty: q,
        uom_code: r?.uom_code ?? null,
        name_human: r?.name_human ?? null,
        item_name_ru: r?.item_name_ru ?? null,
        name_ru: r?.name_ru ?? null,
        name: r?.name ?? null,
      });
    } else {
      prev.qty += q;
      if (!prev.uom_code && r?.uom_code) prev.uom_code = r.uom_code;
      if (!prev.item_name_ru && r?.item_name_ru) prev.item_name_ru = r.item_name_ru;
      if (!prev.name_human && r?.name_human) prev.name_human = r.name_human;
      if (!prev.name_ru && r?.name_ru) prev.name_ru = r.name_ru;
      if (!prev.name && r?.name) prev.name = r.name;
    }
  }

  return Array.from(map.values());
}

export function aggPickedRows(rows: PickedRow[]) {
  const map = new Map<string, { base: PickedRow; qty: number }>();

  for (const r of rows || []) {
    const code = String(r?.rik_code ?? "").trim();
    if (!code) continue;
    const q = Number(String(r.qty ?? "").trim().replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) continue;

    const prev = map.get(code);
    if (!prev) map.set(code, { base: r, qty: q });
    else prev.qty += q;
  }

  return Array.from(map.values());
}

export async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Array<{ ok: true; value: R } | { ok: false; error: unknown }>> {
  const n = Math.max(1, Math.min(20, Number(limit) || 6));
  const results: Array<{ ok: true; value: R } | { ok: false; error: unknown }> = new Array(items.length);

  let i = 0;
  const next = async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        const value = await worker(items[idx], idx);
        results[idx] = { ok: true, value };
      } catch (error) {
        results[idx] = { ok: false, error };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => next()));
  return results;
}

export function buildScopeNote(
  objName?: string,
  lvlName?: string,
  sysName?: string,
  zoneName?: string,
) {
  const parts = [
    objName ? `Объект: ${objName}` : "",
    lvlName ? `Этаж/уровень: ${lvlName}` : "",
    sysName ? `Система: ${sysName}` : "",
    zoneName ? `Зона: ${zoneName}` : "",
  ].filter(Boolean);
  return parts.join("; ");
}

export async function loadForemanHistory(): Promise<string[]> {
  try {
    if (Platform.OS === "web") {
      const raw = window.localStorage.getItem(FOREMAN_HISTORY_KEY) || "[]";
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
    }

    const raw = await AsyncStorage.getItem(FOREMAN_HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

export async function saveForemanToHistory(name: string) {
  const v = String(name ?? "").trim();
  if (!v) return;

  const list = await loadForemanHistory();
  const next = [v, ...list.filter((x) => String(x).trim() && x !== v)].slice(0, 12);

  if (Platform.OS === "web") {
    window.localStorage.setItem(FOREMAN_HISTORY_KEY, JSON.stringify(next));
  } else {
    await AsyncStorage.setItem(FOREMAN_HISTORY_KEY, JSON.stringify(next));
  }
}
