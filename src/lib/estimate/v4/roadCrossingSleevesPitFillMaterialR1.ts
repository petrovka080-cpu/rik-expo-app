import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods, ROAD_CROSSING_SLEEVES_CIVIL_EXPRESSIONS_R1 as civil } from "./roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_PIT_RETURN_EXPRESSIONS_R1 as space, ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1 as pitRows } from "./roadCrossingSleevesPitReturnFillR1";

/** Selected SAME granular fill for both rectangular pits only. FHWA separates
 * in-situ, loose and finished fill states and requires material suitability;
 * its illustrative factors are NOT project facts or defaults in this model.
 * Reuse is explicitly confirmed in finished-volume equivalent, never equated
 * to geometric excavation or counted again as compatible loose stock.
 */
export const ROAD_CROSSING_SLEEVES_PIT_FILL_SCOPE_R1 = Object.freeze({
  fullOwner: false, engineeringAccepted: false,
  material: "One confirmed granular product for both rectangular jacking pits; other/mixed technologies require their own owner",
  reuse: "Actual approved reuse across both pits in finished-volume equivalent, not automatically available excavated soil or supplied loose stock",
  grossRatio: "Actual loose supplied m3 per additional finished-fill m3 including all process/compaction losses; no universal or second factor",
  balanceState: "Compatible stock, retained reserve and supply multiple use the same selected supplied-loose state and are disjoint from allocated reused material",
  cost: "Only additional new supplied-loose order; reuse, finished geometry, consumption, supply multiples and balances are not separate purchases",
  purchaseOverride: "Visible purchase exception; formula-reference supply balances must be reconciled by the full owner before procurement approval",
  excluded: "Material suitability/design approval, pit-specific distribution, other fill products, placing/compaction labor and machines, water, haul/disposal/trips and full crossing",
});
const METHOD = "rcs_civil_installation_method";
const MODE = "rcs_pit_fill_material_mode";
export const ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1 = Object.freeze({
  sameGranular: "Один подтверждённый зернистый материал для обоих котлованов",
  other: "Другой материал или разные технологии котлованов: отдельный расчёт",
});
export const ROAD_CROSSING_SLEEVES_PIT_FILL_APPLICABILITY_R1: AutomaticInclusionCondition = Object.freeze({
  kind: "and", operands: Object.freeze([
    { kind: "equals" as const, parameterId: METHOD, value: methods.pipeJacking },
    { kind: "equals" as const, parameterId: MODE, value: ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1.sameGranular },
  ]),
});
const REUSE = "rcs_pit_fill_approved_reused_finished_m3";
const PRODUCT = "rcs_pit_fill_granular_product_designation";
const RATIO = "rcs_pit_fill_gross_supplied_volume_ratio";
const STOCK = "rcs_pit_fill_compatible_loose_stock_m3";
const RESERVE = "rcs_pit_fill_retained_loose_reserve_m3";
const MULTIPLE = "rcs_pit_fill_supplier_loose_multiple_m3";
const fact = (id: string, title: string, unitId: string, min = 0): AutomaticParameterSpec => ({
  id, title, unitId, min, valueType: "decimal", kind: "conditional", requiredWhen: ROAD_CROSSING_SLEEVES_PIT_FILL_APPLICABILITY_R1,
});
export const ROAD_CROSSING_SLEEVES_PIT_FILL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: MODE, title: "Подтверждённый вариант материала обратной засыпки котлованов", kind: "conditional", valueType: "enum", unitId: null,
    values: Object.values(ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1), requiredWhen: { parameterId: METHOD, value: methods.pipeJacking } },
  { id: PRODUCT, title: "Выбранный совместимый зернистый материал для обоих котлованов по проектной спецификации",
    unitId: null, valueType: "text", kind: "conditional", requiredWhen: ROAD_CROSSING_SLEEVES_PIT_FILL_APPLICABILITY_R1 },
  fact(REUSE, "Подтверждённый повторно используемый материал для обоих котлованов в эквиваленте готового уплотнённого объёма, не повторять в рыхлом наличии", "m3"),
  fact(RATIO, "Фактический рыхлый поставочный объём на 1 м³ дополнительной готовой засыпки, уже со всеми потерями и уплотнением", "ratio", 0.000_001),
  fact(STOCK, "Совместимый рыхлый материал в наличии, без уже выделенного повторно используемого грунта", "m3"),
  fact(RESERVE, "Сохраняемый резерв выбранного материала в том же рыхлом поставочном состоянии", "m3"),
  fact(MULTIPLE, "Фактическая кратность заказа выбранного рыхлого материала, не количество рейсов", "m3", 0.000_001),
]);
// Both method branches use the same canonical finished/loose balance. This
// builds FormulaGraph expressions only; it does not evaluate or install rates.
function fillExpressions(remainingSpace: string, reuse: string, ratio: string, stock: string, reserve: string, multiple: string) {
  const additional = `(${remainingSpace})-${reuse}`;
  const consumed = `(${additional})*${ratio}`;
  const total = `(${consumed})+${reserve}`;
  const need = `max(0,(${total})-${stock})`;
  const multiples = `ceil((${need})/${multiple})`;
  const ordered = `(${multiples})*${multiple}`;
  const remaining = `${stock}+(${ordered})-(${consumed})`;
  return Object.freeze({
    approved_reused_finished_m3: reuse, additional_finished_fill_m3: additional,
    consumed_loose_m3: consumed, retained_loose_reserve_m3: reserve, compatible_loose_stock_m3: stock,
    total_loose_need_m3: total, new_loose_need_m3: need, supplier_multiple_count: multiples,
    ordered_loose_m3: ordered, remaining_loose_m3: remaining, free_loose_m3_beyond_reserve: `(${remaining})-${reserve}`,
  });
}
export const ROAD_CROSSING_SLEEVES_PIT_FILL_EXPRESSIONS_R1 = fillExpressions(space.total_remaining_space_m3, REUSE, RATIO, STOCK, RESERVE, MULTIPLE);
const geometryFacts = [...new Set(pitRows.flatMap(row => row.inputParameterIds ?? [])), MODE];
const row = (key: keyof typeof ROAD_CROSSING_SLEEVES_PIT_FILL_EXPRESSIONS_R1, title: string): AutomaticRowSpec => ({
  rowId: `rcs:pit-fill:${key}`, formulaId: `rcs:pit-fill:${key}`, section: "Материал обратной засыпки прямоугольных котлованов",
  category: "material", title, unitId: key === "supplier_multiple_count" ? "package" : "m3",
  expression: ROAD_CROSSING_SLEEVES_PIT_FILL_EXPRESSIONS_R1[key], inclusion: ROAD_CROSSING_SLEEVES_PIT_FILL_APPLICABILITY_R1,
  inputParameterIds: ["approved_reused_finished_m3", "retained_loose_reserve_m3", "compatible_loose_stock_m3"].includes(key)
    ? [METHOD, MODE] : [...geometryFacts, REUSE],
  costTreatment: "INFORMATIONAL_SCOPE",
});
export const ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  row("approved_reused_finished_m3", "Подтверждённое повторное использование в готовом уплотнённом объёме; не новая закупка"),
  { ...row("additional_finished_fill_m3", "Дополнительный готовый объём засыпки после выделенного повторного использования"),
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m3", minimum: 0,
      reasonRu: "Выделенное повторное использование в готовом объёме не может превышать суммарное оставшееся место котлованов. Не подменяйте готовый объём рыхлым или объёмом разработки." } },
  row("consumed_loose_m3", "Расход выбранного рыхлого материала на дополнительную готовую засыпку, уже со всеми потерями"),
  row("retained_loose_reserve_m3", "Сохраняемый рыхлый резерв материала котлованов"),
  row("compatible_loose_stock_m3", "Совместимое рыхлое наличие без повторного учёта выделенного грунта"),
  row("total_loose_need_m3", "Потребность выбранного рыхлого материала и сохраняемого резерва"),
  row("new_loose_need_m3", "Дополнительная рыхлая потребность после совместимого наличия"),
  row("supplier_multiple_count", "Число кратностей поставки материала котлованов; не оплата или рейсы"),
  { ...row("ordered_loose_m3", "Новый заказ выбранного зернистого материала для котлованов в рыхлом поставочном объёме"),
    procurement: true, costTreatment: "OWN_COST", titleParameterIds: [PRODUCT],
    inputParameterIds: [...geometryFacts, PRODUCT, REUSE, RATIO, STOCK, RESERVE, MULTIPLE] },
  row("remaining_loose_m3", "Рыхлый остаток после засыпки котлованов, включая сохраняемый резерв"),
  row("free_loose_m3_beyond_reserve", "Свободный рыхлый материал сверх сохраняемого резерва котлованов"),
]);

