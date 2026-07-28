import { estimateDeterministicHash } from "../estimateDeterministicHash";

export const CANONICAL_PARAMETER_CORE_SCHEMA_VERSION =
  "canonical-parameter-core:2026-07-28.v1" as const;

export type CanonicalParameterValue = number | string | boolean;
export type CanonicalParameterValueType = "number" | "string" | "boolean";
export type CanonicalParameterRequiredLevel =
  | "BLOCKING_REQUIRED"
  | "CONTRACT_REQUIRED"
  | "CONDITIONAL"
  | "OPTIONAL";
export type CanonicalParameterSource =
  | "USER_EXPLICIT"
  | "TEXT_EXTRACTED"
  | "PROJECT_SPECIFIC"
  | "NORMATIVE_DERIVED"
  | "CALCULATED"
  | "ASSUMED"
  | "MISSING";
export type CanonicalParameterSessionStatus =
  | "BLOCKING_REQUIRED"
  | "PRELIMINARY_WITH_ASSUMPTIONS"
  | "COMPLETE"
  | "INVALID";

export type CanonicalParameterVisibilityCondition =
  | { kind: "ALWAYS" }
  | {
      kind: "PARAMETER_EQUALS";
      parameterId: string;
      value: CanonicalParameterValue;
    };

export type CanonicalParameterValidation = {
  min?: number;
  max?: number;
  integer?: boolean;
  nonEmpty?: boolean;
  pattern?: string;
};

export type CanonicalParameterAllowedValue = {
  value: CanonicalParameterValue;
  label: string;
};

export type CanonicalParameterNormativeSource = {
  profile: "KG_PROFILE" | "INTERNATIONAL_REFERENCE_PROFILE" | "PROJECT_SPECIFIC_PROFILE";
  sourceId: string;
  document: string;
  revision: string;
  locator: string;
  checkedAt: string;
  sourceHash: string;
} | null;

export type CanonicalParameterDefinition = {
  parameterId: string;
  label: string;
  description: string;
  valueType: CanonicalParameterValueType;
  unit: string | null;
  requiredLevel: CanonicalParameterRequiredLevel;
  visibilityCondition: CanonicalParameterVisibilityCondition;
  validation: CanonicalParameterValidation;
  allowedValues: readonly CanonicalParameterAllowedValue[];
  affectsRows: readonly string[];
  affectsFormula: readonly string[];
  normativeSource: CanonicalParameterNormativeSource;
  displayOrder: number;
};

export type CanonicalParameter = {
  parameterId: string;
  label: string;
  description: string;
  value: CanonicalParameterValue | null;
  valueType: CanonicalParameterValueType;
  unit: string | null;
  requiredLevel: CanonicalParameterRequiredLevel;
  visibilityCondition: CanonicalParameterVisibilityCondition;
  validation: CanonicalParameterValidation;
  allowedValues: readonly CanonicalParameterAllowedValue[];
  source: CanonicalParameterSource;
  confidence: number;
  assumption: string | null;
  affectsRows: readonly string[];
  affectsFormula: readonly string[];
  normativeSource: CanonicalParameterNormativeSource;
  displayOrder: number;
  sourceText: string | null;
  valid: boolean;
  validationIssues: readonly string[];
};

export type CanonicalParameterRequiredAlternative = {
  alternativeId: string;
  parameterIds: readonly string[];
};

export type CanonicalParameterSchema = {
  coreSchemaVersion: typeof CANONICAL_PARAMETER_CORE_SCHEMA_VERSION;
  schemaId: string;
  schemaVersion: string;
  workPassportId: string;
  canonicalWorkKey: string;
  calculationVersion: string;
  definitions: readonly CanonicalParameterDefinition[];
  requiredAlternatives: readonly CanonicalParameterRequiredAlternative[];
};

export type CanonicalParameterSeed = {
  parameterId: string;
  value: CanonicalParameterValue;
  source: Exclude<CanonicalParameterSource, "MISSING">;
  confidence: number;
  assumption?: string | null;
  sourceText?: string | null;
};

export type CanonicalParameterSession = {
  coreSchemaVersion: typeof CANONICAL_PARAMETER_CORE_SCHEMA_VERSION;
  sessionId: string;
  draftId: string;
  revisionId: string;
  schemaId: string;
  schemaVersion: string;
  workPassportId: string;
  canonicalWorkKey: string;
  calculationVersion: string;
  status: CanonicalParameterSessionStatus;
  parameters: readonly CanonicalParameter[];
  blockingMissingParameterIds: readonly string[];
  contractMissingParameterIds: readonly string[];
  assumptionParameterIds: readonly string[];
  invalidParameterIds: readonly string[];
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
};

