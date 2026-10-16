import type { CanonicalEstimateParameterDefinition, CanonicalEstimateResourceDefinition, CanonicalEstimateFormulaDefinition } from "./canonicalEstimateCompileCore";
import { compileFormulaGraph } from "./formulaGraph";

export type EffectiveResourceQuantityBindingV1 = { parameterId: string; unitId: string };

function invalid(subject: string): never {
  throw Object.assign(new Error(`effective resource quantity binding invalid: ${subject}`), { code: "DEFINITION_INTEGRITY_FAILED" });
}

/** Conditions retain the existing InclusionGraph/FormulaGraph semantics. This
 * collects dependencies only; it never evaluates an alternative expression. */
export function canonicalConditionParameterIds(value: unknown, cache = new Map<object, string[]>()): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const cached = cache.get(value);
  if (cached) return cached;
  const record = value as Record<string, unknown>;
  const ids = [record.parameterId, record.valueParameterId, record.kind === "parameter" ? record.id : null]
    .filter((id): id is string => typeof id === "string" && !!id);
  if (record.kind === "formula_greater_than" && typeof record.expression === "string") {
    ids.push(...compileFormulaGraph(record.expression).inputParameterIds);
  }
  for (const child of [record.operand, ...(Array.isArray(record.operands) ? record.operands : []),
    ...(Array.isArray(record.conditions) ? record.conditions : [])]) ids.push(...canonicalConditionParameterIds(child, cache));
  const result = [...new Set(ids)];
  cache.set(value, result);
  return result;
}

