import type { ProfessionalWorkPassport } from "./workPassportContract";

export type AiEstimateNormativeWorkFamily =
  | "apartment_repair"
  | "road"
  | "water_supply"
  | "sewerage"
  | "power_line"
  | "substation"
  | "facade"
  | "roof"
  | "drilling"
  | "fence"
  | "dam"
  | "concrete"
  | "earthworks"
  | "demolition"
  | "glazing"
  | "heating"
  | "ventilation"
  | "electrical"
  | "plumbing"
  | "industrial_equipment"
  | "mep"
  | "other";

export type AiEstimateNormativeParameterSeed = {
  key: string;
  role: "required_for_quantity" | "required_for_professional_accuracy" | "optional_accuracy_improver";
};

const FAMILY_PATTERNS: { family: AiEstimateNormativeWorkFamily; pattern: RegExp }[] = [
  { family: "substation", pattern: /substation|transformer|switchgear|electric_substation|ktp|tpp/i },
  { family: "power_line", pattern: /power.?line|transmission|overhead|cable|lep|low_voltage|road_lighting|line_poles/i },
  { family: "water_supply", pattern: /water_supply|waterproofing|water|pipeline|pipe|pump|reservoir|tank|well_water|utility_connection/i },
  { family: "sewerage", pattern: /sewer|drain|wastewater|culvert|stormwater|road_drainage/i },
  { family: "road", pattern: /road|asphalt|pavement|highway|street|runway|apron|railway|sidewalk|curb|guardrail|traffic/i },
  { family: "glazing", pattern: /glazing|window|glass|windows_doors|stained_glass|atrium|lantern/i },
  { family: "facade", pattern: /facade|cladding|insulat|ventilated|curtain|scaffold|mast_climber|rope_access/i },
  { family: "roof", pattern: /roof|gutter|attic|mansard|skylight|dormer|flashings|snow_guards|rafters|battens/i },
  { family: "drilling", pattern: /drill|bore|hole|anchor|pile|well/i },
  { family: "fence", pattern: /fence|gate|post|profile_sheet_fence/i },
  { family: "dam", pattern: /dam|gabion|hydraulic|embankment|slope|quay|retaining/i },
  { family: "concrete", pattern: /concrete|rebar|reinforcement|formwork|slab|frame|foundation|monolithic|precast|masonry|screed/i },
  { family: "earthworks", pattern: /earth|excavat|trench|soil|ground|subgrade|basement|strip_foundation|raft_foundation/i },
  { family: "demolition", pattern: /demolit|dismantl|remove|cleaning_waste/i },
  { family: "heating", pattern: /heat|heating|boiler|radiator|thermal/i },
  { family: "ventilation", pattern: /hvac|ventilat|duct|air|conditioning|smoke_exhaust/i },
  { family: "electrical", pattern: /electric|electrical|socket|lighting|wire|fire_safety|alarm/i },
  { family: "plumbing", pattern: /plumb|sanitary|toilet|sink|bathroom|bath|shower/i },
  { family: "industrial_equipment", pattern: /equipment|industrial|plant|machine|mining|silo|crane|elevator|parking/i },
  { family: "apartment_repair", pattern: /apartment|renovat|repair|interior|kitchen|tile|paint|floor|flooring|wall|ceiling|drywall|plaster|putty|private_house|cottage|residential|hotel|school|hospital|shopping/i },
  { family: "mep", pattern: /mep|engineering|utility|utility_connection/i },
];

function seed(
  key: string,
  role: AiEstimateNormativeParameterSeed["role"],
): AiEstimateNormativeParameterSeed {
  return { key, role };
}

