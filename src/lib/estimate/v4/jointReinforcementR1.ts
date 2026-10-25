import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory/clientRuntimeV1";

type InputValue = string | number | boolean;

import { JOINT_REINFORCEMENT_TARGETS } from "../contracts/reinforcementProductionPromptParametersR1";
export { JOINT_REINFORCEMENT_TARGETS } from "../contracts/reinforcementProductionPromptParametersR1";

export type JointReinforcementContextKey =
  (typeof JOINT_REINFORCEMENT_TARGETS)[number]["contextKey"];

export const JOINT_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "joint-reinforcement",
  compilerVersion: "canonical-estimate-compiler.joint-reinforcement-r1",
  errorPrefix: "JOINT_REINFORCEMENT",
  catalogIds: JOINT_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.joint-reinforcement-r1";

export const JOINT_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "joint-reinforcement",
  contract: CONTRACT,
  guideVersion: "joint-reinforcement-r1",
});

export const JOINT_REINFORCEMENT_RESOURCES = deriveReinforcementFamilyResourcesR1({
  ownerKey: "joint-reinforcement",
  contract: CONTRACT,
});

const BASE_INPUT: Readonly<Record<string, InputValue>> = Object.freeze({
  product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  bar_standard_and_grade: "ASTM A615 Grade 60",
  bar_size_designation: "No. 4",
  nominal_diameter_mm: 12.7,
  shape_straight_bent_curved_or_link: "BENT:PROJECT-BBS:JOINT-EDGE-BARS-NO-MOVEMENT-GAP-CROSSING",
  selected_standard_mass_kg_per_m: 0.994,
  laps_hooks_chairs_connectors_and_accessories_scope: "PROJECT_SCOPE:edge reinforcement on both sides; no bar crosses the movement gap unless a separately scheduled sleeved dowel system is specified",
  fabrication_allowance_if_documented: "NONE:INCLUDED_IN_APPROVED_SCHEDULE",
  supplier_bundle_or_length_constraints: "NONE:NO_AUTOMATIC_BUNDLE_ROUNDING",
  binding_wire_specification: "Проволока вязальная отожжённая по проектной ведомости",
  mechanical_couplers_applicable: false,
  mechanical_coupler_designation: "NOT_APPLICABLE:JOINT_EDGE_BBS_HAS_NO_MECHANICAL_COUPLERS",
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

const PROJECT_SCHEDULES: Readonly<Record<JointReinforcementContextKey, Readonly<Record<string, InputValue>>>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 420, binding_wire_mass_kg: 6, spacer_chair_designation: "JR-EDGE-SPACER-40", spacer_chair_quantity_piece: 82, unloading_and_storage_worker_h: 3, installation_worker_h: 18, cover_control_worker_h: 3, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 18 },
  high_load: { approved_reinforcement_schedule_weight_kg: 1_800, binding_wire_mass_kg: 25, spacer_chair_designation: "JR-HD-EDGE-SPACER-60", spacer_chair_quantity_piece: 340, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 9, site_cutting_worker_h: 13, site_bending_worker_h: 15, cage_assembly_worker_h: 42, installation_worker_h: 61, cover_control_worker_h: 9, rebar_cutting_machine_h: 5, rebar_bending_machine_h: 6, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР JR-HD-LIFT", lifting_machine_h: 5, reinforcement_inspection_service_h: 5, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 30 },
  repair: { approved_reinforcement_schedule_weight_kg: 260, binding_wire_mass_kg: 4, spacer_chair_designation: "JR-REPAIR-EDGE-SPACER-35", spacer_chair_quantity_piece: 54, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 3, site_cutting_worker_h: 5, site_bending_worker_h: 5, cage_assembly_worker_h: 11, installation_worker_h: 15, cover_control_worker_h: 3, rebar_cutting_machine_h: 2, rebar_bending_machine_h: 2, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 14 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 380, binding_wire_mass_kg: 6, spacer_chair_designation: "JR-TR-EDGE-SPACER-40", spacer_chair_quantity_piece: 76, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 3, site_cutting_worker_h: 4, site_bending_worker_h: 4, cage_assembly_worker_h: 12, installation_worker_h: 18, cover_control_worker_h: 3, rebar_cutting_machine_h: 2, rebar_bending_machine_h: 2, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 20 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 760, binding_wire_mass_kg: 11, spacer_chair_designation: "JR-WZ-NONABSORBENT-EDGE-SPACER-50", spacer_chair_quantity_piece: 148, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 5, installation_worker_h: 30, cover_control_worker_h: 5, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 24 },
});

export function jointReinforcementAcceptanceInputR1(contextKey: JointReinforcementContextKey): Readonly<Record<string, InputValue>> {
  const target = JOINT_REINFORCEMENT_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`JOINT_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-JR-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-JR-${reference}-REV-A`,
    bar_count_and_cut_length_m: `PROJECT_BBS:BBS-JR-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved edge-reinforcement mass across all bar marks`,
    estimator_approval_reference: `EST-JR-${reference}-REBAR-REV-A`,
  });
}

export async function compileJointReinforcementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: JOINT_REINFORCEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? JOINT_REINFORCEMENT_TARGETS[0].catalogId,
    parameters: JOINT_REINFORCEMENT_PARAMETERS,
    resources: JOINT_REINFORCEMENT_RESOURCES,
  });
}