function isVisible(
  definition: CanonicalParameterDefinition,
  values: ReadonlyMap<string, CanonicalParameterValue>,
): boolean {
  if (definition.visibilityCondition.kind === "ALWAYS") return true;
  return values.get(definition.visibilityCondition.parameterId) ===
    definition.visibilityCondition.value;
}

function validateValue(
  definition: CanonicalParameterDefinition,
  value: CanonicalParameterValue | null,
): string[] {
  if (value == null) return [];
  const issues: string[] = [];
  if (typeof value !== definition.valueType) issues.push("VALUE_TYPE_INVALID");
  if (typeof value === "number") {
    if (!Number.isFinite(value)) issues.push("NUMBER_NOT_FINITE");
    if (definition.validation.min != null && value < definition.validation.min) {
      issues.push("NUMBER_BELOW_MIN");
    }
    if (definition.validation.max != null && value > definition.validation.max) {
      issues.push("NUMBER_ABOVE_MAX");
    }
    if (definition.validation.integer && !Number.isInteger(value)) {
      issues.push("INTEGER_REQUIRED");
    }
  }
  if (typeof value === "string") {
    if (definition.validation.nonEmpty && value.trim().length === 0) {
      issues.push("NON_EMPTY_REQUIRED");
    }
    if (
      definition.validation.pattern &&
      !new RegExp(definition.validation.pattern, "u").test(value)
    ) {
      issues.push("PATTERN_MISMATCH");
    }
  }
  if (
    definition.allowedValues.length > 0 &&
    !definition.allowedValues.some((candidate) => candidate.value === value)
  ) {
    issues.push("ALLOWED_VALUE_REQUIRED");
  }
  return issues;
}

function validateSchema(schema: CanonicalParameterSchema): void {
  const ids = new Set<string>();
  for (const definition of schema.definitions) {
    if (!definition.parameterId.trim()) throw new Error("CANONICAL_PARAMETER_ID_REQUIRED");
    if (ids.has(definition.parameterId)) {
      throw new Error(`CANONICAL_PARAMETER_DUPLICATE_ID:${definition.parameterId}`);
    }
    ids.add(definition.parameterId);
    if (!definition.label.trim()) {
      throw new Error(`CANONICAL_PARAMETER_LABEL_REQUIRED:${definition.parameterId}`);
    }
  }
  for (const alternative of schema.requiredAlternatives) {
    if (
      alternative.parameterIds.length === 0 ||
      alternative.parameterIds.some((parameterId) => !ids.has(parameterId))
    ) {
      throw new Error(`CANONICAL_PARAMETER_REQUIRED_ALTERNATIVE_INVALID:${alternative.alternativeId}`);
    }
  }
}

function sessionStatus(input: {
  blockingMissingParameterIds: readonly string[];
  contractMissingParameterIds: readonly string[];
  assumptionParameterIds: readonly string[];
  invalidParameterIds: readonly string[];
}): CanonicalParameterSessionStatus {
  if (input.invalidParameterIds.length > 0) return "INVALID";
  if (input.blockingMissingParameterIds.length > 0) return "BLOCKING_REQUIRED";
  if (
    input.contractMissingParameterIds.length > 0 ||
    input.assumptionParameterIds.length > 0
  ) {
    return "PRELIMINARY_WITH_ASSUMPTIONS";
  }
  return "COMPLETE";
}

