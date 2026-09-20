import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory";

type InputValue = string | number | boolean;

export const BELT_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_standard", titleRu: "Армирование монолитного пояса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_high_load", titleRu: "Армирование монолитного пояса в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_large_area", titleRu: "Армирование монолитного пояса на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_repair", titleRu: "Армирование ремонтного участка монолитного пояса", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_small_area", titleRu: "Армирование монолитного пояса на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_technical_room", titleRu: "Армирование монолитного пояса технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_wet_zone", titleRu: "Армирование монолитного пояса во влажной зоне", contextRu: "влажная зона" },
] as const);

export type BeltReinforcementContextKey =
  (typeof BELT_REINFORCEMENT_TARGETS)[number]["contextKey"];

export const BELT_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "belt-reinforcement",
  compilerVersion: "canonical-estimate-compiler.belt-reinforcement-r1",
  errorPrefix: "BELT_REINFORCEMENT",
  catalogIds: BELT_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.belt-reinforcement-r1";

export const BELT_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "belt-reinforcement",
  contract: CONTRACT,
  guideVersion: "belt-reinforcement-r1",
});

export const BELT_REINFORCEMENT_RESOURCES = deriveReinforcementFamilyResourcesR1({
  ownerKey: "belt-reinforcement",
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

const PROJECT_SCHEDULES: Readonly<Record<BeltReinforcementContextKey, Readonly<Record<string, InputValue>>>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 1_600, binding_wire_mass_kg: 22, spacer_chair_designation: "BL-SPACER-50", spacer_chair_quantity_piece: 244, unloading_and_storage_worker_h: 9, installation_worker_h: 52, cover_control_worker_h: 8, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 20 },
  high_load: { approved_reinforcement_schedule_weight_kg: 5_600, binding_wire_mass_kg: 76, spacer_chair_designation: "BL-HD-SPACER-70", spacer_chair_quantity_piece: 850, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "BL-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 126, unloading_and_storage_worker_h: 23, site_cutting_worker_h: 34, site_bending_worker_h: 40, cage_assembly_worker_h: 120, installation_worker_h: 158, cover_control_worker_h: 20, rebar_cutting_machine_h: 13, rebar_bending_machine_h: 15, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР BL-HD-LIFT", lifting_machine_h: 12, reinforcement_inspection_service_h: 9, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 30 },
  large_area: { approved_reinforcement_schedule_weight_kg: 12_500, binding_wire_mass_kg: 158, spacer_chair_designation: "BL-LA-SPACER-50", spacer_chair_quantity_piece: 1_895, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 44, site_cutting_worker_h: 64, site_bending_worker_h: 76, cage_assembly_worker_h: 249, installation_worker_h: 326, cover_control_worker_h: 36, rebar_cutting_machine_h: 25, rebar_bending_machine_h: 30, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР BL-LA-LIFT", lifting_machine_h: 26, reinforcement_inspection_service_h: 16, mill_certificate_package_count: 4, reinforcement_delivery_distance_km: 42 },
  repair: { approved_reinforcement_schedule_weight_kg: 600, binding_wire_mass_kg: 9, spacer_chair_designation: "BL-REPAIR-SPACER-40", spacer_chair_quantity_piece: 98, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "BL-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 21, unloading_and_storage_worker_h: 4, site_cutting_worker_h: 9, site_bending_worker_h: 9, cage_assembly_worker_h: 23, installation_worker_h: 31, cover_control_worker_h: 5, rebar_cutting_machine_h: 3, rebar_bending_machine_h: 3, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 15 },
  small_area: { approved_reinforcement_schedule_weight_kg: 360, binding_wire_mass_kg: 6, spacer_chair_designation: "BL-SA-SPACER-40", spacer_chair_quantity_piece: 59, unloading_and_storage_worker_h: 3, installation_worker_h: 19, cover_control_worker_h: 3, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 10 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 1_350, binding_wire_mass_kg: 19, spacer_chair_designation: "BL-TR-SPACER-50", spacer_chair_quantity_piece: 208, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "BL-TR-COUPLER-NO5", mechanical_coupler_quantity_piece: 34, unloading_and_storage_worker_h: 8, site_cutting_worker_h: 13, site_bending_worker_h: 14, cage_assembly_worker_h: 42, installation_worker_h: 52, cover_control_worker_h: 8, rebar_cutting_machine_h: 5, rebar_bending_machine_h: 6, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 22 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 2_800, binding_wire_mass_kg: 39, spacer_chair_designation: "BL-WZ-NONABSORBENT-SPACER-60", spacer_chair_quantity_piece: 440, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 13, installation_worker_h: 86, cover_control_worker_h: 13, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР BL-WZ-LIFT", lifting_machine_h: 7, reinforcement_inspection_service_h: 7, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 27 },
});

export function beltReinforcementAcceptanceInputR1(contextKey: BeltReinforcementContextKey): Readonly<Record<string, InputValue>> {
  const target = BELT_REINFORCEMENT_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`BELT_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({ ...BASE_INPUT, ...schedule, bar_bending_schedule_reference: `BBS-BL-${reference}-REV-A`, structural_drawing_and_revision_reference: `STR-BL-${reference}-REV-A`, bar_count_and_cut_length_m: `PROJECT_BBS:BBS-BL-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved mass across all bar marks`, estimator_approval_reference: `EST-BL-${reference}-REBAR-REV-A` });
}

export async function compileBeltReinforcementR1(submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {}) {
  return compileReinforcementFamilyR1(submittedParameters, { descriptor: BELT_REINFORCEMENT_DESCRIPTOR, catalogId: options.catalogId ?? BELT_REINFORCEMENT_TARGETS[0].catalogId, parameters: BELT_REINFORCEMENT_PARAMETERS, resources: BELT_REINFORCEMENT_RESOURCES });
}
