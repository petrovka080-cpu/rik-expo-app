import type { AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";

/** Project geometry, NOT a full civil/crossing owner or excavation design.
 * Only the explicitly confirmed rectangular/prismatic variants below are
 * supported. Slopes, end ramps, nonrectangular shafts, reaction structures,
 * groundwater, support design, soil reuse/haul and execution resources are not
 * silently inferred. Pipe Jacking Association: thrust/reception pit dimensions
 * and reaction arrangements are specific to the approved drive/method.
 * https://www.pipejacking.org/about_pipe_jacking
 */
export const ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 = Object.freeze({
  openCut: "Открытая прямоугольная траншея",
  pipeJacking: "Продавливание с прямоугольными котлованами",
});
export const ROAD_CROSSING_SLEEVES_CIVIL_SCOPE_R1 = Object.freeze({
  fullOwner: false, engineeringAccepted: false,
  geometry: "One straight uniform casing; actual external excavation dimensions, not usable pit dimensions",
  pitBackfill: "Gross pit volume only; net return fill needs actual retained structures and method facts",
  soil: "Geometric excavation is not proof of soil suitability, reuse, disposal classification or haul quantity",
});
const METHOD = "rcs_civil_installation_method";
const openCut = ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1.openCut;
const pipeJacking = ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1.pipeJacking;
const fact = (id: string, title: string, method: string, min = 0.000_001, unitId = "m"): AutomaticParameterSpec => ({
  id, title, kind: "conditional", valueType: "decimal", unitId, min,
  requiredWhen: { parameterId: METHOD, value: method },
});
export const ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: METHOD, title: "Подтверждённый способ и форма разработки грунта", kind: "ordinary", valueType: "enum", unitId: null, values: [openCut, pipeJacking] },
  fact("rcs_open_cut_excavation_width_m", "Фактическая наружная ширина прямоугольной разработки траншеи", openCut),
  fact("rcs_open_cut_excavation_depth_m", "Фактическая глубина прямоугольной разработки траншеи", openCut),
  fact("rcs_open_cut_full_width_bedding_thickness_m", "Толщина проектного основания по всей ширине траншеи", openCut, 0),
  fact("rcs_jacking_thrust_excavation_length_m", "Наружная длина разработки стартового котлована", pipeJacking),
  fact("rcs_jacking_thrust_excavation_width_m", "Наружная ширина разработки стартового котлована", pipeJacking),
  fact("rcs_jacking_thrust_excavation_depth_m", "Глубина разработки стартового котлована", pipeJacking),
  fact("rcs_jacking_reception_excavation_length_m", "Наружная длина разработки приёмного котлована", pipeJacking),
  fact("rcs_jacking_reception_excavation_width_m", "Наружная ширина разработки приёмного котлована", pipeJacking),
  fact("rcs_jacking_reception_excavation_depth_m", "Глубина разработки приёмного котлована", pipeJacking),
  fact("rcs_jacking_confirmed_excavation_diameter_mm", "Фактический диаметр разработки выбранного проходческого оборудования", pipeJacking, 0.000_001, "mm"),
]);

const L = "rcs_crossing_length_m";
const WIDTH = "rcs_open_cut_excavation_width_m";
const DEPTH = "rcs_open_cut_excavation_depth_m";
const BED = "rcs_open_cut_full_width_bedding_thickness_m";
const CASING_VOLUME = `3.141592654/4*pow(rcs_casing_outside_diameter_mm,2)*${L}/1000000`;
const TRENCH_VOLUME = `${L}*${WIDTH}*${DEPTH}`;
const BED_VOLUME = `${L}*${WIDTH}*${BED}`;
const THRUST_VOLUME = "rcs_jacking_thrust_excavation_length_m*rcs_jacking_thrust_excavation_width_m*rcs_jacking_thrust_excavation_depth_m";
const RECEPTION_VOLUME = "rcs_jacking_reception_excavation_length_m*rcs_jacking_reception_excavation_width_m*rcs_jacking_reception_excavation_depth_m";
const BORE_VOLUME = `3.141592654/4*pow(rcs_jacking_confirmed_excavation_diameter_mm,2)*${L}/1000000`;

