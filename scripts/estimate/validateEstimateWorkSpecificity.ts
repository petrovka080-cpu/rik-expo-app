import {
  compileProductionExpandedEstimate10000,
  type ProductionCompiledExpandedEstimate,
} from "../../src/lib/ai/estimateTemplate10000";
import { classifyEstimateRowsReality } from "./classifyEstimateRowReality";

export type KnownEstimateWorkType =
  | "diamond_concrete_drilling"
  | "profile_sheet_fence"
  | "mansard_roof"
  | "apartment_renovation"
  | "masonry"
  | "screed"
  | "concrete"
  | "reinforcement"
  | "formwork"
  | "roofing"
  | "metalwork";

export type WorkSpecificityCase = {
  case_id: string;
  prompt: string;
  expected_work_type: KnownEstimateWorkType;
  fallback_work_key: string;
  quantity: number;
};

export type ParsedWorkSpecificParameters = {
  work_type: KnownEstimateWorkType;
  extracted_parameters: Record<string, number | string | boolean>;
  missing_parameters: string[];
};

export type WorkSpecificityResult = {
  case_id: string;
  prompt: string;
  work_type: KnownEstimateWorkType;
  selected_template_id: string | null;
  selected_template_version: string | null;
  selected_work_key: string | null;
  extracted_parameters: Record<string, number | string | boolean>;
  missing_parameters: string[];
  rows_generated_despite_missing_params: boolean;
  row_count: number;
  source_backed_row_count: number;
  generic_family_default_row_count: number;
  blind_quantity_copy_count: number;
  known_work_generic_fallback_rejected: boolean;
  generic_known_work_is_hard_fail: boolean;
  professional: boolean;
  blocking_reasons: string[];
  compiled?: ProductionCompiledExpandedEstimate;
};

