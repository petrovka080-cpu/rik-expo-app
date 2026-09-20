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

export const SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard", titleRu: "Бетонирование плитного фундамента в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_high_load", titleRu: "Бетонирование плитного фундамента для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_large_area", titleRu: "Бетонирование плитного фундамента на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair", titleRu: "Бетонирование плитного фундамента с локальным ремонтом основания", contextRu: "локальный ремонт основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_small_area", titleRu: "Бетонирование плитного фундамента на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_technical_room", titleRu: "Бетонирование плитного фундамента в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_wet_zone", titleRu: "Бетонирование плитного фундамента во влажной зоне", contextRu: "влажная зона" },
] as const);

export type SlabFoundationConcretePlacementContextKey =
  (typeof SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS)[number]["contextKey"];

export const SLAB_FOUNDATION_CONCRETE_PLACEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "slab-foundation-concrete-placement",
  contract: "rik-expo-app.slab-foundation-concrete-placement-r1",
  guideVersion: "slab-foundation-concrete-placement-r1",
  projectApplicabilityRu:
    "Значение относится к конкретной захватке плитного фундамента и не выводится из универсальной нормы.",
  sourceIdPrefix: "slab-foundation-concrete-placement",
  compilerVersion: "canonical-estimate-compiler.slab-foundation-concrete-placement-r1",
  errorPrefix: "SLAB_FOUNDATION_CONCRETE",
  catalogIds: SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ConcretePlacementFamilyDescriptorR1);

export const SLAB_FOUNDATION_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS =
  CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS_R1;
export const SLAB_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS =
  createConcretePlacementParametersR1(SLAB_FOUNDATION_CONCRETE_PLACEMENT_DESCRIPTOR);
export const SLAB_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS = STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS;
export const SLAB_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES =
  createConcretePlacementResourcesR1(SLAB_FOUNDATION_CONCRETE_PLACEMENT_DESCRIPTOR);
export const SLAB_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA = CONCRETE_PLACEMENT_SOURCE_METADATA_R1;

const BASE_INPUT: Readonly<Record<string, ConcretePlacementInputValueR1>> = Object.freeze({
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  concrete_class: "B25",
  watertightness: "W6",
  frost_resistance: "F150",
  mobility: "P4",
  placement_method: "pump",
  selected_contingency_percent: 7,
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
SlabFoundationConcretePlacementContextKey,
Readonly<Record<string, ConcretePlacementInputValueR1>>
>> = Object.freeze({
  standard: { plan_dimension_concrete_volume_m3: 30, curing_membrane_area_m2: 120, placement_worker_h: 68, finishing_worker_h: 30, curing_worker_h: 18, pump_machine_h: 7, deep_vibrator_machine_h: 11, concrete_delivery_distance_km: 22 },
  high_load: { plan_dimension_concrete_volume_m3: 80, curing_membrane_area_m2: 0, placement_worker_h: 168, finishing_worker_h: 70, curing_worker_h: 42, pump_machine_h: 17, deep_vibrator_machine_h: 27, concrete_delivery_distance_km: 38, selected_contingency_percent: 10, curing_method: "water", winter_mode: true, winter_heating_cable_m: 520, winter_heating_worker_h: 64, heating_transformer_machine_h: 52 },
  large_area: { plan_dimension_concrete_volume_m3: 160, curing_membrane_area_m2: 620, placement_worker_h: 320, finishing_worker_h: 138, curing_worker_h: 82, pump_machine_h: 32, deep_vibrator_machine_h: 50, concrete_delivery_distance_km: 46, selected_contingency_percent: 8, quality_control_document_count: 3 },
  repair: { plan_dimension_concrete_volume_m3: 10, curing_membrane_area_m2: 0, placement_worker_h: 30, finishing_worker_h: 14, curing_worker_h: 9, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 5, concrete_delivery_distance_km: 15, curing_method: "water", selected_contingency_percent: 4 },
  small_area: { plan_dimension_concrete_volume_m3: 8, curing_membrane_area_m2: 34, placement_worker_h: 24, finishing_worker_h: 11, curing_worker_h: 8, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 4, concrete_delivery_distance_km: 11, selected_contingency_percent: 4 },
  technical_room: { plan_dimension_concrete_volume_m3: 24, curing_membrane_area_m2: 0, placement_worker_h: 64, finishing_worker_h: 28, curing_worker_h: 17, placement_method: "crane_bucket", pump_machine_h: 0, crane_bucket_machine_h: 12, deep_vibrator_machine_h: 10, concrete_delivery_distance_km: 21, curing_method: "water", selected_contingency_percent: 5 },
  wet_zone: { plan_dimension_concrete_volume_m3: 52, curing_membrane_area_m2: 210, placement_worker_h: 116, finishing_worker_h: 50, curing_worker_h: 30, pump_machine_h: 12, deep_vibrator_machine_h: 18, concrete_delivery_distance_km: 30, selected_contingency_percent: 7, watertightness: "W8", quality_control_document_count: 2 },
});

export function slabFoundationConcretePlacementAcceptanceInputR1(
  contextKey: SlabFoundationConcretePlacementContextKey,
): Readonly<Record<string, ConcretePlacementInputValueR1>> {
  const target = SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`SLAB_FOUNDATION_CONCRETE_PLACEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    plan_volume_calculation_reference: `SFSLAB-POUR-${reference}-VOLUME-REV-A`,
    mix_design_or_project_specification_reference: `SFSLAB-POUR-${reference}-MIX-B25-REV-A`,
    mixture_designation: `B25 ${contextKey === "wet_zone" ? "W8" : "W6"} F150 P4`,
    placement_location: `Плитный фундамент; ${target.contextRu}; захватка SFSLAB-POUR-${reference}`,
    contingency_selection_justification: `Резерв подтверждён сметчиком для захватки SFSLAB-POUR-${reference}`,
    delivery_schedule_and_truck_capacity: `График SFSLAB-POUR-${reference}; автобетоносмесители до 8 м³`,
    producer_order_confirmation: `RMC-SFSLAB-POUR-${reference}-CONFIRMED`,
    estimator_approval_reference: `EST-SFSLAB-POUR-${reference}-REV-A`,
  });
}

export async function compileSlabFoundationConcretePlacementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileConcretePlacementFamilyR1(submittedParameters, {
    descriptor: SLAB_FOUNDATION_CONCRETE_PLACEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS[0].catalogId,
    parameters: SLAB_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS,
    resources: SLAB_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES,
  });
}
