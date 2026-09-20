import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory";

type InputValue = string | number | boolean;

export const PEDESTAL_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_standard", titleRu: "Армирование бетонного пьедестала в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_high_load", titleRu: "Армирование бетонного пьедестала в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_large_area", titleRu: "Армирование бетонного пьедестала на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_repair", titleRu: "Армирование ремонтного участка бетонного пьедестала", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_small_area", titleRu: "Армирование бетонного пьедестала на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_technical_room", titleRu: "Армирование бетонного пьедестала технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_wet_zone", titleRu: "Армирование бетонного пьедестала во влажной зоне", contextRu: "влажная зона" },
] as const);

export type PedestalReinforcementContextKey =
  (typeof PEDESTAL_REINFORCEMENT_TARGETS)[number]["contextKey"];

export const PEDESTAL_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "pedestal-reinforcement",
  compilerVersion: "canonical-estimate-compiler.pedestal-reinforcement-r1",
  errorPrefix: "PEDESTAL_REINFORCEMENT",
  catalogIds: PEDESTAL_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.pedestal-reinforcement-r1";

export const PEDESTAL_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "pedestal-reinforcement",
  contract: CONTRACT,
  guideVersion: "pedestal-reinforcement-r1",
});

export const PEDESTAL_REINFORCEMENT_RESOURCES = deriveReinforcementFamilyResourcesR1({
  ownerKey: "pedestal-reinforcement",
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
PedestalReinforcementContextKey,
Readonly<Record<string, InputValue>>
>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 900, binding_wire_mass_kg: 12, spacer_chair_designation: "PD-SPACER-50", spacer_chair_quantity_piece: 137, unloading_and_storage_worker_h: 5, installation_worker_h: 31, cover_control_worker_h: 5, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 18 },
  high_load: { approved_reinforcement_schedule_weight_kg: 3_200, binding_wire_mass_kg: 44, spacer_chair_designation: "PD-HD-SPACER-70", spacer_chair_quantity_piece: 482, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "PD-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 76, unloading_and_storage_worker_h: 14, site_cutting_worker_h: 19, site_bending_worker_h: 23, cage_assembly_worker_h: 69, installation_worker_h: 91, cover_control_worker_h: 12, rebar_cutting_machine_h: 8, rebar_bending_machine_h: 9, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР PD-HD-LIFT", lifting_machine_h: 7, reinforcement_inspection_service_h: 6, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 28 },
  large_area: { approved_reinforcement_schedule_weight_kg: 7_200, binding_wire_mass_kg: 92, spacer_chair_designation: "PD-LA-SPACER-50", spacer_chair_quantity_piece: 1_095, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 26, site_cutting_worker_h: 38, site_bending_worker_h: 45, cage_assembly_worker_h: 144, installation_worker_h: 190, cover_control_worker_h: 21, rebar_cutting_machine_h: 15, rebar_bending_machine_h: 18, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР PD-LA-LIFT", lifting_machine_h: 15, reinforcement_inspection_service_h: 10, mill_certificate_package_count: 3, reinforcement_delivery_distance_km: 40 },
  repair: { approved_reinforcement_schedule_weight_kg: 340, binding_wire_mass_kg: 6, spacer_chair_designation: "PD-REPAIR-SPACER-40", spacer_chair_quantity_piece: 58, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "PD-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 13, unloading_and_storage_worker_h: 3, site_cutting_worker_h: 6, site_bending_worker_h: 5, cage_assembly_worker_h: 14, installation_worker_h: 19, cover_control_worker_h: 3, rebar_cutting_machine_h: 2, rebar_bending_machine_h: 2, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 13 },
  small_area: { approved_reinforcement_schedule_weight_kg: 220, binding_wire_mass_kg: 4, spacer_chair_designation: "PD-SA-SPACER-40", spacer_chair_quantity_piece: 38, unloading_and_storage_worker_h: 2, installation_worker_h: 12, cover_control_worker_h: 2, reinforcement_inspection_service_h: 1, reinforcement_delivery_distance_km: 9 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 780, binding_wire_mass_kg: 11, spacer_chair_designation: "PD-TR-SPACER-50", spacer_chair_quantity_piece: 121, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "PD-TR-COUPLER-NO5", mechanical_coupler_quantity_piece: 20, unloading_and_storage_worker_h: 5, site_cutting_worker_h: 8, site_bending_worker_h: 8, cage_assembly_worker_h: 24, installation_worker_h: 30, cover_control_worker_h: 5, rebar_cutting_machine_h: 3, rebar_bending_machine_h: 3, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 20 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 1_500, binding_wire_mass_kg: 21, spacer_chair_designation: "PD-WZ-NONABSORBENT-SPACER-60", spacer_chair_quantity_piece: 241, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 8, installation_worker_h: 49, cover_control_worker_h: 8, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР PD-WZ-LIFT", lifting_machine_h: 4, reinforcement_inspection_service_h: 5, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 25 },
});

export function pedestalReinforcementAcceptanceInputR1(
  contextKey: PedestalReinforcementContextKey,
): Readonly<Record<string, InputValue>> {
  const target = PEDESTAL_REINFORCEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PEDESTAL_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-PD-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-PD-${reference}-REV-A`,
    bar_count_and_cut_length_m:
      `PROJECT_BBS:BBS-PD-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved mass across all bar marks`,
    estimator_approval_reference: `EST-PD-${reference}-REBAR-REV-A`,
  });
}

export async function compilePedestalReinforcementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: PEDESTAL_REINFORCEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? PEDESTAL_REINFORCEMENT_TARGETS[0].catalogId,
    parameters: PEDESTAL_REINFORCEMENT_PARAMETERS,
    resources: PEDESTAL_REINFORCEMENT_RESOURCES,
  });
}
