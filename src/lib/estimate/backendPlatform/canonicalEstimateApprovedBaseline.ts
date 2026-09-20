export type CanonicalApprovedBaselineRecord = {
  input_values?: unknown;
  input_classification?: unknown;
};

const NON_RUNTIME_BASELINE_CLASSIFICATIONS = new Set([
  "FIXTURE_ONLY",
  "VALIDATION_FIXTURE",
  "TEST_ONLY",
]);

const NORMATIVELY_PROVEN_BASELINE_CLASSIFICATIONS = new Set([
  "NORMATIVE",
  "DERIVED",
]);

const NEGATING_REQUIREMENT_STATES = new Set([
  "NOT_REQUIRED",
  "NOT_APPLICABLE",
  "INCLUDED_IN_ACCESS_SYSTEM",
  "INCLUDED_IN_CONTRACTOR_SCOPE",
  "INCLUDED_IN_MAIN_CONTRACT",
]);

function record(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * An approved baseline proves that a definition can be compiled with a known
 * fixture. It is not, by itself, permission to reuse project/site values in a
 * new customer estimate. New definitions mark validation-only inputs
 * explicitly; unclassified historical baselines keep their existing behavior
 * until they receive a versioned migration.
 */
export function canonicalApprovedBaselineParameterIsRuntimeEligible(
  baseline: CanonicalApprovedBaselineRecord | null | undefined,
  parameterId: string,
): boolean {
  const values = record(baseline?.input_values);
  if (!Object.prototype.hasOwnProperty.call(values, parameterId)) return false;
  const classification = String(record(baseline?.input_classification)[parameterId] ?? "").trim().toUpperCase();
  const value = String(values[parameterId] ?? "").trim().toUpperCase();
  if (parameterId.endsWith("_requirement_state")
    && NEGATING_REQUIREMENT_STATES.has(value)
    && !NORMATIVELY_PROVEN_BASELINE_CLASSIFICATIONS.has(classification)) {
    return false;
  }
  return !NON_RUNTIME_BASELINE_CLASSIFICATIONS.has(classification);
}

export function canonicalApprovedBaselineRuntimeParameters(
  baseline: CanonicalApprovedBaselineRecord | null | undefined,
): Record<string, unknown> {
  const values = record(baseline?.input_values);
  return Object.fromEntries(Object.entries(values).filter(([parameterId]) =>
    canonicalApprovedBaselineParameterIsRuntimeEligible(baseline, parameterId)
  ));
}

export function canonicalApprovedBaselineRuntimeDefaultValue(
  baseline: CanonicalApprovedBaselineRecord | null | undefined,
  parameterId: string,
): unknown {
  return canonicalApprovedBaselineParameterIsRuntimeEligible(baseline, parameterId)
    ? record(baseline?.input_values)[parameterId]
    : null;
}
