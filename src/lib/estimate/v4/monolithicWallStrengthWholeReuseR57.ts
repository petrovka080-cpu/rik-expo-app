import type { AutomaticOwnerDefinition, AutomaticInclusionCondition } from './automaticConstructionOwnerR1';
import { buildMonolithicStrengthMeasuredRepairR4 } from './monolithicStrengthMeasuredRepairR4';
import { strengthDirectParameterR2 as sp, strengthDirectRowR2 as sr } from './monolithicStrengthDirectWholeCycleR2';
import { repairParameterR3 as rp, repairRowR3 as rr } from './monolithicStrengthRepairR3';
import { appendOptionalAutomaticOwnerR1 } from './optionalAutomaticOwnerCompositionR1';
import { canonicalEstimateOperationReference } from '../backendPlatform/canonicalEstimateOperationComposition';
import { buildMasterParameterCalculationConsumers } from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';

export const WALL_STRENGTH_CATALOG_R57 = 'canonical-work:master:monolithic_reinforced_concrete_wall_standard';
export const WALL_STRENGTH_METHOD_R57 = 'mono_wall_strength_r57_method';
export const WALL_STRENGTH_CHOICE_R57 = 'ONE_IDENTIFIED_FLAT_MEMBER_TYPE_II_24_48_DRY_WALL_GB_HAND_REPAIR';
export const WALL_QUALITY_NEED_R57 = 'master212:family-b:krer06-01-031-04:r1:need:quality-lab';

/** Finite current-wall consumer of the complete existing R4, including both
 * source need lists. The programme, one identified member and deployed posts
 * remain independent of the parent's concrete volume. No whole-service need
 * is retired and no application labour norm becomes a consumer question. */
