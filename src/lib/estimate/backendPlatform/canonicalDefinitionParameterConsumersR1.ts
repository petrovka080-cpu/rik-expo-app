import {canonicalConditionParameterIds} from './canonicalEffectiveResourceQuantityV1';
import {resolveCanonicalSourceProfileSelectionV1,type CanonicalSourceProfileParameterV1,type CanonicalSourceProfileSelectionV1} from './canonicalSourceProfileSelectionV1';

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

type SourceProfileConsumerParameterV1 = CanonicalSourceProfileParameterV1 & Readonly<{
  formulaConsumers?: readonly string[];
  resourceBranchConsumers?: readonly string[];
}>;

/** A measured input can reach a formula through the definition-owned profile
 * producer. Project those real downstream consumers for editing; do not alter
 * persisted definitions, values, ownership or evaluate a second quantity path.
 * The existing producer validates every selection/copy edge before projection. */
export function withCanonicalSourceProfileCalculationConsumersV1<T extends SourceProfileConsumerParameterV1>(
  parameterSchema: T[], sourceProfileSelectionMetadata: unknown,
): T[] {
  if (sourceProfileSelectionMetadata === undefined) return parameterSchema;
  resolveCanonicalSourceProfileSelectionV1({sourceProfileSelectionMetadata,parameterSchema,
    confirmedParameters:{},effectiveUserParameters:{}});
  // The sole producer above checked the complete bounded contract/schema.
  const metadata = sourceProfileSelectionMetadata as CanonicalSourceProfileSelectionV1;
  const byId = new Map(parameterSchema.map(parameter=>[parameter.parameterId,parameter]));
  const downstream = new Map<string,Set<string>>();
  const link = (from:string,to:string) => {
    const outputs=downstream.get(from)??new Set<string>();outputs.add(to);downstream.set(from,outputs);
  };
  for (const profile of metadata.profiles) {
    for (const copy of profile.geometryCopies) link(copy.fromParameterId,copy.toParameterId);
    // Keep every possible dependency, including currently inactive branches.
    // The existing static condition collector includes peer comparisons.
    const outputs=[metadata.selectorParameterId,...profile.geometryCopies.map(copy=>copy.toParameterId)];
    for (const id of canonicalConditionParameterIds(profile.when)) {
      for (const output of outputs) link(id,output);
    }
  }
  let changed=false;
  const result=parameterSchema.map(parameter=>{
    const outputs=downstream.get(parameter.parameterId);if(!outputs)return parameter;
    const formulas=new Set(parameter.formulaConsumers??[]),resources=new Set(parameter.resourceBranchConsumers??[]);
    for (const id of outputs) {
      const target=byId.get(id)!;
      for (const formula of target.formulaConsumers??[]) formulas.add(formula);
      for (const resource of target.resourceBranchConsumers??[]) resources.add(resource);
    }
    if(formulas.size===(parameter.formulaConsumers?.length??0)&&resources.size===(parameter.resourceBranchConsumers?.length??0))return parameter;
    changed=true;return {...parameter,formulaConsumers:[...formulas],resourceBranchConsumers:[...resources]};
  });
  return changed?result:parameterSchema;
}
