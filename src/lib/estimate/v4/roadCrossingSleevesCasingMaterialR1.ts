import type { AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_QUANTITY_EXPRESSIONS_R1 as quantities } from "./roadCrossingSleevesQuantityModelR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

/** One selected casing material order, not a full crossing or product approval.
 * Compatible whole sections, including existing stock and supplier bundles,
 * have the explicitly supplied physical section length. Unidentified offcuts
 * never become stock. FormulaGraph owns all arithmetic; geometry/density do
 * not invent a grade, certified unit mass, price or freight specification.
 */
export const ROAD_CROSSING_SLEEVES_CASING_MATERIAL_SCOPE_R1 = Object.freeze({
  fullOwner: false, engineeringAccepted: false,
  supply: "Whole confirmed compatible sections of the declared physical section length",
  cost: "Only new ordered casing metres; no second section, bundle or geometric-mass payment",
  cutting: "Geometric remainder from used whole sections is separate from unused whole-section stock; not an approved reusable offcut",
  mass: "Geometric preliminary mass only, not a payable kilogram quantity or certified freight mass",
  purchaseOverride: "Accepted whole-bundle order drives supply balance and freight; consumption and reserve deficits prevent procurement readiness",
  excluded: "Product/structural approval, site joints, lifting, civil work, freight, carrier pipe and full crossing",
});
export const ROAD_CROSSING_SLEEVES_CASING_MATERIAL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "rcs_casing_product_designation", title: "Обозначение выбранного совместимого стального футляра по спецификации",
    valueType: "text", unitId: null, kind: "ordinary" },
]);

function control(key: keyof typeof quantities, title: string, unitId: string): AutomaticRowSpec {
  return { rowId: `rcs:casing:${key}`, formulaId: `rcs:casing:${key}`, section: "Баланс секций стального футляра",
    category: "material", title, unitId, expression: quantities[key], costTreatment: "INFORMATIONAL_SCOPE" };
}
const casingBalance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: "rcs:casing:ordered_casing_length_m", orderUnitId: "m",
  consumed: `(${quantities.installed_whole_section_length_m})`, stock: "rcs_compatible_stock_section_count*rcs_planned_physical_section_length_m",
  reserve: "rcs_retained_spare_section_count*rcs_planned_physical_section_length_m",
  quantum: "rcs_supplier_bundle_section_count*rcs_planned_physical_section_length_m" });
const casingSections = `(${casingBalance.effective})/rcs_planned_physical_section_length_m`;
function casingSupplyControl(key: string, title: string, expression: string, unitId = "piece"): AutomaticRowSpec {
  return { rowId: `rcs:casing:${key}`, formulaId: `rcs:casing:${key}`, section: "Баланс секций стального футляра",
    category: "material", title, unitId, expression, costTreatment: "INFORMATIONAL_SCOPE" };
}
export const ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  control("installed_length_m", "Длина смонтированного футляра, не повторный заказ материала", "m"),
  control("wall_thickness_mm", "Толщина стенки из фактических наружного и внутреннего диаметров", "mm"),
  control("installed_section_count", "Физические секции для монтажа, независимо от поставочных пачек", "piece"),
  control("installed_whole_section_length_m", "Полная длина задействованных целых секций до обрезки", "m"),
  control("cutting_remainder_m", "Геометрический обрезок задействованных секций, не подтверждённое пригодное наличие", "m"),
  control("retained_spare_section_count", "Сохраняемый резерв целых совместимых секций", "piece"),
  control("total_section_need", "Потребность физических секций для монтажа и сохраняемого резерва", "piece"),
  control("compatible_stock_section_count", "Подтверждённые целые совместимые секции в наличии", "piece"),
  control("new_section_need", "Дополнительная потребность физических секций после наличия", "piece"),
  casingSupplyControl("supplier_bundle_count", "Количество принятых новых поставочных пачек, не число монтажных стыков", casingBalance.packages, "package"),
  casingSupplyControl("ordered_section_count", "Целые секции в принятом новом заказе, без второй оплаты", casingSections),
  { rowId: "rcs:casing:ordered_casing_length_m", formulaId: "rcs:casing:ordered_casing_length_m", section: "Материалы дорожного футляра",
    category: "material", title: "Новый заказ выбранного стального футляра целыми совместимыми секциями",
    unitId: "m", expression: quantities.ordered_casing_length_m, procurement: true, costTreatment: "OWN_COST", ...casingBalance.owner,
    titleParameterIds: ["rcs_casing_product_designation"], inputParameterIds: ["rcs_casing_product_designation",
      "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm"] },
  casingSupplyControl("available_whole_section_count", "Подтверждённое наличие и принятые новые целые секции", `rcs_compatible_stock_section_count+(${casingSections})`),
  casingSupplyControl("remaining_whole_section_count", "Остаток целых секций после монтажа, включая сохраняемый резерв", `(${casingBalance.remaining})/rcs_planned_physical_section_length_m`),
  casingSupplyControl("free_section_count_beyond_spare", "Свободные целые секции сверх сохраняемого резерва, без геометрического обрезка", `(${casingBalance.free})/rcs_planned_physical_section_length_m`),
  casingSupplyControl("consumption_shortage_section_count", "Недостающие целые секции для монтажа; закупка не готова", `(${casingBalance.consumptionShortage})/rcs_planned_physical_section_length_m`),
  casingSupplyControl("reserve_deficit_section_count", "Непокрытый сохраняемый резерв целых секций; закупка не готова", `(${casingBalance.reserveDeficit})/rcs_planned_physical_section_length_m`),
  control("preliminary_installed_steel_mass_kg", "Предварительная геометрическая масса смонтированного футляра, не отдельная закупка", "kg"),
  casingSupplyControl("preliminary_ordered_steel_mass_kg", "Предварительная геометрическая масса принятого нового заказа, не отдельная оплата или подтверждённый груз",
    `(${quantities.preliminary_installed_steel_mass_kg})/rcs_crossing_length_m*${casingBalance.effective}`, "kg"),
]);

