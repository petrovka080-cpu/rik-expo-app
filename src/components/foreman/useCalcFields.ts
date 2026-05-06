import { useEffect, useState } from "react";
import {
  loadPagedRowsWithCeiling,
  type PagedQuery,
} from "../../../src/lib/api/_core";
import { supabase } from "../../../src/lib/supabaseClient";
import { enrichFieldUiMeta, type FieldUiPriority } from "./calcFieldProfiles";
import { normalizeWorkTypeCode } from "./workTypeCode";

export type BasisKey = string;
const isDemoWorkType = (code?: string | null) => {
  const c = normalizeWorkTypeCode(code);
  return c.startsWith("WT-DEM-") || c === "WT-DEMO";
};

export type Field = {
  key: BasisKey;
  label: string;
  displayLabelRu?: string;
  displayHintRu?: string;
  uom?: string | null;
  hint?: string | null;
  required?: boolean;
  defaultValue?: number | null;
  order?: number | null;
  usedInNorms?: boolean;
  familyCode?: string;
  semanticRole?: string;
  uiPriority?: FieldUiPriority;
  visibleInBaseUi?: boolean;
  editable?: boolean;
  hiddenInUi?: boolean;
};

type CalcValues = Record<BasisKey, number | null>;
const CALC_FIELDS_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
};
type CalcFieldsViewName =
  | "v_reno_calc_fields_ui_clean"
  | "v_reno_calc_fields_ui";

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

async function fetchCalcFieldRows(
  viewName: CalcFieldsViewName,
  workTypeCode: string,
): Promise<FieldRow[]> {
  const result = await loadPagedRowsWithCeiling<unknown>(
    () =>
      supabase
        .from(viewName)
        .select(
          `
        basis_key,
        label_ru,
        uom_code,
        is_required,
        hint_ru,
        default_value,
        sort_order,
        used_in_norms
      `,
        )
        .eq("work_type_code", workTypeCode)
        .order("sort_order", { ascending: true })
        .order("basis_key", {
          ascending: true,
        }) as unknown as PagedQuery<unknown>,
    CALC_FIELDS_PAGE_DEFAULTS,
  );

  if (result.error) throw result.error;

  return (result.data ?? [])
    .map(toFieldRow)
    .filter((row): row is FieldRow => Boolean(row));
}

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
      const rawWorkTypeCode = String(workTypeCode ?? "").trim();
      if (!rawWorkTypeCode) {
        setFields([]);
        setError(null);
        return;
      }
      const normalizedWorkTypeCode = normalizeWorkTypeCode(rawWorkTypeCode);

      setLoading(true);
      setError(null);

      try {
        const viewName: CalcFieldsViewName = isDemoWorkType(rawWorkTypeCode)
          ? "v_reno_calc_fields_ui_clean"
          : "v_reno_calc_fields_ui";

        let familyCode: string | null = null;
        try {
          const familyRes = await supabase
            .from("v_work_types_picker")
            .select("family_code")
            .eq("code", rawWorkTypeCode)
            .maybeSingle();
          familyCode = String(familyRes.data?.family_code ?? "").trim() || null;
        } catch {
          familyCode = null;
        }

        const rawList = await fetchCalcFieldRows(viewName, rawWorkTypeCode);

        const allKeys = rawList.map((r) => r.basis_key);

        const list: Field[] = rawList.map((r) => {
          const uiMeta = enrichFieldUiMeta({
            workTypeCode: normalizedWorkTypeCode,
            familyCode,
            basisKey: r.basis_key,
            originalLabel: r.label_ru || r.basis_key,
            originalHint: r.hint_ru ?? null,
            allBasisKeys: allKeys,
          });
          return {
            key: r.basis_key,
            label: uiMeta.displayLabelRu || r.label_ru || r.basis_key,
            displayLabelRu: uiMeta.displayLabelRu,
            uom: r.uom_code ?? null,
            hint: uiMeta.displayHintRu ?? r.hint_ru ?? null,
            displayHintRu: uiMeta.displayHintRu,
            required: !!r.is_required,
            usedInNorms: !!r.used_in_norms,
            defaultValue:
              typeof r.default_value === "number" ? r.default_value : null,
            order: r.sort_order ?? null,
            familyCode: uiMeta.familyCode,
            semanticRole: uiMeta.semanticRole,
            uiPriority: uiMeta.uiPriority,
            visibleInBaseUi: uiMeta.visibleInBaseUi,
            editable: uiMeta.editable,
            hiddenInUi: uiMeta.hiddenInUi,
          };
        });

        if (!cancelled) {
          setFields(list.filter((f) => f.hiddenInUi !== true));
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
