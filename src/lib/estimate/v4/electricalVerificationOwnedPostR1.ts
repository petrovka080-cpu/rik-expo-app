import pack from '../../../../data/estimate-benchmarks/source-packs/electrical-verification-owned-post-r1.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec}
  from './automaticConstructionOwnerR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

export const electricalVerificationOwnedPostPackR1 = pack;
export const electricalVerificationOwnedPostRowR1 = (key: string) => pack.prefix + ':' + key;
const row = electricalVerificationOwnedPostRowR1;
const required = {kind: 'equals' as const, parameterId: pack.methodId, value: pack.method};
const selected = {kind: 'selected', parameterId: pack.methodId, value: pack.method};
const parentProfile = {kind: 'selected', parameterId: pack.socketSelectorId, value: pack.socketProfile};
const instrumentKeys = ['voltage-indicator', 'proving-unit', 'proving-batteries', 'proving-magnetic-hanger',
  'voltage-kit-case', 'installation-tester', 'continuity-red-lead', 'continuity-green-lead',
  'continuity-red-probe', 'continuity-green-probe', 'continuity-red-gs38-cap', 'continuity-green-gs38-cap',
  'continuity-red-clip', 'continuity-green-clip', 'continuity-zero-adapter', 'continuity-batteries',
  'continuity-padded-strap', 'continuity-hard-case'];

/** A noncommercial, initially usable instrument inventory. This leaf reuses
 * frozen Master32 capability/BOM evidence. It does not reuse the panel's cable,
 * strip length, connector, single-post scheduling formula or installation rate. */
