import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory";

type InputValue = string | number | boolean;

export const STAIRS_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_standard", titleRu: "Армирование бетонной лестницы в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_high_load", titleRu: "Армирование бетонной лестницы в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_large_area", titleRu: "Армирование бетонной лестницы на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_repair", titleRu: "Армирование ремонтного участка бетонной лестницы", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_small_area", titleRu: "Армирование бетонной лестницы на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_technical_room", titleRu: "Армирование бетонной лестницы технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_wet_zone", titleRu: "Армирование бетонной лестницы во влажной зоне", contextRu: "влажная зона" },
] as const);

export type StairsReinforcementContextKey =
  (typeof STAIRS_REINFORCEMENT_TARGETS)[number]["contextKey"];

export const STAIRS_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "stairs-reinforcement",
  compilerVersion: "canonical-estimate-compiler.stairs-reinforcement-r1",
  errorPrefix: "STAIRS_REINFORCEMENT",
  catalogIds: STAIRS_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.stairs-reinforcement-r1";

export const STAIRS_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "stairs-reinforcement",
  contract: CONTRACT,
  guideVersion: "stairs-reinforcement-r1",
});

export const STAIRS_REINFORCEMENT_RESOURCES = deriveReinforcementFamilyResourcesR1({
  ownerKey: "stairs-reinforcement",
  contract: CONTRACT,
});

const BASE_INPUT: Readonly<Record<string, InputValue>> = Object.freeze({
  product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  bar_standard_and_grade: "ASTM A615 Grade 60",
  bar_size_designation: "No. 5",
  nominal_diameter_mm: 15.875,
  shape_straight_bent_curved_or_link: "BENT:PROJECT-BBS",
  selected_standard_mass_kg_per_m: 1.552,
  laps_hooks_chairs_connectors_and_accessories_scope: "PROJECT_SCOPE:all BBS laps and hooks; chairs and couplers scheduled separately",
  fabrication_allowance_if_documented: "NONE:INCLUDED_IN_APPROVED_SCHEDULE",
  supplier_bundle_or_length_constraints: "NONE:NO_AUTOMATIC_BUNDLE_ROUNDING",
  binding_wire_specification: "Проволока вязальная отожжённая по проектной ведомости",
  mechanical_couplers_applicable: false,
  mechanical_coupler_designation: "NOT_APPLICABLE:PROJECT_BBS_HAS_NO_MECHANICAL_COUPLERS",
  mechanical_coupler_quantity_piece: 0,
  lifting_equipment_applicable: false,
  lifting_equipment_designation: "NOT_APPLICABLE:MANUAL_HANDLING_CONFIRMED_BY_METHOD_STATEMENT",
  lifting_machine_h: 0,
  fabrication_mode: "READY_CAGES",
  site_cutting_worker_h: 0,
  site_bending_worker_h: 0,
  cage_assembly_worker_h: 0,
  rebar_cutting_machine_h: 0,
  rebar_bending_machine_h: 0,
  mill_certificate_package_count: 1,
  delivery_pricing_mode: "SEPARATE",
});

const PROJECT_SCHEDULES: Readonly<Record<StairsReinforcementContextKey, Readonly<Record<string, InputValue>>>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 1_200, binding_wire_mass_kg: 16, spacer_chair_designation: "ST-SPACER-50", spacer_chair_quantity_piece: 184, unloading_and_storage_worker_h: 7, installation_worker_h: 41, cover_control_worker_h: 6, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 17 },
  high_load: { approved_reinforcement_schedule_weight_kg: 4_200, binding_wire_mass_kg: 57, spacer_chair_designation: "ST-HD-SPACER-70", spacer_chair_quantity_piece: 638, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "ST-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 96, unloading_and_storage_worker_h: 18, site_cutting_worker_h: 25, site_bending_worker_h: 30, cage_assembly_worker_h: 91, installation_worker_h: 119, cover_control_worker_h: 16, rebar_cutting_machine_h: 10, rebar_bending_machine_h: 12, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР ST-HD-LIFT", lifting_machine_h: 9, reinforcement_inspection_service_h: 7, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 27 },
  large_area: { approved_reinforcement_schedule_weight_kg: 9_400, binding_wire_mass_kg: 119, spacer_chair_designation: "ST-LA-SPACER-50", spacer_chair_quantity_piece: 1_425, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 34, site_cutting_worker_h: 49, site_bending_worker_h: 58, cage_assembly_worker_h: 188, installation_worker_h: 247, cover_control_worker_h: 27, rebar_cutting_machine_h: 19, rebar_bending_machine_h: 23, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР ST-LA-LIFT", lifting_machine_h: 20, reinforcement_inspection_service_h: 13, mill_certificate_package_count: 3, reinforcement_delivery_distance_km: 39 },
  repair: { approved_reinforcement_schedule_weight_kg: 450, binding_wire_mass_kg: 7, spacer_chair_designation: "ST-REPAIR-SPACER-40", spacer_chair_quantity_piece: 74, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "ST-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 16, unloading_and_storage_worker_h: 3, site_cutting_worker_h: 7, site_bending_worker_h: 6, cage_assembly_worker_h: 18, installation_worker_h: 24, cover_control_worker_h: 4, rebar_cutting_machine_h: 2, rebar_bending_machine_h: 2, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 12 },
  small_area: { approved_reinforcement_schedule_weight_kg: 280, binding_wire_mass_kg: 5, spacer_chair_designation: "ST-SA-SPACER-40", spacer_chair_quantity_piece: 47, unloading_and_storage_worker_h: 2, installation_worker_h: 15, cover_control_worker_h: 3, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 8 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 1_000, binding_wire_mass_kg: 14, spacer_chair_designation: "ST-TR-SPACER-50", spacer_chair_quantity_piece: 154, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "ST-TR-COUPLER-NO5", mechanical_coupler_quantity_piece: 25, unloading_and_storage_worker_h: 6, site_cutting_worker_h: 10, site_bending_worker_h: 11, cage_assembly_worker_h: 31, installation_worker_h: 39, cover_control_worker_h: 6, rebar_cutting_machine_h: 4, rebar_bending_machine_h: 4, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 19 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 2_100, binding_wire_mass_kg: 29, spacer_chair_designation: "ST-WZ-NONABSORBENT-SPACER-60", spacer_chair_quantity_piece: 332, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 10, installation_worker_h: 66, cover_control_worker_h: 10, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР ST-WZ-LIFT", lifting_machine_h: 5, reinforcement_inspection_service_h: 6, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 24 },
});

export function stairsReinforcementAcceptanceInputR1(contextKey: StairsReinforcementContextKey): Readonly<Record<string, InputValue>> {
  const target = STAIRS_REINFORCEMENT_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`STAIRS_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-ST-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-ST-${reference}-REV-A`,
    bar_count_and_cut_length_m: `PROJECT_BBS:BBS-ST-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved mass across all bar marks`,
    estimator_approval_reference: `EST-ST-${reference}-REBAR-REV-A`,
  });
}

export async function compileStairsReinforcementR1(submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {}) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: STAIRS_REINFORCEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? STAIRS_REINFORCEMENT_TARGETS[0].catalogId,
    parameters: STAIRS_REINFORCEMENT_PARAMETERS,
    resources: STAIRS_REINFORCEMENT_RESOURCES,
  });
}
