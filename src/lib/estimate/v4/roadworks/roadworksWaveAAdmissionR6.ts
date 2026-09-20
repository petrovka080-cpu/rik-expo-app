import type {
  CanonicalEstimateParameterGuideKind,
  CanonicalEstimateParameterValueSourceRole,
  CanonicalEstimateParameterVisibilityRole,
} from "../../backendPlatform/contracts";
import {
  getRoadworksWaveAParameterDefinitions,
  type RoadworksWaveAInputs,
  type RoadworksWaveAParameterDefinition,
  type RoadworksWaveAParameterKey,
} from "./roadworksWaveA";

export const ROADWORKS_WAVE_A_ADMISSION_CONTRACT_R6 =
  "roadworks-wave-a-runtime-admission:r6.v1" as const;

export type RoadworksWaveAAdmissionPolicyR6 = {
  parameterId: RoadworksWaveAParameterKey;
  sourceRole: RoadworksWaveAParameterDefinition["sourceRole"];
  visibilityRole: CanonicalEstimateParameterVisibilityRole;
  valueSourceRole: CanonicalEstimateParameterValueSourceRole;
  guideKind: CanonicalEstimateParameterGuideKind;
  baselineClassification: "DERIVED" | "VALIDATION_FIXTURE";
  preliminaryCompilationAllowed: boolean;
  requiresSourceConfirmation: boolean;
  runtimeValue: string | number | boolean | null;
  sourceId: string | null;
  sourceVersion: string | null;
};

const PROJECT_QUALITY_OR_ACCEPTANCE_PARAMETER =
  /(?:control_interval|sampling_interval|test_interval|geometry_control_interval|acceptance_lot)/u;
const SELECTED_MACHINE_PRODUCTIVITY_PARAMETER =
  /productivity_.+_per_machine_hour$/u;
const PROJECT_EXECUTION_LABOR_PRODUCTIVITY_PARAMETER =
  /productivity_.+_per_man_hour$/u;
const PROJECT_WASTE_ALLOWANCE_PARAMETER = /(?:^|_)waste_(?:factor|percent)(?:_|$)/u;
const PROJECT_OR_PRODUCT_CONSUMPTION_PARAMETER =
  /(?:emulsion_rate|tack_coat|joint_sealant|primer_rate|marking_(?:glass_beads|material)_rate|(?:^|_)water_rate|water_l_m2|concrete_m3_per_|consumable_kg_|compound_kg_|beads_kg_|compaction_factor)/u;

function technicalValueSourceRole(
  parameterId: string,
): CanonicalEstimateParameterValueSourceRole {
  if (PROJECT_QUALITY_OR_ACCEPTANCE_PARAMETER.test(parameterId)) {
    return "PROJECT_DOCUMENTATION";
  }
  if (SELECTED_MACHINE_PRODUCTIVITY_PARAMETER.test(parameterId)) {
    return "SELECTED_EQUIPMENT_PASSPORT";
  }
  // KRER publishes labor against an exact table variant and its complete work
  // composition, not one portable m2/man-hour constant for these generic or
  // atomic owners.  Until that exact variant is bound, the actual crew output
  // belongs to the object estimate/PPR and must stay an explicit refinement.
  if (PROJECT_EXECUTION_LABOR_PRODUCTIVITY_PARAMETER.test(parameterId)
    || PROJECT_WASTE_ALLOWANCE_PARAMETER.test(parameterId)) {
    return "PROJECT_DOCUMENTATION";
  }
  if (PROJECT_OR_PRODUCT_CONSUMPTION_PARAMETER.test(parameterId)) {
    return "MANUFACTURER_CONFIRMED";
  }
  return "NORM_REQUIRED_BUT_PROJECT_SELECTED";
}

function userOwnedValueSourceRole(
  definition: RoadworksWaveAParameterDefinition,
): CanonicalEstimateParameterValueSourceRole {
  if (definition.key === "area_m2") return "USER_MEASURED";
  switch (definition.sourceRole) {
    case "USER_PROJECT_INPUT":
    case "LOGISTICS_INPUT":
      return "PROJECT_DOCUMENTATION";
    case "PROJECT_DESIGN_INPUT":
    case "EXECUTION_PLAN_INPUT":
      return "ENGINEERING_DESIGN";
    case "MATERIAL_PASSPORT_INPUT":
      return "MANUFACTURER_CONFIRMED";
    case "TECHNICAL_SOURCE_INPUT":
      return technicalValueSourceRole(definition.key);
    case "DERIVED_OPERATION_VALUE":
      return "BACKEND_DERIVED";
  }
}