export const NORMATIVE_FAMILY_REQUIRED_PARAMETERS: Record<AiEstimateNormativeWorkFamily, AiEstimateNormativeParameterSeed[]> = {
  apartment_repair: [
    seed("area_m2", "required_for_quantity"),
    seed("ceiling_height_m", "required_for_professional_accuracy"),
    seed("bathrooms_count", "required_for_quantity"),
    seed("bathroom_floor_area_m2", "required_for_professional_accuracy"),
    seed("net_wall_area_m2", "required_for_quantity"),
    seed("electrical_points", "required_for_professional_accuracy"),
    seed("water_points", "required_for_professional_accuracy"),
  ],
  road: [
    seed("length_m", "required_for_quantity"),
    seed("width_m", "required_for_quantity"),
    seed("thickness_m", "required_for_professional_accuracy"),
    seed("material_specification", "required_for_professional_accuracy"),
    seed("site_access", "optional_accuracy_improver"),
  ],
  water_supply: [
    seed("line_length_m", "required_for_quantity"),
    seed("diameter_mm", "required_for_quantity"),
    seed("trench_depth_m", "required_for_professional_accuracy"),
    seed("trench_width_m", "required_for_professional_accuracy"),
    seed("house_connections", "required_for_professional_accuracy"),
    seed("equipment_specification", "required_for_professional_accuracy"),
    seed("volume_m3", "optional_accuracy_improver"),
  ],
  sewerage: [
    seed("line_length_m", "required_for_quantity"),
    seed("diameter_mm", "required_for_quantity"),
    seed("trench_depth_m", "required_for_professional_accuracy"),
    seed("trench_width_m", "required_for_professional_accuracy"),
    seed("sewer_points", "required_for_professional_accuracy"),
  ],
  power_line: [
    seed("voltage_kv", "required_for_quantity"),
    seed("line_length_m", "required_for_quantity"),
    seed("pole_step_m", "required_for_quantity"),
    seed("poles_count", "required_for_professional_accuracy"),
    seed("cable_section", "required_for_professional_accuracy"),
    seed("phases", "optional_accuracy_improver"),
  ],
  substation: [
    seed("voltage_kv", "required_for_quantity"),
    seed("power_kw", "required_for_professional_accuracy"),
    seed("work_package", "required_for_quantity"),
    seed("equipment_specification", "required_for_professional_accuracy"),
    seed("cable_section", "optional_accuracy_improver"),
  ],
  facade: [
    seed("facade_area_m2", "required_for_quantity"),
    seed("height_m", "required_for_professional_accuracy"),
    seed("insulation_thickness_mm", "required_for_professional_accuracy"),
    seed("material_specification", "required_for_professional_accuracy"),
    seed("site_access", "optional_accuracy_improver"),
  ],
  roof: [
    seed("roof_area_m2", "required_for_quantity"),
    seed("height_m", "optional_accuracy_improver"),
    seed("roof_windows_count", "required_for_professional_accuracy"),
    seed("insulation_thickness_mm", "optional_accuracy_improver"),
    seed("material_specification", "required_for_professional_accuracy"),
  ],
  drilling: [
    seed("count", "required_for_quantity"),
    seed("diameter_mm", "required_for_quantity"),
    seed("depth_mm", "required_for_quantity"),
    seed("material_specification", "required_for_professional_accuracy"),
    seed("site_access", "optional_accuracy_improver"),
  ],
  fence: [
    seed("length_m", "required_for_quantity"),
    seed("height_m", "required_for_quantity"),
    seed("poles_count", "required_for_professional_accuracy"),
    seed("pole_step_m", "required_for_professional_accuracy"),
    seed("material_specification", "required_for_professional_accuracy"),
  ],
  dam: [
    seed("length_m", "required_for_quantity"),
    seed("height_m", "required_for_quantity"),
    seed("width_m", "required_for_professional_accuracy"),
    seed("material_specification", "required_for_professional_accuracy"),
    seed("trench_depth_m", "optional_accuracy_improver"),
  ],
  concrete: [
    seed("volume_m3", "required_for_quantity"),
    seed("thickness_m", "required_for_professional_accuracy"),
    seed("area_m2", "required_for_professional_accuracy"),
    seed("material_specification", "required_for_professional_accuracy"),
  ],
  earthworks: [
    seed("volume_m3", "required_for_quantity"),
    seed("length_m", "required_for_professional_accuracy"),
    seed("width_m", "required_for_professional_accuracy"),
    seed("trench_depth_m", "required_for_professional_accuracy"),
    seed("site_access", "optional_accuracy_improver"),
  ],
  demolition: [
    seed("area_m2", "required_for_quantity"),
    seed("volume_m3", "required_for_professional_accuracy"),
    seed("waste_volume_m3", "required_for_professional_accuracy"),
    seed("site_access", "optional_accuracy_improver"),
  ],
  glazing: [
    seed("glazing_area_m2", "required_for_quantity"),
    seed("count", "required_for_professional_accuracy"),
    seed("height_m", "optional_accuracy_improver"),
    seed("material_specification", "required_for_professional_accuracy"),
  ],
  heating: [
    seed("power_kw", "required_for_quantity"),
    seed("line_length_m", "required_for_professional_accuracy"),
    seed("diameter_mm", "required_for_professional_accuracy"),
    seed("equipment_specification", "required_for_professional_accuracy"),
  ],
  ventilation: [
    seed("capacity", "required_for_quantity"),
    seed("line_length_m", "required_for_professional_accuracy"),
    seed("equipment_specification", "required_for_professional_accuracy"),
    seed("site_access", "optional_accuracy_improver"),
  ],
  electrical: [
    seed("electrical_points", "required_for_quantity"),
    seed("power_kw", "required_for_professional_accuracy"),
    seed("cable_section", "required_for_professional_accuracy"),
    seed("voltage_kv", "optional_accuracy_improver"),
  ],
  plumbing: [
    seed("water_points", "required_for_quantity"),
    seed("sewer_points", "required_for_quantity"),
    seed("diameter_mm", "required_for_professional_accuracy"),
    seed("line_length_m", "required_for_professional_accuracy"),
  ],
  industrial_equipment: [
    seed("equipment_specification", "required_for_quantity"),
    seed("power_kw", "required_for_professional_accuracy"),
    seed("work_package", "required_for_quantity"),
    seed("site_access", "optional_accuracy_improver"),
  ],
  mep: [
    seed("work_package", "required_for_quantity"),
    seed("line_length_m", "required_for_professional_accuracy"),
    seed("equipment_specification", "required_for_professional_accuracy"),
  ],
  other: [
    seed("q", "required_for_quantity"),
    seed("material_specification", "required_for_professional_accuracy"),
    seed("site_access", "optional_accuracy_improver"),
  ],
};

export function classifyAiEstimateNormativeWorkFamilyFromText(text: string): AiEstimateNormativeWorkFamily {
  const normalized = String(text ?? "");
  for (const item of FAMILY_PATTERNS) {
    if (item.pattern.test(normalized)) return item.family;
  }
  return "other";
}

export function classifyAiEstimateNormativeWorkFamily(
  passport: Pick<ProfessionalWorkPassport, "templateId" | "workKey" | "familyId" | "category" | "localizedNameRu" | "aliases">,
): AiEstimateNormativeWorkFamily {
  return classifyAiEstimateNormativeWorkFamilyFromText([
    passport.templateId,
    passport.workKey,
    passport.familyId,
    passport.category,
    passport.localizedNameRu,
    ...passport.aliases,
  ].join(" "));
}

export function normativeSeedsForWorkFamily(
  family: AiEstimateNormativeWorkFamily,
): AiEstimateNormativeParameterSeed[] {
  return NORMATIVE_FAMILY_REQUIRED_PARAMETERS[family] ?? NORMATIVE_FAMILY_REQUIRED_PARAMETERS.other;
}
