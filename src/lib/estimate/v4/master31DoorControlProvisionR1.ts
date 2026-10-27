import sourcePack from '../../../../data/estimate-benchmarks/source-packs/master31-door-control-provision-r1.json';
import snapshot from '../../../../data/estimate-benchmarks/fixtures/master31-door-control-current-parent-r1.json';
import { buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { canonicalEstimateStableJson } from '../backendPlatform/canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from '../backendPlatform/canonicalEstimateSha256';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

type Json = Record<string, any>;
export const master31DoorControlProvisionPackR1 = sourcePack;
const pack = master31DoorControlProvisionPackR1;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const factory = { kind: 'equals' as const, parameterId: pack.factorySelectorId, value: pack.factoryChoice };
// `selected`, unlike ordinary equals, is false when the optional method is absent.
// This keeps every old need active for the ordinary existing factory input.
const selected = { kind: 'selected', parameterId: pack.selectorId, value: pack.selectedMethod };
const active = { kind: 'and', operands: [factory, selected] };
const group = 'manufacturer-factory:apartment-door-standard';
const provisionOperation = pack.prefix + ':operation:provision';
const measurementOperation = pack.prefix + ':operation:measurement';
const controlOperation = pack.prefix + ':operation:control';
// Independent whole-method roster. A coordinated deletion/change in pack and rows
// must not turn an incomplete station into a complete one.
const REQUIRED_CONTROL_INVENTORY_R1: Readonly<Record<string, readonly [string, string, string]>> = {
  level: ['equipment', 'item', '1'], tape: ['equipment', 'item', '1'], pencil: ['material', 'item', '1'],
  caliper: ['equipment', 'item', '1'], 'fresh-cell': ['material', 'item', '1'],
  'feeler-set': ['equipment', 'set', '1'], 'feeler-blades': ['equipment', 'item', '19'],
  plumb: ['equipment', 'item', '1'], 'plumb-line': ['equipment', 'm', '5'], paper: ['material', 'item', '1'],
  case: ['equipment', 'item', '1'], 'level-case': ['equipment', 'item', '1'], cloth: ['material', 'item', '1'],
};
function rehash<T extends { row_sha256: string }>(row: T): T {
  const { row_sha256: _old, ...body } = row;
  return { ...body, row_sha256: estimateDeterministicHash(body) } as T;
}

export function master31DoorControlCoverageR1(): Json {
  return { kind: 'and', operands: [factory, selected,
    { kind: 'greater_than', parameterId: pack.frontCountId, value: 0 },
    { kind: 'less_than_or_equal', parameterId: pack.frontCountId, valueParameterId: pack.factoryCountId }] };
}

/** Exact read-only v4 graph, with all database fields retained. No live read. */
export function master31DoorControlParentR1(): AutomaticOwnerDefinition {
  const capture = clone(snapshot.capture);
  return { parameters: capture.parameters, formulas: capture.formulas, resources: capture.resources,
    runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {},
    ordinaryParameterIds: ['q', pack.factorySelectorId, pack.factoryCountId] } as unknown as AutomaticOwnerDefinition;
}

/** A complete initially usable control station, not installation completion,
 * actual measurements, new tool purchases, wear, labour hours or productivity. */
export function appendMaster31DoorControlProvisionR1(
  parent: AutomaticOwnerDefinition = master31DoorControlParentR1(),
): AutomaticOwnerDefinition {
  const body = { parameters: parent.parameters, formulas: parent.formulas, resources: parent.resources };
  if (canonicalEstimateSha256HexText(canonicalEstimateStableJson(body)) !== pack.parentComputationSha256
    || snapshot.capture.definition.id !== pack.parentDefinitionId
    || snapshot.capture.definition.definition_sha256 !== pack.parentDefinitionSha256) {
    throw new Error('MASTER31_DOOR_EXACT_V4_PARENT_REQUIRED');
  }
  const originalIds = new Set(parent.parameters.map(p => p.parameter_id));
  const specs: AutomaticParameterSpec[] = [
    { id: pack.factoryCountId, title: 'Число одинаковых дверных блоков', kind: 'ordinary', valueType: 'integer', unitId: 'piece', min: 1, max: 1000000 },
    { id: pack.selectorId, title: 'Как обеспечен измерительный контроль двери?', kind: 'conditional', valueType: 'enum', unitId: null,
      values: [pack.selectedMethod, pack.unresolvedMethod] },
    { id: pack.frontCountId, title: 'Число одновременно работающих измерительно-контрольных фронтов', kind: 'conditional', valueType: 'integer', unitId: 'piece',
      min: 1, max: 1000000, numericPeerConstraints: { lessThanOrEqualParameter: pack.factoryCountId },
      requiredWhen: { kind: 'equals', parameterId: pack.selectorId, value: pack.selectedMethod } },
    ...pack.additionalNeeds.map(n => ({ id: n.parameterId, title: n.titleRu, kind: 'conditional' as const,
      valueType: 'decimal' as const, unitId: n.unitId, min: 0 })),
  ];
  const rows: AutomaticRowSpec[] = [
    { rowId: pack.ownerRowId, formulaId: pack.prefix + ':formula:provision', title: pack.ownerTitleRu,
      section: 'Измерительно-контрольное оснащение', category: 'equipment', unitId: 'set',
      expression: pack.frontCountId, procurement: false, costTreatment: 'OWN_COST' },
    ...pack.parts.map(part => ({ rowId: part.rowId, formulaId: part.formulaId, title: part.titleRu,
      section: 'Состав измерительно-контрольного комплекта', category: part.category, unitId: part.unitId,
      expression: pack.frontCountId + '*' + part.perFront, procurement: false,
      costTreatment: 'INCLUDED_IN_RESOURCE_ROWS' as const })),
    ...pack.additionalNeeds.map(n => ({ rowId: n.rowId, formulaId: n.formulaId, title: n.titleRu,
      section: 'Нерассчитанные потребности монтажа и возобновления', category: 'material', unitId: n.unitId,
      expression: n.parameterId, procurement: false, costTreatment: 'INFORMATIONAL_SCOPE' as const })),
  ];
  const dsv = pack.sources.find(s => s.key === 'dsv')!;
  const built = buildAutomaticConstructionOwnerR1({ contract: pack.contract, semanticOwner: pack.prefix,
    sourceId: pack.sourceId, normId: pack.normId,
    sourceMetadata: { source_title: 'ДСВ: измерительно-контрольное оснащение по организационному методу',
      source_document_version: 'ДСВ5.0/1.2025 + door-control-serial-front/r1', definition_hash: dsv.sha256,
      artifact_sha256: dsv.sha256, exact_locator: dsv.locator },
    applicabilityRu: pack.boundariesRu.join(' '), ordinary: [], profile: [], conditional: specs,
    rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.boundariesRu });
  const parameters = [...parent.parameters, ...built.parameters.filter(p => !originalIds.has(p.parameter_id)).map((p, i) => {
    const need = pack.additionalNeeds.find(n => n.parameterId === p.parameter_id);
    if (need) return { ...p, ordinal: parent.parameters.length + i, required: false,
      truth_metadata: unresolvedApplicationNormTruthR1(p.truth_metadata, need.reasonRu) };
    return { ...p, ordinal: parent.parameters.length + i, required: false,
      truth_metadata: { ...p.truth_metadata, value_source_role: 'PROJECT_SPECIFIC_INPUT', source_confirmation_required: false,
        visible_when: p.parameter_id === pack.selectorId ? factory : active,
        provenance: { consumer_input_role_v1: 'OBJECT_FACT' },
        guide: { ...p.truth_metadata.guide as Json, guide_kind: 'PROJECT_DEFINED', source_role: 'PROJECT_DOCUMENTATION',
          guide_short_ru: p.parameter_id === pack.frontCountId
            ? 'Укажите фактическое число одновременно действующих фронтов. Один комплект используется последовательно на каждом фронте. Число дверей, q и часы не подставляются.'
            : 'Выберите организационный метод оснащения. Это не подтверждение результатов замеров, готовности проёма, безопасности или монтажа.' } } };
  })];
  const additions = built.resources.map((row, index) => {
    const part = pack.parts.find(p => p.rowId === row.row_id);
    const need = pack.additionalNeeds.find(n => n.rowId === row.row_id);
    const isOwner = row.row_id === pack.ownerRowId;
    const source = pack.sources.find(s => s.key === (part?.sourceKey ?? need?.sourceKey));
    const operationId = isOwner ? provisionOperation : need ? pack.prefix + ':operation:need:' + need.key : measurementOperation;
    return rehash({ ...row, ordinal: parent.resources.length + index,
      inclusion_ast: need?.condition === 'FACTORY_DOOR_OTHER_INSTALLATION_SCOPE' ? factory : active,
      ...(part ? { cost_owner_id: pack.ownerRowId } : {}),
      resource_graph: { ...row.resource_graph,
        ...(part ? { parentCostOwnerId: pack.ownerRowId, includedInResourceOwnerRowId: pack.ownerRowId } : {}),
        ...(!need ? { derivedQuantityEditPolicyV1: { contractVersion: 'canonical-derived-quantity-edit-policy/v1',
          mode: 'PARAMETERS_ONLY', unitId: row.unit_id, parameterIds: [pack.frontCountId],
          reasonRu: 'Начальное оснащение меняется числом одновременно работающих фронтов, не числом дверей или ручным количеством строки.' } } : {}),
        operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1', groupId: group,
          groupTitleRu: 'Установка квартирной стальной двери', operationId,
          operationTitleRu: isOwner ? 'Обеспечение измерительного фронта' : need ? need.titleRu : 'Измерение и выверка дверного блока',
          processOrdinal: 20, completionCriterionRu: 'Функциональная доступность указанного оснащения; результаты замеров и монтаж не приняты.',
          ...(part ? { additionalOperations: [{ operationId: controlOperation, operationTitleRu: 'Контроль геометрии и прилегания',
            processOrdinal: 40, completionCriterionRu: 'Тот же экземпляр прибора доступен для последовательного контроля; фактический результат не предполагается.' }] } : {}) },
        publicResourcePresentationV1: { contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: row.title_ru,
          nameRu: row.title_ru, brandAndModelRu: null, specificationRu: null, detailsRu: [] } },
      source_metadata: { ...row.source_metadata,
        sourceRole: need ? 'UNRESOLVED_APPLICATION_NORM' : 'VERSIONED_ORGANISATIONAL_PHYSICAL_PROVISION_NOT_CONSUMPTION_NORM',
        normativeTrace: need || !source ? [] : [{ sourceId: pack.sourceId, source_id: pack.sourceId, normId: pack.normId,
          exact_locator: source.locator, artifact_sha256: source.sha256, official_url: source.officialUrl,
          evidenceRole: 'MANUFACTURER_CAPABILITY_OR_REQUIRED_OPERATION_ONLY', quantityNormClaimed: false }],
        ...(need ? { normative_source_ids: [], missingPhysicalQuantityReasonRu: need.reasonRu, commercialScopeUnresolved: true,
          applicabilityConditionUnconfirmed: need.condition } : { physicalProvisionAccepted: true,
          sourceNormQuantityAccepted: false, physicalProvisionMethod: pack.engineeringMethod.version,
          initialUsableInventoryOnly: true, manufacturerCrewNormClaimed: false,
          internalSelectedSourceModel: part?.sourceBoundary ?? null,
          physicalProvisionMethodEvidence: { kind: 'ENGINEERING_ORGANIZATION', methodVersion: pack.engineeringMethod.version,
            sourcePackPath: 'data/estimate-benchmarks/source-packs/master31-door-control-provision-r1.json',
            frontCountParameterId: pack.frontCountId, inventoryPerFront: part?.perFront ?? '1',
            manufacturerQuantityNormClaimed: false, stockOrPurchaseInferred: false },
          sourceOperationEvidence: { officialUrl: dsv.officialUrl, artifactSha256: dsv.sha256,
            locator: 'DSV5.0/1.2025 PDF15–18,21: required geometry/seal checks, not inventory quantities' },
          quantityMeaning: 'F active fronts times declared functional inventory; not N doors, purchases, wear or hours.' }),
        automaticGenericPriceInheritanceAllowed: false,
        automaticLegacyPriceOrQuantityTransferAllowed: false, onsiteInstallationQuantitiesAdmitted: false,
        full_technical_acceptance: false, completeInstallation: false, actualMeasurementsOrAcceptanceProved: false,
        supplyPriceScope: need ? 'No commercial owner admitted for this additional unknown need.' : pack.engineeringMethod.priceScope } });
  });
  const retained = parent.resources.map(row => pack.closedOldNeedRowIds.includes(row.row_id) ? rehash({ ...row,
    inclusion_ast: { kind: 'and', operands: [row.inclusion_ast, { kind: 'not', operand: master31DoorControlCoverageR1() }] },
    source_metadata: { ...row.source_metadata, completionNeedTransitionV1: { featureContract: pack.contract,
      selectedMethodParameterId: pack.selectorId, resolvedOnlyForMethod: pack.selectedMethod,
      resolvedThroughPaidOwnerRowId: pack.ownerRowId, automaticLegacyPriceOrQuantityTransferAllowed: false } } }) : row);
  const next = { ...parent, parameters, formulas: [...parent.formulas, ...built.formulas], resources: [...retained, ...additions] };
  assertMaster31DoorControlProvisionR1(next);
  return next;
}

