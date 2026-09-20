import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory";

type InputValue = string | number | boolean;

export const SLAB_FOUNDATION_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_standard", titleRu: "Армирование плитного фундамента в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_high_load", titleRu: "Армирование плитного фундамента в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_large_area", titleRu: "Армирование плитного фундамента на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_repair", titleRu: "Армирование ремонтного участка плитного фундамента", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_small_area", titleRu: "Армирование плитного фундамента на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_technical_room", titleRu: "Армирование плитного фундамента технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_wet_zone", titleRu: "Армирование плитного фундамента во влажной зоне", contextRu: "влажная зона" },
] as const);

export type SlabFoundationReinforcementContextKey =
  (typeof SLAB_FOUNDATION_REINFORCEMENT_TARGETS)[number]["contextKey"];

export const SLAB_FOUNDATION_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "slab-foundation-reinforcement",
  compilerVersion: "canonical-estimate-compiler.slab-foundation-reinforcement-r1",
  errorPrefix: "SLAB_FOUNDATION_REINFORCEMENT",
  catalogIds: SLAB_FOUNDATION_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.slab-foundation-reinforcement-r1";

export const SLAB_FOUNDATION_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "slab-foundation-reinforcement",
  contract: CONTRACT,
  guideVersion: "slab-foundation-reinforcement-r1",
});

export const SLAB_FOUNDATION_REINFORCEMENT_RESOURCES =
  deriveReinforcementFamilyResourcesR1({
    ownerKey: "slab-foundation-reinforcement",
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
SlabFoundationReinforcementContextKey,
Readonly<Record<string, InputValue>>
>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 3_200, binding_wire_mass_kg: 39, spacer_chair_designation: "SLAB-SPACER-50", spacer_chair_quantity_piece: 460, unloading_and_storage_worker_h: 13, installation_worker_h: 96, cover_control_worker_h: 11, reinforcement_inspection_service_h: 5, reinforcement_delivery_distance_km: 22 },
  high_load: { approved_reinforcement_schedule_weight_kg: 11_200, binding_wire_mass_kg: 148, spacer_chair_designation: "SLAB-HD-SPACER-70", spacer_chair_quantity_piece: 1_680, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "SLAB-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 246, unloading_and_storage_worker_h: 40, site_cutting_worker_h: 58, site_bending_worker_h: 72, cage_assembly_worker_h: 216, installation_worker_h: 292, cover_control_worker_h: 34, rebar_cutting_machine_h: 23, rebar_bending_machine_h: 28, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР SLAB-HD-LIFT", lifting_machine_h: 21, reinforcement_inspection_service_h: 15, mill_certificate_package_count: 4, reinforcement_delivery_distance_km: 34 },
  large_area: { approved_reinforcement_schedule_weight_kg: 24_000, binding_wire_mass_kg: 294, spacer_chair_designation: "SLAB-LA-SPACER-50", spacer_chair_quantity_piece: 3_720, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 78, site_cutting_worker_h: 118, site_bending_worker_h: 142, cage_assembly_worker_h: 476, installation_worker_h: 612, cover_control_worker_h: 58, rebar_cutting_machine_h: 46, rebar_bending_machine_h: 54, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР SLAB-LA-LIFT", lifting_machine_h: 46, reinforcement_inspection_service_h: 26, mill_certificate_package_count: 6, reinforcement_delivery_distance_km: 48 },
  repair: { approved_reinforcement_schedule_weight_kg: 950, binding_wire_mass_kg: 15, spacer_chair_designation: "SLAB-REPAIR-SPACER-40", spacer_chair_quantity_piece: 154, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "SLAB-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 30, unloading_and_storage_worker_h: 6, site_cutting_worker_h: 14, site_bending_worker_h: 12, cage_assembly_worker_h: 34, installation_worker_h: 46, cover_control_worker_h: 7, rebar_cutting_machine_h: 5, rebar_bending_machine_h: 5, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 16 },
  small_area: { approved_reinforcement_schedule_weight_kg: 600, binding_wire_mass_kg: 9, spacer_chair_designation: "SLAB-SA-SPACER-40", spacer_chair_quantity_piece: 96, unloading_and_storage_worker_h: 4, installation_worker_h: 28, cover_control_worker_h: 5, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 12 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 2_600, binding_wire_mass_kg: 34, spacer_chair_designation: "SLAB-TR-SPACER-50", spacer_chair_quantity_piece: 382, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "SLAB-TR-COUPLER-NO5", mechanical_coupler_quantity_piece: 56, unloading_and_storage_worker_h: 12, site_cutting_worker_h: 21, site_bending_worker_h: 23, cage_assembly_worker_h: 70, installation_worker_h: 88, cover_control_worker_h: 13, rebar_cutting_machine_h: 8, rebar_bending_machine_h: 9, reinforcement_inspection_service_h: 6, reinforcement_delivery_distance_km: 24 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 5_200, binding_wire_mass_kg: 69, spacer_chair_designation: "SLAB-WZ-NONABSORBENT-SPACER-60", spacer_chair_quantity_piece: 820, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 21, installation_worker_h: 154, cover_control_worker_h: 23, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР SLAB-WZ-LIFT", lifting_machine_h: 11, reinforcement_inspection_service_h: 11, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 30 },
});

export function slabFoundationReinforcementAcceptanceInputR1(
  contextKey: SlabFoundationReinforcementContextKey,
): Readonly<Record<string, InputValue>> {
  const target = SLAB_FOUNDATION_REINFORCEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`SLAB_FOUNDATION_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-SLAB-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-SLAB-${reference}-REV-A`,
    bar_count_and_cut_length_m:
      `PROJECT_BBS:BBS-SLAB-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved mass across all bar marks`,
    estimator_approval_reference: `EST-SLAB-${reference}-REBAR-REV-A`,
  });
}

export async function compileSlabFoundationReinforcementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: SLAB_FOUNDATION_REINFORCEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? SLAB_FOUNDATION_REINFORCEMENT_TARGETS[0].catalogId,
    parameters: SLAB_FOUNDATION_REINFORCEMENT_PARAMETERS,
    resources: SLAB_FOUNDATION_REINFORCEMENT_RESOURCES,
  });
}
