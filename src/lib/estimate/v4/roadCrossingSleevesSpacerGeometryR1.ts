import type { AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";

/** RACI-specific geometric compatibility only. Uses the quantity component's
 * actual carrier OD and casing ID. It neither selects a load-rated product nor
 * approves a layout, method, groundwater seal or complete crossing owner.
 * Source: https://www.racispacers.com/choosing-a-spacer/ — formulas 2 and 3.
 * The manufacturer's 15 mm here is a DIAMETRAL difference, not radial clearance.
 */
export const ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "rcs_maximum_joint_envelope_diameter_mm", title: "Максимальный наружный диаметр раструба, фланца или муфты рабочей трубы", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001, numericPeerConstraints: { greaterThanOrEqualParameter: "rcs_carrier_outside_diameter_mm" } },
  { id: "rcs_raci_selected_element_height_mm", title: "Высота выбранного опорного элемента RACI по спецификации", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
]);

const ASSEMBLED = "rcs_carrier_outside_diameter_mm+2*rcs_raci_selected_element_height_mm";
export const ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:raci_assembled_diameter", section: "Совместимость выбранных опор RACI", category: "service", title: "Расчётный наружный диаметр рабочей трубы с опорами RACI", unitId: "mm", formulaId: "rcs:raci_assembled_diameter", expression: ASSEMBLED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rcs:raci_joint_diametral_difference", section: "Совместимость выбранных опор RACI", category: "service", title: "Разность диаметра трубы с опорами и максимального диаметра соединения", unitId: "mm", formulaId: "rcs:raci_joint_diametral_difference", expression: `(${ASSEMBLED})-rcs_maximum_joint_envelope_diameter_mm`, costTreatment: "INFORMATIONAL_SCOPE",
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "mm", exclusiveMinimum: 15, reasonRu: "Для выбранных опор RACI диаметр трубы с опорами должен превышать максимальный диаметр соединения более чем на 15 мм." } },
  { rowId: "rcs:raci_insertion_diametral_difference", section: "Совместимость выбранных опор RACI", category: "service", title: "Разность внутреннего диаметра футляра и диаметра трубы с опорами", unitId: "mm", formulaId: "rcs:raci_insertion_diametral_difference", expression: `rcs_casing_inside_diameter_mm-(${ASSEMBLED})`, costTreatment: "INFORMATIONAL_SCOPE",
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "mm", exclusiveMinimum: 15, reasonRu: "Для ввода выбранных опор RACI внутренний диаметр футляра должен превышать диаметр трубы с опорами более чем на 15 мм." } },
]);
