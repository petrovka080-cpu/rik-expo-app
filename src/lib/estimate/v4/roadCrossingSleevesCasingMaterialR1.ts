import type { AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_QUANTITY_EXPRESSIONS_R1 as quantities } from "./roadCrossingSleevesQuantityModelR1";

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
  purchaseOverride: "An explicit row override is a visible purchase exception; control balances remain formula references and must be reconciled by the full owner before procurement approval",
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
  control("supplier_bundle_count", "Количество новых поставочных пачек, не число монтажных стыков", "package"),
  control("ordered_section_count", "Целые секции в новом заказе после округления пачек, без второй оплаты", "piece"),
  { rowId: "rcs:casing:ordered_casing_length_m", formulaId: "rcs:casing:ordered_casing_length_m", section: "Материалы дорожного футляра",
    category: "material", title: "Новый заказ выбранного стального футляра целыми совместимыми секциями",
    unitId: "m", expression: quantities.ordered_casing_length_m, procurement: true, costTreatment: "OWN_COST",
    titleParameterIds: ["rcs_casing_product_designation"], inputParameterIds: ["rcs_casing_product_designation",
      "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm"] },
  control("remaining_whole_section_count", "Остаток целых секций после монтажа, включая сохраняемый резерв", "piece"),
  control("free_section_count_beyond_spare", "Свободные целые секции сверх сохраняемого резерва, без геометрического обрезка", "piece"),
  control("preliminary_installed_steel_mass_kg", "Предварительная геометрическая масса смонтированного футляра, не отдельная закупка", "kg"),
  control("preliminary_ordered_steel_mass_kg", "Предварительная геометрическая масса нового заказа, не отдельная оплата или подтверждённый груз", "kg"),
]);
