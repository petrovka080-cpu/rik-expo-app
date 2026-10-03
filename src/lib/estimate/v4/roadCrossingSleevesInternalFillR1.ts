import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";

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
export const ROAD_CROSSING_SLEEVES_INTERNAL_FILL_APPLICABILITY_R1 = Object.freeze({
  kind: "equals" as const, parameterId: MODE, value: ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1.dryGrout,
});
const inclusion = ROAD_CROSSING_SLEEVES_INTERNAL_FILL_APPLICABILITY_R1;
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

/** Separate material ownership for actual mixing water. Customer-supplied
 * water retains the existing visible consumption control and has no new paid
 * purchase. Neither branch changes dry powder, crew/equipment or geometry.
 * Every water quantity uses the same suitable m3 supply state; multiple counts
 * are billing/supply quantities, never inferred delivery trips.
 */
export const ROAD_CROSSING_SLEEVES_INTERNAL_WATER_MODES_R1 = Object.freeze({
  separatePurchase: "Отдельная закупка воды, совместимой с выбранной сухой смесью",
  customerSupplied: "Подтверждённая вода заказчика; новой закупки исполнителем нет",
});
export const ROAD_CROSSING_SLEEVES_INTERNAL_WATER_COST_BASIS_R1 = "Только вода; без сухой смеси, всех исполнителей, техники, энергии и доставки";
export const ROAD_CROSSING_SLEEVES_INTERNAL_WATER_SCOPE_R1 = Object.freeze({
  fullOwner: false, engineeringAccepted: false,
  consumption: "Existing actual consumed dry kg times selected mixing litres per net-mass bag, not ordered powder, unopened reserve or dry stock alone",
  supply: "Separate suitable water stock, retained reserve, actual supply multiple, new order and remaining/free m3; allocations disjoint from other operations",
  cost: "Only new suitable water order when explicitly selected; excludes powder, crew, equipment, energy and delivery",
  customerSupplied: "Explicit actual project supply fact; consumed water remains visible but creates no executor purchase",
  excluded: "Water quality/product acceptance and non-overlapping allocation, actual delivery and logistics, water used by other operations, full crossing",
  purchaseOverride: ROAD_CROSSING_SLEEVES_INTERNAL_FILL_SCOPE_R1.purchaseOverride,
});
const W_MODE = "rcs_internal_fill_water_supply_mode";
const W_PRODUCT = "rcs_internal_fill_water_product_designation";
const W_REFERENCE = "rcs_internal_fill_water_compatibility_reference";
const W_BASIS = "rcs_internal_fill_water_cost_basis";
const W_STOCK = "rcs_internal_fill_water_compatible_stock_m3";
const W_RESERVE = "rcs_internal_fill_water_retained_reserve_m3";
const W_MULTIPLE = "rcs_internal_fill_water_supplier_multiple_m3";
export const ROAD_CROSSING_SLEEVES_INTERNAL_WATER_APPLICABILITY_R1: AutomaticInclusionCondition = Object.freeze({
  kind: "and", operands: Object.freeze([inclusion,
    { kind: "equals" as const, parameterId: W_MODE, value: ROAD_CROSSING_SLEEVES_INTERNAL_WATER_MODES_R1.separatePurchase },
  ]),
});
const waterFact = (id: string, title: string, min = 0): AutomaticParameterSpec => ({ id, title, unitId: "m3", valueType: "decimal",
  kind: "conditional", min, requiredWhen: ROAD_CROSSING_SLEEVES_INTERNAL_WATER_APPLICABILITY_R1 });
