import type { AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_EXPRESSIONS_R1 as civil, ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "./roadCrossingSleevesCivilGeometryR1";

/** Net geometric space only. Approved permanent occupied volume must include
 * casing ends, retained structures and other fill outside the selected return
 * fill scope, without overlaps. Temporary equipment is not a permanent volume.
 * Actual excavation dimensions remain method/project facts (PJA boundary), not
 * a deduction from crossing length. No soil suitability/compaction/haul norm.
 */
export const ROAD_CROSSING_SLEEVES_PIT_RETURN_SCOPE_R1 = Object.freeze({
  fullOwner: false, engineeringAccepted: false,
  geometry: "Confirmed rectangular thrust/reception excavation minus actual non-overlapping permanent occupied volume in each same pit",
  excluded: "Soil/product suitability, excavation safety, support/reaction approval, groundwater, annular grouting, compaction/supply-state conversion, construction resources and haul/disposal",
  cost: "Informational geometric space only, not a second excavation or paid fill/material order",
  manualOverride: "Visible quantity exception, not a rewrite of original dimensions/retained volumes or engineering approval",
});
const METHOD = "rcs_civil_installation_method";
const THRUST_RETAINED = "rcs_jacking_thrust_permanent_occupied_volume_m3";
const RECEPTION_RETAINED = "rcs_jacking_reception_permanent_occupied_volume_m3";
const fact = (id: string, title: string): AutomaticParameterSpec => ({
  id, title, kind: "conditional", valueType: "decimal", unitId: "m3", min: 0,
  requiredWhen: { parameterId: METHOD, value: methods.pipeJacking },
});
export const ROAD_CROSSING_SLEEVES_PIT_RETURN_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  fact(THRUST_RETAINED, "Подтверждённый постоянный занятый объём стартового котлована: конструкции, концы футляра и другие заполнения без пересечений"),
  fact(RECEPTION_RETAINED, "Подтверждённый постоянный занятый объём приёмного котлована: конструкции, концы футляра и другие заполнения без пересечений"),
]);
const THRUST_INPUTS = [METHOD, "rcs_jacking_thrust_excavation_length_m", "rcs_jacking_thrust_excavation_width_m", "rcs_jacking_thrust_excavation_depth_m", THRUST_RETAINED];
const RECEPTION_INPUTS = [METHOD, "rcs_jacking_reception_excavation_length_m", "rcs_jacking_reception_excavation_width_m", "rcs_jacking_reception_excavation_depth_m", RECEPTION_RETAINED];
const THRUST_SPACE = `(${civil.jacking_thrust_pit_excavation_m3})-${THRUST_RETAINED}`;
const RECEPTION_SPACE = `(${civil.jacking_reception_pit_excavation_m3})-${RECEPTION_RETAINED}`;
export const ROAD_CROSSING_SLEEVES_PIT_RETURN_EXPRESSIONS_R1 = Object.freeze({
  thrust_remaining_space_m3: THRUST_SPACE,
  reception_remaining_space_m3: RECEPTION_SPACE,
  total_remaining_space_m3: `(${THRUST_SPACE})+(${RECEPTION_SPACE})`,
});
function row(key: keyof typeof ROAD_CROSSING_SLEEVES_PIT_RETURN_EXPRESSIONS_R1, title: string, inputs: readonly string[]): AutomaticRowSpec {
  return {
    rowId: `rcs:pit-return:${key}`, formulaId: `rcs:pit-return:${key}`, section: "Геометрия оставшегося места в котлованах",
    category: "service", title, unitId: "m3", expression: ROAD_CROSSING_SLEEVES_PIT_RETURN_EXPRESSIONS_R1[key],
    inclusion: { kind: "equals", parameterId: METHOD, value: methods.pipeJacking },
    inputParameterIds: inputs, costTreatment: "INFORMATIONAL_SCOPE",
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "m3", minimum: 0,
      reasonRu: "Постоянный занятый объём не может превышать геометрическую разработку соответствующего котлована. Объёмы разных котлованов не компенсируют ошибку друг друга." },
  };
}
export const ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  row("thrust_remaining_space_m3", "Оставшееся геометрическое место стартового котлована; не норма грунта или поставки", THRUST_INPUTS),
  row("reception_remaining_space_m3", "Оставшееся геометрическое место приёмного котлована; не норма грунта или поставки", RECEPTION_INPUTS),
  row("total_remaining_space_m3", "Сумма оставшегося места котлованов; без проходки и повторной разработки", [...new Set([...THRUST_INPUTS, ...RECEPTION_INPUTS])]),
]);