export function createCanonicalParameterSession(input: {
  schema: CanonicalParameterSchema;
  draftId: string;
  revisionId: string;
  seeds: readonly CanonicalParameterSeed[];
  createdAt: string;
  previousSession?: CanonicalParameterSession | null;
}): CanonicalParameterSession {
  validateSchema(input.schema);
  const seedById = new Map(input.seeds.map((seed) => [seed.parameterId, seed]));
  const knownIds = new Set(input.schema.definitions.map((definition) => definition.parameterId));
  for (const seed of input.seeds) {
    if (!knownIds.has(seed.parameterId)) {
      throw new Error(`CANONICAL_PARAMETER_SEED_NOT_IN_SCHEMA:${seed.parameterId}`);
    }
  }
  const values = new Map<string, CanonicalParameterValue>();
  for (const seed of input.seeds) values.set(seed.parameterId, seed.value);
  const parameters = input.schema.definitions
    .filter((definition) => isVisible(definition, values))
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((definition): CanonicalParameter => {
      const seed = seedById.get(definition.parameterId);
      const value = seed?.value ?? null;
      const validationIssues = validateValue(definition, value);
      return Object.freeze({
        ...definition,
        allowedValues: Object.freeze([...definition.allowedValues]),
        affectsRows: Object.freeze([...definition.affectsRows]),
        affectsFormula: Object.freeze([...definition.affectsFormula]),
        value,
        source: seed?.source ?? "MISSING",
        confidence: seed?.confidence ?? 0,
        assumption: seed?.assumption ?? null,
        sourceText: seed?.sourceText ?? null,
        valid: validationIssues.length === 0,
        validationIssues: Object.freeze(validationIssues),
      });
    });
  const presentValidIds = new Set(
    parameters
      .filter((parameter) => parameter.value != null && parameter.valid)
      .map((parameter) => parameter.parameterId),
  );
  const hasRequiredAlternative = input.schema.requiredAlternatives.length === 0 ||
    input.schema.requiredAlternatives.some((alternative) =>
      alternative.parameterIds.every((parameterId) => presentValidIds.has(parameterId))
    );
  const blockingDefinitions = parameters.filter((parameter) =>
    parameter.requiredLevel === "BLOCKING_REQUIRED" && parameter.value == null
  );
  const blockingMissingParameterIds = hasRequiredAlternative
    ? []
    : blockingDefinitions.map((parameter) => parameter.parameterId);
  const contractMissingParameterIds = parameters
    .filter((parameter) =>
      parameter.value == null &&
      (
        parameter.requiredLevel === "CONTRACT_REQUIRED" ||
        parameter.requiredLevel === "CONDITIONAL" ||
        (parameter.requiredLevel === "BLOCKING_REQUIRED" && hasRequiredAlternative)
      )
    )
    .map((parameter) => parameter.parameterId);
  const assumptionParameterIds = parameters
    .filter((parameter) => parameter.source === "ASSUMED")
    .map((parameter) => parameter.parameterId);
  const invalidParameterIds = parameters
    .filter((parameter) => !parameter.valid)
    .map((parameter) => parameter.parameterId);
  const status = sessionStatus({
    blockingMissingParameterIds,
    contractMissingParameterIds,
    assumptionParameterIds,
    invalidParameterIds,
  });
  const fingerprint = estimateDeterministicHash({
    coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
    schemaId: input.schema.schemaId,
    schemaVersion: input.schema.schemaVersion,
    workPassportId: input.schema.workPassportId,
    canonicalWorkKey: input.schema.canonicalWorkKey,
    calculationVersion: input.schema.calculationVersion,
    revisionId: input.revisionId,
    status,
    parameters: parameters.map((parameter) => ({
      parameterId: parameter.parameterId,
      value: parameter.value,
      source: parameter.source,
      assumption: parameter.assumption,
      valid: parameter.valid,
    })),
  });
  return Object.freeze({
    coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
    sessionId: input.previousSession?.sessionId ??
      `canonical-parameter-session:${input.draftId}`,
    draftId: input.draftId,
    revisionId: input.revisionId,
    schemaId: input.schema.schemaId,
    schemaVersion: input.schema.schemaVersion,
    workPassportId: input.schema.workPassportId,
    canonicalWorkKey: input.schema.canonicalWorkKey,
    calculationVersion: input.schema.calculationVersion,
    status,
    parameters: Object.freeze(parameters),
    blockingMissingParameterIds: Object.freeze(blockingMissingParameterIds),
    contractMissingParameterIds: Object.freeze(contractMissingParameterIds),
    assumptionParameterIds: Object.freeze(assumptionParameterIds),
    invalidParameterIds: Object.freeze(invalidParameterIds),
    fingerprint,
    createdAt: input.previousSession?.createdAt ?? input.createdAt,
    updatedAt: input.createdAt,
  });
}

export function canonicalParameterValues(
  session: CanonicalParameterSession,
): Record<string, CanonicalParameterValue> {
  return Object.fromEntries(
    session.parameters
      .filter((parameter): parameter is CanonicalParameter & { value: CanonicalParameterValue } =>
        parameter.value != null
      )
      .map((parameter) => [parameter.parameterId, parameter.value]),
  );
}