/** One confirmed product/reuse specification for the whole open trench.
 * Layered/mixed backfill is an explicit different branch, never approximated
 * by this product. Additional retained structures and restoration layers are
 * subtracted only in their actual NON-OVERLAPPING finished-volume equivalent.
 */
export const ROAD_CROSSING_SLEEVES_TRENCH_FILL_SCOPE_R1 = Object.freeze({
  fullOwner: false, engineeringAccepted: false,
  material: "One confirmed granular product for the open trench; layered/mixed/other technologies require their own owner",
  geometry: "Existing trench minus full-width bedding, outside casing displacement and actual other non-overlapping permanent occupation/restoration layers",
  reuse: ROAD_CROSSING_SLEEVES_PIT_FILL_SCOPE_R1.reuse.replace("both pits", "the open trench"),
  grossRatio: ROAD_CROSSING_SLEEVES_PIT_FILL_SCOPE_R1.grossRatio,
  balanceState: ROAD_CROSSING_SLEEVES_PIT_FILL_SCOPE_R1.balanceState,
  cost: ROAD_CROSSING_SLEEVES_PIT_FILL_SCOPE_R1.cost,
  purchaseOverride: ROAD_CROSSING_SLEEVES_PIT_FILL_SCOPE_R1.purchaseOverride,
  excluded: "Approved suitability/design and distribution, layered/other materials, placement/compaction labor and machines, water, haul/disposal/trips and full crossing",
});
const T_MODE = "rcs_trench_fill_material_mode";
const T_OCCUPIED = "rcs_trench_fill_other_permanent_occupied_volume_m3";
const T_REUSE = "rcs_trench_fill_approved_reused_finished_m3";
const T_PRODUCT = "rcs_trench_fill_granular_product_designation";
const T_RATIO = "rcs_trench_fill_gross_supplied_volume_ratio";
const T_STOCK = "rcs_trench_fill_compatible_loose_stock_m3";
const T_RESERVE = "rcs_trench_fill_retained_loose_reserve_m3";
const T_MULTIPLE = "rcs_trench_fill_supplier_loose_multiple_m3";
export const ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1 = Object.freeze({
  sameGranular: "Один подтверждённый зернистый материал для всей обратной засыпки траншеи",
  other: "Послойные, разные или другие материалы траншеи: отдельный расчёт",
});
export const ROAD_CROSSING_SLEEVES_TRENCH_FILL_APPLICABILITY_R1: AutomaticInclusionCondition = Object.freeze({
  kind: "and", operands: Object.freeze([
    { kind: "equals" as const, parameterId: METHOD, value: methods.openCut },
    { kind: "equals" as const, parameterId: T_MODE, value: ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1.sameGranular },
  ]),
});
const trenchFact = (id: string, title: string, unitId: string, min = 0): AutomaticParameterSpec => ({
  id, title, unitId, min, valueType: "decimal", kind: "conditional", requiredWhen: ROAD_CROSSING_SLEEVES_TRENCH_FILL_APPLICABILITY_R1,
});
export const ROAD_CROSSING_SLEEVES_TRENCH_FILL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: T_MODE, title: "Подтверждённый вариант материала обратной засыпки открытой траншеи", kind: "conditional", valueType: "enum", unitId: null,
    values: Object.values(ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1), requiredWhen: { parameterId: METHOD, value: methods.openCut } },
  { id: T_PRODUCT, title: "Выбранный совместимый зернистый материал всей засыпки траншеи по проектной спецификации",
    unitId: null, valueType: "text", kind: "conditional", requiredWhen: ROAD_CROSSING_SLEEVES_TRENCH_FILL_APPLICABILITY_R1 },
  trenchFact(T_OCCUPIED, "Фактический объём других остающихся конструкций и восстанавливаемых слоёв в траншее, без повторения основания и наружного объёма футляра; подтвердите ноль при отсутствии", "m3"),
  trenchFact(T_REUSE, "Подтверждённое повторное использование в траншее в эквиваленте готового уплотнённого объёма; не повторять в рыхлом наличии", "m3"),
  trenchFact(T_RATIO, "Рыхлый поставочный объём на 1 м³ дополнительной готовой засыпки траншеи, уже со всеми потерями и уплотнением", "ratio", 0.000_001),
  trenchFact(T_STOCK, "Совместимое рыхлое наличие для траншеи, без уже выделенного повторно используемого грунта", "m3"),
  trenchFact(T_RESERVE, "Сохраняемый резерв материала траншеи в том же рыхлом поставочном состоянии", "m3"),
  trenchFact(T_MULTIPLE, "Фактическая кратность заказа рыхлого материала траншеи, не количество рейсов", "m3", 0.000_001),
]);
const T_SPACE = `(${civil.open_cut_remaining_fill_space_m3})-${T_OCCUPIED}`;
export const ROAD_CROSSING_SLEEVES_TRENCH_FILL_EXPRESSIONS_R1 = Object.freeze({
  net_remaining_space_m3: T_SPACE,
  ...fillExpressions(T_SPACE, T_REUSE, T_RATIO, T_STOCK, T_RESERVE, T_MULTIPLE),
});
const trenchGeometryFacts = [METHOD, T_MODE, "rcs_crossing_length_m", "rcs_open_cut_excavation_width_m",
  "rcs_open_cut_excavation_depth_m", "rcs_open_cut_full_width_bedding_thickness_m", "rcs_casing_outside_diameter_mm", T_OCCUPIED];