export function electricalVerificationOwnedPostR1(): AutomaticOwnerDefinition & {
  publicationAllowed: false; completeInstallation: false;
} {
  const conditional: AutomaticParameterSpec[] = [
    {id: pack.socketSelectorId, title: 'Профиль установки розетки', kind: 'conditional', valueType: 'enum',
      unitId: null, values: [pack.socketProfile]},
    {id: pack.methodId, title: 'Собственное измерительное оснащение', kind: 'conditional', valueType: 'enum',
      unitId: null, values: [pack.method, pack.unresolvedMethod]},
    {id: pack.countId, title: 'Фактическое число целых пригодных собственных измерительных комплектов',
      kind: 'conditional', valueType: 'integer', unitId: 'set', min: 1, requiredWhen: required},
    {id: pack.scheduleId, title: 'Ведомость собственных приборов, принадлежностей, состояния и документов проверки',
      kind: 'conditional', valueType: 'text', unitId: null, requiredWhen: required},
    {id: pack.fitId, title: 'Условия применимости выбранного измерительного оснащения', kind: 'conditional',
      valueType: 'enum', unitId: null, values: [pack.fit], requiredWhen: required},
    ...pack.openNeeds.map(n => ({id: n.parameterId, title: n.titleRu, kind: 'internal' as const,
      valueType: 'decimal' as const, unitId: null, requiredWhen: required})),
  ];
  const facts = [pack.countId, pack.scheduleId, pack.fitId];
  const active = {kind: 'and', operands: [parentProfile, selected]};
  const rows: AutomaticRowSpec[] = [
    ...pack.parts.map(t => ({rowId: row(t.key), formulaId: row('formula:' + t.key),
      section: 'Собственное измерительное оснащение', category: 'equipment', title: t.titleRu,
      unitId: t.unitId, expression: pack.countId + '*' + t.countPerPost,
      costTreatment: 'INFORMATIONAL_SCOPE' as const, procurement: false, inputParameterIds: facts})),
    ...pack.openNeeds.map(n => ({rowId: row('need:' + n.key), formulaId: row('formula:need:' + n.key),
      section: 'Неопределённое обслуживание и дополнительные измерения', category: n.category, title: n.titleRu,
      unitId: '', expression: n.parameterId, costTreatment: 'INFORMATIONAL_SCOPE' as const, procurement: false,
      inputParameterIds: facts})),
  ];
  const primary = pack.sources.find(s => s.id === 'vipd150-srd-datasheet');
  if (!primary || JSON.stringify(pack.parts.map(t => t.key)) !== JSON.stringify(instrumentKeys)
    || pack.parts.some(t => t.unitId !== 'piece' || t.countPerPost !== (t.key.endsWith('-batteries') ? 6 : 1))
    || pack.parts.length !== 18 || pack.parts.reduce((n, p) => n + p.countPerPost, 0) !== 28
    || pack.parts.some(p => p.key === 'stripper-cutter' || p.key === 'measuring-rule' || p.key === 'slotted-screwdriver')) {
    throw Error('ELECTRICAL_VERIFICATION_EXACT_INSTRUMENT_ONLY_BOM_REQUIRED');
  }
  const built = buildAutomaticConstructionOwnerR1({contract: pack.contract, semanticOwner: pack.catalogId,
    sourceId: pack.sourceId, normId: 'OWNED_INITIAL_INSTRUMENT_INVENTORY_NOT_CONSUMPTION_OR_TEST_RESULTS',
    sourceMetadata: {source_title: pack.titleRu, source_document_version: 'Master32 frozen capability/BOM reuse; socket scope candidate',
      definition_hash: hash(pack), artifact_sha256: primary.sha256, exact_locator: primary.locatorRu},
    applicabilityRu: pack.scopeRu, ordinary: [], profile: [], conditional, rows,
    deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.excludedRu});
  const parameters = built.parameters.map(p => {
    const need = pack.openNeeds.find(n => n.parameterId === p.parameter_id);
    return need ? {...p, truth_metadata: {...unresolvedApplicationNormTruthR1(p.truth_metadata, need.reasonRu),
      guide: {guide_kind: 'PROJECT_DEFINED', source_role: 'UNRESOLVED_APPLICATION_NORM',
        source_document: pack.sourceId, source_locator: need.reasonRu, guide_validation_policy: 'MANDATORY_BLOCK'},
      projectAuthenticated: false, sourceAuthorityPromoted: false}}
      : {...p, truth_metadata: {...p.truth_metadata, value_source_role: 'PROJECT_SPECIFIC_INPUT',
        source_confirmation_required: false, provenance: {consumer_input_role_v1: 'OBJECT_FACT'}, projectAuthenticated: false}};
  });
  const resources = built.resources.map(r => {
    const part = pack.parts.find(t => r.row_id === row(t.key));
    const formula = built.formulas.find(f => f.formula_id === r.formula_id);
    if (!formula) throw Error('ELECTRICAL_VERIFICATION_EXACT_FORMULA_REQUIRED');
    const usingKeys = part ? Object.entries(pack.partUsingOperationKeys).find(([key]) => key === part.key)?.[1] : ['qa-close'];
    if (!usingKeys?.length) throw Error('ELECTRICAL_VERIFICATION_USING_OPERATION_REQUIRED');
    const using = usingKeys.map(key => {
      const operation = pack.usingOperations.find(o => o.id === pack.usingOperationGroupId + ':' + key);
      if (!operation) throw Error('ELECTRICAL_VERIFICATION_EXACT_EXISTING_OPERATION_REQUIRED:' + key);
      return {operationId: operation.id, operationTitleRu: operation.titleRu, processOrdinal: operation.processOrdinal,
        processRole: 'PROCESS' as const,
        completionCriterionRu: 'Оснащение пригодно и доступно по ведомости; результаты измерений не приняты.'};
    });
    if (!using[0]) throw Error('ELECTRICAL_VERIFICATION_USING_OPERATION_REQUIRED');
    const {row_sha256: _old, ...body} = r;
    const next = {...body, inclusion_ast: active, cost_owner_id: null,
      resource_graph: {...r.resource_graph,
        ...(part ? {derivedQuantityEditPolicyV1: {contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY',
          unitId: r.unit_id, parameterIds: formula.input_parameter_ids,
          reasonRu: 'Целое пригодное оснащение задаётся фактической ведомостью; число розеток не является числом приборов.'}} : {}),
        operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: pack.usingOperationGroupId,
          groupTitleRu: pack.usingOperationGroupTitleRu, ...using[0], additionalOperations: using.slice(1)},
        physicalProvisionV1: {basis: 'ACTUAL_OWNED_USABLE_WHOLE_INSTRUMENT_INVENTORY', actualInventoryParameterId: pack.countId,
          inventoryMultiplier: part?.countPerPost ?? null, actualWarehouseClaimed: false, newPurchaseClaimed: false,
          rentalDurationClaimed: false, consumptionOrWearNormClaimed: false,
          manufacturerProfile: part?.profile ?? null},
        publicResourcePresentationV1: {contractVersion: 'canonical-public-resource-presentation/v1',
          nameRu: r.title_ru, sourceTitleRu: r.title_ru, brandAndModelRu: null, specificationRu: null, detailsRu: []}},
      source_metadata: {...r.source_metadata, normativeTrace: [],
        sourceRole: part ? 'FROZEN_PRIMARY_CAPABILITY_INITIAL_BOM_REFERENCE' : 'UNRESOLVED_APPLICATION_NORM',
        primaryCapabilityArtifacts: part ? pack.sources.filter(s => part.sourceArtifactIds.includes(s.id)) : [],
        exact_locator: part?.locator ?? null, automaticGenericPriceInheritanceAllowed: false,
        actualElectricalTestsOrSafeIsolationProved: false, full_technical_acceptance: false,
        sourceAuthorityPromoted: false, projectAuthenticated: false, publicationAllowed: false,
        wholeInstallationNotClaimed: true, includedInstallationOrKitPayment: false}};
    return {...next, row_sha256: hash(next)};
  });
  return {...built, parameters, resources, publicationAllowed: false, completeInstallation: false};
}

