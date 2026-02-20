// src/screens/warehouse/warehouse.uom.ts
import { supabase } from "../../lib/supabaseClient";

import { isUuid } from "./warehouse.utils";

export async function resolveUnitIdByCode(code: string): Promise<string | null> {
  const c = String(code ?? "").trim();
  if (!c) return null;

  try {
    const m = await supabase
      .from("rik_materials" as any)
      .select("unit_id")
      .eq("mat_code", c)
      .maybeSingle();

    if (!m.error && m.data?.unit_id) return String(m.data.unit_id);
    return null;
  } catch {
    return null;
  }
}

export async function resolveUomTextByCode(
  code: string,
  fallback?: string | null,
): Promise<string | null> {
  const fb = String(fallback ?? "").trim();
  if (fb) return fb;

  const c = String(code ?? "").trim();
  if (!c) return null;

  // 1) сначала берём unit_id из rik_materials
  let unit: string = "";
  try {
    const m = await supabase
      .from("rik_materials" as any)
      .select("unit_id")
      .eq("mat_code", c)
      .maybeSingle();

    unit = String(m.data?.unit_id ?? "").trim();
    if (!unit) return null;
  } catch {
    return null;
  }

  
  if (!isUuid(unit)) return unit;

  
  try {
    const u = await supabase
      .from("rik_uoms" as any)
      .select("uom_code")
      .eq("id", unit)
      .maybeSingle();

    const codeText = String((u.data as any)?.uom_code ?? "").trim();
    return codeText || null;
  } catch {
    return null;
  }
}
// ✅ UI/PDF label (RU) при каноне в базе
export const uomLabelRu = (uomAny: any) => {
  const raw = String(uomAny ?? "").trim();
  if (!raw) return "—";

  // нормализуем варианты (м2 / м² / m² / M2 / etc)
  const s = raw
    .replace(/\s+/g, "")
    .replace("²", "2")
    .replace("³", "3")
    .toLowerCase();

  // канон → RU
  if (s === "m") return "м";
  if (s === "m2") return "м²";
  if (s === "m3") return "м³";

  // если уже RU — оставляем как есть
  if (raw === "м" || raw === "м²" || raw === "м³") return raw;

  return raw;
};

// ✅ если когда-нибудь надо вводить RU и сохранять в канон
export const uomCanon = (uomAny: any) => {
  const raw = String(uomAny ?? "").trim();
  if (!raw) return "";

  const s = raw
    .replace(/\s+/g, "")
    .replace("²", "2")
    .replace("³", "3")
    .toLowerCase();

  if (s === "м") return "m";
  if (s === "м2" || s === "м²") return "m2";
  if (s === "м3" || s === "м³") return "m3";

  return raw;
};