function guideKind(
  definition: RoadworksWaveAParameterDefinition,
): CanonicalEstimateParameterGuideKind {
  const valueSourceRole = userOwnedValueSourceRole(definition);
  if (valueSourceRole === "PROJECT_DOCUMENTATION"
    || valueSourceRole === "ENGINEERING_DESIGN") return "PROJECT_DEFINED";
  if (valueSourceRole === "SELECTED_EQUIPMENT_PASSPORT"
    || valueSourceRole === "MANUFACTURER_CONFIRMED") return "MANUFACTURER_RANGE";
  switch (definition.sourceRole) {
    case "DERIVED_OPERATION_VALUE":
      return "DERIVED_VALUE_RULE";
    case "MATERIAL_PASSPORT_INPUT":
      return "MANUFACTURER_RANGE";
    case "TECHNICAL_SOURCE_INPUT":
      return "NORMATIVE_RANGE";
    case "USER_PROJECT_INPUT":
      return definition.key === "area_m2" ? "MEASUREMENT_RULE" : "ENUM_DECISION_RULE";
    case "PROJECT_DESIGN_INPUT":
    case "LOGISTICS_INPUT":
    case "EXECUTION_PLAN_INPUT":
      return "PROJECT_DEFINED";
  }
}

export function roadworksWaveAAdmissionPolicyR6(
  definition: RoadworksWaveAParameterDefinition,
): RoadworksWaveAAdmissionPolicyR6 {
  const fixed = definition.sourceFixedBinding;
  if (fixed) {
    return Object.freeze({
      parameterId: definition.key,
      sourceRole: definition.sourceRole,
      visibilityRole: "USER_DERIVED_READONLY",
      valueSourceRole: "BACKEND_DERIVED",
      guideKind: "DERIVED_VALUE_RULE",
      baselineClassification: "DERIVED",
      preliminaryCompilationAllowed: false,
      requiresSourceConfirmation: false,
      runtimeValue: fixed.value,
      sourceId: fixed.sourceId,
      sourceVersion: fixed.sourceVersion,
    });
  }

  const valueSourceRole = userOwnedValueSourceRole(definition);
  const requiresSourceConfirmation = definition.sourceRole === "MATERIAL_PASSPORT_INPUT"
    || definition.sourceRole === "TECHNICAL_SOURCE_INPUT";
  return Object.freeze({
    parameterId: definition.key,
    sourceRole: definition.sourceRole,
    visibilityRole: valueSourceRole === "NORM_REQUIRED_BUT_PROJECT_SELECTED"
      ? "INTERNAL_ONLY"
      : "USER_INPUT",
    valueSourceRole,
    guideKind: guideKind(definition),
    // Compiler examples remain reproducible evidence. They are not permission
    // to apply 50 mm, 2.4 t/m3, 1.03, 0.3 l/m2 or any other fixture value to a
    // new customer object.
    baselineClassification: "VALIDATION_FIXTURE",
    preliminaryCompilationAllowed: true,
    requiresSourceConfirmation,
    runtimeValue: null,
    sourceId: null,
    sourceVersion: null,
  });
}

export function buildRoadworksWaveAAdmissionLedgerR6(
  workId: string,
): readonly RoadworksWaveAAdmissionPolicyR6[] {
  return getRoadworksWaveAParameterDefinitions(workId).map(roadworksWaveAAdmissionPolicyR6);
}

export function buildRoadworksWaveAApprovedBaselineR6(
  workId: string,
  validationFixture: RoadworksWaveAInputs,
): {
  inputValues: Readonly<Record<string, string | number | boolean>>;
  inputClassification: Readonly<Record<string, "DERIVED" | "VALIDATION_FIXTURE">>;
  runtimeParameters: Readonly<Record<string, string | number | boolean>>;
} {
  const ledger = buildRoadworksWaveAAdmissionLedgerR6(workId);
  const inputValues = Object.fromEntries(ledger.map((policy) => [
    policy.parameterId,
    policy.runtimeValue ?? validationFixture[policy.parameterId],
  ])) as Record<string, string | number | boolean>;
  const inputClassification = Object.fromEntries(ledger.map((policy) => [
    policy.parameterId,
    policy.baselineClassification,
  ])) as Record<string, "DERIVED" | "VALIDATION_FIXTURE">;
  const runtimeParameters = Object.fromEntries(ledger.flatMap((policy) =>
    policy.baselineClassification === "DERIVED" && policy.runtimeValue != null
      ? [[policy.parameterId, policy.runtimeValue] as const]
      : []
  ));
  return Object.freeze({
    inputValues: Object.freeze(inputValues),
    inputClassification: Object.freeze(inputClassification),
    runtimeParameters: Object.freeze(runtimeParameters),
  });
}

export function roadworksWaveAParameterRequiresSourceConfirmationR6(
  definition: RoadworksWaveAParameterDefinition,
): boolean {
  return roadworksWaveAAdmissionPolicyR6(definition).requiresSourceConfirmation;
}
