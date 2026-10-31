import type { AutomaticOwnerDefinition, AutomaticInclusionCondition } from './automaticConstructionOwnerR1';
import { buildMonolithicRepairHandSourceCandidateR3, repairParameterR3 as p,
  repairRowR3 as r } from './monolithicStrengthRepairR3';
import { appendOptionalAutomaticOwnerR1 } from './optionalAutomaticOwnerCompositionR1';
import { canonicalEstimateOperationReference } from '../backendPlatform/canonicalEstimateOperationComposition';
import { buildMasterParameterCalculationConsumers } from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';

export const SLAB_REPAIR_CATALOG_R55 = 'canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard';
export const SLAB_REPAIR_METHOD_R55 = 'mono_slab_repair_r55_method';
export const SLAB_REPAIR_CHOICE_R55 = 'GB_HAND_LAYER_5_80MM_SOUND_ROUGH_NO_EXPOSED_REBAR_NO_PRIMER';
const needPrefix = 'master212:slab_foundation:scope-need:';
const needKeys = ['repair-mortar', 'repair-water', 'repair-labor', 'repair-tools'];

/** Reuse the complete accepted repair factory in the current foundation card.
 * The actual method comes from project documentation; it is never inferred
 * from foundation volume or the old, different repair product. No need is
 * retired: the selected factory still declares preparation, labour, curing,
 * cleaning and the other unresolved parts of the whole repair method. */
export function appendMonolithicSlabMeasuredRepairReuseR55(input: Readonly<{
  catalogId: string; parent: AutomaticOwnerDefinition; expectedParentFingerprint: string;
}>): AutomaticOwnerDefinition {
  const check = (ok: unknown, code: string): void => {
    if (!ok) throw Error('SLAB_REPAIR_REUSE_R55_' + code);
  };
  check(input.catalogId === SLAB_REPAIR_CATALOG_R55, 'EXACT_CARD');
  check(hash(input.parent) === input.expectedParentFingerprint, 'EXACT_PARENT');
  const needs = needKeys.map(key => input.parent.resources.find(row => row.row_id === needPrefix + key));
  const restore = canonicalEstimateOperationReference(needs[0]?.resource_graph.operationCompositionV1);
  check(restore?.operationId === 'master212:slab_foundation:retained-operation:repair', 'EXACT_OPERATION');
  const first = needs[0];
  check(first && needs.every((row, i) => row && row.unit_id === ['kg', 'l', 'man_hour', 'set'][i]
    && row.source_metadata?.sourceRole === 'UNRESOLVED_APPLICATION_NORM'
    && row.resource_graph.costTreatment === 'INFORMATIONAL_SCOPE' && !row.procurement_eligible
    && canonicalEstimateOperationReference(row.resource_graph.operationCompositionV1)?.operationId === restore?.operationId
    && hash(row.inclusion_ast) === hash(first.inclusion_ast)), 'EXACT_UNRESOLVED_SCOPE');
  if (!restore || !first) throw Error('SLAB_REPAIR_REUSE_R55_MISSING_RESTORE');
  const child = buildMonolithicRepairHandSourceCandidateR3();
  const methodTemplate = child.parameters.find(parameter => parameter.parameter_id === p('method_ref'));
  if (!methodTemplate) throw Error('SLAB_REPAIR_REUSE_R55_SOURCE_METHOD_REQUIRED');
  const method = { ...methodTemplate, parameter_id: SLAB_REPAIR_METHOD_R55,
    ordinal: input.parent.parameters.length, title_ru: 'Подтверждённый способ локального ремонта бетона',
    value_type: 'enum', required: false, default_value: null,
    constraints_json: { values: [SLAB_REPAIR_CHOICE_R55] },
    truth_metadata: { ...methodTemplate.truth_metadata,
      semantic_parameter_key: SLAB_REPAIR_METHOD_R55, visibility_role: 'INTERNAL_ONLY',
      value_source_role: 'PROJECT_DOCUMENTATION', formula_consumers: [], resource_branch_consumers: [],
      hidden_default_forbidden: true } };
  const selected: AutomaticInclusionCondition = { kind: 'equals', parameterId: SLAB_REPAIR_METHOD_R55,
    value: SLAB_REPAIR_CHOICE_R55 };
  // The exact captured parent gate excludes its legacy product profile.
  const when: AutomaticInclusionCondition = { kind: 'and', operands: [
    selected, first.inclusion_ast as AutomaticInclusionCondition] };
  const bound = { ...child,
    parameters: child.parameters.map(parameter => ({ ...parameter, truth_metadata: { ...parameter.truth_metadata,
      ...(child.ordinaryParameterIds.includes(parameter.parameter_id)
        || ['length_m', 'width_m', 'depth_m'].map(p).includes(parameter.parameter_id)
        ? { visible_when: when } : {}) } })),
    resources: child.resources.map(row => {
      const operation = canonicalEstimateOperationReference(row.resource_graph.operationCompositionV1);
      if (!operation || operation.additionalOperations?.length) throw Error('SLAB_REPAIR_REUSE_R55_SOURCE_OPERATIONS');
      const result = { ...row, resource_graph: { ...row.resource_graph, operationCompositionV1: {
        ...operation, groupId: restore.groupId, groupTitleRu: restore.groupTitleRu,
        additionalOperations: [{ operationId: restore.operationId, operationTitleRu: restore.operationTitleRu,
          completionCriterionRu: restore.completionCriterionRu, whenResourcePresent: needKeys.map(key => needPrefix + key) }],
      } }, row_sha256: '' };
      return { ...result, row_sha256: hash(result) };
    }),
  };
  const next = appendOptionalAutomaticOwnerR1({ parent: { ...input.parent,
    parameters: [...input.parent.parameters, method] }, child: bound, when });
  check(next.resources.filter(row => row.row_id === r('dry-material-order')).length === 1, 'SINGLE_MATERIAL_OWNER');
  check(next.resources.length === input.parent.resources.length + child.resources.length, 'WHOLE_FACTORY');
  const consumers = buildMasterParameterCalculationConsumers(next);
  return { ...next, ordinaryParameterIds: [...input.parent.ordinaryParameterIds,
    ...['patch_count', 'length_m', 'width_m', 'depth_m'].map(p)],
    parameters: next.parameters.map(parameter => ({ ...parameter, truth_metadata: { ...parameter.truth_metadata,
      formula_consumers: consumers.formulaConsumers[parameter.parameter_id],
      resource_branch_consumers: consumers.resourceConsumers[parameter.parameter_id] } })),
  };
}
