type Json = Record<string, any>;

/** The exact metadata enrichment used by publication, also usable without a DB. */
export function buildMasterParameterCalculationConsumers(input: Readonly<{
  parameters: readonly Json[];
  formulas: readonly Json[];
  resources: readonly Json[];
}>): Readonly<{
  formulaConsumers: Record<string, string[]>;
  resourceConsumers: Record<string, string[]>;
}> {
  const formulaConsumers: Record<string, string[]> = Object.fromEntries(input.parameters.map(
    (parameter) => [
      parameter.parameter_id,
      input.formulas.filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
        .map((formula) => formula.formula_id),
    ],
  ));
  const resourceRowIds = new Set(input.resources.map((resource) => String(resource.row_id)));
  // This is local to one immutable-definition read. A large resource graph
  // used to be stringified again for EVERY parameter (and often every editor
  // fixture), creating avoidable CPU/temporary-string pressure. Keep the exact
  // existing quoted-ID/precedence semantics and lazy formula short circuit;
  // neither definition data nor inferred consumers survive into another call.
  const resourceIndexes = input.resources.map(resource => ({ resource,
    graphText: undefined as string | undefined, inclusionText: undefined as string | undefined }));
  const resourceConsumers: Record<string, string[]> = Object.fromEntries(input.parameters.map(
    (parameter) => {
      const quotedId = `"${parameter.parameter_id}"`;
      const inferred = resourceIndexes.filter(entry =>
        formulaConsumers[parameter.parameter_id]!.includes(entry.resource.formula_id)
        || (entry.graphText ??= JSON.stringify(entry.resource.resource_graph)).includes(quotedId)
        || (entry.inclusionText ??= JSON.stringify(entry.resource.inclusion_ast)).includes(quotedId))
        .map(entry => entry.resource.row_id);
      const declared = Array.isArray(parameter.truth_metadata?.resource_branch_consumers)
        ? parameter.truth_metadata.resource_branch_consumers
          .map(String)
          .filter((rowId: string) => resourceRowIds.has(rowId))
        : [];
      return [parameter.parameter_id, inferred.length > 0 ? inferred : declared];
    },
  ));
  return { formulaConsumers, resourceConsumers };
}
