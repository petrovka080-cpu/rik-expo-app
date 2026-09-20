import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory";

type InputValue = string | number | boolean;

export const FORMWORK_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_standard", titleRu: "Монтаж арматуры монолитной конструкции в опалубке стандартной зоны", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_high_load", titleRu: "Монтаж арматуры монолитной конструкции в опалубке зоны высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_large_area", titleRu: "Монтаж арматуры монолитной конструкции в опалубке большого участка", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_repair", titleRu: "Монтаж арматуры монолитной конструкции в опалубке ремонтного участка", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_small_area", titleRu: "Монтаж арматуры монолитной конструкции в опалубке малого участка", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_technical_room", titleRu: "Монтаж арматуры монолитной конструкции в опалубке технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_wet_zone", titleRu: "Монтаж арматуры монолитной конструкции в опалубке влажной зоны", contextRu: "влажная зона" },
] as const);

export type FormworkReinforcementContextKey =
  (typeof FORMWORK_REINFORCEMENT_TARGETS)[number]["contextKey"];

export const FORMWORK_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "formwork-reinforcement",
  compilerVersion: "canonical-estimate-compiler.formwork-reinforcement-r1",
  errorPrefix: "FORMWORK_REINFORCEMENT",
  catalogIds: FORMWORK_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.formwork-reinforcement-r1";

export const FORMWORK_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "formwork-reinforcement",
  contract: CONTRACT,
  guideVersion: "formwork-reinforcement-r1",
});

export const FORMWORK_REINFORCEMENT_RESOURCES = deriveReinforcementFamilyResourcesR1({
  ownerKey: "formwork-reinforcement",
  contract: CONTRACT,
});

const BASE_INPUT: Readonly<Record<string, InputValue>> = Object.freeze({
  product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  bar_standard_and_grade: "ASTM A615 Grade 60",
  bar_size_designation: "No. 5",
  nominal_diameter_mm: 15.875,
  shape_straight_bent_curved_or_link: "BENT:PROJECT-BBS:IN-FORMWORK-STRUCTURAL-REINFORCEMENT",
  selected_standard_mass_kg_per_m: 1.552,
  laps_hooks_chairs_connectors_and_accessories_scope: "PROJECT_SCOPE:structural reinforcement installed within erected formwork; formwork design, strengthening and concrete placement are excluded",
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

const PROJECT_SCHEDULES: Readonly<Record<FormworkReinforcementContextKey, Readonly<Record<string, InputValue>>>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 950, binding_wire_mass_kg: 14, spacer_chair_designation: "FW-RB-SPACER-45", spacer_chair_quantity_piece: 176, unloading_and_storage_worker_h: 6, installation_worker_h: 34, cover_control_worker_h: 6, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 18 },
  high_load: { approved_reinforcement_schedule_weight_kg: 3_200, binding_wire_mass_kg: 44, spacer_chair_designation: "FW-RB-HD-SPACER-70", spacer_chair_quantity_piece: 590, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "FW-RB-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 78, unloading_and_storage_worker_h: 15, site_cutting_worker_h: 22, site_bending_worker_h: 25, cage_assembly_worker_h: 72, installation_worker_h: 103, cover_control_worker_h: 14, rebar_cutting_machine_h: 8, rebar_bending_machine_h: 10, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР FW-RB-HD-LIFT", lifting_machine_h: 8, reinforcement_inspection_service_h: 7, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 30 },
  large_area: { approved_reinforcement_schedule_weight_kg: 7_600, binding_wire_mass_kg: 99, spacer_chair_designation: "FW-RB-LA-SPACER-55", spacer_chair_quantity_piece: 1_390, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 29, site_cutting_worker_h: 43, site_bending_worker_h: 50, cage_assembly_worker_h: 148, installation_worker_h: 211, cover_control_worker_h: 27, rebar_cutting_machine_h: 17, rebar_bending_machine_h: 20, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР FW-RB-LA-LIFT", lifting_machine_h: 17, reinforcement_inspection_service_h: 12, mill_certificate_package_count: 3, reinforcement_delivery_distance_km: 40 },
  repair: { approved_reinforcement_schedule_weight_kg: 340, binding_wire_mass_kg: 5, spacer_chair_designation: "FW-RB-REPAIR-SPACER-35", spacer_chair_quantity_piece: 66, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "FW-RB-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 12, unloading_and_storage_worker_h: 3, site_cutting_worker_h: 6, site_bending_worker_h: 6, cage_assembly_worker_h: 14, installation_worker_h: 20, cover_control_worker_h: 4, rebar_cutting_machine_h: 2, rebar_bending_machine_h: 2, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 13 },
  small_area: { approved_reinforcement_schedule_weight_kg: 210, binding_wire_mass_kg: 3, spacer_chair_designation: "FW-RB-SA-SPACER-35", spacer_chair_quantity_piece: 42, unloading_and_storage_worker_h: 2, installation_worker_h: 12, cover_control_worker_h: 2, reinforcement_inspection_service_h: 1, reinforcement_delivery_distance_km: 9 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 780, binding_wire_mass_kg: 12, spacer_chair_designation: "FW-RB-TR-SPACER-45", spacer_chair_quantity_piece: 150, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 5, site_cutting_worker_h: 7, site_bending_worker_h: 8, cage_assembly_worker_h: 24, installation_worker_h: 32, cover_control_worker_h: 6, rebar_cutting_machine_h: 3, rebar_bending_machine_h: 3, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 20 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 1_700, binding_wire_mass_kg: 24, spacer_chair_designation: "FW-RB-WZ-NONABSORBENT-SPACER-55", spacer_chair_quantity_piece: 320, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 9, installation_worker_h: 56, cover_control_worker_h: 9, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР FW-RB-WZ-LIFT", lifting_machine_h: 5, reinforcement_inspection_service_h: 5, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 24 },
});

export function formworkReinforcementAcceptanceInputR1(contextKey: FormworkReinforcementContextKey): Readonly<Record<string, InputValue>> {
  const target = FORMWORK_REINFORCEMENT_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`FORMWORK_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-FW-RB-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-FW-RB-${reference}-REV-A`,
    bar_count_and_cut_length_m: `PROJECT_BBS:BBS-FW-RB-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved structural-reinforcement mass across all bar marks`,
    estimator_approval_reference: `EST-FW-RB-${reference}-REV-A`,
  });
}

export async function compileFormworkReinforcementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: FORMWORK_REINFORCEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? FORMWORK_REINFORCEMENT_TARGETS[0].catalogId,
    parameters: FORMWORK_REINFORCEMENT_PARAMETERS,
    resources: FORMWORK_REINFORCEMENT_RESOURCES,
  });
}
