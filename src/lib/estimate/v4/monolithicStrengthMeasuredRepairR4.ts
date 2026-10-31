import { buildMonolithicStrengthDirectWholeCycleR2, strengthDirectParameterR2,
  strengthDirectRowR2 } from './monolithicStrengthDirectWholeCycleR2';
import { buildMonolithicRepairHandSourceCandidateR3, repairParameterR3,
  repairRowR3, repairSourcePackR3 } from './monolithicStrengthRepairR3';
import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { canonicalEstimateOperationReference } from '../backendPlatform/canonicalEstimateOperationComposition';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';

const geometryIds = new Set([
  ...['member_count', 'member_kind', 'area_m2', 'length_m'].map(strengthDirectParameterR2),
  ...['patch_count', 'length_m', 'width_m', 'depth_m'].map(repairParameterR3),
]);

/** Connects the existing source factories through their declared operations.
 * This is the selected invasive test method, not a choice of method for every
 * concrete card. Actual damage, programme and deployed posts stay independent
 * of site-count lower bounds. Both whole-method need lists remain intact.
 * The ordinary core still owns all quantities, prices and saved amendments. */
export function buildMonolithicStrengthMeasuredRepairR4(): AutomaticOwnerDefinition {
  const strength = buildMonolithicStrengthDirectWholeCycleR2();
  const repair = buildMonolithicRepairHandSourceCandidateR3();
  for (const [kind, first, second] of [
    ['parameter', strength.parameters.map(p => p.parameter_id), repair.parameters.map(p => p.parameter_id)],
    ['formula', strength.formulas.map(f => f.formula_id), repair.formulas.map(f => f.formula_id)],
    ['resource', strength.resources.map(r => r.row_id), repair.resources.map(r => r.row_id)],
  ] as const) {
    if (new Set([...first, ...second]).size !== first.length + second.length) {
      throw new Error('STRENGTH_REPAIR_R4_DUPLICATE_' + kind);
    }
  }
  if (Object.keys(strength.runtimeInput).length || Object.keys(repair.runtimeInput).length) {
    throw new Error('STRENGTH_REPAIR_R4_NO_INFERRED_PROGRAMME_DEFAULTS');
  }
  const restoreRows = strength.resources.filter(row => [
    'repair-mortar', 'repair-preparation', 'repair-water', 'repair-labour',
  ].map(strengthDirectRowR2).includes(row.row_id));
  const restore = canonicalEstimateOperationReference(restoreRows[0]?.resource_graph?.operationCompositionV1);
  if (restoreRows.length !== 4 || !restore || restore.processOrdinal == null
    || restoreRows.some(row => canonicalEstimateOperationReference(row.resource_graph?.operationCompositionV1)
      ?.operationId !== restore.operationId)) {
    throw new Error('STRENGTH_REPAIR_R4_EXACT_RESTORE_OPERATION_REQUIRED');
  }
  // Reserve a finite interval for the nine source repair operations between
  // restoration and the next parent step. Quantities and formula order do
  // not depend on this presentation order.
  const operationSpan = Object.keys(repairSourcePackR3.operationTitles).length + 1;
  const parentOrdinal = restore.processOrdinal * operationSpan;
  const materialDeficitExpression = ['mixing-charge-shortage', 'dry-consumption-shortage', 'dry-reserve-deficit']
    .map(key => {
      const row = repair.resources.find(item => item.row_id === repairRowR3(key));
      const formula = repair.formulas.find(item => item.formula_id === row?.formula_id);
      if (row?.unit_id !== 'kg' || formula?.output_unit_id !== 'kg' || !formula.expression_source) {
        throw new Error('STRENGTH_REPAIR_R4_EXACT_MATERIAL_BALANCE_REQUIRED');
      }
      return '(' + formula.expression_source + ')';
    }).join('+');
  const parameters = [...strength.parameters, ...repair.parameters].map(parameter => {
    if (geometryIds.has(parameter.parameter_id)
      || parameter.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM'
      || parameter.truth_metadata.effective_resource_quantity_v1) return parameter;
    const provenance = parameter.truth_metadata.provenance;
    if (provenance != null && (typeof provenance !== 'object' || Array.isArray(provenance))) {
      throw new Error('STRENGTH_REPAIR_R4_INVALID_PARAMETER_PROVENANCE');
    }
    return { ...parameter, truth_metadata: { ...parameter.truth_metadata,
      visibility_role: 'INTERNAL_ONLY', value_source_role: 'PROJECT_DOCUMENTATION',
      provenance: { ...provenance, consumer_input_role_v1: 'APPLICATION_TECHNICAL' } } };
  });
  const parentResources = strength.resources.map(resource => {
    const operation = canonicalEstimateOperationReference(resource.resource_graph?.operationCompositionV1);
    if (!operation || operation.processOrdinal == null) return resource;
    const body = { ...resource, resource_graph: { ...resource.resource_graph,
      operationCompositionV1: { ...operation, processOrdinal: operation.processOrdinal * operationSpan } }, row_sha256: '' };
    return { ...body, row_sha256: hash(body) };
  });
  const repairResources = repair.resources.map((resource, index) => {
    const operation = canonicalEstimateOperationReference(resource.resource_graph?.operationCompositionV1);
    if (!operation || operation.processOrdinal == null || operation.additionalOperations?.length) {
      throw new Error('STRENGTH_REPAIR_R4_EXACT_REPAIR_OPERATION_REQUIRED');
    }
    const body = { ...resource, ordinal: strength.resources.length + index,
      resource_graph: { ...resource.resource_graph,
        // This existing balance control follows its covering rows in the
        // ordinary compiler. It records the supported part of restoration;
        // the original whole-system material need must remain unresolved.
        ...(resource.row_id === repairRowR3('dry-reserve-deficit') ? {
          scopeRequirementV1: { contractVersion: 'canonical-scope-requirement/v1',
            kind: 'PARTLY_INCLUDED', groupId: restore.groupId, groupTitleRu: restore.groupTitleRu,
            titleRu: 'Материальное обеспечение восстановления мест испытаний',
            reasonRu: 'Рассчитаны измеренный расход и поставка для принятой программы замесов. Полная система ремонта, потери, подготовка, труд, уход и очистка ещё требуют подтверждения.',
            exactScopeWhen: { kind: 'and', operands: [
              { kind: 'greater_than', parameterId: repairParameterR3('patch_count'), value: 0 },
              { kind: 'not', operand: { kind: 'formula_greater_than', expression: materialDeficitExpression,
                unitId: 'kg', value: 0 } },
            ] },
            coveringRowIds: ['theoretical-dry', 'mixing-charge-dry', 'dry-material-order',
              'dry-consumption-shortage'].map(repairRowR3),
            originalRowIds: [strengthDirectRowR2('repair-mortar')],
            costExclusionBreaksScopeV1: true,
            sourceEvidence: [{ sha256: repairSourcePackR3.sourceArtifacts[0].sha256,
              locator: 'GB April2025 PDS2-4; measured hand repair and actual whole-charge supply only; whole-method acceptance remains open' }],
          },
        } : {}), operationCompositionV1: {
        ...operation, groupId: restore.groupId, groupTitleRu: restore.groupTitleRu,
        processOrdinal: parentOrdinal + operation.processOrdinal + 1,
        additionalOperations: [{ operationId: restore.operationId, operationTitleRu: restore.operationTitleRu,
          completionCriterionRu: restore.completionCriterionRu, processOrdinal: parentOrdinal,
          processRole: restore.processRole, whenResourcePresent: restoreRows.map(row => row.row_id) }],
      } }, row_sha256: '' };
    return { ...body, row_sha256: hash(body) };
  });
  return Object.freeze({ parameters: Object.freeze(parameters),
    formulas: Object.freeze([...strength.formulas, ...repair.formulas]),
    resources: Object.freeze([...parentResources, ...repairResources]),
    runtimeInput: Object.freeze({}), runtimeClassification: Object.freeze({}), runtimeSourceIds: Object.freeze({}),
    ordinaryParameterIds: Object.freeze(parameters.filter(p => geometryIds.has(p.parameter_id)).map(p => p.parameter_id)),
  });
}
