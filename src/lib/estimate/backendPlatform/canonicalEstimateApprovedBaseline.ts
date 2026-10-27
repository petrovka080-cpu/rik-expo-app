export type CanonicalApprovedBaselineRecord = {
  input_values?: unknown;
  input_classification?: unknown;
};

type BaselineScopeContext = Readonly<{
  parameterDefinitions: readonly Readonly<{ parameter_id: string; value_type?: string; constraints_json?: unknown; truth_metadata?: unknown }>[];
  inputParameters: Readonly<Record<string, unknown>>;
}>;

/** Same finite declaration is checked independently by the existing SQL writer.
 * It recognizes a published legacy-choice gate, without a second AST engine. */
function publishedAssumptionChoice(parameterId: string, scope: BaselineScopeContext): Readonly<{ id: string; value: string }> | null {
  const parameter = scope.parameterDefinitions.find(entry => entry.parameter_id === parameterId);
  const truth = record(parameter?.truth_metadata), condition = record(truth.visible_when);
  if (truth.value_source_role !== 'VISIBLE_BASELINE_ASSUMPTION' || condition.kind !== 'and'
    || Object.keys(condition).length !== 2 || !Array.isArray(condition.operands) || condition.operands.length !== 2) return null;
  const choice = record(condition.operands[0]), literal = record(condition.operands[1]);
  if (choice.kind !== 'selected' || Object.keys(choice).length !== 3
    || typeof choice.parameterId !== 'string' || typeof choice.value !== 'string' || !choice.value.length
    || literal.kind !== 'literal' || literal.value !== true || Object.keys(literal).length !== 2) return null;
  const selector = scope.parameterDefinitions.find(entry => entry.parameter_id === choice.parameterId);
  const selectorTruth = record(selector?.truth_metadata), values = record(selector?.constraints_json).values;
  if (selector?.value_type !== 'enum' || selectorTruth.visibility_role !== 'USER_INPUT'
    || selectorTruth.value_source_role !== 'USER_INPUT' || !Array.isArray(values) || !values.includes(choice.value)) return null;
  return { id: choice.parameterId, value: choice.value };
}

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
  scope?: BaselineScopeContext,
): Record<string, unknown> {
  const values = record(baseline?.input_values);
  return Object.fromEntries(Object.entries(values).filter(([parameterId]) => {
    if (!canonicalApprovedBaselineParameterIsRuntimeEligible(baseline, parameterId)) return false;
    if (!scope || String(record(baseline?.input_classification)[parameterId]).trim().toUpperCase() !== 'ASSUMPTION') return true;
    const choice = publishedAssumptionChoice(parameterId, scope);
    if (!choice) return true;
    // A retained example belongs only to its explicitly applicable branch.
    // Missing choice is not permission to make that old project a new fact.
    return scope.inputParameters[choice.id] === choice.value;
  }));
}

export function canonicalApprovedBaselineRuntimeDefaultValue(
  baseline: CanonicalApprovedBaselineRecord | null | undefined,
  parameterId: string,
): unknown {
  return canonicalApprovedBaselineParameterIsRuntimeEligible(baseline, parameterId)
    ? record(baseline?.input_values)[parameterId]
    : null;
}
