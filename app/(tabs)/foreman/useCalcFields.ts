import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../src/lib/supabaseClient';

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

const BASIS_META: Record<string, Partial<Field>> = {
  area_m2: { label: 'Площадь', uom: 'м²', hint: 'длина × ширина' },
  perimeter_m: { label: 'Периметр', uom: 'м', hint: 'по стенам/плинтусу' },
  length_m: { label: 'Длина', uom: 'м', hint: 'кабель/штробы/профили' },
  height_m: { label: 'Высота', uom: 'м', hint: 'от пола до потолка' },
  width_m: { label: 'Ширина', uom: 'м', hint: 'в свету/по проёму' },
  depth_m: { label: 'Глубина', uom: 'м', hint: 'толщина слоя/ниши' },
  thickness_m: { label: 'Толщина', uom: 'м', hint: 'толщина конструкции' },
  thickness_mm: { label: 'Толщина', uom: 'мм', hint: 'толщина конструкции' },
  volume_m3: { label: 'Объём', uom: 'м³', hint: 'бетон/заливки' },
  points: { label: 'Точки', uom: 'шт', hint: 'розетки/выпуски/краны' },
  count: { label: 'Количество', uom: 'шт', hint: 'двери/комплекты' },
  multiplier: { label: 'Множитель', hint: 'доп. коэффициент' },
  slope_pct: { label: 'Уклон', uom: '%', hint: 'градусы/проценты' },
  angle_deg: { label: 'Угол', uom: '°' },
  diameter_mm: { label: 'Диаметр', uom: 'мм' },
  diameter_m: { label: 'Диаметр', uom: 'м' },
  step_m: { label: 'Шаг', uom: 'м' },
  step_mm: { label: 'Шаг', uom: 'мм' },
  rows: { label: 'Ряды', uom: 'шт' },
  layers: { label: 'Слои', uom: 'шт' },
  weight_kg: { label: 'Масса', uom: 'кг' },
  weight_t: { label: 'Масса', uom: 'т' },
};

const TEXT_SYNONYMS: Record<string, string[]> = {
  area_m2: ['area_m2', 'area', 'm2', 'м2', 'м^2', 'площадь'],
  perimeter_m: ['perimeter_m', 'perimeter', 'pm', 'п.м.', 'пм', 'периметр'],
  length_m: ['length_m', 'length', 'l_m', 'м', 'длина'],
  height_m: ['height_m', 'height', 'h', 'высота'],
  width_m: ['width_m', 'width', 'ширина'],
  depth_m: ['depth_m', 'depth', 'глубина'],
  thickness_m: ['thickness_m', 'thickness', 'толщина', 't_m'],
  thickness_mm: ['thickness_mm', 'thickness_mm', 't_mm', 'толщина_мм'],
  volume_m3: ['volume_m3', 'volume', 'm3', 'м3', 'объем', 'объём'],
  points: ['points', 'point', 'точки', 'точка', 'шт'],
  count: ['count', 'qty', 'pieces', 'pcs', 'шт', 'количество'],
  multiplier: ['multiplier', 'coef', 'коэффициент'],
  slope_pct: ['slope_pct', 'slope', 'уклон'],
  angle_deg: ['angle_deg', 'angle', 'угол'],
  diameter_mm: ['diameter_mm', 'diameter', 'диаметр', 'd_mm'],
  diameter_m: ['diameter_m', 'diameter_m', 'd_m'],
  step_m: ['step_m', 'step', 'шаг'],
  step_mm: ['step_mm', 'step_mm', 'шаг_мм'],
  rows: ['rows', 'ряды', 'row'],
  layers: ['layers', 'слои', 'layer'],
  weight_kg: ['weight_kg', 'kg', 'масса_кг'],
  weight_t: ['weight_t', 't', 'тонны'],
};

const truthy = (val: unknown): boolean | undefined => {
  if (val == null) return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const t = val.trim().toLowerCase();
    if (!t) return undefined;
    if (['true', 't', '1', 'yes', 'y', 'да'].includes(t)) return true;
    if (['false', 'f', '0', 'no', 'n', 'нет'].includes(t)) return false;
  }
  return undefined;
};

const toNumber = (val: unknown): number | undefined => {
  if (val == null) return undefined;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : undefined;
  }
  if (typeof val === 'string') {
    const num = Number(val.replace(',', '.'));
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
};

function normalizeBasis(basisTxt: string | null | undefined): BasisKey | null {
  const raw = (basisTxt ?? '').trim();
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  for (const [key, variants] of Object.entries(TEXT_SYNONYMS)) {
    if (variants.includes(lowered)) return key;
  }
  return lowered.replace(/\s+/g, '_');
}

function fallbackLabel(key: BasisKey) {
  return key
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function useCalcFields(workTypeCode?: string) {
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workTypeCode) {
      setFields([]);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('reno_norm_rules')
          .select('*')
          .eq('work_type_code', workTypeCode)
          .order('input_order', { ascending: true, nullsFirst: true })
          .order('basis', { ascending: true })
          .limit(5000);

        if (fetchError) throw fetchError;

        const aggregated = new Map<BasisKey, Field>();

        (data ?? []).forEach((row) => {
          const key = normalizeBasis((row as any).basis);
          if (!key) return;

          const template = BASIS_META[key] ?? {};
          const prev = aggregated.get(key) ?? {
            key,
            label: template.label ?? fallbackLabel(key),
            hint: template.hint,
            uom: template.uom,
            required: false,
            defaultValue: undefined,
            order: null,
          };

          const label =
            (row as any).basis_label_ru ??
            (row as any).basis_label ??
            (row as any).input_label_ru ??
            (row as any).input_label ??
            prev.label ??
            template.label ??
            fallbackLabel(key);

          const hint =
            (row as any).basis_hint_ru ??
            (row as any).basis_hint ??
            (row as any).input_hint_ru ??
            (row as any).input_hint ??
            prev.hint ??
            template.hint;

          const uom =
            (row as any).uom_name_ru ??
            (row as any).uom_name ??
            (row as any).uom_code ??
            prev.uom ??
            template.uom;

          const requiredFlag = truthy(
            (row as any).basis_required ??
              (row as any).input_required ??
              (row as any).is_required ??
              (row as any).required,
          );

          const defaultValue =
            toNumber((row as any).default_basis_value) ??
            toNumber((row as any).default_value) ??
            toNumber((row as any).basis_default_value) ??
            toNumber((row as any).input_default_value) ??
            toNumber((row as any).default_input_value) ??
            prev.defaultValue ??
            (template.defaultValue as number | undefined);

          const order =
            toNumber((row as any).input_order) ??
            toNumber((row as any).order_index) ??
            toNumber((row as any).sort_order) ??
            toNumber((row as any).basis_order) ??
            toNumber((row as any).order) ??
            prev.order ??
            null;

          aggregated.set(key, {
            key,
            label,
            hint,
            uom,
            required: prev.required || requiredFlag === true,
            defaultValue,
            order,
          });
        });

        if (!cancelled) {
          const list = Array.from(aggregated.values()).sort((a, b) => {
            const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) return orderA - orderB;
            return a.label.localeCompare(b.label, 'ru');
          });
          setFields(list);
        }
      } catch (err: any) {
        console.error('[useCalcFields]', err?.message ?? err);
        if (!cancelled) {
          setFields([]);
          setError(err?.message ?? 'Не удалось загрузить нормы');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workTypeCode]);

  const hasOnlyCount = useMemo(() => fields.length === 1 && fields[0]?.key === 'count', [fields]);

  return { loading, fields, hasOnlyCount, error };
}
