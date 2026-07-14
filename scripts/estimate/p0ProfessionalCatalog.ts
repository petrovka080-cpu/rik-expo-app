import type { ProfessionalWorkFamilyId } from "../../src/features/estimates/catalog/professionalCatalogTypes";

export type P0ProfessionalCatalogCaseId =
  | "diamond_concrete_drilling"
  | "profile_sheet_fence"
  | "mansard_roof"
  | "apartment_capital_renovation_54"
  | "masonry_400"
  | "concrete_volume"
  | "reinforcement_kg"
  | "reinforcement_100"
  | "formwork_contact_area"
  | "screed_100x50"
  | "roofing_basic"
  | "metalwork_basic"
  | "plumbing_basic"
  | "electrical_basic";

export type P0ProfessionalCatalogCase = {
  case_id: P0ProfessionalCatalogCaseId;
  label: string;
  source_kind: "critical_prompt_calculator" | "catalog_template" | "project_template_group";
  catalog_family_id: ProfessionalWorkFamilyId;
  required_calculator_module: string | null;
  sample_work_key: string | null;
  sample_quantity: number;
  sample_prompt_case_id: string | null;
  required_parameters: readonly string[];
  expected_units: readonly string[];
  expected_source_token: string;
  buyer_handoff_required: boolean;
  pdf_snapshot_required: boolean;
};

export const P0_REQUIRED_CALCULATOR_MODULES = Object.freeze([
  "diamondDrillingCalculator.ts",
  "profileSheetFenceCalculator.ts",
  "mansardRoofCalculator.ts",
  "masonryCalculator.ts",
  "concreteCalculator.ts",
  "reinforcementCalculator.ts",
  "formworkCalculator.ts",
  "screedCalculator.ts",
  "roofingCalculator.ts",
  "metalworkCalculator.ts",
  "plumbingCalculator.ts",
  "electricalCalculator.ts",
] as const);

