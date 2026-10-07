import type { CanonicalEstimateParameterDefinition } from './canonicalEstimateCompileCore';
import { compileFormulaGraph, evaluateFormulaGraph, type FormulaParameterValue } from './formulaGraph';
import { canonicalConditionParameterIds } from './canonicalEffectiveResourceQuantityV1';
import { resolveInclusionGraph } from './inclusionGraph';

export const PRELIMINARY_SOURCE_FORMULA = 'PRELIMINARY_SOURCE_FORMULA';
export const CATALOGUE_SOURCE_SELECTION = 'CATALOGUE_SOURCE_SELECTION';

export function canonicalAutomaticPreliminaryClassificationV1(truth: Record<string, unknown>, baselineClassification: unknown): string | undefined {
  const classification = String(truth.runtime_profile_classification ?? '');
  return ([PRELIMINARY_SOURCE_FORMULA, CATALOGUE_SOURCE_SELECTION].includes(classification)
    ? classification : String(baselineClassification ?? classification)).trim() || undefined;
}

function invalid(id: string): never {
  throw Object.assign(new Error(`preliminary parameter formula invalid: ${id}`), { code: 'DEFINITION_INTEGRITY_FAILED' });
}

/** Catalogue data uses the same decimal FormulaGraph as resource quantities.
 * A preliminary value is replaceable; it is never proof of an actual project
 * layout, wind calculation, stock allocation, price or equipment passport. */
export function resolveCanonicalPreliminaryParameterFormulasV1(
  definitions: readonly CanonicalEstimateParameterDefinition[],
  input: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const byId = new Map(definitions.map(p => [p.parameter_id, p]));
  const policies = new Map<string, { formula: ReturnType<typeof compileFormulaGraph>; when: Record<string, unknown>; dependencies: string[] }>();
  for (const definition of definitions) {
    const raw = definition.truth_metadata?.preliminary_value_formula_v1;
    if (raw == null) continue;
    if (typeof raw !== 'object' || Array.isArray(raw)) invalid(definition.parameter_id);
    const policy = raw as Record<string, unknown>;
    const truth = definition.truth_metadata!;
    const guide = truth.guide as Record<string, unknown> | undefined;
    if (Object.keys(policy).some(key => !['version', 'expression', 'when'].includes(key))
      || policy.version !== 'canonical-preliminary-parameter-formula:v1'
      || typeof policy.expression !== 'string'
      || !['decimal', 'integer'].includes(definition.value_type)
      || definition.default_value != null
      || truth.value_source_role !== 'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE'
      || truth.runtime_profile_classification !== PRELIMINARY_SOURCE_FORMULA
      || !guide?.source_document || !guide.source_locator
      || !/^[a-f0-9]{64}$/iu.test(String(guide.source_snapshot_hash ?? ''))
      || !policy.when || typeof policy.when !== 'object' || Array.isArray(policy.when)) invalid(definition.parameter_id);
    const formula = compileFormulaGraph(policy.expression);
    const when = policy.when as Record<string, unknown>;
    resolveInclusionGraph(when, {});
    const dependencies = [...new Set([...formula.inputParameterIds, ...canonicalConditionParameterIds(when)])];
    if (dependencies.includes(definition.parameter_id) || dependencies.some(id => !byId.has(id))
      || formula.inputParameterIds.some(id => !['decimal', 'integer'].includes(byId.get(id)!.value_type))) invalid(definition.parameter_id);
    policies.set(definition.parameter_id, { formula, when, dependencies });
  }
  const parameters = { ...input };
  const states = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string): void => {
    if (states.get(id) === 'done') return;
    if (states.get(id) === 'visiting') invalid(`cycle:${id}`);
    const policy = policies.get(id)!;
    states.set(id, 'visiting');
    policy.dependencies.filter(dependency => policies.has(dependency)).forEach(visit);
    if (parameters[id] == null && resolveInclusionGraph(policy.when, parameters).value === true
      && policy.formula.inputParameterIds.every(dependency => parameters[dependency] != null)) {
      parameters[id] = evaluateFormulaGraph(policy.formula.ast, parameters as Record<string, FormulaParameterValue>);
    }
    states.set(id, 'done');
  };
  policies.forEach((_, id) => visit(id));
  return parameters;
}

export function canonicalAutomaticPreliminaryParameterIdsV1(
  definitions: readonly CanonicalEstimateParameterDefinition[],
): Set<string> {
  return new Set(definitions.filter(p => [PRELIMINARY_SOURCE_FORMULA, CATALOGUE_SOURCE_SELECTION]
    .includes(String(p.truth_metadata?.runtime_profile_classification))).map(p => p.parameter_id));
}

/** Recompute automatic values after an area or system change. Keep genuine
 * explicit overrides, including those inherited from the immutable parent. */
export function stripCanonicalAutomaticPreliminaryInputsV1(
  definitions: readonly CanonicalEstimateParameterDefinition[],
  values: Readonly<Record<string, unknown>>,
  explicit: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const automatic = canonicalAutomaticPreliminaryParameterIdsV1(definitions);
  return Object.fromEntries(Object.entries(values).filter(([id]) => !automatic.has(id) || Object.hasOwn(explicit, id)));
}
