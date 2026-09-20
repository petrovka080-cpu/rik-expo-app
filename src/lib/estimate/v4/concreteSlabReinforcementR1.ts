import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory";

type InputValue = string | number | boolean;

export const CONCRETE_SLAB_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_standard", titleRu: "Армирование бетонной плиты в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_high_load", titleRu: "Армирование бетонной плиты в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_large_area", titleRu: "Армирование бетонной плиты на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_repair", titleRu: "Армирование ремонтного участка бетонной плиты", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_small_area", titleRu: "Армирование бетонной плиты на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_technical_room", titleRu: "Армирование бетонной плиты технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_wet_zone", titleRu: "Армирование бетонной плиты во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ConcreteSlabReinforcementContextKey =
  (typeof CONCRETE_SLAB_REINFORCEMENT_TARGETS)[number]["contextKey"];

export const CONCRETE_SLAB_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "concrete-slab-reinforcement",
  compilerVersion: "canonical-estimate-compiler.concrete-slab-reinforcement-r1",
  errorPrefix: "CONCRETE_SLAB_REINFORCEMENT",
  catalogIds: CONCRETE_SLAB_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.concrete-slab-reinforcement-r1";

export const CONCRETE_SLAB_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "concrete-slab-reinforcement",
  contract: CONTRACT,
  guideVersion: "concrete-slab-reinforcement-r1",
});

export const CONCRETE_SLAB_REINFORCEMENT_RESOURCES =
  deriveReinforcementFamilyResourcesR1({
    ownerKey: "concrete-slab-reinforcement",
    contract: CONTRACT,
  });

const BASE_INPUT: Readonly<Record<string, InputValue>> = Object.freeze({
  product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  bar_standard_and_grade: "ASTM A615 Grade 60",
  bar_size_designation: "No. 5",
  nominal_diameter_mm: 15.875,
  shape_straight_bent_curved_or_link: "BENT:PROJECT-BBS",
  selected_standard_mass_kg_per_m: 1.552,
  laps_hooks_chairs_connectors_and_accessories_scope:
    "PROJECT_SCOPE:all BBS laps and hooks; chairs and couplers scheduled separately",
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

const PROJECT_SCHEDULES: Readonly<Record<
ConcreteSlabReinforcementContextKey,
Readonly<Record<string, InputValue>>
>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 2_800, binding_wire_mass_kg: 34, spacer_chair_designation: "CS-SPACER-50", spacer_chair_quantity_piece: 410, unloading_and_storage_worker_h: 12, installation_worker_h: 86, cover_control_worker_h: 10, reinforcement_inspection_service_h: 5, reinforcement_delivery_distance_km: 20 },
  high_load: { approved_reinforcement_schedule_weight_kg: 9_800, binding_wire_mass_kg: 129, spacer_chair_designation: "CS-HD-SPACER-70", spacer_chair_quantity_piece: 1_460, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "CS-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 214, unloading_and_storage_worker_h: 35, site_cutting_worker_h: 51, site_bending_worker_h: 63, cage_assembly_worker_h: 190, installation_worker_h: 254, cover_control_worker_h: 30, rebar_cutting_machine_h: 20, rebar_bending_machine_h: 24, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР CS-HD-LIFT", lifting_machine_h: 18, reinforcement_inspection_service_h: 13, mill_certificate_package_count: 3, reinforcement_delivery_distance_km: 31 },
  large_area: { approved_reinforcement_schedule_weight_kg: 21_000, binding_wire_mass_kg: 258, spacer_chair_designation: "CS-LA-SPACER-50", spacer_chair_quantity_piece: 3_240, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 69, site_cutting_worker_h: 103, site_bending_worker_h: 124, cage_assembly_worker_h: 414, installation_worker_h: 536, cover_control_worker_h: 51, rebar_cutting_machine_h: 40, rebar_bending_machine_h: 47, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР CS-LA-LIFT", lifting_machine_h: 40, reinforcement_inspection_service_h: 23, mill_certificate_package_count: 5, reinforcement_delivery_distance_km: 44 },
  repair: { approved_reinforcement_schedule_weight_kg: 850, binding_wire_mass_kg: 13, spacer_chair_designation: "CS-REPAIR-SPACER-40", spacer_chair_quantity_piece: 138, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "CS-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 27, unloading_and_storage_worker_h: 5, site_cutting_worker_h: 13, site_bending_worker_h: 11, cage_assembly_worker_h: 31, installation_worker_h: 42, cover_control_worker_h: 6, rebar_cutting_machine_h: 4, rebar_bending_machine_h: 4, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 15 },
  small_area: { approved_reinforcement_schedule_weight_kg: 520, binding_wire_mass_kg: 8, spacer_chair_designation: "CS-SA-SPACER-40", spacer_chair_quantity_piece: 84, unloading_and_storage_worker_h: 4, installation_worker_h: 25, cover_control_worker_h: 4, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 11 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 2_250, binding_wire_mass_kg: 29, spacer_chair_designation: "CS-TR-SPACER-50", spacer_chair_quantity_piece: 334, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "CS-TR-COUPLER-NO5", mechanical_coupler_quantity_piece: 48, unloading_and_storage_worker_h: 10, site_cutting_worker_h: 18, site_bending_worker_h: 20, cage_assembly_worker_h: 62, installation_worker_h: 78, cover_control_worker_h: 11, rebar_cutting_machine_h: 7, rebar_bending_machine_h: 8, reinforcement_inspection_service_h: 5, reinforcement_delivery_distance_km: 22 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 4_500, binding_wire_mass_kg: 60, spacer_chair_designation: "CS-WZ-NONABSORBENT-SPACER-60", spacer_chair_quantity_piece: 710, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 18, installation_worker_h: 134, cover_control_worker_h: 20, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР CS-WZ-LIFT", lifting_machine_h: 9, reinforcement_inspection_service_h: 10, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 27 },
});

export function concreteSlabReinforcementAcceptanceInputR1(
  contextKey: ConcreteSlabReinforcementContextKey,
): Readonly<Record<string, InputValue>> {
  const target = CONCRETE_SLAB_REINFORCEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`CONCRETE_SLAB_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-CS-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-CS-${reference}-REV-A`,
    bar_count_and_cut_length_m:
      `PROJECT_BBS:BBS-CS-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved mass across all bar marks`,
    estimator_approval_reference: `EST-CS-${reference}-REBAR-REV-A`,
  });
}

export async function compileConcreteSlabReinforcementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: CONCRETE_SLAB_REINFORCEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? CONCRETE_SLAB_REINFORCEMENT_TARGETS[0].catalogId,
    parameters: CONCRETE_SLAB_REINFORCEMENT_PARAMETERS,
    resources: CONCRETE_SLAB_REINFORCEMENT_RESOURCES,
  });
}
