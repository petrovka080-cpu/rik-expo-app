import type { AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";

/** ONE full continuous internal annulus and ONE approved preblended dry product.
 * This is not external overbreak grouting, a mix design or execution approval.
 * Actual dry yield/loss, bag mass and mixing water remain selected-product facts;
 * no manufacturer's example is installed as a default. Water is consumed only
 * by mixed powder, not unopened reserve or purchase-rounding surplus.
 */
export const ROAD_CROSSING_SLEEVES_INTERNAL_FILL_SCOPE_R1 = Object.freeze({
  fullOwner: false, engineeringAccepted: false,
  geometry: "Internal casing ID minus carrier OD over one continuous crossing; subtract actual non-overlapping permanent occupation beyond the carrier cylinder",
  material: "One project-approved preblended dry grout product, with actual gross dry kg per net installed m3 already including all process losses",
  stock: "Only confirmed compatible usable dry stock and retained dry reserve; wet mixed grout is not assumed reusable stock",
  water: "Actual mixing litres per selected net-mass bag, applied to consumed dry kg only; informational until a disjoint water supply/cost owner is selected",
  cost: "Only newly ordered dry kg own material cost/procurement; bags, consumption, water and balances are not second purchases",
  purchaseOverride: "Visible purchase exception; formula-reference balances need full-owner reconciliation before procurement approval",
  excluded: "Other or partial fill, external casing/ground voids, product/method approval, pressure/buoyancy/restraints, bulkheads, placing/mixing/cleaning/curing resources, water supply and logistics, full crossing",
});
const MODE = "rcs_internal_fill_mode";
export const ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1 = Object.freeze({
  none: "Без заполнения внутри футляра по подтверждённому проектному решению",
  dryGrout: "Полное внутреннее заполнение одной согласованной сухой затворяемой смесью",
  other: "Другое или частичное заполнение внутри футляра: отдельный расчёт",
});
const inclusion = { kind: "equals" as const, parameterId: MODE, value: ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1.dryGrout };
const L = "rcs_crossing_length_m";
const ID = "rcs_casing_inside_diameter_mm";
const OD = "rcs_carrier_outside_diameter_mm";
const OCCUPIED = "rcs_internal_fill_permanent_occupied_m3";
const PRODUCT = "rcs_internal_fill_dry_product_designation";
const RATE = "rcs_internal_fill_gross_dry_mass_ratio";
const STOCK = "rcs_internal_fill_compatible_dry_stock_kg";
const RESERVE = "rcs_internal_fill_retained_dry_reserve_kg";
const BAG = "rcs_internal_fill_supplier_bag_net_kg";
const WATER = "rcs_internal_fill_mixing_water_l_for_selected_bag";
const fact = (id: string, title: string, unitId: string, min = 0): AutomaticParameterSpec => ({
  id, title, unitId, min, valueType: "decimal", kind: "conditional", requiredWhen: inclusion,
});
export const ROAD_CROSSING_SLEEVES_INTERNAL_FILL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: MODE, title: "Подтверждённый вариант заполнения пространства внутри футляра", unitId: null,
    valueType: "enum", kind: "ordinary", values: Object.values(ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1) },
  fact(OCCUPIED, "Постоянный занятый объём внутри футляра сверх цилиндра рабочей трубы: опоры, соединения и концевые элементы без пересечений", "m3"),
  { id: PRODUCT, title: "Выбранная согласованная сухая готовая смесь для полного внутреннего заполнения футляра", unitId: null,
    valueType: "text", kind: "conditional", requiredWhen: inclusion },
  fact(RATE, "Фактическая масса сухой смеси на 1 м³ готового внутреннего заполнения, уже со всеми технологическими потерями", "kg_per_m3", 0.000_001),
  fact(STOCK, "Подтверждённая совместимая пригодная сухая смесь в наличии, не затворённый раствор", "kg"),
  fact(RESERVE, "Сохраняемый сухой резерв выбранной смеси внутреннего заполнения", "kg"),
  fact(BAG, "Фактическая масса нетто одной поставочной упаковки выбранной сухой смеси", "kg", 0.000_001),
  fact(WATER, "Фактическая вода затворения на одну упаковку указанной массы нетто по паспорту выбранной смеси", "l", 0.000_001),
]);
// Keep mm2 until the final volume conversion in the fixed-decimal evaluator.
const GROSS = `3.141592654/4*(pow(${ID},2)-pow(${OD},2))*${L}/1000000`;
const NET = `(${GROSS})-${OCCUPIED}`;
const CONSUMED = `(${NET})*${RATE}`;
const TOTAL = `(${CONSUMED})+${RESERVE}`;
const NEED = `max(0,(${TOTAL})-${STOCK})`;
const BAGS = `ceil((${NEED})/${BAG})`;
const ORDERED = `(${BAGS})*${BAG}`;
const REMAINING = `${STOCK}+(${ORDERED})-(${CONSUMED})`;
export const ROAD_CROSSING_SLEEVES_INTERNAL_FILL_EXPRESSIONS_R1 = Object.freeze({
  gross_internal_annulus_m3: GROSS, permanent_occupied_m3: OCCUPIED, net_fill_m3: NET,
  consumed_dry_kg: CONSUMED, compatible_dry_stock_kg: STOCK, retained_dry_reserve_kg: RESERVE,
  total_dry_need_kg: TOTAL, new_dry_need_kg: NEED, supplier_bag_count: BAGS, ordered_dry_kg: ORDERED,
  remaining_dry_kg: REMAINING, free_dry_kg_beyond_reserve: `(${REMAINING})-${RESERVE}`,
  mixing_water_m3: `(${CONSUMED})*${WATER}/${BAG}/1000`,
});
const geometry = [MODE, L, ID, OD];
const netGeometry = [...geometry, OCCUPIED];
const row = (key: keyof typeof ROAD_CROSSING_SLEEVES_INTERNAL_FILL_EXPRESSIONS_R1, title: string, unitId = "kg"): AutomaticRowSpec => ({
  rowId: `rcs:internal-fill:${key}`, formulaId: `rcs:internal-fill:${key}`,
  section: "Полное внутреннее заполнение футляра выбранной сухой смесью", category: "material", title, unitId,
  expression: ROAD_CROSSING_SLEEVES_INTERNAL_FILL_EXPRESSIONS_R1[key], inclusion, costTreatment: "INFORMATIONAL_SCOPE",
  inputParameterIds: [MODE],
});
export const ROAD_CROSSING_SLEEVES_INTERNAL_FILL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { ...row("gross_internal_annulus_m3", "Геометрический внутренний зазор футляра вокруг цилиндра рабочей трубы", "m3"),
    inputParameterIds: geometry,
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m3", minimum: 0,
      reasonRu: "Внутренний диаметр футляра должен превышать наружный диаметр рабочей трубы; внешняя проходка не является внутренним заполнением." } },
  row("permanent_occupied_m3", "Постоянный занятый объём внутри зазора без повторного вычитания цилиндра трубы", "m3"),
  { ...row("net_fill_m3", "Готовый внутренний объём заполнения после фактических опор, соединений и концевых элементов", "m3"),
    inputParameterIds: netGeometry,
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m3", minimum: 0,
      reasonRu: "Непересекающийся занятый объём внутри зазора не может превышать его геометрию. Не вычитайте цилиндр рабочей трубы повторно и не подменяйте внутренний объём внешним грунтом." } },
  row("consumed_dry_kg", "Расход выбранной сухой смеси на внутреннее заполнение со всеми технологическими потерями"),
  row("compatible_dry_stock_kg", "Подтверждённое пригодное сухое наличие выбранной смеси"),
  row("retained_dry_reserve_kg", "Сохраняемый сухой резерв смеси, не затворять как расход"),
  row("total_dry_need_kg", "Общая потребность сухой смеси с сохраняемым резервом"),
  row("new_dry_need_kg", "Дополнительная сухая потребность после совместимого наличия"),
  row("supplier_bag_count", "Число новых упаковок сухой смеси; не отдельная оплачиваемая позиция", "package"),
  { ...row("ordered_dry_kg", "Новый заказ выбранной сухой смеси для внутреннего заполнения в массе нетто"),
    costTreatment: "OWN_COST", procurement: true, titleParameterIds: [PRODUCT],
    inputParameterIds: [...netGeometry, PRODUCT, RATE, STOCK, RESERVE, BAG] },
  row("remaining_dry_kg", "Сухой остаток после внутреннего заполнения, включая сохраняемый резерв"),
  row("free_dry_kg_beyond_reserve", "Свободная сухая смесь сверх сохраняемого резерва"),
  { ...row("mixing_water_m3", "Вода затворения расходуемой сухой смеси, без воды для нераскрытого резерва и округления заказа", "m3"),
    inputParameterIds: [...netGeometry, RATE, WATER, BAG] },
]);
