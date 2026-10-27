import type { BasisKey, Field } from "./useCalcFields";
import { formatCalcNumber, normalizeCalcRawInput } from "./calcModal.normalize";

export type CalcModalMeasures = Partial<Record<BasisKey, number>>;
export type CalcModalInputs = Partial<Record<BasisKey, string>>;
export type CalcModalFieldErrors = Partial<Record<BasisKey, string>>;
export type CalcModalFormState = {
  inputs: CalcModalInputs;
  measures: CalcModalMeasures;
  errors: CalcModalFieldErrors;
};

export type CalcModalRow = {
  work_type_code: string;
  rik_code: string;
  section: string;
  uom_code: string;
  basis: string;
  base_coeff: number;
  effective_coeff: number;
  qty: number;
  suggested_qty: number | null;
  packs: number | null;
  pack_size: number | null;
  pack_uom: string | null;
  hint: string | null;
  item_name_ru: string | null;
};

export type CalcAutoRuleContext = {
  workTypeCode?: string | null;
  filmTouched: boolean;
  manualKeys: ReadonlySet<string>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const toFiniteNumberOrNull = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toFiniteNumberOrZero = (value: unknown) => {
  const numeric = toFiniteNumberOrNull(value);
  return numeric ?? 0;
};

export const EMPTY_CALC_MODAL_FORM_STATE: CalcModalFormState = {
  inputs: {},
  measures: {},
  errors: {},
};

export const qtyIssue = (value: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.ceil(numeric);
};

export const rowKeyOf = (row: Pick<CalcModalRow, "section" | "rik_code">) =>
  `${row.section}:${row.rik_code}`;

export const normalizeCalcRow = (value: unknown): CalcModalRow => {
  const row = isRecord(value) ? value : {};
  return {
    work_type_code: String(row.work_type_code ?? ""),
    rik_code: String(row.rik_code ?? ""),
    section: String(row.section ?? ""),
    uom_code: String(row.uom_code ?? ""),
    basis: String(row.basis ?? ""),
    base_coeff: toFiniteNumberOrZero(row.base_coeff),
    effective_coeff: toFiniteNumberOrZero(row.effective_coeff),
    qty: toFiniteNumberOrZero(row.qty),
    suggested_qty: toFiniteNumberOrNull(row.suggested_qty),
    packs: toFiniteNumberOrNull(row.packs),
    pack_size: toFiniteNumberOrNull(row.pack_size),
    pack_uom: row.pack_uom == null ? null : String(row.pack_uom),
    hint: row.hint == null ? null : String(row.hint),
    item_name_ru: row.item_name_ru == null ? null : String(row.item_name_ru),
  };
};

export const normalizeCalcRows = (value: unknown): CalcModalRow[] =>
  Array.isArray(value) ? value.map(normalizeCalcRow) : [];

export const applyCalcAutoRules = (
  measures: CalcModalMeasures,
  inputs: CalcModalInputs,
  context: CalcAutoRuleContext,
): CalcModalFormState => {
  const nextMeasures: CalcModalMeasures = { ...measures };
  const nextInputs: CalcModalInputs = { ...inputs };

  if (context.workTypeCode === "ind_concrete" && !context.filmTouched) {
    const area = nextMeasures.area_m2;
    const film = nextMeasures.film_m2;
    if (typeof area === "number" && Number.isFinite(area) && !(typeof film === "number" && Number.isFinite(film))) {
      nextMeasures.film_m2 = area;
      nextInputs.film_m2 = formatCalcNumber(area);
    }
  }

  if (!context.manualKeys.has("area_m2")) {
    const length = nextMeasures.length_m;
    const perimeter = nextMeasures.perimeter_m;
    const height = nextMeasures.height_m;
    const openingsArea = nextMeasures.area_wall_m2;

    const hasLengthHeight =
      typeof length === "number" &&
      Number.isFinite(length) &&
      typeof height === "number" &&
      Number.isFinite(height);

    const hasPerimeterHeight =
      typeof perimeter === "number" &&
      Number.isFinite(perimeter) &&
      typeof height === "number" &&
      Number.isFinite(height);

    let area: number | null = null;
    if (hasLengthHeight) {
      area = length * height;
    } else if (hasPerimeterHeight) {
      area = perimeter * height;
    }

    if (area != null) {
      if (
        typeof openingsArea === "number" &&
        Number.isFinite(openingsArea) &&
        openingsArea > 0
      ) {
        area = Math.max(0, area - openingsArea);
      }

      const currentArea = nextMeasures.area_m2;
      if (!(typeof currentArea === "number" && Number.isFinite(currentArea))) {
        const output = Number(area.toFixed(3));
        nextMeasures.area_m2 = output;
        nextInputs.area_m2 = formatCalcNumber(output);
      }
    }
  }

  if (!context.manualKeys.has("volume_m3")) {
    const area = nextMeasures.area_m2;
    const thickness = nextMeasures.height_m;
    const perimeter = nextMeasures.perimeter_m;
    const width = nextMeasures.length_m;

    const hasAreaThickness =
      typeof area === "number" &&
      Number.isFinite(area) &&
      typeof thickness === "number" &&
      Number.isFinite(thickness);

    const hasStripDimensions =
      typeof perimeter === "number" &&
      Number.isFinite(perimeter) &&
      typeof width === "number" &&
      Number.isFinite(width) &&
      typeof thickness === "number" &&
      Number.isFinite(thickness);

    let derivedVolume: number | null = null;
    if (hasStripDimensions) {
      derivedVolume = perimeter * width * thickness;
    } else if (hasAreaThickness) {
      derivedVolume = area * thickness;
    }

    if (derivedVolume != null) {
      const volume = Number(derivedVolume.toFixed(3));
      const currentVolume = nextMeasures.volume_m3;
      if (!(typeof currentVolume === "number" && Number.isFinite(currentVolume))) {
        nextMeasures.volume_m3 = volume;
        nextInputs.volume_m3 = formatCalcNumber(volume);
      }
    }
  }

  return {
    inputs: nextInputs,
    measures: nextMeasures,
    errors: {},
  };
};

export const buildCalcPayload = (
  fields: readonly Field[],
  measures: CalcModalMeasures,
  lossValue: number,
) => {
  const payload: Record<string, number> = {};

  for (const field of fields) {
    const value = measures[field.key];
    if (typeof value === "number" && Number.isFinite(value)) {
      payload[field.key] = value;
    }
  }

  if (typeof measures.multiplier === "number" && Number.isFinite(measures.multiplier)) {
    payload.multiplier = measures.multiplier;
    return payload;
  }

  const lossFromField =
    typeof measures.loss === "number" && Number.isFinite(measures.loss)
      ? measures.loss
      : typeof measures.waste_pct === "number" && Number.isFinite(measures.waste_pct)
        ? measures.waste_pct
        : null;

  payload.loss = lossFromField ?? (Number.isFinite(lossValue) ? lossValue : 0);
  return payload;
};

export const incrementCalcRowQty = (
  rows: CalcModalRow[] | null,
  rowKey: string,
  delta: number,
) => {
  if (!rows) return rows;
  return rows.map((row) => {
    if (rowKeyOf(row) !== rowKey) return row;
    const nextQty = Math.max(0, Number(row.qty ?? 0) + delta);
    return { ...row, qty: nextQty };
  });
};

export const setCalcRowQty = (
  rows: CalcModalRow[] | null,
  rowKey: string,
  rawValue: string,
) => {
  if (!rows) return rows;
  const normalized = normalizeCalcRawInput(rawValue).replace(",", ".").trim();
  const value = Number(normalized);
  if (!Number.isFinite(value)) return rows;

  return rows.map((row) => {
    if (rowKeyOf(row) !== rowKey) return row;
    return { ...row, qty: value };
  });
};

export const removeCalcRow = (rows: CalcModalRow[] | null, rowKey: string) => {
  if (!rows) return rows;
  return rows.filter((row) => rowKeyOf(row) !== rowKey);
};