/** Finite inventory contract authored from the method roster, not emitted row counts. */
export function assertMaster31DoorControlProvisionR1(definition: AutomaticOwnerDefinition): void {
  const expectedKeys = Object.keys(REQUIRED_CONTROL_INVENTORY_R1).sort();
  if (pack.parts.length !== 13 || JSON.stringify(pack.parts.map(p => p.key).sort()) !== JSON.stringify(expectedKeys)) {
    throw new Error('MASTER31_CONTROL_FIXED_WHOLE_ROSTER_REQUIRED');
  }
  const fronts = definition.parameters.find(p => p.parameter_id === pack.frontCountId);
  if (!fronts || fronts.unit_id !== 'piece' || fronts.value_type !== 'integer' || fronts.default_value !== null) {
    throw new Error('MASTER31_CONTROL_EXPLICIT_FRONT_FACT_REQUIRED');
  }
  const owner = definition.resources.find(r => r.row_id === pack.ownerRowId);
  if (!owner || owner.resource_graph.costTreatment !== 'OWN_COST' || owner.unit_id !== 'set'
    || owner.procurement_eligible !== false || owner.source_metadata?.automaticGenericPriceInheritanceAllowed !== false) {
    throw new Error('MASTER31_CONTROL_SEPARATE_PROVISION_OWNER_REQUIRED');
  }
  if (definition.formulas.find(f => f.formula_id === pack.prefix + ':formula:provision')?.expression_source !== pack.frontCountId) {
    throw new Error('MASTER31_CONTROL_SEPARATE_PROVISION_OWNER_REQUIRED');
  }
  for (const part of pack.parts) {
    const fixed = REQUIRED_CONTROL_INVENTORY_R1[part.key];
    const row = definition.resources.find(r => r.row_id === part.rowId);
    const formula = definition.formulas.find(f => f.formula_id === part.formulaId);
    if (!fixed || part.category !== fixed[0] || part.unitId !== fixed[1] || part.perFront !== fixed[2]
      || part.rowId !== pack.prefix + ':' + part.key || part.formulaId !== pack.prefix + ':formula:' + part.key
      || !row || row.unit_id !== fixed[1] || row.category !== fixed[0] || row.cost_owner_id !== pack.ownerRowId
      || row.resource_graph.costTreatment !== 'INCLUDED_IN_RESOURCE_ROWS' || row.procurement_eligible !== false
      || row.resource_graph.includedInResourceOwnerRowId !== pack.ownerRowId
      || row.source_metadata?.automaticGenericPriceInheritanceAllowed !== false
      || formula?.expression_source !== pack.frontCountId + '*' + fixed[2]) {
      throw new Error('MASTER31_CONTROL_COMPLETE_INVENTORY_OR_OWNER_INVALID:' + part.key);
    }
  }
}