export function appendMonolithicWallStrengthWholeReuseR57(input: Readonly<{
  catalogId: string; parent: AutomaticOwnerDefinition; expectedParentFingerprint: string;
}>): AutomaticOwnerDefinition {
  const check = (ok: unknown, code: string): void => {
    if (!ok) throw Error('WALL_STRENGTH_R57_' + code);
  };
  check(input.catalogId === WALL_STRENGTH_CATALOG_R57, 'EXACT_CARD');
  check(hash(input.parent) === input.expectedParentFingerprint, 'EXACT_PARENT');
  const need = input.parent.resources.find(row => row.row_id === WALL_QUALITY_NEED_R57);
  const operation = canonicalEstimateOperationReference(need?.resource_graph.operationCompositionV1);
  check(need?.unit_id === 'service_hour' && need.source_metadata?.sourceRole === 'UNRESOLVED_APPLICATION_NORM'
    && need.resource_graph.costTreatment === 'OWN_COST'
    && operation?.operationId === 'master212:family-b:krer06-01-031-04:r1:operation:quality-lab', 'EXACT_OPEN_QUALITY_SCOPE');
  if (!need || !operation) throw Error('WALL_STRENGTH_R57_MISSING_OPERATION');
  const child = buildMonolithicStrengthMeasuredRepairR4();
  const planning = canonicalEstimateOperationReference(child.resources.find(row => row.row_id === sr('planning-labour'))
    ?.resource_graph.operationCompositionV1);
  check(planning?.operationId === sr('operation:plan'), 'EXACT_SOURCE_PLANNING_OPERATION');
  const siteBounds = new Set(['sites-flat', 'sites-horizontal', 'sites-vertical'].map(sr));
  const template = child.parameters.find(parameter => parameter.parameter_id === sp('member_ref'));
  if (!template) throw Error('WALL_STRENGTH_R57_SOURCE_PROGRAMME_REQUIRED');
  const method = { ...template, parameter_id: WALL_STRENGTH_METHOD_R57,
    ordinal: input.parent.parameters.length, title_ru: 'Принятый способ контроля отдельной плоской конструкции',
    value_type: 'enum', required: false, default_value: null,
    constraints_json: { values: [WALL_STRENGTH_CHOICE_R57] },
    truth_metadata: { ...template.truth_metadata, semantic_parameter_key: WALL_STRENGTH_METHOD_R57,
      visibility_role: 'INTERNAL_ONLY', value_source_role: 'PROJECT_DOCUMENTATION',
      formula_consumers: [], resource_branch_consumers: [], hidden_default_forbidden: true } };
  const when: AutomaticInclusionCondition = { kind: 'and', operands: [
    { kind: 'equals', parameterId: WALL_STRENGTH_METHOD_R57, value: WALL_STRENGTH_CHOICE_R57 },
    need.inclusion_ast as AutomaticInclusionCondition,
  ] };
  const geometry = new Set([sp('area_m2'), ...['patch_count', 'length_m', 'width_m', 'depth_m'].map(rp)]);
  const bound: AutomaticOwnerDefinition = { ...child,
    parameters: child.parameters.map(parameter => {
      const hiddenMemberFact = [sp('member_count'), sp('member_kind'), sp('length_m')].includes(parameter.parameter_id);
      const provenance = parameter.truth_metadata.provenance;
      if (provenance != null && (typeof provenance !== 'object' || Array.isArray(provenance))) {
        throw Error('WALL_STRENGTH_R57_INVALID_SOURCE_PROVENANCE');
      }
      return { ...parameter,
        ...(parameter.parameter_id === sp('member_kind')
          ? { constraints_json: { ...parameter.constraints_json, values: ['FLAT'] } } : {}),
        truth_metadata: { ...parameter.truth_metadata,
          ...(geometry.has(parameter.parameter_id) ? { visible_when: when } : {}),
          ...(hiddenMemberFact ? { visibility_role: 'INTERNAL_ONLY', value_source_role: 'PROJECT_DOCUMENTATION',
            provenance: { ...provenance, consumer_input_role_v1: 'APPLICATION_TECHNICAL' } } : {}) } };
    }),
    resources: child.resources.map(row => {
      // The three source lower-bound controls are not test programme points.
      // Their original formulas stay intact; they support the existing plan.
      const original = canonicalEstimateOperationReference(row.resource_graph.operationCompositionV1)
        ?? (siteBounds.has(row.row_id) ? planning : null);
      if (!original) throw Error('WALL_STRENGTH_R57_WHOLE_SOURCE_OPERATIONS_REQUIRED');
      const scope = row.resource_graph.scopeRequirementV1;
      if (scope != null && (typeof scope !== 'object' || Array.isArray(scope))) {
        throw Error('WALL_STRENGTH_R57_INVALID_SOURCE_SCOPE');
      }
      // Related operations use the primary operation's instance in the existing
      // contract. Rebind that instance and its same-group scope, keeping every
      // source operation ID, condition, norm and owner intact.
      const result = { ...row, resource_graph: { ...row.resource_graph,
        ...(scope && 'groupId' in scope && scope.groupId === original.groupId
          ? { scopeRequirementV1: { ...scope, groupId: operation.groupId, groupTitleRu: operation.groupTitleRu } } : {}),
        operationCompositionV1: { ...original, groupId: operation.groupId, groupTitleRu: operation.groupTitleRu,
        additionalOperations: [...(original.additionalOperations ?? []), {
          operationId: operation.operationId, operationTitleRu: operation.operationTitleRu,
          completionCriterionRu: operation.completionCriterionRu, whenResourcePresent: [WALL_QUALITY_NEED_R57],
        }] } }, row_sha256: '' };
      return { ...result, row_sha256: hash(result) };
    }), ordinaryParameterIds: [...geometry],
  };
  const next = appendOptionalAutomaticOwnerR1({ parent: { ...input.parent,
    parameters: [...input.parent.parameters, method] }, child: bound, when });
  check(next.resources.length === input.parent.resources.length + child.resources.length, 'WHOLE_FACTORY');
  check(next.resources.filter(row => row.row_id === rr('dry-material-order')).length === 1, 'SINGLE_REPAIR_OWNER');
  const consumers = buildMasterParameterCalculationConsumers(next);
  return { ...next, ordinaryParameterIds: [...input.parent.ordinaryParameterIds, ...geometry],
    parameters: next.parameters.map(parameter => ({ ...parameter, truth_metadata: { ...parameter.truth_metadata,
      formula_consumers: consumers.formulaConsumers[parameter.parameter_id],
      resource_branch_consumers: consumers.resourceConsumers[parameter.parameter_id] } })) };
}