/** Replace only the three broad instrument displays of the composable socket
 * candidate after explicit whole-inventory selection and known usable count.
 * No existing panel source, historical calculation, payment or order is touched. */
export function appendElectricalVerificationOwnedPostR1(parent: AutomaticOwnerDefinition): AutomaticOwnerDefinition {
  const covered = pack.coveredCandidateRowIds;
  if (!covered.every(id => parent.resources.some(r => r.row_id === id))
    || !parent.parameters.some(p => p.parameter_id === pack.socketSelectorId)) {
    throw Error('ELECTRICAL_VERIFICATION_EXACT_SOCKET_CANDIDATE_REQUIRED');
  }
  const added = electricalVerificationOwnedPostR1(), ids = new Set(parent.parameters.map(p => p.parameter_id));
  if (added.parameters.some(p => ids.has(p.parameter_id) && p.parameter_id !== pack.socketSelectorId)
    || added.resources.some(r => parent.resources.some(old => old.row_id === r.row_id))
    || added.formulas.some(f => parent.formulas.some(old => old.formula_id === f.formula_id))) {
    throw Error('ELECTRICAL_VERIFICATION_ID_COLLISION');
  }
  const coverage = {kind: 'and', operands: [parentProfile, selected,
    {kind: 'selected', parameterId: pack.fitId, value: pack.fit},
    {kind: 'greater_than', parameterId: pack.countId, value: 0},
    {kind: 'present', parameterId: pack.scheduleId}]};
  const resources = parent.resources.map(r => {
    if (!covered.includes(r.row_id)) return r;
    const {row_sha256: _old, ...body} = r;
    const next = {...body, inclusion_ast: {kind: 'and', operands: [r.inclusion_ast, {kind: 'not', operand: coverage}]}};
    return {...next, row_sha256: hash(next)};
  });
  resources.push(...added.resources.map((r, i) => {
    const {row_sha256: _old, ...body} = r, next = {...body, ordinal: parent.resources.length + i};
    return {...next, row_sha256: hash(next)};
  }));
  const parameters = parent.parameters.map(p => {
    const prior = p.constraints_json?.requiredWhen;
    if (!pack.coveredCandidateParameterIds.includes(p.parameter_id) || prior == null
      || typeof prior !== 'object' || Array.isArray(prior)) return p;
    return {...p, constraints_json: {...p.constraints_json,
      requiredWhen: {kind: 'and', operands: [prior, {kind: 'not', operand: coverage}]}}};
  });
  return {...parent, parameters: [...parameters, ...added.parameters.filter(p => !ids.has(p.parameter_id))
    .map((p, i) => ({...p, ordinal: parent.parameters.length + i}))],
    formulas: [...parent.formulas, ...added.formulas], resources};
}
