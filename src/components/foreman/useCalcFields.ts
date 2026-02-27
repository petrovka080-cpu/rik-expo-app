import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

export type BasisKey = string;
const isDemoWorkType = (code?: string | null) => {
  const c = String(code ?? "").trim();
  return c.startsWith("WT-DEM-") || c === "WT-DEMO";
};

export type Field = {
  key: BasisKey;
  label: string;
  uom?: string | null;
  hint?: string | null;
  required?: boolean;
  defaultValue?: number | null;
  order?: number | null;
  usedInNorms?: boolean;
};

type CalcValues = Record<BasisKey, number | null>;

type FieldRow = {
  basis_key: string;
  label_ru?: string | null;
  uom_code?: string | null;
  is_required?: boolean | null;
  hint_ru?: string | null;
  default_value?: number | null;
  sort_order?: number | null;
  used_in_norms?: boolean | null;
};

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

const toFieldRow = (v: unknown): FieldRow | null => {
  const r = asRecord(v);
  const basis_key = String(r.basis_key ?? "").trim();
  if (!basis_key) return null;
  return {
    basis_key,
    label_ru: r.label_ru == null ? null : String(r.label_ru),
    uom_code: r.uom_code == null ? null : String(r.uom_code),
    is_required: Boolean(r.is_required),
    hint_ru: r.hint_ru == null ? null : String(r.hint_ru),
    default_value: typeof r.default_value === "number" ? r.default_value : null,
    sort_order: typeof r.sort_order === "number" ? r.sort_order : null,
    used_in_norms: Boolean(r.used_in_norms),
  };
};

export function useCalcFields(workTypeCode?: string | null) {
  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<CalcValues>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setValue = (key: BasisKey, v: number | null) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const reset = () => setValues({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const code = String(workTypeCode ?? "").trim();
      if (!code) {
        setFields([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const viewName = isDemoWorkType(code)
          ? "v_reno_calc_fields_ui_clean"
          : "v_reno_calc_fields_ui";

        const { data, error } = await supabase
          .from(viewName)
          .select(`
            basis_key,
            label_ru,
            uom_code,
            is_required,
            hint_ru,
            default_value,
            sort_order,
            used_in_norms
          `)
          .eq("work_type_code", code)
          .order("sort_order", { ascending: true });

        if (error) throw error;

        const list: Field[] = (Array.isArray(data) ? data : [])
          .map(toFieldRow)
          .filter((r): r is FieldRow => !!r)
          .map((r) => ({
            key: r.basis_key,
            label: r.label_ru || r.basis_key,
            uom: r.uom_code ?? null,
            hint: r.hint_ru ?? null,
            required: !!r.is_required,
            usedInNorms: !!r.used_in_norms,
            defaultValue: typeof r.default_value === "number" ? r.default_value : null,
            order: r.sort_order ?? null,
          }));

        if (!cancelled) {
          setFields(list);
        }
      } catch {
        if (!cancelled) {
          setFields([]);
          setError("Не удалось загрузить поля калькулятора");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [workTypeCode]);

  return {
    fields,
    values,
    setValue,
    reset,
    loading,
    error,
    basisValues: values,
    setBasisValue: setValue,
  };
}
