import {
  compileReinforcementFamilyR1,
  deriveReinforcementFamilyParametersR1,
  deriveReinforcementFamilyResourcesR1,
  type ReinforcementFamilyDescriptorR1,
  type StripFoundationReinforcementParameter,
} from "./stripFoundationReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./domainFactory/clientRuntimeV1";

type InputValue = string | number | boolean;

import { REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS } from "../contracts/reinforcementProductionPromptParametersR1";
export { REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS } from "../contracts/reinforcementProductionPromptParametersR1";

/**
 * The legacy catalog token `form` means "form/assemble the reinforcement
 * cage" for these identities. The public promise and family are
 * reinforcement, not formwork, so they deliberately share the approved BBS
 * calculation owner with the reinforcement-frame identities above.
 */
import { REINFORCEMENT_FRAME_ASSEMBLY_TARGETS } from "../contracts/reinforcementProductionPromptParametersR1";
export { REINFORCEMENT_FRAME_ASSEMBLY_TARGETS } from "../contracts/reinforcementProductionPromptParametersR1";

export type ReinforcementFrameReinforcementContextKey =
  (typeof REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS)[number]["contextKey"];

export type ReinforcementFrameAssemblyContextKey =
  (typeof REINFORCEMENT_FRAME_ASSEMBLY_TARGETS)[number]["contextKey"];

export const REINFORCEMENT_FRAME_REINFORCEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "reinforcement-frame-reinforcement",
  compilerVersion: "canonical-estimate-compiler.reinforcement-frame-reinforcement-r1",
  errorPrefix: "REINFORCEMENT_FRAME_REINFORCEMENT",
  catalogIds: REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

export const REINFORCEMENT_FRAME_ASSEMBLY_DESCRIPTOR = Object.freeze({
  ownerKey: "reinforcement-frame-reinforcement",
  compilerVersion: "canonical-estimate-compiler.reinforcement-frame-reinforcement-r1",
  errorPrefix: "REINFORCEMENT_FRAME_ASSEMBLY",
  catalogIds: REINFORCEMENT_FRAME_ASSEMBLY_TARGETS.map((target) => target.catalogId),
} satisfies ReinforcementFamilyDescriptorR1);

const CONTRACT = "rik-expo-app.reinforcement-frame-reinforcement-r1";

export const REINFORCEMENT_FRAME_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = deriveReinforcementFamilyParametersR1({
  ownerKey: "reinforcement-frame-reinforcement",
  contract: CONTRACT,
  guideVersion: "reinforcement-frame-reinforcement-r1",
});

export const REINFORCEMENT_FRAME_REINFORCEMENT_RESOURCES = deriveReinforcementFamilyResourcesR1({
  ownerKey: "reinforcement-frame-reinforcement",
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
ReinforcementFrameReinforcementContextKey,
Readonly<Record<string, InputValue>>
>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 1_500, binding_wire_mass_kg: 21, spacer_chair_designation: "RF-SPACER-50", spacer_chair_quantity_piece: 228, unloading_and_storage_worker_h: 8, installation_worker_h: 49, cover_control_worker_h: 8, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 19 },
  high_load: { approved_reinforcement_schedule_weight_kg: 5_200, binding_wire_mass_kg: 70, spacer_chair_designation: "RF-HD-SPACER-70", spacer_chair_quantity_piece: 790, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "RF-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 118, unloading_and_storage_worker_h: 21, site_cutting_worker_h: 31, site_bending_worker_h: 37, cage_assembly_worker_h: 111, installation_worker_h: 146, cover_control_worker_h: 19, rebar_cutting_machine_h: 12, rebar_bending_machine_h: 14, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР RF-HD-LIFT", lifting_machine_h: 11, reinforcement_inspection_service_h: 8, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 29 },
  repair: { approved_reinforcement_schedule_weight_kg: 560, binding_wire_mass_kg: 8, spacer_chair_designation: "RF-REPAIR-SPACER-40", spacer_chair_quantity_piece: 91, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "RF-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 19, unloading_and_storage_worker_h: 4, site_cutting_worker_h: 8, site_bending_worker_h: 8, cage_assembly_worker_h: 21, installation_worker_h: 29, cover_control_worker_h: 5, rebar_cutting_machine_h: 3, rebar_bending_machine_h: 3, reinforcement_inspection_service_h: 3, reinforcement_delivery_distance_km: 14 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 1_250, binding_wire_mass_kg: 18, spacer_chair_designation: "RF-TR-SPACER-50", spacer_chair_quantity_piece: 193, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "RF-TR-COUPLER-NO5", mechanical_coupler_quantity_piece: 31, unloading_and_storage_worker_h: 7, site_cutting_worker_h: 12, site_bending_worker_h: 13, cage_assembly_worker_h: 38, installation_worker_h: 48, cover_control_worker_h: 7, rebar_cutting_machine_h: 5, rebar_bending_machine_h: 5, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 21 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 2_600, binding_wire_mass_kg: 36, spacer_chair_designation: "RF-WZ-NONABSORBENT-SPACER-60", spacer_chair_quantity_piece: 410, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 12, installation_worker_h: 80, cover_control_worker_h: 12, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР RF-WZ-LIFT", lifting_machine_h: 6, reinforcement_inspection_service_h: 7, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 26 },
});

export function reinforcementFrameReinforcementAcceptanceInputR1(
  contextKey: ReinforcementFrameReinforcementContextKey,
): Readonly<Record<string, InputValue>> {
  const target = REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`REINFORCEMENT_FRAME_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-RF-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-RF-${reference}-REV-A`,
    bar_count_and_cut_length_m:
      `PROJECT_BBS:BBS-RF-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved mass across all bar marks`,
    estimator_approval_reference: `EST-RF-${reference}-REBAR-REV-A`,
  });
}

export function reinforcementFrameAssemblyAcceptanceInputR1(
  contextKey: ReinforcementFrameAssemblyContextKey,
): Readonly<Record<string, InputValue>> {
  const target = REINFORCEMENT_FRAME_ASSEMBLY_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`REINFORCEMENT_FRAME_ASSEMBLY_CONTEXT_UNSUPPORTED:${contextKey}`);
  return reinforcementFrameReinforcementAcceptanceInputR1(contextKey);
}

export async function compileReinforcementFrameReinforcementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: REINFORCEMENT_FRAME_REINFORCEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS[0].catalogId,
    parameters: REINFORCEMENT_FRAME_REINFORCEMENT_PARAMETERS,
    resources: REINFORCEMENT_FRAME_REINFORCEMENT_RESOURCES,
  });
}

export async function compileReinforcementFrameAssemblyR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
) {
  return compileReinforcementFamilyR1(submittedParameters, {
    descriptor: REINFORCEMENT_FRAME_ASSEMBLY_DESCRIPTOR,
    catalogId: options.catalogId ?? REINFORCEMENT_FRAME_ASSEMBLY_TARGETS[0].catalogId,
    parameters: REINFORCEMENT_FRAME_REINFORCEMENT_PARAMETERS,
    resources: REINFORCEMENT_FRAME_REINFORCEMENT_RESOURCES,
  });
}
