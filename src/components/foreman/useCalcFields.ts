

import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

export type BasisKey = string;

export type Field = {
  key: BasisKey;
  label: string;
  uom?: string | null;
  hint?: string | null;
  required?: boolean;
  defaultValue?: number | null;
  order?: number | null;
};

type CalcValues = Record<BasisKey, number | null>;

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
        const { data, error } = await supabase
          .from("v_reno_calc_fields_ui")
          .select(
            `
            basis_key,
            label_ru,
            uom_code,
            is_required,
            hint_ru,
            default_value,
            sort_order
          `,
          )
          .eq("work_type_code", code)
          .order("sort_order", { ascending: true });

        if (error) throw error;

        const list: Field[] = (data ?? []).map((r: any) => ({
          key: r.basis_key,
          label: r.label_ru || r.basis_key,
          uom: r.uom_code,
          hint: r.hint_ru,
          required: !!r.is_required,
          defaultValue:
            typeof r.default_value === "number"
              ? r.default_value
              : null,
          order: r.sort_order,
        }));

        if (!cancelled) {
          setFields(list);
          setValues((prev) => {
            const next = { ...prev };
            for (const f of list) {
              if (
                next[f.key] === undefined &&
                f.defaultValue != null
              ) {
                next[f.key] = f.defaultValue;
              }
            }
            return next;
          });
        }
      } catch (e: any) {
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

    // алиасы под CalcModal (ты их уже используешь)
    basisValues: values,
    setBasisValue: setValue,
  };
}