const trenchRow = (key: keyof typeof ROAD_CROSSING_SLEEVES_TRENCH_FILL_EXPRESSIONS_R1, title: string): AutomaticRowSpec => ({
  rowId: `rcs:trench-fill:${key}`, formulaId: `rcs:trench-fill:${key}`, section: "Материал обратной засыпки открытой траншеи",
  category: "material", title, unitId: key === "supplier_multiple_count" ? "package" : "m3",
  expression: ROAD_CROSSING_SLEEVES_TRENCH_FILL_EXPRESSIONS_R1[key], inclusion: ROAD_CROSSING_SLEEVES_TRENCH_FILL_APPLICABILITY_R1,
  inputParameterIds: ["approved_reused_finished_m3", "retained_loose_reserve_m3", "compatible_loose_stock_m3"].includes(key)
    ? [METHOD, T_MODE] : key === "net_remaining_space_m3" ? trenchGeometryFacts : [...trenchGeometryFacts, T_REUSE],
  costTreatment: "INFORMATIONAL_SCOPE",
});
export const ROAD_CROSSING_SLEEVES_TRENCH_FILL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { ...trenchRow("net_remaining_space_m3", "Место для засыпки траншеи после основания, футляра и других остающихся конструкций и слоёв"),
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m3", minimum: 0,
      reasonRu: "Другие остающиеся конструкции и слои не могут превышать место траншеи после основания и футляра. Не повторяйте уже вычтенные объёмы." } },
  trenchRow("approved_reused_finished_m3", "Подтверждённое повторное использование в траншее в готовом объёме; не новая закупка"),
  { ...trenchRow("additional_finished_fill_m3", "Дополнительный готовый объём засыпки траншеи после выделенного повторного использования"),
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m3", minimum: 0,
      reasonRu: "Повторное использование в готовом уплотнённом объёме не может превышать оставшееся место траншеи. Объём разработки и рыхлый объём не подтверждают пригодный готовый объём." } },
  trenchRow("consumed_loose_m3", "Расход выбранного рыхлого материала на дополнительную готовую засыпку траншеи, уже со всеми потерями"),
  trenchRow("retained_loose_reserve_m3", "Сохраняемый рыхлый резерв материала траншеи"),
  trenchRow("compatible_loose_stock_m3", "Совместимое рыхлое наличие для траншеи без повторного учёта выделенного грунта"),
  trenchRow("total_loose_need_m3", "Рыхлая потребность засыпки траншеи с сохраняемым резервом"),
  trenchRow("new_loose_need_m3", "Дополнительная рыхлая потребность траншеи после совместимого наличия"),
  trenchRow("supplier_multiple_count", "Число кратностей поставки материала траншеи; не оплата или рейсы"),
  { ...trenchRow("ordered_loose_m3", "Новый заказ выбранного зернистого материала траншеи в рыхлом поставочном объёме"),
    procurement: true, costTreatment: "OWN_COST", titleParameterIds: [T_PRODUCT],
    inputParameterIds: [...trenchGeometryFacts, T_PRODUCT, T_REUSE, T_RATIO, T_STOCK, T_RESERVE, T_MULTIPLE] },
  trenchRow("remaining_loose_m3", "Рыхлый остаток после засыпки траншеи, включая сохраняемый резерв"),
  trenchRow("free_loose_m3_beyond_reserve", "Свободный рыхлый материал траншеи сверх сохраняемого резерва"),
]);
