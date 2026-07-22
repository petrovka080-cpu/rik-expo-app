import type { AsphaltProfessionalEstimateCompilationV4 } from "./compileAsphaltProfessionalEstimateV4";

const ALWAYS_REQUIRED_ROWS = [
  "initial_data_analysis",
  "field_site_survey",
  "base_acceptance",
  "mechanized_surface_cleaning",
  "geodetic_layout",
  "axes_marks_fixing",
  "mobilization_demobilization",
  "work_zone_organization",
  "base_emulsion_material",
  "base_emulsion_application",
  "asphalt_layer_1_material",
  "asphalt_layer_1_paving",
  "asphalt_layer_1_preliminary_compaction",
  "asphalt_layer_1_main_compaction",
  "asphalt_layer_1_final_compaction",
  "asphalt_layer_1_quality_control",
  "asphalt_layer_2_material",
  "asphalt_layer_2_paving",
  "asphalt_layer_2_preliminary_compaction",
  "asphalt_layer_2_main_compaction",
  "asphalt_layer_2_final_compaction",
  "asphalt_layer_2_quality_control",
  "emulsion_interface_1_2",
  "emulsion_interface_1_2_application",
  "longitudinal_joints",
  "transverse_joints",
  "edge_treatment",
  "joint_sealing_material",
  "road_workers",
  "surface_cleaner",
  "bitumen_distributor",
  "asphalt_paver_layer_1",
  "asphalt_paver_layer_2",
  "smooth_roller_layer_1",
  "smooth_roller_layer_2",
  "pneumatic_roller_layer_1",
  "pneumatic_roller_layer_2",
  "asphalt_layer_1_delivery",
  "asphalt_layer_2_delivery",
  "asphalt_layer_1_truck_trips",
  "asphalt_layer_2_truck_trips",
  "dump_trucks_layer_1",
  "dump_trucks_layer_2",
  "laboratory_tests",
  "surface_smoothness_control",
  "pavement_thickness_control",
  "executive_survey",
  "execution_documentation",
] as const;

const GENERIC_ROW = /^(?:материал(?:ы)?|работ(?:а|ы)?|услуг(?:а|и)?|оборудование|техника|комплект|прочее)$/iu;
const PADDING_ROW = /(?:preview|placeholder|padding|filler|резерв|строка\s+\d+)/iu;

export type AsphaltWorkAssemblyCoverageCountersV4 = {
  required_wbs_rows_missing: number;
  quantity_missing: number;
  quantity_non_positive: number;
  unit_missing: number;
  formula_trace_missing: number;
  assumption_trace_missing: number;
  generic_rows: number;
  preview_only_rows: number;
  padding_rows: number;
  duplicate_row_ids: number;
  category_mismatch: number;
  formula_dimension_mismatch: number;
  unresolved_requirements: number;
};

export function validateAsphaltWorkAssemblyCoverageV4(
  compilation: AsphaltProfessionalEstimateCompilationV4,
) {
  const rows = compilation.compiled_rows;
  const ids = rows.map((row) => row.definition.row_id);
  const idSet = new Set(ids);
  const required: string[] = [...ALWAYS_REQUIRED_ROWS];
  if (compilation.preliminary_assembly_policy.profile_id === "asphalt_parking_new_construction") {
    required.push("sand_material", "sand_placement", "crushed_layer_1_material", "crushed_layer_1_placement", "crushed_layer_2_material", "crushed_layer_2_placement", "grader");
  }
  if (compilation.preliminary_assembly_policy.profile_id === "asphalt_resurfacing_with_milling") {
    required.push("milling", "milling_machine", "milled_material_transport");
  }
  const counters: AsphaltWorkAssemblyCoverageCountersV4 = {
    required_wbs_rows_missing: required.filter((rowId) => !idSet.has(rowId)).length,
    quantity_missing: rows.filter((row) => row.quantity == null || !Number.isFinite(row.quantity)).length,
    quantity_non_positive: rows.filter((row) => row.quantity <= 0).length,
    unit_missing: rows.filter((row) => !row.definition.unit_id).length,
    formula_trace_missing: rows.filter((row) => !row.definition.formula_id || !row.definition.explanation_trace_ru.trim()).length,
    assumption_trace_missing: rows.filter((row) => row.assumption_ids.length === 0).length,
    generic_rows: rows.filter((row) => GENERIC_ROW.test(row.definition.professional_name_ru.trim())).length,
    preview_only_rows: rows.filter((row) => /^preview:/i.test(row.definition.row_id)).length,
    padding_rows: rows.filter((row) => PADDING_ROW.test(`${row.definition.row_id} ${row.definition.professional_name_ru}`)).length,
    duplicate_row_ids: ids.length - idSet.size,
    category_mismatch: compilation.category_unit_blockers.length,
    formula_dimension_mismatch: compilation.formula_dimension_blockers.length,
    unresolved_requirements: compilation.passport.unresolved_requirements.length,
  };
  const green = Object.values(counters).every((value) => value === 0);
  return {
    status: green
      ? "GREEN_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4" as const
      : "STOP_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4" as const,
    assembly_id: compilation.preliminary_assembly_policy.assembly_id,
    quantity_basis: compilation.quantity_basis,
    required_row_ids: required,
    counters,
  };
}
