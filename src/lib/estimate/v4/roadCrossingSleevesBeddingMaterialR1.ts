import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_EXPRESSIONS_R1 as civil, ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "./roadCrossingSleevesCivilGeometryR1";

/** Selected granular bedding only, not a universal sand/compaction norm or
 * a full civil owner. All balance volumes use the SAME confirmed supplied
 * loose state. The gross conversion already includes process/compaction
 * losses; never multiply a second loss factor or infer truck trips from it.
 */
export const ROAD_CROSSING_SLEEVES_BEDDING_SCOPE_R1 = Object.freeze({
  fullOwner: false, engineeringAccepted: false,
  material: "Selected granular bedding for confirmed open rectangular trench with positive full-width bedding thickness",
  balanceState: "Confirmed supplied loose volume; stock, reserve and supply multiple must be compatible with this same physical state",
  grossRatio: "Actual supplied loose m3 per finished bedding m3, including all compaction/process losses; no universal or second loss factor",
  cost: "Only new supplied-volume order; finished geometry, consumption, packs and remaining balances are informational",
  purchaseOverride: "Visible purchase exception; formula-reference balances must be reconciled by the full owner before procurement approval",
  excluded: "Material/design approval, concrete bedding, soil reuse, laying/compaction crew and equipment, freight/trips, certified mass and full crossing",
});
export const ROAD_CROSSING_SLEEVES_BEDDING_APPLICABILITY_R1: AutomaticInclusionCondition = Object.freeze({
  kind: "and", operands: Object.freeze([
    { kind: "equals" as const, parameterId: "rcs_civil_installation_method", value: methods.openCut },
    { kind: "greater_than" as const, parameterId: "rcs_open_cut_full_width_bedding_thickness_m", value: 0 },
  ]),
});
const fact = (id: string, title: string, unitId: string, min = 0): AutomaticParameterSpec => ({
  id, title, unitId, min, valueType: "decimal", kind: "conditional", requiredWhen: ROAD_CROSSING_SLEEVES_BEDDING_APPLICABILITY_R1,
});
export const ROAD_CROSSING_SLEEVES_BEDDING_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "rcs_bedding_granular_product_designation", title: "Выбранный зернистый материал основания по проекту и спецификации",
    unitId: null, valueType: "text", kind: "conditional", requiredWhen: ROAD_CROSSING_SLEEVES_BEDDING_APPLICABILITY_R1 },
  fact("rcs_bedding_gross_supplied_volume_ratio", "Расход поставочного рыхлого объёма на 1 м³ готового основания, уже со всеми потерями и уплотнением", "ratio", 0.000_001),
  fact("rcs_bedding_compatible_loose_stock_m3", "Подтверждённое наличие совместимого материала в том же рыхлом поставочном состоянии", "m3"),
  fact("rcs_bedding_retained_loose_reserve_m3", "Сохраняемый резерв в том же рыхлом поставочном состоянии", "m3"),
  fact("rcs_bedding_supplier_loose_multiple_m3", "Фактическая кратность заказа рыхлого поставочного объёма, не автоматически рейс машины", "m3", 0.000_001),
]);
const CONSUMED = `(${civil.open_cut_full_width_bedding_m3})*rcs_bedding_gross_supplied_volume_ratio`;
const TOTAL = `(${CONSUMED})+rcs_bedding_retained_loose_reserve_m3`;
const NEED = `max(0,(${TOTAL})-rcs_bedding_compatible_loose_stock_m3)`;
const MULTIPLES = `ceil((${NEED})/rcs_bedding_supplier_loose_multiple_m3)`;
const ORDERED = `(${MULTIPLES})*rcs_bedding_supplier_loose_multiple_m3`;
const REMAINING = `rcs_bedding_compatible_loose_stock_m3+(${ORDERED})-(${CONSUMED})`;
export const ROAD_CROSSING_SLEEVES_BEDDING_EXPRESSIONS_R1 = Object.freeze({
  consumed_loose_m3: CONSUMED,
  retained_loose_reserve_m3: "rcs_bedding_retained_loose_reserve_m3",
  compatible_loose_stock_m3: "rcs_bedding_compatible_loose_stock_m3",
  total_loose_need_m3: TOTAL,
  new_loose_need_m3: NEED,
  supplier_multiple_count: MULTIPLES,
  ordered_loose_m3: ORDERED,
  remaining_loose_m3: REMAINING,
  free_loose_m3_beyond_reserve: `(${REMAINING})-rcs_bedding_retained_loose_reserve_m3`,
});
const row = (key: keyof typeof ROAD_CROSSING_SLEEVES_BEDDING_EXPRESSIONS_R1, title: string): AutomaticRowSpec => ({
  rowId: `rcs:bedding:${key}`, formulaId: `rcs:bedding:${key}`, section: "Материал зернистого основания открытой траншеи",
  category: "material", title, unitId: key === "supplier_multiple_count" ? "package" : "m3",
  expression: ROAD_CROSSING_SLEEVES_BEDDING_EXPRESSIONS_R1[key], inclusion: ROAD_CROSSING_SLEEVES_BEDDING_APPLICABILITY_R1,
  // An explicit quantity is not confirmation of the selected method or of
  // unknown bedding thickness, even when that fact is also a formula operand.
  inputParameterIds: ["rcs_civil_installation_method", "rcs_open_cut_full_width_bedding_thickness_m"],
  costTreatment: "INFORMATIONAL_SCOPE",
});
export const ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  row("consumed_loose_m3", "Расход рыхлого поставочного материала на готовое основание, уже со всеми потерями"),
  row("retained_loose_reserve_m3", "Сохраняемый резерв рыхлого материала"),
  row("compatible_loose_stock_m3", "Подтверждённый совместимый рыхлый материал в наличии"),
  row("total_loose_need_m3", "Потребность рыхлого материала для основания и сохраняемого резерва"),
  row("new_loose_need_m3", "Дополнительная потребность после совместимого наличия"),
  row("supplier_multiple_count", "Число поставочных кратностей, не отдельная оплата или количество рейсов"),
  { ...row("ordered_loose_m3", "Новый заказ выбранного зернистого материала в рыхлом поставочном объёме"),
    procurement: true, costTreatment: "OWN_COST", titleParameterIds: ["rcs_bedding_granular_product_designation"],
    inputParameterIds: ["rcs_civil_installation_method", "rcs_open_cut_full_width_bedding_thickness_m", "rcs_bedding_granular_product_designation"] },
  row("remaining_loose_m3", "Остаток рыхлого материала после расхода на основание, включая резерв"),
  row("free_loose_m3_beyond_reserve", "Свободный рыхлый материал сверх сохраняемого резерва"),
]);
