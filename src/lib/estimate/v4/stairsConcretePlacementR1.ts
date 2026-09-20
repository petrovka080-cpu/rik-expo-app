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

export const STAIRS_CONCRETE_PLACEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_standard", titleRu: "Бетонирование бетонной лестницы в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_high_load", titleRu: "Бетонирование бетонной лестницы для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_large_area", titleRu: "Бетонирование бетонной лестницы на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_repair", titleRu: "Бетонирование бетонной лестницы с локальным ремонтом основания", contextRu: "локальный ремонт основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_small_area", titleRu: "Бетонирование бетонной лестницы на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_technical_room", titleRu: "Бетонирование бетонной лестницы в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_wet_zone", titleRu: "Бетонирование бетонной лестницы во влажной зоне", contextRu: "влажная зона" },
] as const);

export type StairsConcretePlacementContextKey =
  (typeof STAIRS_CONCRETE_PLACEMENT_TARGETS)[number]["contextKey"];

export const STAIRS_CONCRETE_PLACEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "stairs-concrete-placement",
  contract: "rik-expo-app.stairs-concrete-placement-r1",
  guideVersion: "stairs-concrete-placement-r1",
  projectApplicabilityRu:
    "Значение относится к конкретной захватке бетонной лестницы и не выводится из универсальной нормы.",
  sourceIdPrefix: "stairs-concrete-placement",
  compilerVersion: "canonical-estimate-compiler.stairs-concrete-placement-r1",
  errorPrefix: "STAIRS_CONCRETE",
  catalogIds: STAIRS_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ConcretePlacementFamilyDescriptorR1);

export const STAIRS_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS =
  CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS_R1;
export const STAIRS_CONCRETE_PLACEMENT_PARAMETERS =
  createConcretePlacementParametersR1(STAIRS_CONCRETE_PLACEMENT_DESCRIPTOR);
export const STAIRS_CONCRETE_PLACEMENT_FORMULAS = STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS;
export const STAIRS_CONCRETE_PLACEMENT_RESOURCES =
  createConcretePlacementResourcesR1(STAIRS_CONCRETE_PLACEMENT_DESCRIPTOR);
export const STAIRS_CONCRETE_PLACEMENT_SOURCE_METADATA = CONCRETE_PLACEMENT_SOURCE_METADATA_R1;

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
StairsConcretePlacementContextKey,
Readonly<Record<string, ConcretePlacementInputValueR1>>
>> = Object.freeze({
  standard: { plan_dimension_concrete_volume_m3: 10, curing_membrane_area_m2: 48, placement_worker_h: 42, finishing_worker_h: 24, curing_worker_h: 12, pump_machine_h: 3, deep_vibrator_machine_h: 6, concrete_delivery_distance_km: 23 },
  high_load: { plan_dimension_concrete_volume_m3: 25, curing_membrane_area_m2: 0, placement_worker_h: 96, finishing_worker_h: 50, curing_worker_h: 26, pump_machine_h: 6, deep_vibrator_machine_h: 12, concrete_delivery_distance_km: 35, selected_contingency_percent: 10, curing_method: "water", winter_mode: true, winter_heating_cable_m: 230, winter_heating_worker_h: 29, heating_transformer_machine_h: 24 },
  large_area: { plan_dimension_concrete_volume_m3: 50, curing_membrane_area_m2: 230, placement_worker_h: 184, finishing_worker_h: 96, curing_worker_h: 50, pump_machine_h: 11, deep_vibrator_machine_h: 22, concrete_delivery_distance_km: 42, selected_contingency_percent: 8, quality_control_document_count: 2 },
  repair: { plan_dimension_concrete_volume_m3: 4, curing_membrane_area_m2: 0, placement_worker_h: 20, finishing_worker_h: 12, curing_worker_h: 7, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 3, concrete_delivery_distance_km: 13, curing_method: "water", selected_contingency_percent: 4 },
  small_area: { plan_dimension_concrete_volume_m3: 3, curing_membrane_area_m2: 16, placement_worker_h: 15, finishing_worker_h: 9, curing_worker_h: 5, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 2, concrete_delivery_distance_km: 10, selected_contingency_percent: 4 },
  technical_room: { plan_dimension_concrete_volume_m3: 8, curing_membrane_area_m2: 0, placement_worker_h: 36, finishing_worker_h: 20, curing_worker_h: 11, placement_method: "crane_bucket", pump_machine_h: 0, crane_bucket_machine_h: 5, deep_vibrator_machine_h: 5, concrete_delivery_distance_km: 19, curing_method: "water", selected_contingency_percent: 5 },
  wet_zone: { plan_dimension_concrete_volume_m3: 16, curing_membrane_area_m2: 76, placement_worker_h: 66, finishing_worker_h: 36, curing_worker_h: 19, pump_machine_h: 4, deep_vibrator_machine_h: 9, concrete_delivery_distance_km: 28, selected_contingency_percent: 7, watertightness: "W8", quality_control_document_count: 2 },
});

export function stairsConcretePlacementAcceptanceInputR1(
  contextKey: StairsConcretePlacementContextKey,
): Readonly<Record<string, ConcretePlacementInputValueR1>> {
  const target = STAIRS_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`STAIRS_CONCRETE_PLACEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    plan_volume_calculation_reference: `STAIR-POUR-${reference}-VOLUME-REV-A`,
    mix_design_or_project_specification_reference: `STAIR-POUR-${reference}-MIX-B25-REV-A`,
    mixture_designation: `B25 ${contextKey === "wet_zone" ? "W8" : "W6"} F150 P4`,
    placement_location: `Бетонная лестница; ${target.contextRu}; захватка STAIR-POUR-${reference}`,
    contingency_selection_justification: `Резерв подтверждён сметчиком для захватки STAIR-POUR-${reference}`,
    delivery_schedule_and_truck_capacity: `График STAIR-POUR-${reference}; автобетоносмесители до 8 м³`,
    producer_order_confirmation: `RMC-STAIR-POUR-${reference}-CONFIRMED`,
    estimator_approval_reference: `EST-STAIR-POUR-${reference}-REV-A`,
  });
}

export async function compileStairsConcretePlacementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileConcretePlacementFamilyR1(submittedParameters, {
    descriptor: STAIRS_CONCRETE_PLACEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? STAIRS_CONCRETE_PLACEMENT_TARGETS[0].catalogId,
    parameters: STAIRS_CONCRETE_PLACEMENT_PARAMETERS,
    resources: STAIRS_CONCRETE_PLACEMENT_RESOURCES,
  });
}
