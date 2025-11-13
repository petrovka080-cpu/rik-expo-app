import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../src/lib/supabaseClient';

export type BasisKey = 'area_m2' | 'perimeter_m' | 'length_m' | 'points' | 'volume_m3' | 'count';
export type Field = { key: BasisKey; label: string; uom?: string; hint?: string; required?: boolean };

const BASIS_MAP: Record<BasisKey, Field> = {
  area_m2:     { key: 'area_m2',     label: 'Площадь',  uom: 'м', hint: 'длина  ширина' },
  perimeter_m: { key: 'perimeter_m', label: 'Периметр', uom: 'м',  hint: 'по стенам/плинтусу' },
  length_m:    { key: 'length_m',    label: 'Длина',    uom: 'м',  hint: 'кабель/штробы/профили' },
  points:      { key: 'points',      label: 'Точки',    uom: 'шт', hint: 'розетки/выпуски/краны' },
  volume_m3:   { key: 'volume_m3',   label: 'Объём',    uom: 'м', hint: 'бетон/заливки' },
  count:       { key: 'count',       label: 'Количество', uom: 'шт', hint: 'двери/комплекты' },
};

const TEXT_SYNONYMS: Record<BasisKey, string[]> = {
  area_m2:     ['area_m2','area','m2','м2','м'],
  perimeter_m: ['perimeter_m','perimeter','pm','п.м.','пм','периметр'],
  length_m:    ['length_m','length','m','м'],
  points:      ['points','point','точки','точка','шт'],
  volume_m3:   ['volume_m3','volume','m3','м3','м'],
  count:       ['count','qty','pieces','pcs'],
};

function normalizeBasis(basisTxt: string | null | undefined): BasisKey | null {
  const t = (basisTxt ?? '').trim().toLowerCase();
  if (!t) return null;
  const entries = Object.entries(TEXT_SYNONYMS) as [BasisKey, string[]][];
  for (const [key, variants] of entries) {
    if (variants.includes(t)) return key;
  }
  return null;
}

export function useCalcFields(workTypeCode?: string) {
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);

  useEffect(() => {
    if (!workTypeCode) return;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('reno_norm_rules')
          .select('basis')
          .eq('work_type_code', workTypeCode)
          .limit(5000);

        if (error) throw error;
        const uniq = Array.from(new Set((data ?? []).map(r => (r as any).basis))).filter(Boolean) as string[];
        const normalized: (BasisKey)[] = Array.from(
          new Set(uniq.map(b => normalizeBasis(String(b))).filter(Boolean) as BasisKey[])
        );
        const list = normalized.map(k => ({ ...BASIS_MAP[k], required: true }));
        setFields(list);
      } catch (e) {
        console.error('[useCalcFields]', e);
        setFields([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [workTypeCode]);

  const hasOnlyCount = useMemo(() => fields.length === 1 && fields[0].key === 'count', [fields]);

  return { loading, fields, hasOnlyCount };
}
