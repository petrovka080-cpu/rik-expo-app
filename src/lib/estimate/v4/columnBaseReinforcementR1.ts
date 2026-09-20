import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory";

type InputValue = string | number | boolean;

export const COLUMN_BASE_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_standard", titleRu: "Армирование столбчатого основания в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_high_load", titleRu: "Армирование столбчатого основания в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_large_area", titleRu: "Армирование столбчатого основания на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_repair", titleRu: "Армирование ремонтного участка столбчатого основания", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_small_area", titleRu: "Армирование столбчатого основания на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_technical_room", titleRu: "Армирование столбчатого основания технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_wet_zone", titleRu: "Армирование столбчатого основания во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ColumnBaseReinforcementContextKey =
  (typeof COLUMN_BASE_REINFORCEMENT_TARGETS)[number]["contextKey"];

export const COLUMN_BASE_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "column-base-reinforcement",
  compilerVersion: "canonical-estimate-compiler.column-base-reinforcement-r1",
  errorPrefix: "COLUMN_BASE_REINFORCEMENT",
  catalogIds: COLUMN_BASE_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.column-base-reinforcement-r1";

export const COLUMN_BASE_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "column-base-reinforcement",
  contract: CONTRACT,
  guideVersion: "column-base-reinforcement-r1",
});

export const COLUMN_BASE_REINFORCEMENT_RESOURCES = deriveReinforcementFamilyResourcesR1({
  ownerKey: "column-base-reinforcement",
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
ColumnBaseReinforcementContextKey,
Readonly<Record<string, InputValue>>
>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 1_100, binding_wire_mass_kg: 15, spacer_chair_designation: "CB-SPACER-50", spacer_chair_quantity_piece: 168, unloading_and_storage_worker_h: 6, installation_worker_h: 37, cover_control_worker_h: 6, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 18 },
  high_load: { approved_reinforcement_schedule_weight_kg: 3_800, binding_wire_mass_kg: 52, spacer_chair_designation: "CB-HD-SPACER-70", spacer_chair_quantity_piece: 578, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "CB-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 88, unloading_and_storage_worker_h: 16, site_cutting_worker_h: 23, site_bending_worker_h: 27, cage_assembly_worker_h: 81, installation_worker_h: 107, cover_control_worker_h: 14, rebar_cutting_machine_h: 9, rebar_bending_machine_h: 11, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР CB-HD-LIFT", lifting_machine_h: 8, reinforcement_inspection_service_h: 7, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 28 },
  large_area: { approved_reinforcement_schedule_weight_kg: 8_500, binding_wire_mass_kg: 108, spacer_chair_designation: "CB-LA-SPACER-50", spacer_chair_quantity_piece: 1_292, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 31, site_cutting_worker_h: 44, site_bending_worker_h: 52, cage_assembly_worker_h: 169, installation_worker_h: 222, cover_control_worker_h: 24, rebar_cutting_machine_h: 17, rebar_bending_machine_h: 21, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР CB-LA-LIFT", lifting_machine_h: 18, reinforcement_inspection_service_h: 12, mill_certificate_package_count: 3, reinforcement_delivery_distance_km: 40 },
  repair: { approved_reinforcement_schedule_weight_kg: 400, binding_wire_mass_kg: 6, spacer_chair_designation: "CB-REPAIR-SPACER-40", spacer_chair_quantity_piece: 66, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "CB-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 15, unloading_and_storage_worker_h: 3, site_cutting_worker_h: 6, site_bending_worker_h: 6, cage_assembly_worker_h: 16, installation_worker_h: 21, cover_control_worker_h: 4, rebar_cutting_machine_h: 2, rebar_bending_machine_h: 2, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 13 },
  small_area: { approved_reinforcement_schedule_weight_kg: 250, binding_wire_mass_kg: 4, spacer_chair_designation: "CB-SA-SPACER-40", spacer_chair_quantity_piece: 42, unloading_and_storage_worker_h: 2, installation_worker_h: 14, cover_control_worker_h: 3, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 9 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 900, binding_wire_mass_kg: 13, spacer_chair_designation: "CB-TR-SPACER-50", spacer_chair_quantity_piece: 140, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "CB-TR-COUPLER-NO5", mechanical_coupler_quantity_piece: 23, unloading_and_storage_worker_h: 5, site_cutting_worker_h: 9, site_bending_worker_h: 10, cage_assembly_worker_h: 28, installation_worker_h: 35, cover_control_worker_h: 5, rebar_cutting_machine_h: 4, rebar_bending_machine_h: 4, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 20 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 1_800, binding_wire_mass_kg: 25, spacer_chair_designation: "CB-WZ-NONABSORBENT-SPACER-60", spacer_chair_quantity_piece: 287, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 9, installation_worker_h: 58, cover_control_worker_h: 9, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР CB-WZ-LIFT", lifting_machine_h: 5, reinforcement_inspection_service_h: 5, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 25 },
});

export function columnBaseReinforcementAcceptanceInputR1(
  contextKey: ColumnBaseReinforcementContextKey,
): Readonly<Record<string, InputValue>> {
  const target = COLUMN_BASE_REINFORCEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`COLUMN_BASE_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-CB-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-CB-${reference}-REV-A`,
    bar_count_and_cut_length_m:
      `PROJECT_BBS:BBS-CB-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved mass across all bar marks`,
    estimator_approval_reference: `EST-CB-${reference}-REBAR-REV-A`,
  });
}

export async function compileColumnBaseReinforcementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: COLUMN_BASE_REINFORCEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? COLUMN_BASE_REINFORCEMENT_TARGETS[0].catalogId,
    parameters: COLUMN_BASE_REINFORCEMENT_PARAMETERS,
    resources: COLUMN_BASE_REINFORCEMENT_RESOURCES,
  });
}
