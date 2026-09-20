import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  buildRoadworksWaveAAdmissionLedgerR6,
  type RoadworksWaveAAdmissionPolicyR6,
} from "../../../src/lib/estimate/v4/roadworks";
import type { R555AsphaltDefinition } from "../r555/asphaltCanonicalDefinitionsR555";

export const R6_ASPHALT_WAVE_A_ADMISSION_SUCCESSOR_CONTRACT =
  "rik-expo-app.r4-a13-6.asphalt-wave-a-runtime-admission-successor.v1" as const;

export type R6AsphaltWaveAAdmissionDefinition = {
  catalogId: string;
  canonicalTechnologyId: string;
  validationInputValues: Readonly<Record<string, string | number | boolean>>;
  inputClassification: Readonly<Record<string, "DERIVED" | "VALIDATION_FIXTURE">>;
  runtimeParameters: Readonly<Record<string, string | number | boolean>>;
  policyByParameterId: Readonly<Record<string, RoadworksWaveAAdmissionPolicyR6>>;
  userOrProjectParameterIds: readonly string[];
  sourceConfirmationParameterIds: readonly string[];
  derivedParameterIds: readonly string[];
};

const waveAWorkIds = new Set(RoadworksWaveAInventory.map((entry) => entry.workId));

export function isR6AsphaltWaveAAdmissionTarget(
  definition: Pick<R555AsphaltDefinition, "canonicalTechnologyId">,
): boolean {
  return waveAWorkIds.has(definition.canonicalTechnologyId);
}

export function buildR6AsphaltWaveAAdmissionDefinition(
  definition: R555AsphaltDefinition,
): R6AsphaltWaveAAdmissionDefinition | null {
  if (!isR6AsphaltWaveAAdmissionTarget(definition)) return null;
  const ledger = buildRoadworksWaveAAdmissionLedgerR6(definition.canonicalTechnologyId);
  const declared = new Set(definition.parameters.map((parameter) => parameter.parameterId));
  if (ledger.length !== declared.size || ledger.some((policy) => !declared.has(policy.parameterId))) {
    throw new Error(`R6_ASPHALT_WAVE_A_SCHEMA_DRIFT:${definition.catalogId}`);
  }
  const policyByParameterId = Object.fromEntries(
    ledger.map((policy) => [policy.parameterId, policy]),
  ) as Record<string, RoadworksWaveAAdmissionPolicyR6>;
  const validationInputValues = Object.fromEntries(ledger.map((policy) => {
    const fixtureValue = definition.baseline[policy.parameterId]
      ?? DEFAULT_ROADWORKS_WAVE_A_INPUTS[policy.parameterId];
    const value = policy.runtimeValue ?? fixtureValue;
    if (value == null) {
      throw new Error(`R6_ASPHALT_WAVE_A_FIXTURE_VALUE_MISSING:${definition.catalogId}:${policy.parameterId}`);
    }
    return [policy.parameterId, value];
  })) as Record<string, string | number | boolean>;
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
    catalogId: definition.catalogId,
    canonicalTechnologyId: definition.canonicalTechnologyId,
    validationInputValues: Object.freeze(validationInputValues),
    inputClassification: Object.freeze(inputClassification),
    runtimeParameters: Object.freeze(runtimeParameters),
    policyByParameterId: Object.freeze(policyByParameterId),
    userOrProjectParameterIds: Object.freeze(ledger
      .filter((policy) => policy.visibilityRole === "USER_INPUT")
      .map((policy) => policy.parameterId)),
    sourceConfirmationParameterIds: Object.freeze(ledger
      .filter((policy) => policy.requiresSourceConfirmation)
      .map((policy) => policy.parameterId)),
    derivedParameterIds: Object.freeze(ledger
      .filter((policy) => policy.baselineClassification === "DERIVED")
      .map((policy) => policy.parameterId)),
  });
}

export function buildAllR6AsphaltWaveAAdmissionDefinitions(
  definitions: readonly R555AsphaltDefinition[],
): readonly R6AsphaltWaveAAdmissionDefinition[] {
  const targets = definitions
    .map(buildR6AsphaltWaveAAdmissionDefinition)
    .filter((entry): entry is R6AsphaltWaveAAdmissionDefinition => entry != null)
    .sort((left, right) => left.catalogId.localeCompare(right.catalogId));
  if (targets.length !== RoadworksWaveAInventory.length) {
    throw new Error(`R6_ASPHALT_WAVE_A_TARGET_COUNT:${targets.length}:${RoadworksWaveAInventory.length}`);
  }
  return Object.freeze(targets);
}