export function master31DoorControlCompletenessR1(): Json {
  const prior = clone(snapshot.capture.contentPassport.decision.independentCompletenessMap) as Json;
  const common = { sourceId: pack.sourceId, condition: 'EXPLICIT_CONTROL_METHOD_AND_VALID_F_ONLY',
    exactTechnologyChoice: master31DoorControlCoverageR1(), quantityRule: 'VERSIONED_FUNCTIONAL_INVENTORY_PER_SIMULTANEOUS_FRONT_NOT_CONSUMPTION' };
  return { ...prior, sourceKind: 'PROJECT_SYSTEM',
    evidenceSha256: canonicalEstimateSha256HexText(canonicalEstimateStableJson({
      retainedParentEvidenceSha256: prior.evidenceSha256, method: pack.engineeringMethod,
      independentFixedInventory: REQUIRED_CONTROL_INVENTORY_R1,
      sources: pack.sources, retainedNeedIds: pack.oldNeeds.map(n => n.rowId),
      additionalPotentialNeedIds: pack.additionalNeeds.map(n => n.rowId),
    })), generatedFromCurrentRows: false, fullTechnicalAcceptance: false, completeInstallation: false,
    evidenceReferences: [...prior.evidenceReferences, ...pack.sources.map(s => s.officialUrl + ' ' + s.locator)],
    entries: [...prior.entries.map((entry: Json) => pack.closedOldNeedRowIds.includes(entry.resolution?.rowId)
      ? { ...entry, exactTechnologyChoice: { kind: 'not', operand: master31DoorControlCoverageR1() },
        condition: 'Retained original need unless the complete selected control provision is resolved.' } : entry),
      { ...common, expectedResourceId: pack.sourceId + ':provision', operationId: provisionOperation,
        requiredOperationIds: [provisionOperation], category: 'equipment', unitId: 'set', specification: pack.ownerTitleRu,
        formulaId: pack.prefix + ':formula:provision', resolution: { kind: 'ROW', rowId: pack.ownerRowId } },
      ...pack.parts.map(part => ({ ...common, expectedResourceId: pack.sourceId + ':' + part.key, operationId: measurementOperation,
        requiredOperationIds: [measurementOperation, controlOperation], category: part.category, unitId: part.unitId,
        specification: part.sourceBoundary, formulaId: part.formulaId,
        resolution: { kind: 'INCLUDED_COMPONENT_ROW', rowId: part.rowId, parentRowId: pack.ownerRowId } })),
      ...pack.additionalNeeds.map(need => ({ expectedResourceId: pack.sourceId + ':need:' + need.key, sourceId: pack.sourceId,
        operationId: pack.prefix + ':operation:need:' + need.key, requiredOperationIds: [pack.prefix + ':operation:need:' + need.key],
        category: 'material', unitId: need.unitId, specification: need.reasonRu, condition: need.condition,
        quantityRule: 'UNRESOLVED_PHYSICAL_AND_COMMERCIAL_SCOPE_NOT_ZERO', formulaId: need.formulaId,
        resolution: { kind: 'ROW', rowId: need.rowId } }))],
    unresolvedOnsiteNeedRowIds: [...pack.oldNeeds.map(n => n.rowId), ...pack.additionalNeeds.map(n => n.rowId)],
    conditionalRetainedNeedRowIds: pack.closedOldNeedRowIds, completeInitialControlProvisionOnly: false,
    conditionalCompleteProvision: { selectorParameterId: pack.selectorId, selectedMethod: pack.selectedMethod,
      coverageCondition: master31DoorControlCoverageR1(), resolvedNeedRowIds: pack.closedOldNeedRowIds,
      selectedScopeUnresolvedNeedRowIds: [...pack.oldNeeds.filter(n => !pack.closedOldNeedRowIds.includes(n.rowId)).map(n => n.rowId),
        ...pack.additionalNeeds.map(n => n.rowId)], completeInstallation: false } };
}
