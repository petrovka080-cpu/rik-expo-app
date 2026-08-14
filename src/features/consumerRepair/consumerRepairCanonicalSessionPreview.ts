import type {
  CanonicalParameter,
  CanonicalParameterSession,
  CanonicalParameterValue,
} from "../../lib/estimate/canonicalParameters/canonicalParameterCore";

function validationIssues(input: {
  parameter: CanonicalParameter;
  value: CanonicalParameterValue | null;
}): string[] {
  if (input.value == null) return [];
  const issues: string[] = [];
  if (typeof input.value !== input.parameter.valueType) {
    issues.push("VALUE_TYPE_INVALID");
  }
  if (typeof input.value === "number") {
    if (!Number.isFinite(input.value)) issues.push("NUMBER_NOT_FINITE");
    if (
      input.parameter.validation.min != null &&
      input.value < input.parameter.validation.min
    ) {
      issues.push("NUMBER_BELOW_MIN");
    }
    if (
      input.parameter.validation.max != null &&
      input.value > input.parameter.validation.max
    ) {
      issues.push("NUMBER_ABOVE_MAX");
    }
    if (input.parameter.validation.integer && !Number.isInteger(input.value)) {
      issues.push("INTEGER_REQUIRED");
    }
  }
  if (typeof input.value === "string") {
    if (input.parameter.validation.nonEmpty && input.value.trim().length === 0) {
      issues.push("NON_EMPTY_REQUIRED");
    }
    if (
      input.parameter.validation.pattern &&
      !new RegExp(input.parameter.validation.pattern, "u").test(input.value)
    ) {
      issues.push("PATTERN_MISMATCH");
    }
  }
  if (
    input.parameter.allowedValues.length > 0 &&
    !input.parameter.allowedValues.some((candidate) => candidate.value === input.value)
  ) {
    issues.push("ALLOWED_VALUE_REQUIRED");
  }
  return issues;
}

function previewValue(
  parameter: CanonicalParameter,
  rawValue: string,
): CanonicalParameterValue | null {
  if (rawValue.trim() === "") return null;
  if (parameter.valueType === "number") {
    const parsed = Number(rawValue.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : rawValue;
  }
  if (parameter.valueType === "boolean") {
    if (rawValue === "true") return true;
    if (rawValue === "false") return false;
  }
  return rawValue;
}

/**
 * Builds the non-persistent editor preview from the durable session itself.
 *
 * The restored-draft UI must not resolve the global schema registry. Some
 * domain registries construct and hash every work at module evaluation time;
 * doing that for the 605-work Electrical domain exhausted Hermes before a
 * 500-row revision could open. The canonical service remains the sole owner of
 * persisted cross-field validation when the batch patch is submitted.
 */
export function buildConsumerRepairCanonicalSessionPreview(input: {
  session: CanonicalParameterSession | null;
  draftValues: Readonly<Record<string, string>>;
}): CanonicalParameterSession | null {
  if (!input.session) return null;
  let changed = false;
  const parameters = input.session.parameters.map((parameter): CanonicalParameter => {
    if (!Object.prototype.hasOwnProperty.call(input.draftValues, parameter.parameterId)) {
      return parameter;
    }
    const rawValue = input.draftValues[parameter.parameterId] ?? "";
    const currentRawValue = parameter.value == null ? "" : String(parameter.value);
    if (rawValue === currentRawValue) return parameter;
    changed = true;
    const value = previewValue(parameter, rawValue);
    const parameterValidationIssues = validationIssues({ parameter, value });
    const valid = parameterValidationIssues.length === 0;
    const state = !valid
      ? "INVALID" as const
      : value == null
        ? parameter.requiredLevel === "OPTIONAL"
          ? "NOT_APPLICABLE" as const
          : "BLOCKING_REQUIRED" as const
        : "PROVIDED" as const;
    return {
      ...parameter,
      value,
      source: value == null ? "MISSING" : "USER_EXPLICIT",
      state,
      confidence: value == null ? 0 : 1,
      assumption: null,
      sourceText: value == null ? null : "pending-user-edit",
      valid,
      validationIssues: parameterValidationIssues,
    };
  });
  if (!changed) return input.session;

  const blockingMissingParameterIds = parameters
    .filter((parameter) =>
      parameter.requiredLevel === "BLOCKING_REQUIRED" &&
      parameter.value == null &&
      parameter.state !== "NOT_APPLICABLE"
    )
    .map((parameter) => parameter.parameterId);
  const contractMissingParameterIds = parameters
    .filter((parameter) =>
      parameter.value == null &&
      parameter.state !== "NOT_APPLICABLE" &&
      (
        parameter.requiredLevel === "CONTRACT_REQUIRED" ||
        parameter.requiredLevel === "CONDITIONAL"
      )
    )
    .map((parameter) => parameter.parameterId);
  const assumptionParameterIds = parameters
    .filter((parameter) => parameter.source === "ASSUMED")
    .map((parameter) => parameter.parameterId);
  const invalidParameterIds = parameters
    .filter((parameter) => !parameter.valid)
    .map((parameter) => parameter.parameterId);
  const status = invalidParameterIds.length > 0
    ? "INVALID" as const
    : blockingMissingParameterIds.length > 0
      ? "BLOCKING_REQUIRED" as const
      : contractMissingParameterIds.length > 0 || assumptionParameterIds.length > 0
        ? "PRELIMINARY_WITH_ASSUMPTIONS" as const
        : "COMPLETE" as const;
  return {
    ...input.session,
    status,
    parameters,
    blockingMissingParameterIds,
    contractMissingParameterIds,
    assumptionParameterIds,
    invalidParameterIds,
  };
}