export const ROAD_CROSSING_SLEEVES_CIVIL_EXPRESSIONS_R1 = Object.freeze({
  open_cut_plan_area_m2: `${L}*${WIDTH}`,
  open_cut_excavation_m3: TRENCH_VOLUME,
  open_cut_full_width_bedding_m3: BED_VOLUME,
  open_cut_casing_displacement_m3: CASING_VOLUME,
  open_cut_remaining_fill_space_m3: `(${TRENCH_VOLUME})-(${BED_VOLUME})-(${CASING_VOLUME})`,
  open_cut_width_difference_m: `${WIDTH}-rcs_casing_outside_diameter_mm/1000`,
  open_cut_depth_difference_above_bedding_m: `${DEPTH}-${BED}-rcs_casing_outside_diameter_mm/1000`,
  jacking_thrust_pit_excavation_m3: THRUST_VOLUME,
  jacking_reception_pit_excavation_m3: RECEPTION_VOLUME,
  jacking_bore_excavation_m3: BORE_VOLUME,
  jacking_total_geometric_excavation_m3: `(${THRUST_VOLUME})+(${RECEPTION_VOLUME})+(${BORE_VOLUME})`,
  jacking_excavation_casing_diameter_difference_mm: "rcs_jacking_confirmed_excavation_diameter_mm-rcs_casing_outside_diameter_mm",
});

function row(id: keyof typeof ROAD_CROSSING_SLEEVES_CIVIL_EXPRESSIONS_R1, title: string,
  unitId: string, method: string, nonnegativeReason?: string): AutomaticRowSpec {
  return {
    rowId: `rcs:civil:${id}`, formulaId: `rcs:civil:${id}`, section: `Геометрия: ${method}`, category: "service", title, unitId,
    expression: ROAD_CROSSING_SLEEVES_CIVIL_EXPRESSIONS_R1[id],
    inclusion: { kind: "equals", parameterId: METHOD, value: method }, costTreatment: "INFORMATIONAL_SCOPE",
    ...(nonnegativeReason == null ? {} : { formulaOutputBounds: {
      schemaVersion: "canonical_formula_output_bounds_v1" as const, unitId, minimum: 0, reasonRu: nonnegativeReason,
    } }),
  };
}
export const ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  row("open_cut_plan_area_m2", "Площадь прямоугольной разработки в плане", "m2", openCut),
  row("open_cut_excavation_m3", "Геометрический объём открытой прямоугольной траншеи", "m3", openCut),
  row("open_cut_full_width_bedding_m3", "Проектный объём основания по всей ширине траншеи", "m3", openCut),
  row("open_cut_casing_displacement_m3", "Объём, вытесненный наружным сечением футляра", "m3", openCut),
  row("open_cut_remaining_fill_space_m3", "Оставшееся место для заполнения снаружи футляра, не подтверждение повторного использования грунта", "m3", openCut,
    "Объём основания и наружный объём футляра не могут превышать геометрический объём выбранной траншеи."),
  row("open_cut_width_difference_m", "Разность ширины разработки и наружного диаметра футляра, без нормативного монтажного зазора", "m", openCut,
    "Наружный диаметр футляра не может быть больше ширины выбранной прямоугольной разработки."),
  row("open_cut_depth_difference_above_bedding_m", "Разность доступной глубины над основанием и наружного диаметра футляра, не приёмка проектного покрытия", "m", openCut,
    "Наружный диаметр футляра с основанием не может превышать глубину выбранной разработки."),
  row("jacking_thrust_pit_excavation_m3", "Геометрический объём разработки стартового прямоугольного котлована", "m3", pipeJacking),
  row("jacking_reception_pit_excavation_m3", "Геометрический объём разработки приёмного прямоугольного котлована", "m3", pipeJacking),
  row("jacking_bore_excavation_m3", "Геометрический объём проходки по фактическому диаметру оборудования", "m3", pipeJacking),
  row("jacking_total_geometric_excavation_m3", "Сумма геометрической разработки котлованов и проходки, без двойной траншеи", "m3", pipeJacking),
  row("jacking_excavation_casing_diameter_difference_mm", "Разность фактического диаметра разработки и наружного диаметра футляра", "mm", pipeJacking,
    "Диаметр фактической проходки не может быть меньше наружного диаметра выбранного футляра."),
]);