export const ROAD_CROSSING_SLEEVES_INTERNAL_WATER_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: W_MODE, title: "Фактический вариант снабжения водой для затворения внутреннего заполнения", unitId: null,
    valueType: "enum", kind: "conditional", values: Object.values(ROAD_CROSSING_SLEEVES_INTERNAL_WATER_MODES_R1), requiredWhen: inclusion },
  { id: W_PRODUCT, title: "Выбранная вода для затворения смеси; не сухой компонент и не доставка", unitId: null,
    valueType: "text", kind: "conditional", requiredWhen: ROAD_CROSSING_SLEEVES_INTERNAL_WATER_APPLICABILITY_R1 },
  { id: W_REFERENCE, title: "Подтверждение совместимости выбранной воды с выбранной сухой смесью и назначения только этому замесу", unitId: null,
    valueType: "text", kind: "conditional", requiredWhen: ROAD_CROSSING_SLEEVES_INTERNAL_WATER_APPLICABILITY_R1 },
  { id: W_BASIS, title: "Отдельная граница стоимости воды затворения", unitId: null,
    valueType: "enum", kind: "conditional", values: [ROAD_CROSSING_SLEEVES_INTERNAL_WATER_COST_BASIS_R1], requiredWhen: ROAD_CROSSING_SLEEVES_INTERNAL_WATER_APPLICABILITY_R1 },
  waterFact(W_STOCK, "Подтверждённая совместимая вода для этого замеса в наличии; не повторять выделенную другим операциям"),
  waterFact(W_RESERVE, "Сохраняемый резерв той же совместимой воды; не расходовать на сухой резерв смеси"),
  waterFact(W_MULTIPLE, "Фактическая кратность нового заказа выбранной воды в м³; не число рейсов", 0.000_001),
]);
const W_CONSUMED = ROAD_CROSSING_SLEEVES_INTERNAL_FILL_EXPRESSIONS_R1.mixing_water_m3;
const W_TOTAL = `(${W_CONSUMED})+${W_RESERVE}`;
const W_NEED = `max(0,(${W_TOTAL})-${W_STOCK})`;
const W_COUNT = `ceil((${W_NEED})/${W_MULTIPLE})`;
const W_ORDER = `(${W_COUNT})*${W_MULTIPLE}`;
const W_REMAINING = `${W_STOCK}+(${W_ORDER})-(${W_CONSUMED})`;
export const ROAD_CROSSING_SLEEVES_INTERNAL_WATER_EXPRESSIONS_R1 = Object.freeze({
  compatible_stock_m3: W_STOCK, retained_reserve_m3: W_RESERVE, total_need_m3: W_TOTAL,
  new_need_m3: W_NEED, supplier_multiple_count: W_COUNT, ordered_m3: W_ORDER,
  remaining_m3: W_REMAINING, free_m3_beyond_reserve: `(${W_REMAINING})-${W_RESERVE}`,
});
const waterInputs = [...netGeometry, PRODUCT, RATE, WATER, BAG, W_MODE];
const waterRow = (key: keyof typeof ROAD_CROSSING_SLEEVES_INTERNAL_WATER_EXPRESSIONS_R1, title: string): AutomaticRowSpec => ({
  rowId: `rcs:internal-water:${key}`, formulaId: `rcs:internal-water:${key}`, section: "Отдельная вода затворения внутреннего заполнения",
  category: "material", title, unitId: key === "supplier_multiple_count" ? "package" : "m3",
  expression: ROAD_CROSSING_SLEEVES_INTERNAL_WATER_EXPRESSIONS_R1[key], inclusion: ROAD_CROSSING_SLEEVES_INTERNAL_WATER_APPLICABILITY_R1,
  costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: [MODE, W_MODE],
});
export const ROAD_CROSSING_SLEEVES_INTERNAL_WATER_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  waterRow("compatible_stock_m3", "Совместимая вода в наличии, выделенная этому замесу"),
  waterRow("retained_reserve_m3", "Сохраняемый резерв воды, не расход замеса"),
  waterRow("total_need_m3", "Фактический расход воды замеса с сохраняемым резервом"),
  waterRow("new_need_m3", "Дополнительная потребность в воде после совместимого наличия"),
  waterRow("supplier_multiple_count", "Число кратностей поставки воды; не отдельная оплата и не рейсы"),
  { ...waterRow("ordered_m3", "Новый отдельный заказ совместимой воды для затворения внутреннего заполнения"),
    costTreatment: "OWN_COST", procurement: true, titleParameterIds: [W_PRODUCT],
    inputParameterIds: [...waterInputs, W_PRODUCT, W_REFERENCE, W_BASIS, W_STOCK, W_RESERVE, W_MULTIPLE] },
  waterRow("remaining_m3", "Остаток совместимой воды после замеса, включая сохраняемый резерв"),
  waterRow("free_m3_beyond_reserve", "Свободная совместимая вода после замеса сверх сохраняемого резерва"),
]);