export const P0_PROFESSIONAL_CATALOG_CASES: readonly P0ProfessionalCatalogCase[] = Object.freeze([
  {
    case_id: "diamond_concrete_drilling",
    label: "Diamond concrete drilling, reinforced concrete holes",
    source_kind: "critical_prompt_calculator",
    catalog_family_id: "diamond_concrete_drilling",
    required_calculator_module: "diamondDrillingCalculator.ts",
    sample_work_key: null,
    sample_quantity: 12,
    sample_prompt_case_id: "diamond_drilling_full",
    required_parameters: [
      "holes_count",
      "diameter_mm",
      "drilling_depth_mm",
      "material",
      "reinforcement_level",
      "drilling_orientation",
      "wet_or_dry",
      "access_complexity",
    ],
    expected_units: ["linear_m", "piece", "l", "day"],
    expected_source_token: "diamond_drilling_critical_calculator",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "profile_sheet_fence",
    label: "Profile sheet fence on metal posts",
    source_kind: "critical_prompt_calculator",
    catalog_family_id: "profile_sheet_fence",
    required_calculator_module: "profileSheetFenceCalculator.ts",
    sample_work_key: "carpentry_metal_interior_fence_install_standard",
    sample_quantity: 50,
    sample_prompt_case_id: "profile_sheet_fence_full",
    required_parameters: [
      "fence_length_m",
      "fence_height_m",
      "post_spacing_m",
      "post_profile_size",
      "rail_rows_count",
      "profile_sheet_thickness_mm",
      "sheet_effective_width_m",
      "foundation_policy",
      "waste_percent",
    ],
    expected_units: ["m2", "piece", "linear_m", "m3"],
    expected_source_token: "profile_sheet_fence",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "mansard_roof",
    label: "Insulated mansard roof with metal tile",
    source_kind: "critical_prompt_calculator",
    catalog_family_id: "mansard_roof",
    required_calculator_module: "mansardRoofCalculator.ts",
    sample_work_key: null,
    sample_quantity: 200,
    sample_prompt_case_id: "mansard_roof_full",
    required_parameters: [
      "roof_area_m2",
      "covering_material",
      "slope_angle_deg",
      "insulation_thickness_mm",
      "rafter_step_m",
      "rafter_section_mm",
      "batten_step_m",
      "membrane_type",
      "waste_percent",
    ],
    expected_units: ["m2", "m3", "linear_m", "piece", "trip"],
    expected_source_token: "mansard_roof_critical_calculator",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "apartment_capital_renovation_54",
    label: "Apartment capital renovation 54 m2 project group",
    source_kind: "project_template_group",
    catalog_family_id: "cleaning_waste",
    required_calculator_module: null,
    sample_work_key: "apartment_capital_renovation",
    sample_quantity: 54,
    sample_prompt_case_id: "apartment_54",
    required_parameters: [
      "apartment_area_m2",
      "ceiling_height_m",
      "room_count",
      "wet_zone_area_m2",
      "kitchen_area_m2",
      "wall_area_m2",
      "floor_finish_type",
      "wall_finish_type",
      "ceiling_finish_type",
      "electrical_scope",
      "plumbing_scope",
    ],
    expected_units: ["m2", "linear_m", "piece", "set", "m3", "kg", "l", "trip", "point"],
    expected_source_token: "screed_cement_sand_mix",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "masonry_400",
    label: "Masonry gas block 400 m2",
    source_kind: "catalog_template",
    catalog_family_id: "masonry",
    required_calculator_module: "masonryCalculator.ts",
    sample_work_key: "masonry_interior_gas_block_lay_standard",
    sample_quantity: 400,
    sample_prompt_case_id: "masonry_400_gas_block",
    required_parameters: ["area_m2", "material", "wall_thickness_mm"],
    expected_units: ["piece", "kg", "m2"],
    expected_source_token: "masonry",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "concrete_volume",
    label: "Concrete volume calculation",
    source_kind: "catalog_template",
    catalog_family_id: "concrete",
    required_calculator_module: "concreteCalculator.ts",
    sample_work_key: "concrete_foundation_interior_concrete_slab_pour_standard",
    sample_quantity: 10,
    sample_prompt_case_id: null,
    required_parameters: ["volume_m3"],
    expected_units: ["m3"],
    expected_source_token: "concrete_ready_mix",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "reinforcement_kg",
    label: "Reinforcement kg from diameter/length",
    source_kind: "catalog_template",
    catalog_family_id: "reinforcement",
    required_calculator_module: "reinforcementCalculator.ts",
    sample_work_key: "concrete_foundation_interior_reinforcement_frame_reinforce_standard",
    sample_quantity: 100,
    sample_prompt_case_id: null,
    required_parameters: ["diameter_mm", "length_m"],
    expected_units: ["kg"],
    expected_source_token: "reinforcement_rebar",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "reinforcement_100",
    label: "Reinforcement 100 m2 mesh/frame",
    source_kind: "catalog_template",
    catalog_family_id: "reinforcement",
    required_calculator_module: "reinforcementCalculator.ts",
    sample_work_key: "concrete_foundation_interior_reinforcement_frame_reinforce_standard",
    sample_quantity: 100,
    sample_prompt_case_id: null,
    required_parameters: ["diameter_mm", "spacing_mm", "area_m2"],
    expected_units: ["kg"],
    expected_source_token: "reinforcement_rebar",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "formwork_contact_area",
    label: "Formwork by contact area",
    source_kind: "catalog_template",
    catalog_family_id: "formwork",
    required_calculator_module: "formworkCalculator.ts",
    sample_work_key: "concrete_foundation_interior_formwork_form_standard",
    sample_quantity: 20,
    sample_prompt_case_id: null,
    required_parameters: ["contact_area_m2"],
    expected_units: ["m2"],
    expected_source_token: "formwork_contact_area",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "screed_100x50",
    label: "Cement-sand screed 100 m2 x 50 mm",
    source_kind: "project_template_group",
    catalog_family_id: "screed",
    required_calculator_module: "screedCalculator.ts",
    sample_work_key: "screed_cement_sand_50mm",
    sample_quantity: 100,
    sample_prompt_case_id: "screed_100_50",
    required_parameters: ["area_m2", "thickness_mm"],
    expected_units: ["kg", "m2", "l", "linear_m", "piece", "set"],
    expected_source_token: "screed_cement_sand_mix",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "roofing_basic",
    label: "Basic metal roof catalog template",
    source_kind: "catalog_template",
    catalog_family_id: "roofing",
    required_calculator_module: "roofingCalculator.ts",
    sample_work_key: "roofing_interior_metal_roof_install_standard",
    sample_quantity: 100,
    sample_prompt_case_id: null,
    required_parameters: ["roof_area_m2", "covering_material"],
    expected_units: ["m2", "set", "linear_m"],
    expected_source_token: "roofing",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "metalwork_basic",
    label: "Basic metal frame catalog template",
    source_kind: "catalog_template",
    catalog_family_id: "metalwork",
    required_calculator_module: "metalworkCalculator.ts",
    sample_work_key: "carpentry_metal_interior_metal_frame_install_standard",
    sample_quantity: 100,
    sample_prompt_case_id: null,
    required_parameters: ["length_m", "profile_type"],
    expected_units: ["linear_m", "kg", "m2", "piece", "set"],
    expected_source_token: "metalwork",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "plumbing_basic",
    label: "Basic plumbing catalog template",
    source_kind: "catalog_template",
    catalog_family_id: "plumbing",
    required_calculator_module: "plumbingCalculator.ts",
    sample_work_key: "plumbing_interior_water_pipe_install_standard",
    sample_quantity: 10,
    sample_prompt_case_id: null,
    required_parameters: ["points_count", "pipe_length_m"],
    expected_units: ["linear_m", "point", "piece", "set"],
    expected_source_token: "plumbing",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
  {
    case_id: "electrical_basic",
    label: "Basic electrical catalog template",
    source_kind: "catalog_template",
    catalog_family_id: "electrical",
    required_calculator_module: "electricalCalculator.ts",
    sample_work_key: "electrical_interior_socket_install_standard",
    sample_quantity: 10,
    sample_prompt_case_id: null,
    required_parameters: ["points_count", "cable_length_m"],
    expected_units: ["linear_m", "point", "piece", "set"],
    expected_source_token: "electrical",
    buyer_handoff_required: true,
    pdf_snapshot_required: true,
  },
]);

export const P0_CATALOG_FAMILY_IDS: readonly ProfessionalWorkFamilyId[] = Object.freeze(
  [...new Set(P0_PROFESSIONAL_CATALOG_CASES.map((item) => item.catalog_family_id))],
);

export function p0CatalogCaseById(caseId: P0ProfessionalCatalogCaseId): P0ProfessionalCatalogCase {
  const item = P0_PROFESSIONAL_CATALOG_CASES.find((candidate) => candidate.case_id === caseId);
  if (!item) throw new Error(`P0_CATALOG_CASE_NOT_FOUND:${caseId}`);
  return item;
}
