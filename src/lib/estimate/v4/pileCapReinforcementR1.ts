import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory";

type InputValue = string | number | boolean;

export const PILE_CAP_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_standard", titleRu: "Армирование ростверка в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_high_load", titleRu: "Армирование ростверка в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_large_area", titleRu: "Армирование ростверка на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_repair", titleRu: "Армирование ремонтного участка ростверка", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_small_area", titleRu: "Армирование ростверка на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_technical_room", titleRu: "Армирование ростверка технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_wet_zone", titleRu: "Армирование ростверка во влажной зоне", contextRu: "влажная зона" },
] as const);

export type PileCapReinforcementContextKey =
  (typeof PILE_CAP_REINFORCEMENT_TARGETS)[number]["contextKey"];

export const PILE_CAP_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "pile-cap-reinforcement",
  compilerVersion: "canonical-estimate-compiler.pile-cap-reinforcement-r1",
  errorPrefix: "PILE_CAP_REINFORCEMENT",
  catalogIds: PILE_CAP_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.pile-cap-reinforcement-r1";

export const PILE_CAP_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "pile-cap-reinforcement",
  contract: CONTRACT,
  guideVersion: "pile-cap-reinforcement-r1",
});

export const PILE_CAP_REINFORCEMENT_RESOURCES = deriveReinforcementFamilyResourcesR1({
  ownerKey: "pile-cap-reinforcement",
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
PileCapReinforcementContextKey,
Readonly<Record<string, InputValue>>
>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 1_800, binding_wire_mass_kg: 23, spacer_chair_designation: "PC-SPACER-50", spacer_chair_quantity_piece: 268, unloading_and_storage_worker_h: 9, installation_worker_h: 58, cover_control_worker_h: 8, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 19 },
  high_load: { approved_reinforcement_schedule_weight_kg: 6_500, binding_wire_mass_kg: 86, spacer_chair_designation: "PC-HD-SPACER-70", spacer_chair_quantity_piece: 970, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "PC-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 146, unloading_and_storage_worker_h: 25, site_cutting_worker_h: 36, site_bending_worker_h: 43, cage_assembly_worker_h: 132, installation_worker_h: 174, cover_control_worker_h: 23, rebar_cutting_machine_h: 14, rebar_bending_machine_h: 17, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР PC-HD-LIFT", lifting_machine_h: 13, reinforcement_inspection_service_h: 10, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 29 },
  large_area: { approved_reinforcement_schedule_weight_kg: 14_500, binding_wire_mass_kg: 181, spacer_chair_designation: "PC-LA-SPACER-50", spacer_chair_quantity_piece: 2_190, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 49, site_cutting_worker_h: 73, site_bending_worker_h: 86, cage_assembly_worker_h: 284, installation_worker_h: 372, cover_control_worker_h: 39, rebar_cutting_machine_h: 29, rebar_bending_machine_h: 34, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР PC-LA-LIFT", lifting_machine_h: 29, reinforcement_inspection_service_h: 18, mill_certificate_package_count: 4, reinforcement_delivery_distance_km: 42 },
  repair: { approved_reinforcement_schedule_weight_kg: 620, binding_wire_mass_kg: 10, spacer_chair_designation: "PC-REPAIR-SPACER-40", spacer_chair_quantity_piece: 102, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "PC-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 21, unloading_and_storage_worker_h: 4, site_cutting_worker_h: 10, site_bending_worker_h: 9, cage_assembly_worker_h: 24, installation_worker_h: 33, cover_control_worker_h: 5, rebar_cutting_machine_h: 3, rebar_bending_machine_h: 3, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 14 },
  small_area: { approved_reinforcement_schedule_weight_kg: 380, binding_wire_mass_kg: 6, spacer_chair_designation: "PC-SA-SPACER-40", spacer_chair_quantity_piece: 62, unloading_and_storage_worker_h: 3, installation_worker_h: 19, cover_control_worker_h: 3, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 10 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 1_600, binding_wire_mass_kg: 21, spacer_chair_designation: "PC-TR-SPACER-50", spacer_chair_quantity_piece: 241, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "PC-TR-COUPLER-NO5", mechanical_coupler_quantity_piece: 36, unloading_and_storage_worker_h: 8, site_cutting_worker_h: 14, site_bending_worker_h: 15, cage_assembly_worker_h: 46, installation_worker_h: 57, cover_control_worker_h: 8, rebar_cutting_machine_h: 5, rebar_bending_machine_h: 6, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 21 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 3_200, binding_wire_mass_kg: 43, spacer_chair_designation: "PC-WZ-NONABSORBENT-SPACER-60", spacer_chair_quantity_piece: 505, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 14, installation_worker_h: 97, cover_control_worker_h: 15, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР PC-WZ-LIFT", lifting_machine_h: 7, reinforcement_inspection_service_h: 8, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 26 },
});

export function pileCapReinforcementAcceptanceInputR1(
  contextKey: PileCapReinforcementContextKey,
): Readonly<Record<string, InputValue>> {
  const target = PILE_CAP_REINFORCEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PILE_CAP_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-PC-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-PC-${reference}-REV-A`,
    bar_count_and_cut_length_m:
      `PROJECT_BBS:BBS-PC-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved mass across all bar marks`,
    estimator_approval_reference: `EST-PC-${reference}-REBAR-REV-A`,
  });
}

export async function compilePileCapReinforcementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: PILE_CAP_REINFORCEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? PILE_CAP_REINFORCEMENT_TARGETS[0].catalogId,
    parameters: PILE_CAP_REINFORCEMENT_PARAMETERS,
    resources: PILE_CAP_REINFORCEMENT_RESOURCES,
  });
}