/** Carrier supply owns a different product and stock allocation from the casing.
 * Scope: one approved straight carrier, with actual total end extensions. New
 * stick supply counts whole physical sections; coil/other supply needs its own
 * selected boundary. Customer supply never creates an executor pipe purchase.
 */
export const ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1 = Object.freeze({
  newSections: "Отдельная закупка рабочей трубы целыми физическими секциями",
  customerSupplied: "Подтверждённая рабочая труба заказчика; новой закупки исполнителем нет",
  other: "Другая поставка рабочей трубы: отдельная согласованная схема",
});
export const ROAD_CROSSING_SLEEVES_CARRIER_COST_BASIS_R1 = "Только рабочая труба; без соединителей, всех исполнителей, техники, энергии и доставки";
const C_MODE = "rcs_carrier_supply_mode";
const C_PRODUCT = "rcs_carrier_product_designation";
const C_EXTENSION = "rcs_carrier_total_end_extension_m";
const C_SECTION = "rcs_carrier_physical_supply_section_length_m";
const C_DAMAGE = "rcs_carrier_damaged_whole_section_count";
const C_STOCK = "rcs_carrier_compatible_whole_section_stock_count";
const C_RESERVE = "rcs_carrier_retained_whole_section_count";
const C_BUNDLE = "rcs_carrier_supplier_bundle_section_count";
const C_BASIS = "rcs_carrier_pipe_cost_basis";
const carrierInclusion = Object.freeze({ kind: "equals" as const, parameterId: C_MODE, value: ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1.newSections });
const carrierCount = (id: string, title: string, min = 0): AutomaticParameterSpec => ({
  id, title, kind: "conditional", valueType: "integer", unitId: "piece", min, requiredWhen: carrierInclusion,
});
export const ROAD_CROSSING_SLEEVES_CARRIER_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: C_MODE, title: "Фактический вариант снабжения рабочей трубой", kind: "ordinary", valueType: "enum", unitId: null,
    values: Object.values(ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1) },
  { id: C_PRODUCT, title: "Выбранная совместимая рабочая труба с соединениями по спецификации", kind: "ordinary", valueType: "text", unitId: null },
  { id: C_EXTENSION, title: "Фактическая суммарная длина концов рабочей трубы за пределами футляра; не назначать автоматически", kind: "ordinary", valueType: "decimal", unitId: "m", min: 0 },
  { id: C_SECTION, title: "Длина одной фактической поставочной секции рабочей трубы; не длина секции футляра", kind: "conditional",
    valueType: "decimal", unitId: "m", min: 0.000_001, requiredWhen: carrierInclusion },
  carrierCount(C_DAMAGE, "Подтверждённые целые секции рабочей трубы, расходуемые сверх монтажа; геометрический обрезок уже учтён"),
  carrierCount(C_STOCK, "Подтверждённые пригодные целые секции той же рабочей трубы и длины в наличии; без пересечений с другими работами"),
  carrierCount(C_RESERVE, "Сохраняемый резерв целых секций рабочей трубы"),
  carrierCount(C_BUNDLE, "Секций рабочей трубы в фактической поставочной пачке", 1),
  { id: C_BASIS, title: "Граница отдельной стоимости рабочей трубы", kind: "conditional", valueType: "enum", unitId: null,
    values: [ROAD_CROSSING_SLEEVES_CARRIER_COST_BASIS_R1], requiredWhen: carrierInclusion },
]);
const C_LENGTH = `rcs_crossing_length_m+${C_EXTENSION}`;
const C_INSTALLED = `ceil((${C_LENGTH})/${C_SECTION})`;
const C_CONSUMED = `(${C_INSTALLED})+${C_DAMAGE}`;
const C_TOTAL = `(${C_CONSUMED})+${C_RESERVE}`;
const C_NEED = `max(0,(${C_TOTAL})-${C_STOCK})`;
const C_PACKS = `ceil((${C_NEED})/${C_BUNDLE})`;
const C_ORDER = `(${C_PACKS})*${C_BUNDLE}`;
const C_REMAINING = `${C_STOCK}+(${C_ORDER})-(${C_CONSUMED})`;
export const ROAD_CROSSING_SLEEVES_CARRIER_EXPRESSIONS_R1 = Object.freeze({
  installed_length_m: C_LENGTH, installed_section_count: C_INSTALLED,
  cutting_remainder_m: `(${C_INSTALLED})*${C_SECTION}-(${C_LENGTH})`,
  damaged_section_count: C_DAMAGE, compatible_stock_section_count: C_STOCK, retained_section_count: C_RESERVE,
  consumed_section_count: C_CONSUMED, total_section_need: C_TOTAL, new_section_need: C_NEED,
  supplier_bundle_count: C_PACKS, ordered_section_count: C_ORDER,
  ordered_length_m: `(${C_ORDER})*${C_SECTION}`, remaining_section_count: C_REMAINING,
  free_section_count: `(${C_REMAINING})-${C_RESERVE}`,
});
const carrierRow = (key: keyof typeof ROAD_CROSSING_SLEEVES_CARRIER_EXPRESSIONS_R1, title: string): AutomaticRowSpec => ({
  rowId: `rcs:carrier:${key}`, formulaId: `rcs:carrier:${key}`, section: "Рабочая труба выбранного перехода", category: "material", title,
  unitId: key.endsWith("_m") ? "m" : key === "supplier_bundle_count" ? "package" : "piece",
  expression: ROAD_CROSSING_SLEEVES_CARRIER_EXPRESSIONS_R1[key], costTreatment: "INFORMATIONAL_SCOPE",
  ...(key === "installed_length_m" ? {} : { inclusion: carrierInclusion }),
  inputParameterIds: key === "installed_length_m" ? ["rcs_crossing_length_m", C_EXTENSION] : [C_MODE],
});
export const ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  carrierRow("installed_length_m", "Длина рабочей трубы в футляре с фактическими концами; не повторная закупка"),
  carrierRow("installed_section_count", "Целые физические секции рабочей трубы для монтажа"),
  carrierRow("cutting_remainder_m", "Геометрический обрезок монтажных секций рабочей трубы; не автоматически пригодное наличие"),
  carrierRow("damaged_section_count", "Фактические дополнительно расходуемые секции рабочей трубы"),
  carrierRow("compatible_stock_section_count", "Совместимые целые секции рабочей трубы в наличии"),
  carrierRow("retained_section_count", "Сохраняемый резерв секций рабочей трубы"),
  carrierRow("consumed_section_count", "Секции рабочей трубы на монтаж и подтверждённые потери"),
  carrierRow("total_section_need", "Общая потребность секций рабочей трубы с резервом"),
  carrierRow("new_section_need", "Дополнительная потребность секций рабочей трубы после наличия"),
  carrierRow("supplier_bundle_count", "Число новых поставочных пачек рабочей трубы; не монтажные соединения"),
  carrierRow("ordered_section_count", "Новые целые секции рабочей трубы в заказе; без второй оплаты"),
  { ...carrierRow("ordered_length_m", "Новый отдельный заказ выбранной рабочей трубы в метрах целых секций"),
    costTreatment: "OWN_COST", procurement: true, titleParameterIds: [C_PRODUCT],
    inputParameterIds: ["rcs_crossing_length_m", "rcs_carrier_outside_diameter_mm", C_EXTENSION, C_PRODUCT, C_MODE, C_SECTION, C_DAMAGE, C_STOCK, C_RESERVE, C_BUNDLE, C_BASIS] },
  carrierRow("remaining_section_count", "Остаток целых секций рабочей трубы после монтажа и потерь, включая резерв"),
  carrierRow("free_section_count", "Свободные целые секции рабочей трубы сверх сохраняемого резерва"),
]);
