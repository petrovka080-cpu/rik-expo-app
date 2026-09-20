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

export const COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_pour_standard",
    titleRu: "Бетонирование столбчатого основания в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_pour_high_load",
    titleRu: "Бетонирование столбчатого основания для высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "large_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_pour_large_area",
    titleRu: "Бетонирование столбчатого основания на большой площади",
    contextRu: "большая площадь",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_pour_repair",
    titleRu: "Бетонирование столбчатого основания с локальным ремонтом основания",
    contextRu: "локальный ремонт основания",
  },
  {
    contextKey: "small_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_pour_small_area",
    titleRu: "Бетонирование столбчатого основания на малой площади",
    contextRu: "малая площадь",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_pour_technical_room",
    titleRu: "Бетонирование столбчатого основания в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_pour_wet_zone",
    titleRu: "Бетонирование столбчатого основания во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type ColumnBaseConcretePlacementContextKey =
  (typeof COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS)[number]["contextKey"];

export const COLUMN_BASE_CONCRETE_PLACEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "column-base-concrete-placement",
  contract: "rik-expo-app.column-base-concrete-placement-r1",
  guideVersion: "column-base-concrete-placement-r1",
  projectApplicabilityRu:
    "Значение относится к конкретной захватке столбчатого основания и не выводится из универсальной нормы.",
  sourceIdPrefix: "column-base-concrete-placement",
  compilerVersion: "canonical-estimate-compiler.column-base-concrete-placement-r1",
  errorPrefix: "COLUMN_BASE_CONCRETE",
  catalogIds: COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ConcretePlacementFamilyDescriptorR1);

export const COLUMN_BASE_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS =
  CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS_R1;
export const COLUMN_BASE_CONCRETE_PLACEMENT_PARAMETERS =
  createConcretePlacementParametersR1(COLUMN_BASE_CONCRETE_PLACEMENT_DESCRIPTOR);
export const COLUMN_BASE_CONCRETE_PLACEMENT_FORMULAS =
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS;
export const COLUMN_BASE_CONCRETE_PLACEMENT_RESOURCES =
  createConcretePlacementResourcesR1(COLUMN_BASE_CONCRETE_PLACEMENT_DESCRIPTOR);
export const COLUMN_BASE_CONCRETE_PLACEMENT_SOURCE_METADATA =
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
ColumnBaseConcretePlacementContextKey,
Readonly<Record<string, ConcretePlacementInputValueR1>>
>> = Object.freeze({
  standard: { plan_dimension_concrete_volume_m3: 7, curing_membrane_area_m2: 15, placement_worker_h: 19, finishing_worker_h: 6, curing_worker_h: 5, pump_machine_h: 2, deep_vibrator_machine_h: 3, concrete_delivery_distance_km: 22 },
  high_load: { plan_dimension_concrete_volume_m3: 16, curing_membrane_area_m2: 0, placement_worker_h: 43, finishing_worker_h: 11, curing_worker_h: 9, pump_machine_h: 4, deep_vibrator_machine_h: 7, concrete_delivery_distance_km: 33, selected_contingency_percent: 10, curing_method: "water", winter_mode: true, winter_heating_cable_m: 138, winter_heating_worker_h: 17, heating_transformer_machine_h: 15 },
  large_area: { plan_dimension_concrete_volume_m3: 30, curing_membrane_area_m2: 66, placement_worker_h: 75, finishing_worker_h: 20, curing_worker_h: 16, pump_machine_h: 6, deep_vibrator_machine_h: 12, concrete_delivery_distance_km: 40, selected_contingency_percent: 8, quality_control_document_count: 2 },
  repair: { plan_dimension_concrete_volume_m3: 3.5, curing_membrane_area_m2: 0, placement_worker_h: 13, finishing_worker_h: 4, curing_worker_h: 4, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 2, concrete_delivery_distance_km: 13, curing_method: "water", selected_contingency_percent: 4 },
  small_area: { plan_dimension_concrete_volume_m3: 2.5, curing_membrane_area_m2: 6, placement_worker_h: 9, finishing_worker_h: 3, curing_worker_h: 3, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 1, concrete_delivery_distance_km: 9, selected_contingency_percent: 4 },
  technical_room: { plan_dimension_concrete_volume_m3: 5.5, curing_membrane_area_m2: 0, placement_worker_h: 17, finishing_worker_h: 5, curing_worker_h: 4, placement_method: "crane_bucket", pump_machine_h: 0, crane_bucket_machine_h: 3, deep_vibrator_machine_h: 3, concrete_delivery_distance_km: 19, curing_method: "water", selected_contingency_percent: 5 },
  wet_zone: { plan_dimension_concrete_volume_m3: 10, curing_membrane_area_m2: 23, placement_worker_h: 27, finishing_worker_h: 8, curing_worker_h: 7, pump_machine_h: 3, deep_vibrator_machine_h: 5, concrete_delivery_distance_km: 27, selected_contingency_percent: 7, watertightness: "W8", quality_control_document_count: 2 },
});

export function columnBaseConcretePlacementAcceptanceInputR1(
  contextKey: ColumnBaseConcretePlacementContextKey,
): Readonly<Record<string, ConcretePlacementInputValueR1>> {
  const target = COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`COLUMN_BASE_CONCRETE_PLACEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    plan_volume_calculation_reference: `CB-POUR-${reference}-VOLUME-REV-A`,
    mix_design_or_project_specification_reference: `CB-POUR-${reference}-MIX-B25-REV-A`,
    mixture_designation: `B25 ${contextKey === "wet_zone" ? "W8" : "W6"} F150 P4`,
    placement_location: `Столбчатое основание; ${target.contextRu}; захватка CB-POUR-${reference}`,
    contingency_selection_justification: `Резерв подтверждён сметчиком для захватки CB-POUR-${reference}`,
    delivery_schedule_and_truck_capacity: `График CB-POUR-${reference}; автобетоносмесители до 8 м³`,
    producer_order_confirmation: `RMC-CB-POUR-${reference}-CONFIRMED`,
    estimator_approval_reference: `EST-CB-POUR-${reference}-REV-A`,
  });
}

export async function compileColumnBaseConcretePlacementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileConcretePlacementFamilyR1(submittedParameters, {
    descriptor: COLUMN_BASE_CONCRETE_PLACEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS[0].catalogId,
    parameters: COLUMN_BASE_CONCRETE_PLACEMENT_PARAMETERS,
    resources: COLUMN_BASE_CONCRETE_PLACEMENT_RESOURCES,
  });
}
