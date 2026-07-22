import type { BoqCategoryV4, EngineeringDimensionV4 } from "./professionalEstimateV4Contract";

export type DimensionAxisV4 =
  | "length"
  | "mass"
  | "time"
  | "temperature"
  | "count"
  | "labor_time"
  | "machine_time"
  | "package"
  | "service"
  | "test"
  | "document"
  | "currency";

export type DimensionVectorV4 = Partial<Record<DimensionAxisV4, number>>;

export type EngineeringUnitDefinitionV4 = {
  unit_id: string;
  symbol: string;
  localized_name_ru: string;
  dimension: EngineeringDimensionV4;
  vector: DimensionVectorV4;
  conversion_factor_to_si: number;
  conversion_offset_to_si: number;
  precision: number;
  allowed_boq_categories: BoqCategoryV4[];
  aliases: string[];
};

const ALL_MEASURED_CATEGORIES: BoqCategoryV4[] = [
  "material", "equipment", "subcontract_service", "transport", "temporary_work", "testing", "waste",
];

const UNITS: EngineeringUnitDefinitionV4[] = [
  { unit_id: "one", symbol: "—", localized_name_ru: "безразмерная величина", dimension: "dimensionless", vector: {}, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 4, allowed_boq_categories: ["commercial_adjustment"], aliases: ["1", "dimensionless"] },
  { unit_id: "percent", symbol: "%", localized_name_ru: "процент", dimension: "dimensionless", vector: {}, conversion_factor_to_si: 0.01, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["commercial_adjustment"], aliases: ["pct", "процент", "%"] },
  { unit_id: "pcs", symbol: "шт.", localized_name_ru: "штука", dimension: "count", vector: { count: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 0, allowed_boq_categories: ALL_MEASURED_CATEGORIES, aliases: ["pc", "piece", "pieces", "шт", "point"] },
  { unit_id: "m", symbol: "м", localized_name_ru: "метр", dimension: "length", vector: { length: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ALL_MEASURED_CATEGORIES, aliases: ["meter", "metre", "lm", "linear_m", "linear_meter", "m_drilling_depth"] },
  { unit_id: "mm", symbol: "мм", localized_name_ru: "миллиметр", dimension: "length", vector: { length: 1 }, conversion_factor_to_si: 0.001, conversion_offset_to_si: 0, precision: 1, allowed_boq_categories: ALL_MEASURED_CATEGORIES, aliases: ["millimeter", "millimetre", "мм"] },
  { unit_id: "cm", symbol: "см", localized_name_ru: "сантиметр", dimension: "length", vector: { length: 1 }, conversion_factor_to_si: 0.01, conversion_offset_to_si: 0, precision: 1, allowed_boq_categories: ALL_MEASURED_CATEGORIES, aliases: ["centimeter", "centimetre", "см"] },
  { unit_id: "km", symbol: "км", localized_name_ru: "километр", dimension: "transport_distance", vector: { length: 1 }, conversion_factor_to_si: 1000, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ["transport", "subcontract_service"], aliases: ["kilometer", "kilometre", "км"] },
  { unit_id: "m2", symbol: "м²", localized_name_ru: "квадратный метр", dimension: "area", vector: { length: 2 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ALL_MEASURED_CATEGORIES, aliases: ["sqm", "sq_m", "m²", "м2", "м²", "m2_glazing", "m2_roof", "m2_formwork"] },
  { unit_id: "m3", symbol: "м³", localized_name_ru: "кубический метр", dimension: "volume", vector: { length: 3 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ALL_MEASURED_CATEGORIES, aliases: ["cbm", "m³", "м3", "м³", "m3_concrete"] },
  { unit_id: "l", symbol: "л", localized_name_ru: "литр", dimension: "volume", vector: { length: 3 }, conversion_factor_to_si: 0.001, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["material", "transport", "waste"], aliases: ["liter", "litre", "л", "литр"] },
  { unit_id: "kg", symbol: "кг", localized_name_ru: "килограмм", dimension: "mass", vector: { mass: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ["material", "transport", "waste"], aliases: ["кг", "kg_rebar"] },
  { unit_id: "t", symbol: "т", localized_name_ru: "тонна", dimension: "mass", vector: { mass: 1 }, conversion_factor_to_si: 1000, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ["material", "transport", "waste"], aliases: ["ton", "tonne", "тонна", "тонн"] },
  { unit_id: "h", symbol: "ч", localized_name_ru: "час", dimension: "time", vector: { time: 1 }, conversion_factor_to_si: 3600, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["subcontract_service", "temporary_work", "testing"], aliases: ["hour", "hr", "ч"] },
  { unit_id: "day", symbol: "сут.", localized_name_ru: "сутки", dimension: "time", vector: { time: 1 }, conversion_factor_to_si: 86400, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["subcontract_service", "temporary_work", "equipment"], aliases: ["день", "сутки"] },
  { unit_id: "man_hour", symbol: "чел.-ч", localized_name_ru: "человеко-час", dimension: "labor_time", vector: { labor_time: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["labor"], aliases: ["labor_hour", "чел_час", "чел.-ч"] },
  { unit_id: "machine_hour", symbol: "маш.-ч", localized_name_ru: "машино-час", dimension: "machine_time", vector: { machine_time: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["machinery", "equipment"], aliases: ["equipment_hour", "маш_час", "маш.-ч", "shift"] },
  { unit_id: "m2_machine_hour", symbol: "м²/маш.-ч", localized_name_ru: "квадратный метр за машино-час", dimension: "area", vector: { length: 2, machine_time: -1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["machinery", "equipment"], aliases: ["m2/machine_hour", "м2/маш-ч"] },
  { unit_id: "m3_machine_hour", symbol: "м³/маш.-ч", localized_name_ru: "кубический метр за машино-час", dimension: "volume", vector: { length: 3, machine_time: -1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["machinery", "equipment"], aliases: ["m3/machine_hour", "м3/маш-ч"] },
  { unit_id: "m2_man_hour", symbol: "м²/чел.-ч", localized_name_ru: "квадратный метр за человеко-час", dimension: "area", vector: { length: 2, labor_time: -1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["labor"], aliases: ["m2/man_hour", "м2/чел-ч"] },
  { unit_id: "m2_test", symbol: "м²/исп.", localized_name_ru: "квадратный метр на одно испытание", dimension: "area", vector: { length: 2, test: -1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["testing"], aliases: ["m2/test", "м2/исп"] },
  { unit_id: "t_trip", symbol: "т/рейс", localized_name_ru: "тонна на рейс", dimension: "mass", vector: { mass: 1, count: -1 }, conversion_factor_to_si: 1000, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["transport"], aliases: ["t/trip", "т/рейс"] },
  { unit_id: "W", symbol: "Вт", localized_name_ru: "ватт", dimension: "power", vector: { mass: 1, length: 2, time: -3 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 0, allowed_boq_categories: ["equipment"], aliases: ["w", "вт"] },
  { unit_id: "kW", symbol: "кВт", localized_name_ru: "киловатт", dimension: "power", vector: { mass: 1, length: 2, time: -3 }, conversion_factor_to_si: 1000, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["equipment"], aliases: ["kw", "квт"] },
  { unit_id: "MW", symbol: "МВт", localized_name_ru: "мегаватт", dimension: "power", vector: { mass: 1, length: 2, time: -3 }, conversion_factor_to_si: 1_000_000, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ["equipment"], aliases: ["mw", "мвт"] },
  { unit_id: "kWh", symbol: "кВт·ч", localized_name_ru: "киловатт-час", dimension: "energy", vector: { mass: 1, length: 2, time: -2 }, conversion_factor_to_si: 3_600_000, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["equipment", "subcontract_service"], aliases: ["kwh", "квтч", "квт·ч"] },
  { unit_id: "Pa", symbol: "Па", localized_name_ru: "паскаль", dimension: "pressure", vector: { mass: 1, length: -1, time: -2 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 0, allowed_boq_categories: ["equipment", "testing"], aliases: ["pa", "па"] },
  { unit_id: "kPa", symbol: "кПа", localized_name_ru: "килопаскаль", dimension: "pressure", vector: { mass: 1, length: -1, time: -2 }, conversion_factor_to_si: 1000, conversion_offset_to_si: 0, precision: 1, allowed_boq_categories: ["equipment", "testing"], aliases: ["kpa", "кпа"] },
  { unit_id: "MPa", symbol: "МПа", localized_name_ru: "мегапаскаль", dimension: "pressure", vector: { mass: 1, length: -1, time: -2 }, conversion_factor_to_si: 1_000_000, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["equipment", "testing"], aliases: ["mpa", "мпа"] },
  { unit_id: "degC", symbol: "°C", localized_name_ru: "градус Цельсия", dimension: "temperature", vector: { temperature: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 273.15, precision: 1, allowed_boq_categories: ["testing"], aliases: ["celsius", "°c", "c"] },
  { unit_id: "m3_h", symbol: "м³/ч", localized_name_ru: "кубический метр в час", dimension: "flow", vector: { length: 3, time: -1 }, conversion_factor_to_si: 1 / 3600, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["equipment", "testing"], aliases: ["m3h", "m3_hour", "m3_per_hour", "м3/ч"] },
  { unit_id: "m3_day", symbol: "м³/сут.", localized_name_ru: "кубический метр в сутки", dimension: "flow", vector: { length: 3, time: -1 }, conversion_factor_to_si: 1 / 86400, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["equipment", "testing"], aliases: ["m3d", "m3_per_day", "м3/сут"] },
  { unit_id: "kg_m3", symbol: "кг/м³", localized_name_ru: "килограмм на кубический метр", dimension: "density", vector: { mass: 1, length: -3 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["material", "testing"], aliases: ["kg/m3", "кг/м3", "кг/м³"] },
  { unit_id: "t_m3", symbol: "т/м³", localized_name_ru: "тонна на кубический метр", dimension: "density", vector: { mass: 1, length: -3 }, conversion_factor_to_si: 1000, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ["material", "testing"], aliases: ["t/m3", "т/м3", "т/м³"] },
  { unit_id: "l_m2", symbol: "л/м²", localized_name_ru: "литр на квадратный метр", dimension: "application_rate", vector: { length: 1 }, conversion_factor_to_si: 0.001, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ["material"], aliases: ["l/m2", "л/м2", "л/м²"] },
  { unit_id: "kg_m2", symbol: "кг/м²", localized_name_ru: "килограмм на квадратный метр", dimension: "application_rate", vector: { mass: 1, length: -2 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ["material"], aliases: ["kg/m2", "кг/м2", "кг/м²"] },
  { unit_id: "t_km", symbol: "т·км", localized_name_ru: "тонно-километр", dimension: "transport_work", vector: { mass: 1, length: 1 }, conversion_factor_to_si: 1_000_000, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ["transport"], aliases: ["tkm", "т-км", "т·км"] },
  { unit_id: "m3_km", symbol: "м³·км", localized_name_ru: "кубометр-километр", dimension: "transport_work", vector: { length: 4 }, conversion_factor_to_si: 1000, conversion_offset_to_si: 0, precision: 3, allowed_boq_categories: ["transport"], aliases: ["m3km", "м3-км", "м³·км"] },
  { unit_id: "trip", symbol: "рейс", localized_name_ru: "рейс", dimension: "transport_work", vector: { count: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 0, allowed_boq_categories: ["transport"], aliases: ["рейс"] },
  { unit_id: "set", symbol: "компл.", localized_name_ru: "комплект", dimension: "package", vector: { package: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 0, allowed_boq_categories: ["material", "equipment", "temporary_work", "documentation"], aliases: ["комплект", "roll", "bag", "bucket", "рулон", "мешок", "ведро"] },
  { unit_id: "service", symbol: "усл.", localized_name_ru: "услуга", dimension: "service", vector: { service: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 0, allowed_boq_categories: ["subcontract_service", "temporary_work", "permit"], aliases: ["услуга"] },
  { unit_id: "test", symbol: "исп.", localized_name_ru: "испытание", dimension: "test", vector: { test: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 0, allowed_boq_categories: ["testing"], aliases: ["проба", "испытание"] },
  { unit_id: "document", symbol: "док.", localized_name_ru: "документ", dimension: "document", vector: { document: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 0, allowed_boq_categories: ["documentation", "permit"], aliases: ["документ"] },
  { unit_id: "KGS", symbol: "сом", localized_name_ru: "кыргызский сом", dimension: "currency", vector: { currency: 1 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["commercial_adjustment"], aliases: ["kgs", "сом"] },
  { unit_id: "KGS_m2", symbol: "сом/м²", localized_name_ru: "сом за квадратный метр", dimension: "currency_per_unit", vector: { currency: 1, length: -2 }, conversion_factor_to_si: 1, conversion_offset_to_si: 0, precision: 2, allowed_boq_categories: ["commercial_adjustment"], aliases: ["kgs/m2", "сом/м2"] },
];

const BY_ID = new Map(UNITS.map((unit) => [unit.unit_id, unit]));
const BY_ALIAS = new Map<string, EngineeringUnitDefinitionV4>();

function normalizeUnitToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/²/g, "2").replace(/³/g, "3");
}
for (const unit of UNITS) {
  for (const alias of [unit.unit_id, unit.symbol, ...unit.aliases]) {
    BY_ALIAS.set(normalizeUnitToken(alias), unit);
  }
}

export const ENGINEERING_UNIT_REGISTRY_V4: readonly EngineeringUnitDefinitionV4[] = Object.freeze(UNITS);

export function getEngineeringUnitV4(unitId: string | null | undefined): EngineeringUnitDefinitionV4 | null {
  return unitId ? BY_ID.get(unitId) ?? null : null;
}

export function resolveEngineeringUnitV4(value: string | null | undefined): EngineeringUnitDefinitionV4 | null {
  if (!value) return null;
  return BY_ALIAS.get(normalizeUnitToken(value)) ?? null;
}

export function canonicalEngineeringUnitIdV4(value: string | null | undefined): string | null {
  return resolveEngineeringUnitV4(value)?.unit_id ?? null;
}

export function listEngineeringUnitsForDimensionV4(dimension: EngineeringDimensionV4): EngineeringUnitDefinitionV4[] {
  return UNITS.filter((unit) => unit.dimension === dimension);
}

export function convertEngineeringUnitV4(value: number, fromUnitId: string, toUnitId: string): number | null {
  const from = getEngineeringUnitV4(fromUnitId);
  const to = getEngineeringUnitV4(toUnitId);
  if (!from || !to || from.dimension !== to.dimension || !Number.isFinite(value)) return null;
  const si = value * from.conversion_factor_to_si + from.conversion_offset_to_si;
  return (si - to.conversion_offset_to_si) / to.conversion_factor_to_si;
}

export type EngineeringUnitRegistryValidationV4 = {
  ok: boolean;
  duplicate_unit_ids: string[];
  invalid_conversion_unit_ids: string[];
  blockers: string[];
};

export function validateEngineeringUnitRegistryV4(
  units: readonly EngineeringUnitDefinitionV4[] = ENGINEERING_UNIT_REGISTRY_V4,
): EngineeringUnitRegistryValidationV4 {
  const counts = new Map<string, number>();
  for (const unit of units) counts.set(unit.unit_id, (counts.get(unit.unit_id) ?? 0) + 1);
  const duplicateUnitIds = [...counts.entries()].filter(([, count]) => count > 1).map(([unitId]) => unitId).sort();
  const invalidConversions = units.filter((unit) =>
    !Number.isFinite(unit.conversion_factor_to_si) ||
    unit.conversion_factor_to_si <= 0 ||
    !Number.isFinite(unit.conversion_offset_to_si),
  ).map((unit) => unit.unit_id).sort();
  const blockers = [
    ...duplicateUnitIds.map((unitId) => `DUPLICATE_UNIT_ID:${unitId}`),
    ...invalidConversions.map((unitId) => `INVALID_UNIT_CONVERSION:${unitId}`),
  ];
  return {
    ok: blockers.length === 0,
    duplicate_unit_ids: duplicateUnitIds,
    invalid_conversion_unit_ids: invalidConversions,
    blockers,
  };
}
