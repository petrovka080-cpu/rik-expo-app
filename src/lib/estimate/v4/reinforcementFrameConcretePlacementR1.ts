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

export const REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_standard", titleRu: "Бетонирование армокаркаса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_high_load", titleRu: "Бетонирование армокаркаса для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_large_area", titleRu: "Бетонирование армокаркаса на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_repair", titleRu: "Бетонирование армокаркаса с локальным ремонтом основания", contextRu: "локальный ремонт основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_small_area", titleRu: "Бетонирование армокаркаса на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_technical_room", titleRu: "Бетонирование армокаркаса в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_pour_wet_zone", titleRu: "Бетонирование армокаркаса во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ReinforcementFrameConcretePlacementContextKey =
  (typeof REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS)[number]["contextKey"];

export const REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "reinforcement-frame-concrete-placement",
  contract: "rik-expo-app.reinforcement-frame-concrete-placement-r1",
  guideVersion: "reinforcement-frame-concrete-placement-r1",
  projectApplicabilityRu:
    "Значение относится к конкретной захватке бетонирования подготовленного армокаркаса и не выводится из универсальной нормы.",
  sourceIdPrefix: "reinforcement-frame-concrete-placement",
  compilerVersion: "canonical-estimate-compiler.reinforcement-frame-concrete-placement-r1",
  errorPrefix: "REINFORCEMENT_FRAME_CONCRETE",
  catalogIds: REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ConcretePlacementFamilyDescriptorR1);

export const REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS =
  CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS_R1;
export const REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_PARAMETERS =
  createConcretePlacementParametersR1(REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_DESCRIPTOR);
export const REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_FORMULAS =
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS;
export const REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_RESOURCES =
  createConcretePlacementResourcesR1(REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_DESCRIPTOR);
export const REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_SOURCE_METADATA =
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
ReinforcementFrameConcretePlacementContextKey,
Readonly<Record<string, ConcretePlacementInputValueR1>>
>> = Object.freeze({
  standard: { plan_dimension_concrete_volume_m3: 12, curing_membrane_area_m2: 58, placement_worker_h: 48, finishing_worker_h: 28, curing_worker_h: 14, pump_machine_h: 3.5, deep_vibrator_machine_h: 7, concrete_delivery_distance_km: 24 },
  high_load: { plan_dimension_concrete_volume_m3: 30, curing_membrane_area_m2: 0, placement_worker_h: 112, finishing_worker_h: 60, curing_worker_h: 32, pump_machine_h: 7, deep_vibrator_machine_h: 14, concrete_delivery_distance_km: 36, selected_contingency_percent: 10, curing_method: "water", winter_mode: true, winter_heating_cable_m: 280, winter_heating_worker_h: 34, heating_transformer_machine_h: 28 },
  large_area: { plan_dimension_concrete_volume_m3: 64, curing_membrane_area_m2: 290, placement_worker_h: 232, finishing_worker_h: 122, curing_worker_h: 64, pump_machine_h: 14, deep_vibrator_machine_h: 28, concrete_delivery_distance_km: 44, selected_contingency_percent: 8, quality_control_document_count: 2 },
  repair: { plan_dimension_concrete_volume_m3: 5, curing_membrane_area_m2: 0, placement_worker_h: 24, finishing_worker_h: 14, curing_worker_h: 8, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 3.5, concrete_delivery_distance_km: 14, curing_method: "water", selected_contingency_percent: 4 },
  small_area: { plan_dimension_concrete_volume_m3: 4, curing_membrane_area_m2: 20, placement_worker_h: 18, finishing_worker_h: 10, curing_worker_h: 6, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 2.5, concrete_delivery_distance_km: 11, selected_contingency_percent: 4 },
  technical_room: { plan_dimension_concrete_volume_m3: 10, curing_membrane_area_m2: 0, placement_worker_h: 42, finishing_worker_h: 24, curing_worker_h: 13, placement_method: "crane_bucket", pump_machine_h: 0, crane_bucket_machine_h: 6, deep_vibrator_machine_h: 6, concrete_delivery_distance_km: 20, curing_method: "water", selected_contingency_percent: 5 },
  wet_zone: { plan_dimension_concrete_volume_m3: 20, curing_membrane_area_m2: 94, placement_worker_h: 78, finishing_worker_h: 44, curing_worker_h: 23, pump_machine_h: 5, deep_vibrator_machine_h: 11, concrete_delivery_distance_km: 30, selected_contingency_percent: 7, watertightness: "W8", quality_control_document_count: 2 },
});

export function reinforcementFrameConcretePlacementAcceptanceInputR1(
  contextKey: ReinforcementFrameConcretePlacementContextKey,
): Readonly<Record<string, ConcretePlacementInputValueR1>> {
  const target = REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(
    `REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_CONTEXT_UNSUPPORTED:${contextKey}`,
  );
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    plan_volume_calculation_reference: `RF-POUR-${reference}-VOLUME-REV-A`,
    mix_design_or_project_specification_reference: `RF-POUR-${reference}-MIX-B25-REV-A`,
    mixture_designation: `B25 ${contextKey === "wet_zone" ? "W8" : "W6"} F150 P4`,
    placement_location: `Подготовленный армокаркас; ${target.contextRu}; захватка RF-POUR-${reference}`,
    contingency_selection_justification: `Резерв подтверждён сметчиком для захватки RF-POUR-${reference}`,
    delivery_schedule_and_truck_capacity: `График RF-POUR-${reference}; автобетоносмесители до 8 м³`,
    producer_order_confirmation: `RMC-RF-POUR-${reference}-CONFIRMED`,
    estimator_approval_reference: `EST-RF-POUR-${reference}-REV-A`,
  });
}

export async function compileReinforcementFrameConcretePlacementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileConcretePlacementFamilyR1(submittedParameters, {
    descriptor: REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS[0].catalogId,
    parameters: REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_PARAMETERS,
    resources: REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_RESOURCES,
  });
}
