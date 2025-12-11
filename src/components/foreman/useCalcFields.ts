import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

export type BasisKey = string;

export type Field = {
  key: BasisKey;
  label: string;
  uom?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: number | null;
  order?: number | null;
};

/**
 * Базовые типовые поля калькулятора:
 * площадь, периметр, длина, высота, слои, масса и т.п.
 */
const BASIS_META: Record<string, Partial<Field>> = {
  area_m2: {
    label: "Площадь",
    uom: "м²",
    hint: "длина × ширина",
  },
  perimeter_m: {
    label: "Периметр",
    uom: "м",
    hint: "по стенам / плинтусу",
  },
  length_m: {
    label: "Длина",
    uom: "м",
    hint: "кабель / штроба / профиль",
  },
  height_m: {
    label: "Высота",
    uom: "м",
    hint: "от пола до потолка",
  },
  width_m: {
    label: "Ширина",
    uom: "м",
    hint: "в свету / по проёму",
  },
  depth_m: {
    label: "Глубина",
    uom: "м",
    hint: "толщина слоя / ниши",
  },
  thickness_m: {
    label: "Толщина",
    uom: "м",
    hint: "толщина конструкции",
  },
  thickness_mm: {
    label: "Толщина",
    uom: "мм",
    hint: "толщина конструкции",
  },
  volume_m3: {
    label: "Объём",
    uom: "м³",
    hint: "бетон / заливки",
  },
  points: {
    label: "Точки",
    uom: "шт",
    hint: "розетки / выпуски / краны",
  },
  count: {
    label: "Количество",
    uom: "шт",
    hint: "двери / комплекты",
  },
  multiplier: {
    label: "Множитель",
    hint: "доп. коэффициент",
  },
  slope_pct: {
    label: "Уклон",
    uom: "%",
    hint: "градусы / проценты",
  },
  angle_deg: {
    label: "Угол",
    uom: "°",
  },
  diameter_mm: {
    label: "Диаметр",
    uom: "мм",
  },
  diameter_m: {
    label: "Диаметр",
    uom: "м",
  },
  step_m: {
    label: "Шаг",
    uom: "м",
  },
  step_mm: {
    label: "Шаг",
    uom: "мм",
  },
  rows: {
    label: "Ряды",
    uom: "шт",
  },
  layers: {
    label: "Слои",
    uom: "шт",
  },
  weight_kg: {
    label: "Масса",
    uom: "кг",
  },
  weight_t: {
    label: "Масса",
    uom: "т",
  },
};

/**
 * Текстовые синонимы — чтобы из любых подписей/ключей
 * (area, м2, площадь и т.п.) получить нормальный BasisKey.
 */
const TEXT_SYNONYMS: Record<string, string[]> = {
  area_m2: ["area_m2", "area", "m2", "м2", "м^2", "площадь"],
  perimeter_m: ["perimeter_m", "perimeter", "pm", "п.м.", "пм", "периметр"],
  length_m: ["length_m", "length", "l_m", "м", "длина"],
  height_m: ["height_m", "height", "h", "высота"],
  width_m: ["width_m", "width", "ширина"],
  depth_m: ["depth_m", "depth", "глубина"],
  thickness_m: ["thickness_m", "thickness", "толщина", "t_m"],
  thickness_mm: [
    "thickness_mm",
    "thicknessmm",
    "t_mm",
    "толщина_мм",
    "толщ.мм",
  ],
  volume_m3: ["volume_m3", "volume", "m3", "м3", "объем", "объём"],
  points: ["points", "point", "точки", "точка", "шт", "шт."],
  count: ["count", "qty", "pieces", "pcs", "шт", "количество", "кол-во"],
  multiplier: ["multiplier", "coef", "коэф", "коэфф", "множитель"],
  slope_pct: ["slope_pct", "slope", "уклон", "%", "процент", "проценты"],
  angle_deg: ["angle_deg", "angle", "угол", "градусы", "°"],
  diameter_mm: ["diameter_mm", "d_mm", "диаметр", "диаметр_мм", "d"],
  diameter_m: ["diameter_m", "d_m", "диаметр", "диаметр_м"],
  step_m: ["step_m", "step", "шаг", "шаг_м"],
  step_mm: ["step_mm", "stepmm", "шаг_мм", "шагмм"],
  rows: ["rows", "row", "ряды", "ряд"],
  layers: ["layers", "layer", "слои", "слой"],
  weight_kg: ["weight_kg", "kg", "масса", "вес", "кг"],
  weight_t: ["weight_t", "t", "тонн", "тонны", "масса_т"],
};

/**
 * Нормализация произвольного текста в BasisKey.
 * Например: "Площадь", "м2", "area" → "area_m2"
 */
export function resolveBasisKeyFromText(raw: string): BasisKey | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();

  for (const [key, list] of Object.entries(TEXT_SYNONYMS)) {
    if (list.some((s) => s.toLowerCase() === t)) {
      return key as BasisKey;
    }
  }

  return null;
}

/**
 * Достаём метаданные поля по ключу с учётом дефолтных значений.
 */
export function getBasisFieldMeta(key: BasisKey): Field {
  const base = BASIS_META[key] ?? {};
  return {
    key,
    label: base.label ?? key,
    uom: base.uom,
    hint: base.hint,
    required: base.required,
    defaultValue: base.defaultValue ?? null,
    order: base.order ?? null,
  };
}

/**
 * Минимальный хук useCalcFields, чтобы CalcModal не падал.
 * Если в CalcModal используются basisValues / setBasisValue —
 * мы тоже их возвращаем.
 */
type CalcValues = Record<BasisKey, number | null>;

export function useCalcFields(..._args: any[]) {
  const [fields] = useState<Field[]>([]);
  const [values, setValues] = useState<CalcValues>({});

  const setValue = (key: BasisKey, v: number | null) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const reset = () => setValues({});

  return {
    // основные
    fields,
    values,
    setValue,
    reset,
    loading: false,
    error: null as string | null,

    // алиасы на всякий случай, если CalcModal ждёт именно такие имена
    basisValues: values,
    setBasisValue: setValue,
  };
}

