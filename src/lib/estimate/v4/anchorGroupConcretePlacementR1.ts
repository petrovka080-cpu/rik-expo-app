import type { CanonicalEstimateCompileCoreResult } from "../backendPlatform/canonicalEstimateCompileCore";
import { NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID } from "./domainFactory";
import {
  CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS_R1,
  CONCRETE_PLACEMENT_SOURCE_METADATA_R1,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS,
  compileConcretePlacementFamilyR1,
  createConcretePlacementParametersR1,
  createConcretePlacementResourcesR1,
  type ConcretePlacementFamilyDescriptorR1,
  type ConcretePlacementInputValueR1,
} from "./stripFoundationConcretePlacementR1";

export const ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_standard",
    titleRu: "Бетонирование основания анкерной группы в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_high_load",
    titleRu: "Бетонирование основания анкерной группы в зоне высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "large_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_large_area",
    titleRu: "Бетонирование оснований анкерных групп на большом участке",
    contextRu: "большой участок",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_repair",
    titleRu: "Бетонирование ремонтного участка основания анкерной группы",
    contextRu: "локальный ремонт основания",
  },
  {
    contextKey: "small_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_small_area",
    titleRu: "Бетонирование основания анкерной группы на малом участке",
    contextRu: "малый участок",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_technical_room",
    titleRu: "Бетонирование основания анкерной группы в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_wet_zone",
    titleRu: "Бетонирование основания анкерной группы во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type AnchorGroupConcretePlacementContextKey =
  (typeof ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS)[number]["contextKey"];

export const ANCHOR_GROUP_CONCRETE_PLACEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "anchor-group-concrete-placement",
  contract: "rik-expo-app.anchor-group-concrete-placement-r1",
  guideVersion: "anchor-group-concrete-placement-r1",
  projectApplicabilityRu:
    "Значение относится к конкретной захватке основания анкерной группы и не выводится из универсальной нормы.",
  sourceIdPrefix: "anchor-group-concrete-placement",
  compilerVersion: "canonical-estimate-compiler.anchor-group-concrete-placement-r1",
  errorPrefix: "ANCHOR_GROUP_CONCRETE",
  catalogIds: ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ConcretePlacementFamilyDescriptorR1);

export const ANCHOR_GROUP_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS =
  CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS_R1;
export const ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS =
  createConcretePlacementParametersR1(ANCHOR_GROUP_CONCRETE_PLACEMENT_DESCRIPTOR);
export const ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS =
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS;
export const ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES =
  createConcretePlacementResourcesR1(ANCHOR_GROUP_CONCRETE_PLACEMENT_DESCRIPTOR);
export const ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA =
  CONCRETE_PLACEMENT_SOURCE_METADATA_R1;

const BASE_INPUT: Readonly<Record<string, ConcretePlacementInputValueR1>> = Object.freeze({
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  concrete_class: "B25",
  watertightness: "W6",
  frost_resistance: "F150",
  mobility: "P4",
  placement_method: "pump",
  selected_contingency_percent: 6,
  curing_method: "membrane",
  curing_membrane_specification: "Плёнка для ухода за бетоном по проектной ведомости",
  winter_mode: false,
  winter_heating_cable_m: 0,
  winter_heating_worker_h: 0,
  heating_transformer_machine_h: 0,
  crane_bucket_machine_h: 0,
  quality_control_document_count: 1,
  delivery_pricing_mode: "SEPARATE",
  construction_joint_mode: "NONE",
});

const PROJECT_SCHEDULES: Readonly<Record<
AnchorGroupConcretePlacementContextKey,
Readonly<Record<string, ConcretePlacementInputValueR1>>
>> = Object.freeze({
  standard: { plan_dimension_concrete_volume_m3: 8, curing_membrane_area_m2: 16, placement_worker_h: 20, finishing_worker_h: 6, curing_worker_h: 5, pump_machine_h: 2, deep_vibrator_machine_h: 3, concrete_delivery_distance_km: 24 },
  high_load: { plan_dimension_concrete_volume_m3: 18, curing_membrane_area_m2: 0, placement_worker_h: 46, finishing_worker_h: 12, curing_worker_h: 10, pump_machine_h: 4, deep_vibrator_machine_h: 7, concrete_delivery_distance_km: 34, selected_contingency_percent: 10, curing_method: "water", winter_mode: true, winter_heating_cable_m: 150, winter_heating_worker_h: 18, heating_transformer_machine_h: 16 },
  large_area: { plan_dimension_concrete_volume_m3: 36, curing_membrane_area_m2: 72, placement_worker_h: 82, finishing_worker_h: 22, curing_worker_h: 18, pump_machine_h: 7, deep_vibrator_machine_h: 13, concrete_delivery_distance_km: 42, selected_contingency_percent: 8, quality_control_document_count: 2 },
  repair: { plan_dimension_concrete_volume_m3: 4, curing_membrane_area_m2: 0, placement_worker_h: 14, finishing_worker_h: 5, curing_worker_h: 4, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 2, concrete_delivery_distance_km: 14, curing_method: "water", selected_contingency_percent: 4 },
  small_area: { plan_dimension_concrete_volume_m3: 3, curing_membrane_area_m2: 7, placement_worker_h: 10, finishing_worker_h: 3, curing_worker_h: 3, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 1, concrete_delivery_distance_km: 10, selected_contingency_percent: 4 },
  technical_room: { plan_dimension_concrete_volume_m3: 6, curing_membrane_area_m2: 0, placement_worker_h: 18, finishing_worker_h: 5, curing_worker_h: 4, placement_method: "crane_bucket", pump_machine_h: 0, crane_bucket_machine_h: 3, deep_vibrator_machine_h: 3, concrete_delivery_distance_km: 20, curing_method: "water", selected_contingency_percent: 5 },
  wet_zone: { plan_dimension_concrete_volume_m3: 12, curing_membrane_area_m2: 25, placement_worker_h: 30, finishing_worker_h: 9, curing_worker_h: 8, pump_machine_h: 3, deep_vibrator_machine_h: 5, concrete_delivery_distance_km: 28, selected_contingency_percent: 7, watertightness: "W8", quality_control_document_count: 2 },
});

export function anchorGroupConcretePlacementAcceptanceInputR1(
  contextKey: AnchorGroupConcretePlacementContextKey,
): Readonly<Record<string, ConcretePlacementInputValueR1>> {
  const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`ANCHOR_GROUP_CONCRETE_PLACEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    plan_volume_calculation_reference: `AG-POUR-${reference}-VOLUME-REV-A`,
    mix_design_or_project_specification_reference: `AG-POUR-${reference}-MIX-B25-REV-A`,
    mixture_designation: `B25 ${contextKey === "wet_zone" ? "W8" : "W6"} F150 P4`,
    placement_location: `Основание анкерной группы; ${target.contextRu}; захватка AG-POUR-${reference}`,
    contingency_selection_justification: `Резерв подтверждён сметчиком для захватки AG-POUR-${reference}`,
    delivery_schedule_and_truck_capacity: `График AG-POUR-${reference}; автобетоносмесители до 8 м³`,
    producer_order_confirmation: `RMC-AG-POUR-${reference}-CONFIRMED`,
    estimator_approval_reference: `EST-AG-POUR-${reference}-REV-A`,
  });
}

export async function compileAnchorGroupConcretePlacementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileConcretePlacementFamilyR1(submittedParameters, {
    descriptor: ANCHOR_GROUP_CONCRETE_PLACEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS[0].catalogId,
    parameters: ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS,
    resources: ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES,
  });
}