export function planCanonicalEffectiveResourceQuantitiesV1(
  definitions: readonly CanonicalEstimateParameterDefinition[],
  resources: readonly CanonicalEstimateResourceDefinition[],
  formulas: readonly CanonicalEstimateFormulaDefinition[],
) {
  const parameters = new Map(definitions.map(definition => [definition.parameter_id, definition]));
  const formulasById = new Map(formulas.map(formula => [formula.formula_id, formula]));
  const resourcesById = new Map(resources.map(resource => [resource.row_id, resource]));
  const outputs = new Map<string, EffectiveResourceQuantityBindingV1>();
  const owners = new Map<string, string>();
  for (const resource of resources) {
    const raw = resource.resource_graph?.effectiveQuantityOutputV1;
    if (raw == null) continue;
    if (typeof raw !== "object" || Array.isArray(raw)) invalid(resource.row_id);
    const binding = raw as Record<string, unknown>;
    const parameter = parameters.get(String(binding.parameterId));
    const metadata = parameter?.truth_metadata?.effective_resource_quantity_v1 as Record<string, unknown> | undefined;
    const unitId = String(binding.unitId ?? "");
    if (Object.keys(binding).some(key => !["parameterId", "unitId"].includes(key))
      || typeof binding.parameterId !== "string" || !binding.parameterId || !unitId
      || unitId !== resource.unit_id || formulasById.get(resource.formula_id)?.output_unit_id !== unitId
      || !parameter || parameter.required || parameter.default_value != null
      || !["decimal", "integer", "number"].includes(parameter.value_type)
      || parameter.truth_metadata?.visibility_role !== "INTERNAL_ONLY"
      || metadata?.sourceRowId !== resource.row_id || metadata?.unitId !== unitId
      || (parameter as CanonicalEstimateParameterDefinition & { unit_id?: unknown }).unit_id !== unitId || owners.has(binding.parameterId)) invalid(resource.row_id);
    const output = { parameterId: binding.parameterId, unitId };
    outputs.set(resource.row_id, output);
    owners.set(output.parameterId, resource.row_id);
  }
  for (const definition of definitions) {
    if (definition.truth_metadata?.effective_resource_quantity_v1 != null && !owners.has(definition.parameter_id)) invalid(definition.parameter_id);
  }
  const dependencies = new Map<string, string[]>();
  const retentionEnabled = resources.some(resource =>
    (resource.resource_graph?.purchaseBalanceV1 as Record<string, unknown> | undefined)?.manualQuantumViolationPolicy === "retain-raw-and-block-quantum");
  // One compile owns this cache: shared requiredWhen nodes are parsed once,
  // while a changed definition in a later request is always inspected afresh.
  const conditionDependencies = new Map<object, string[]>();
  for (const resource of resources) {
    const ids = new Set([
      ...(formulasById.get(resource.formula_id)?.input_parameter_ids ?? []),
      ...canonicalConditionParameterIds(resource.inclusion_ast, conditionDependencies),
      ...(Array.isArray(resource.resource_graph?.inputParameterIds) ? resource.resource_graph.inputParameterIds as string[] : []),
      ...(Array.isArray(resource.resource_graph?.titleSpecificationParameterIds) ? resource.resource_graph.titleSpecificationParameterIds as string[] : []),
    ]);
    if (retentionEnabled && typeof resource.resource_graph?.titleSpecificationParameterId === "string") {
      ids.add(resource.resource_graph.titleSpecificationParameterId);
    }
    if (retentionEnabled && resource.resource_graph?.purchaseBalanceV1 != null) {
      const policy = resource.resource_graph.purchaseBalanceV1 as Record<string, unknown>;
      for (const key of ["consumedExpression", "stockExpression", "reserveExpression", "orderQuantumExpression", "plannedConsumptionExpression"]) {
        if (typeof policy[key] === "string") compileFormulaGraph(policy[key] as string).inputParameterIds.forEach(id => ids.add(id));
      }
    }
    // A transport fact's requiredWhen can read the effective order even when
    // that fact is not an arithmetic operand in this particular resource.
    for (const id of [...ids]) {
      const constraints = parameters.get(id)?.constraints_json;
      canonicalConditionParameterIds(constraints?.requiredWhen, conditionDependencies).forEach(dependency => ids.add(dependency));
      canonicalConditionParameterIds(constraints?.forbiddenWhen, conditionDependencies).forEach(dependency => ids.add(dependency));
    }
    if (retentionEnabled) {
      const queue = [...ids], seen = new Set<string>();
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const parameterId = queue[cursor];
        if (seen.has(parameterId)) continue;
        seen.add(parameterId);
        const constraints = parameters.get(parameterId)?.constraints_json;
        for (const dependency of [...canonicalConditionParameterIds(constraints?.requiredWhen, conditionDependencies),
          ...canonicalConditionParameterIds(constraints?.forbiddenWhen, conditionDependencies)]) {
          ids.add(dependency); if (!seen.has(dependency)) queue.push(dependency);
        }
      }
    }
    dependencies.set(resource.row_id, [...new Set([...ids].flatMap(id => owners.has(id) ? [owners.get(id)!] : []))]);
  }
  const ordered: CanonicalEstimateResourceDefinition[] = [];
  const states = new Map<string, "visiting" | "done">();
  const visit = (rowId: string): void => {
    if (states.get(rowId) === "done") return;
    if (states.get(rowId) === "visiting") invalid(`cycle:${rowId}`);
    const resource = resourcesById.get(rowId);
    if (!resource) invalid(rowId);
    states.set(rowId, "visiting");
    for (const owner of dependencies.get(rowId) ?? []) visit(owner);
    states.set(rowId, "done");
    ordered.push(resource);
  };
  resources.forEach(resource => visit(resource.row_id));
  const stripIncoming = (values: Record<string, unknown>) => !values || typeof values !== "object" || Array.isArray(values)
    ? values : Object.fromEntries(Object.entries(values).filter(([id]) => !owners.has(id)));
  return { outputs, owners, ordered, stripIncoming, dependencies };
}

/** Persist only this compile's authoritative effective outputs. An inherited
 * output may disappear when its physical input is cleared or its branch closes;
 * it must not survive in user provenance after the compiler removed it. */
export function mergeCanonicalEffectiveResourceQuantityProvenanceV1(input: {
  parameterDefinitions: readonly CanonicalEstimateParameterDefinition[];
  resourceDefinitions: readonly CanonicalEstimateResourceDefinition[];
  formulaDefinitions: readonly CanonicalEstimateFormulaDefinition[];
  userParameters: Record<string, unknown>;
  derivedParameters: Record<string, unknown>;
  separateDerivedProvenance?: boolean;
}): Record<string, unknown> {
  const plan = planCanonicalEffectiveResourceQuantitiesV1(input.parameterDefinitions, input.resourceDefinitions, input.formulaDefinitions);
  return { ...plan.stripIncoming(input.userParameters), ...(input.separateDerivedProvenance ? {} : input.derivedParameters) };
}
