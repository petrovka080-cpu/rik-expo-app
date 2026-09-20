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

export const BELT_CONCRETE_PLACEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_belt_pour_standard", titleRu: "Бетонирование монолитного пояса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_belt_pour_high_load", titleRu: "Бетонирование монолитного пояса для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_pour_large_area", titleRu: "Бетонирование монолитного пояса на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_belt_pour_repair", titleRu: "Бетонирование монолитного пояса с локальным ремонтом основания", contextRu: "локальный ремонт основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_pour_small_area", titleRu: "Бетонирование монолитного пояса на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_belt_pour_technical_room", titleRu: "Бетонирование монолитного пояса в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_belt_pour_wet_zone", titleRu: "Бетонирование монолитного пояса во влажной зоне", contextRu: "влажная зона" },
] as const);

export type BeltConcretePlacementContextKey =
  (typeof BELT_CONCRETE_PLACEMENT_TARGETS)[number]["contextKey"];

export const BELT_CONCRETE_PLACEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "belt-concrete-placement",
  contract: "rik-expo-app.belt-concrete-placement-r1",
  guideVersion: "belt-concrete-placement-r1",
  projectApplicabilityRu:
    "Значение относится к конкретной захватке монолитного пояса и не выводится из универсальной нормы.",
  sourceIdPrefix: "belt-concrete-placement",
  compilerVersion: "canonical-estimate-compiler.belt-concrete-placement-r1",
  errorPrefix: "BELT_CONCRETE",
  catalogIds: BELT_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ConcretePlacementFamilyDescriptorR1);

export const BELT_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS =
  CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS_R1;
export const BELT_CONCRETE_PLACEMENT_PARAMETERS =
  createConcretePlacementParametersR1(BELT_CONCRETE_PLACEMENT_DESCRIPTOR);
export const BELT_CONCRETE_PLACEMENT_FORMULAS = STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS;
export const BELT_CONCRETE_PLACEMENT_RESOURCES =
  createConcretePlacementResourcesR1(BELT_CONCRETE_PLACEMENT_DESCRIPTOR);
export const BELT_CONCRETE_PLACEMENT_SOURCE_METADATA = CONCRETE_PLACEMENT_SOURCE_METADATA_R1;

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
BeltConcretePlacementContextKey,
Readonly<Record<string, ConcretePlacementInputValueR1>>
>> = Object.freeze({
  standard: { plan_dimension_concrete_volume_m3: 6, curing_membrane_area_m2: 18, placement_worker_h: 18, finishing_worker_h: 6, curing_worker_h: 5, pump_machine_h: 2, deep_vibrator_machine_h: 3, concrete_delivery_distance_km: 21 },
  high_load: { plan_dimension_concrete_volume_m3: 14, curing_membrane_area_m2: 0, placement_worker_h: 40, finishing_worker_h: 11, curing_worker_h: 9, pump_machine_h: 4, deep_vibrator_machine_h: 7, concrete_delivery_distance_km: 32, selected_contingency_percent: 10, curing_method: "water", winter_mode: true, winter_heating_cable_m: 132, winter_heating_worker_h: 16, heating_transformer_machine_h: 14 },
  large_area: { plan_dimension_concrete_volume_m3: 28, curing_membrane_area_m2: 80, placement_worker_h: 72, finishing_worker_h: 21, curing_worker_h: 17, pump_machine_h: 6, deep_vibrator_machine_h: 12, concrete_delivery_distance_km: 39, selected_contingency_percent: 8, quality_control_document_count: 2 },
  repair: { plan_dimension_concrete_volume_m3: 3, curing_membrane_area_m2: 0, placement_worker_h: 12, finishing_worker_h: 4, curing_worker_h: 4, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 2, concrete_delivery_distance_km: 12, curing_method: "water", selected_contingency_percent: 4 },
  small_area: { plan_dimension_concrete_volume_m3: 2, curing_membrane_area_m2: 7, placement_worker_h: 8, finishing_worker_h: 3, curing_worker_h: 3, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 1, concrete_delivery_distance_km: 8, selected_contingency_percent: 4 },
  technical_room: { plan_dimension_concrete_volume_m3: 5, curing_membrane_area_m2: 0, placement_worker_h: 16, finishing_worker_h: 5, curing_worker_h: 4, placement_method: "crane_bucket", pump_machine_h: 0, crane_bucket_machine_h: 3, deep_vibrator_machine_h: 3, concrete_delivery_distance_km: 18, curing_method: "water", selected_contingency_percent: 5 },
  wet_zone: { plan_dimension_concrete_volume_m3: 9, curing_membrane_area_m2: 28, placement_worker_h: 25, finishing_worker_h: 8, curing_worker_h: 7, pump_machine_h: 3, deep_vibrator_machine_h: 5, concrete_delivery_distance_km: 26, selected_contingency_percent: 7, watertightness: "W8", quality_control_document_count: 2 },
});

export function beltConcretePlacementAcceptanceInputR1(
  contextKey: BeltConcretePlacementContextKey,
): Readonly<Record<string, ConcretePlacementInputValueR1>> {
  const target = BELT_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`BELT_CONCRETE_PLACEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    plan_volume_calculation_reference: `BELT-POUR-${reference}-VOLUME-REV-A`,
    mix_design_or_project_specification_reference: `BELT-POUR-${reference}-MIX-B25-REV-A`,
    mixture_designation: `B25 ${contextKey === "wet_zone" ? "W8" : "W6"} F150 P4`,
    placement_location: `Монолитный пояс; ${target.contextRu}; захватка BELT-POUR-${reference}`,
    contingency_selection_justification: `Резерв подтверждён сметчиком для захватки BELT-POUR-${reference}`,
    delivery_schedule_and_truck_capacity: `График BELT-POUR-${reference}; автобетоносмесители до 8 м³`,
    producer_order_confirmation: `RMC-BELT-POUR-${reference}-CONFIRMED`,
    estimator_approval_reference: `EST-BELT-POUR-${reference}-REV-A`,
  });
}

export async function compileBeltConcretePlacementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileConcretePlacementFamilyR1(submittedParameters, {
    descriptor: BELT_CONCRETE_PLACEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? BELT_CONCRETE_PLACEMENT_TARGETS[0].catalogId,
    parameters: BELT_CONCRETE_PLACEMENT_PARAMETERS,
    resources: BELT_CONCRETE_PLACEMENT_RESOURCES,
  });
}
