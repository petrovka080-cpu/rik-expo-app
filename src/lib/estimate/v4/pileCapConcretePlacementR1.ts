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

export const PILE_CAP_CONCRETE_PLACEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_pour_standard", titleRu: "Бетонирование ростверка в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_pour_high_load", titleRu: "Бетонирование ростверка для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_pour_large_area", titleRu: "Бетонирование ростверка на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_pour_repair", titleRu: "Бетонирование ростверка с локальным ремонтом основания", contextRu: "локальный ремонт основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_pour_small_area", titleRu: "Бетонирование ростверка на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_pour_technical_room", titleRu: "Бетонирование ростверка в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_pour_wet_zone", titleRu: "Бетонирование ростверка во влажной зоне", contextRu: "влажная зона" },
] as const);

export type PileCapConcretePlacementContextKey =
  (typeof PILE_CAP_CONCRETE_PLACEMENT_TARGETS)[number]["contextKey"];

export const PILE_CAP_CONCRETE_PLACEMENT_DESCRIPTOR = Object.freeze({
  ownerKey: "pile-cap-concrete-placement",
  contract: "rik-expo-app.pile-cap-concrete-placement-r1",
  guideVersion: "pile-cap-concrete-placement-r1",
  projectApplicabilityRu:
    "Значение относится к конкретной захватке ростверка и не выводится из универсальной нормы.",
  sourceIdPrefix: "pile-cap-concrete-placement",
  compilerVersion: "canonical-estimate-compiler.pile-cap-concrete-placement-r1",
  errorPrefix: "PILE_CAP_CONCRETE",
  catalogIds: PILE_CAP_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
} satisfies ConcretePlacementFamilyDescriptorR1);

export const PILE_CAP_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS =
  CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS_R1;
export const PILE_CAP_CONCRETE_PLACEMENT_PARAMETERS =
  createConcretePlacementParametersR1(PILE_CAP_CONCRETE_PLACEMENT_DESCRIPTOR);
export const PILE_CAP_CONCRETE_PLACEMENT_FORMULAS = STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS;
export const PILE_CAP_CONCRETE_PLACEMENT_RESOURCES =
  createConcretePlacementResourcesR1(PILE_CAP_CONCRETE_PLACEMENT_DESCRIPTOR);
export const PILE_CAP_CONCRETE_PLACEMENT_SOURCE_METADATA = CONCRETE_PLACEMENT_SOURCE_METADATA_R1;

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
PileCapConcretePlacementContextKey,
Readonly<Record<string, ConcretePlacementInputValueR1>>
>> = Object.freeze({
  standard: { plan_dimension_concrete_volume_m3: 14, curing_membrane_area_m2: 35, placement_worker_h: 36, finishing_worker_h: 10, curing_worker_h: 9, pump_machine_h: 3, deep_vibrator_machine_h: 5, concrete_delivery_distance_km: 24 },
  high_load: { plan_dimension_concrete_volume_m3: 32, curing_membrane_area_m2: 0, placement_worker_h: 76, finishing_worker_h: 19, curing_worker_h: 16, pump_machine_h: 7, deep_vibrator_machine_h: 11, concrete_delivery_distance_km: 36, selected_contingency_percent: 10, curing_method: "water", winter_mode: true, winter_heating_cable_m: 268, winter_heating_worker_h: 31, heating_transformer_machine_h: 27 },
  large_area: { plan_dimension_concrete_volume_m3: 60, curing_membrane_area_m2: 148, placement_worker_h: 136, finishing_worker_h: 39, curing_worker_h: 31, pump_machine_h: 12, deep_vibrator_machine_h: 20, concrete_delivery_distance_km: 44, selected_contingency_percent: 8, quality_control_document_count: 2 },
  repair: { plan_dimension_concrete_volume_m3: 5, curing_membrane_area_m2: 0, placement_worker_h: 18, finishing_worker_h: 6, curing_worker_h: 5, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 3, concrete_delivery_distance_km: 14, curing_method: "water", selected_contingency_percent: 4 },
  small_area: { plan_dimension_concrete_volume_m3: 3.5, curing_membrane_area_m2: 9, placement_worker_h: 12, finishing_worker_h: 4, curing_worker_h: 4, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 2, concrete_delivery_distance_km: 10, selected_contingency_percent: 4 },
  technical_room: { plan_dimension_concrete_volume_m3: 9, curing_membrane_area_m2: 0, placement_worker_h: 27, finishing_worker_h: 8, curing_worker_h: 7, placement_method: "crane_bucket", pump_machine_h: 0, crane_bucket_machine_h: 5, deep_vibrator_machine_h: 5, concrete_delivery_distance_km: 20, curing_method: "water", selected_contingency_percent: 5 },
  wet_zone: { plan_dimension_concrete_volume_m3: 18, curing_membrane_area_m2: 46, placement_worker_h: 45, finishing_worker_h: 14, curing_worker_h: 12, pump_machine_h: 5, deep_vibrator_machine_h: 7, concrete_delivery_distance_km: 29, selected_contingency_percent: 7, watertightness: "W8", quality_control_document_count: 2 },
});

export function pileCapConcretePlacementAcceptanceInputR1(
  contextKey: PileCapConcretePlacementContextKey,
): Readonly<Record<string, ConcretePlacementInputValueR1>> {
  const target = PILE_CAP_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PILE_CAP_CONCRETE_PLACEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    plan_volume_calculation_reference: `PC-POUR-${reference}-VOLUME-REV-A`,
    mix_design_or_project_specification_reference: `PC-POUR-${reference}-MIX-B25-REV-A`,
    mixture_designation: `B25 ${contextKey === "wet_zone" ? "W8" : "W6"} F150 P4`,
    placement_location: `Ростверк; ${target.contextRu}; захватка PC-POUR-${reference}`,
    contingency_selection_justification: `Резерв подтверждён сметчиком для захватки PC-POUR-${reference}`,
    delivery_schedule_and_truck_capacity: `График PC-POUR-${reference}; автобетоносмесители до 8 м³`,
    producer_order_confirmation: `RMC-PC-POUR-${reference}-CONFIRMED`,
    estimator_approval_reference: `EST-PC-POUR-${reference}-REV-A`,
  });
}

export async function compilePileCapConcretePlacementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileConcretePlacementFamilyR1(submittedParameters, {
    descriptor: PILE_CAP_CONCRETE_PLACEMENT_DESCRIPTOR,
    catalogId: options.catalogId ?? PILE_CAP_CONCRETE_PLACEMENT_TARGETS[0].catalogId,
    parameters: PILE_CAP_CONCRETE_PLACEMENT_PARAMETERS,
    resources: PILE_CAP_CONCRETE_PLACEMENT_RESOURCES,
  });
}
