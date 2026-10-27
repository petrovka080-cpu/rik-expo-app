import type { AutomaticParameterSpec } from "./automaticConstructionOwnerR1";

/** Quantity component for ONE continuous steel casing, not a complete crossing
 * owner, method statement, spacer selection or engineering acceptance.
 * Expressions are consumed only by the existing canonical FormulaGraph.
 * Civil/method resources, weld WPS, packaging and compatibility must still be
 * attached by the full owner before publication. No fixture is a hidden default.
 */
export const ROAD_CROSSING_SLEEVES_QUANTITY_SCOPE_R1 = Object.freeze({
  catalogId: "canonical-work:expanded:road_crossing_sleeves",
  fullOwner: false,
  engineeringAccepted: false,
  ringLayout: "RACI-specific preliminary count, only with an approved load-rated layout",
  steelMass: "Geometric preliminary transport mass; actual certified mass takes precedence",
});

export const ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "rcs_crossing_length_m", title: "Длина одного непрерывного футляра", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "rcs_casing_outside_diameter_mm", title: "Наружный диаметр выбранного стального футляра", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001, numericPeerConstraints: { greaterThanParameter: "rcs_casing_inside_diameter_mm" } },
  { id: "rcs_casing_inside_diameter_mm", title: "Внутренний диаметр выбранного стального футляра", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001, numericPeerConstraints: { greaterThanParameter: "rcs_carrier_outside_diameter_mm" } },
  { id: "rcs_carrier_outside_diameter_mm", title: "Наружный диаметр рабочей трубы", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
  { id: "rcs_planned_physical_section_length_m", title: "Длина физической секции футляра по плану монтажа", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "rcs_compatible_stock_section_count", title: "Подтверждённые целые совместимые секции в наличии", valueType: "integer", unitId: "piece", kind: "ordinary", min: 0 },
  { id: "rcs_retained_spare_section_count", title: "Сохраняемый резерв целых секций", valueType: "integer", unitId: "piece", kind: "ordinary", min: 0 },
  { id: "rcs_supplier_bundle_section_count", title: "Число физических секций в поставочной пачке", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "rcs_steel_density_kg_m3", title: "Плотность стали для предварительной массы", valueType: "decimal", unitId: "kg_per_m3", kind: "ordinary", min: 0.000_001 },
  { id: "rcs_raci_approved_ring_pitch_m", title: "Шаг опорных колец по согласованной схеме RACI", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001, max: 3 },
  { id: "rcs_raci_selected_elements_per_ring", title: "Элементов на кольцо для выбранного изделия RACI", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
]);

const L = "rcs_crossing_length_m";
const SECTION = "rcs_planned_physical_section_length_m";
const INSTALLED_SECTIONS = `ceil(${L}/${SECTION})`;
const STOCK = "rcs_compatible_stock_section_count";
const SPARE = "rcs_retained_spare_section_count";
const BUNDLE = "rcs_supplier_bundle_section_count";
const TOTAL_SECTION_NEED = `(${INSTALLED_SECTIONS})+${SPARE}`;
const NEW_SECTION_NEED = `max(0,(${TOTAL_SECTION_NEED})-${STOCK})`;
const ORDERED_SECTIONS = `ceil((${NEW_SECTION_NEED})/${BUNDLE})*${BUNDLE}`;
const REMAINING_SECTIONS = `${STOCK}+(${ORDERED_SECTIONS})-(${INSTALLED_SECTIONS})`;
// Keep the section area in mm2 until the final kg result; premature division
// rounds the small m2 area in the canonical fixed-decimal evaluator.
const STEEL_AREA_MM2 = "3.141592654/4*(pow(rcs_casing_outside_diameter_mm,2)-pow(rcs_casing_inside_diameter_mm,2))";
const RINGS = `ceil(${L}/rcs_raci_approved_ring_pitch_m)+3`;

export const ROAD_CROSSING_SLEEVES_QUANTITY_EXPRESSIONS_R1 = Object.freeze({
  installed_length_m: L,
  wall_thickness_mm: "(rcs_casing_outside_diameter_mm-rcs_casing_inside_diameter_mm)/2",
  installed_section_count: INSTALLED_SECTIONS,
  site_joint_count: `(${INSTALLED_SECTIONS})-1`,
  circumferential_site_weld_length_m: `3.141592654*rcs_casing_outside_diameter_mm/1000*((${INSTALLED_SECTIONS})-1)`,
  installed_whole_section_length_m: `(${INSTALLED_SECTIONS})*${SECTION}`,
  cutting_remainder_m: `(${INSTALLED_SECTIONS})*${SECTION}-${L}`,
  retained_spare_section_count: SPARE,
  total_section_need: TOTAL_SECTION_NEED,
  compatible_stock_section_count: STOCK,
  new_section_need: NEW_SECTION_NEED,
  supplier_bundle_count: `ceil((${NEW_SECTION_NEED})/${BUNDLE})`,
  ordered_section_count: ORDERED_SECTIONS,
  ordered_casing_length_m: `(${ORDERED_SECTIONS})*${SECTION}`,
  remaining_whole_section_count: REMAINING_SECTIONS,
  free_section_count_beyond_spare: `(${REMAINING_SECTIONS})-${SPARE}`,
  preliminary_installed_steel_mass_kg: `(${STEEL_AREA_MM2})*${L}*rcs_steel_density_kg_m3/1000000`,
  preliminary_ordered_steel_mass_kg: `(${STEEL_AREA_MM2})*((${ORDERED_SECTIONS})*${SECTION})*rcs_steel_density_kg_m3/1000000`,
  raci_installed_ring_count: RINGS,
  raci_installed_element_count: `(${RINGS})*rcs_raci_selected_elements_per_ring`,
  raci_installed_contact_tape_length_m: `(${RINGS})*3.141592654*rcs_carrier_outside_diameter_mm/1000`,
  // Two open ends for the explicitly scoped single continuous crossing. This
  // is kit count only; supplied straps do not become another procurement row.
  installed_end_seal_kit_count: `${L}/${L}*2`,
});