const REQUIRED_PARAMS: Record<KnownEstimateWorkType, readonly string[]> = {
  diamond_concrete_drilling: [
    "holes_count",
    "diameter_mm",
    "drilling_depth_mm",
    "material",
    "reinforcement_level",
    "drilling_orientation",
    "wet_or_dry",
    "access_complexity",
  ],
  profile_sheet_fence: [
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
  mansard_roof: [
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
  apartment_renovation: [
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
  masonry: ["area_m2", "material", "wall_thickness_mm"],
  screed: ["area_m2", "thickness_mm"],
  concrete: ["volume_m3"],
  reinforcement: ["diameter_mm", "spacing_mm", "area_m2"],
  formwork: ["contact_area_m2"],
  roofing: ["roof_area_m2", "covering_material"],
  metalwork: ["length_m", "profile_type"],
};

export const FUNCTIONAL_REALITY_CASES: readonly WorkSpecificityCase[] = Object.freeze([
  {
    case_id: "diamond_drilling_bare",
    prompt: "алмазное бурение бетона",
    expected_work_type: "diamond_concrete_drilling",
    fallback_work_key: "concrete_foundation_interior_concrete_slab_pour_standard",
    quantity: 1,
  },
  {
    case_id: "diamond_drilling_full",
    prompt: "алмазное бурение бетона 12 отверстий диаметр 110 мм толщина 250 мм железобетон",
    expected_work_type: "diamond_concrete_drilling",
    fallback_work_key: "concrete_foundation_interior_concrete_slab_pour_standard",
    quantity: 12,
  },
  {
    case_id: "profile_sheet_fence_bare",
    prompt: "забор из профлиста 50 метров",
    expected_work_type: "profile_sheet_fence",
    fallback_work_key: "carpentry_metal_interior_fence_install_standard",
    quantity: 50,
  },
  {
    case_id: "profile_sheet_fence_full",
    prompt: "забор из профлиста 50 м высота 2 м столбы 60х60 шаг 2.5 м профлист 0.45 мм",
    expected_work_type: "profile_sheet_fence",
    fallback_work_key: "carpentry_metal_interior_fence_install_standard",
    quantity: 50,
  },
  {
    case_id: "mansard_roof_bare",
    prompt: "мансардная крыша 200 кв метра",
    expected_work_type: "mansard_roof",
    fallback_work_key: "roofing_interior_pitched_roof_install_standard",
    quantity: 200,
  },
  {
    case_id: "mansard_roof_full",
    prompt: "мансардная крыша 200 м2 металлочерепица угол 35 градусов утепление 200 мм",
    expected_work_type: "mansard_roof",
    fallback_work_key: "roofing_interior_metal_roof_install_standard",
    quantity: 200,
  },
  {
    case_id: "apartment_54",
    prompt: "ремонт квартиры 54 м2",
    expected_work_type: "apartment_renovation",
    fallback_work_key: "apartment_capital_renovation",
    quantity: 54,
  },
  {
    case_id: "screed_100_50",
    prompt: "стяжка 100 м2 толщина 50 мм",
    expected_work_type: "screed",
    fallback_work_key: "screed_cement_sand_50mm",
    quantity: 100,
  },
  {
    case_id: "masonry_400_gas_block",
    prompt: "кладка 400 м2 газоблок 300 мм",
    expected_work_type: "masonry",
    fallback_work_key: "masonry_interior_gas_block_lay_standard",
    quantity: 400,
  },
]);

function firstNumber(match: RegExpMatchArray | null): number | null {
  if (!match) return null;
  const value = match.slice(1).find(Boolean);
  return value ? Number(value.replace(",", ".")) : null;
}

export function detectKnownEstimateWorkType(prompt: string): KnownEstimateWorkType {
  const text = prompt.toLowerCase();
  if (/алмаз|бурен|d\s*\d|отверст/.test(text)) return "diamond_concrete_drilling";
  if (/забор|профлист|профнаст/.test(text)) return "profile_sheet_fence";
  if (/мансард|крыша|кровл/.test(text)) return "mansard_roof";
  if (/квартир|капитальн/.test(text)) return "apartment_renovation";
  if (/стяж/.test(text)) return "screed";
  if (/кладк|газоблок|кирпич/.test(text)) return "masonry";
  if (/опалуб/.test(text)) return "formwork";
  if (/арматур/.test(text)) return "reinforcement";
  if (/бетон/.test(text)) return "concrete";
  return "metalwork";
}

export function parseWorkSpecificParameters(prompt: string): ParsedWorkSpecificParameters {
  const text = prompt.toLowerCase();
  const workType = detectKnownEstimateWorkType(prompt);
  const extracted: Record<string, number | string | boolean> = {};
  const area = firstNumber(text.match(/(\d+(?:[.,]\d+)?)\s*(?:м2|м²|кв|m2|sqm)/));
  const explicitLength = firstNumber(text.match(/(?:длина|забор)\s*(\d+(?:[.,]\d+)?)\s*(?:м|метр|m)/));
  const length = explicitLength ?? firstNumber(text.match(/(\d+(?:[.,]\d+)?)\s*(?:м|метр|m)(?!\s*м|2|²)/));
  const holes = firstNumber(text.match(/(\d+)\s*(?:отверст|holes)/));
  const diameter = firstNumber(text.match(/(?:d|диаметр)\s*(\d+(?:[.,]\d+)?)/));
  const thickness = firstNumber(text.match(/(?:толщина|глубина|утепление)\s*(\d+(?:[.,]\d+)?)/));
  const height = firstNumber(text.match(/высота\s*(\d+(?:[.,]\d+)?)/));
  const spacing = firstNumber(text.match(/шаг(?:\s+\S+){0,2}?\s*(\d+(?:[.,]\d+)?)/));
  const slope = firstNumber(text.match(/угол\s*(\d+(?:[.,]\d+)?)/));
  if (area != null) {
    extracted.area_m2 = area;
    if (workType === "mansard_roof") extracted.roof_area_m2 = area;
    if (workType === "apartment_renovation") extracted.apartment_area_m2 = area;
  }
  if (length != null) {
    extracted.length_m = length;
    if (workType === "profile_sheet_fence") extracted.fence_length_m = length;
  }
  if (holes != null) extracted.holes_count = holes;
  if (diameter != null) extracted.diameter_mm = diameter;
  const standaloneMmValues = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*мм/g)]
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((value) => Number.isFinite(value));
  const inferredDepth = workType === "diamond_concrete_drilling" && diameter != null
    ? standaloneMmValues.find((value) => Math.abs(value - diameter) > 0.0001) ?? null
    : null;
  const effectiveThickness = thickness ?? inferredDepth;
  if (effectiveThickness != null) {
    if (workType === "diamond_concrete_drilling") extracted.drilling_depth_mm = effectiveThickness;
    if (workType === "screed") extracted.thickness_mm = effectiveThickness;
    if (workType === "mansard_roof") extracted.insulation_thickness_mm = effectiveThickness;
    if (workType === "masonry") extracted.wall_thickness_mm = effectiveThickness;
  }
  if (height != null) extracted.fence_height_m = height;
  if (spacing != null) extracted.post_spacing_m = spacing;
  if (slope != null) extracted.slope_angle_deg = slope;
  if (/железобетон/.test(text)) extracted.material = "reinforced_concrete";
  else if (/бетон/.test(text)) extracted.material = "concrete";
  if (/профлист|профнаст/.test(text)) extracted.profile_sheet_type = "profile_sheet";
  if (/0[.,]45/.test(text)) extracted.profile_sheet_thickness_mm = 0.45;
  if (/металлочереп/.test(text)) extracted.covering_material = "metal_tile";
  if (/газоблок/.test(text)) extracted.material = "gas_block";
  const missing = REQUIRED_PARAMS[workType].filter((key) => extracted[key] == null);
  return {
    work_type: workType,
    extracted_parameters: extracted,
    missing_parameters: missing,
  };
}

export function evaluateWorkSpecificityCase(testCase: WorkSpecificityCase): WorkSpecificityResult {
  const parsed = parseWorkSpecificParameters(testCase.prompt);
  let compiled: ProductionCompiledExpandedEstimate | undefined;
  try {
    compiled = compileProductionExpandedEstimate10000({
      workKey: testCase.fallback_work_key,
      quantity: testCase.quantity,
      countryCode: "KG",
    });
  } catch {
    compiled = undefined;
  }
  const rowSummary = classifyEstimateRowsReality(compiled?.rows ?? []);
  const rowsGeneratedDespiteMissingParams = parsed.missing_parameters.length > 0 && rowSummary.row_count > 0;
  const hasGenericRows = rowSummary.generic_family_default_count > 0 || rowSummary.invalid_fake_source_count > 0;
  const allRowsProfessional = rowSummary.row_count > 0 && rowSummary.source_backed_count === rowSummary.row_count;
  const professional =
    allRowsProfessional &&
    parsed.missing_parameters.length === 0 &&
    !rowsGeneratedDespiteMissingParams &&
    rowSummary.blind_quantity_copy_count === 0;
  const blockingReasons = [
    rowsGeneratedDespiteMissingParams ? "work_specific_required_params_missing_but_rows_generated" : "",
    hasGenericRows ? "known_work_generic_fallback" : "",
    rowSummary.blind_quantity_copy_count > 0 ? "blind_user_quantity_copy_detected" : "",
    !compiled ? "selected_template_missing" : "",
    testCase.expected_work_type === "diamond_concrete_drilling" && compiled?.category === "concrete_foundation"
      ? "diamond_drilling_resolved_to_concrete_placing_template"
      : "",
    testCase.expected_work_type === "profile_sheet_fence" && compiled?.category === "carpentry_metal"
      ? "profile_sheet_fence_resolved_to_generic_metalwork_template"
      : "",
    testCase.expected_work_type === "mansard_roof" && compiled?.category === "roofing"
      ? "mansard_roof_resolved_to_generic_roofing_template"
      : "",
    testCase.expected_work_type === "apartment_renovation" && hasGenericRows
      ? "apartment_renovation_contains_generic_rows"
      : "",
  ].filter(Boolean);

  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    work_type: parsed.work_type,
    selected_template_id: compiled?.templateKey ?? null,
    selected_template_version: compiled?.rows[0]?.templateVersion ?? null,
    selected_work_key: compiled?.workKey ?? null,
    extracted_parameters: parsed.extracted_parameters,
    missing_parameters: parsed.missing_parameters,
    rows_generated_despite_missing_params: rowsGeneratedDespiteMissingParams,
    row_count: rowSummary.row_count,
    source_backed_row_count: rowSummary.source_backed_count,
    generic_family_default_row_count: rowSummary.generic_family_default_count,
    blind_quantity_copy_count: rowSummary.blind_quantity_copy_count,
    known_work_generic_fallback_rejected: hasGenericRows,
    generic_known_work_is_hard_fail: hasGenericRows,
    professional,
    blocking_reasons: blockingReasons,
    compiled,
  };
}
