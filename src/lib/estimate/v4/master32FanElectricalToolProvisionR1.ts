import referenceMethodArtifact from '../../../../data/estimate-benchmarks/source-packs/fan-prepared-opening-reference-method-r610-r1.json';
import {manufacturerDoorFanFactoryDefinitionR1,manufacturerDoorFanFactoryKitsPackR1} from './manufacturerDoorFanFactoryKitsR1';
import artifact from '../../../../data/estimate-benchmarks/source-packs/master32-fan-electrical-tool-provision-r1.json';
import captured from '../../../../data/estimate-benchmarks/fixtures/master32-fan-electrical-current-parents-r1.json';
import { buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { canonicalEstimateStableJson } from '../backendPlatform/canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from '../backendPlatform/canonicalEstimateSha256';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

type Json = Record<string, any>;
export const master32FanElectricalToolProvisionPackR1 = artifact;
const pack = master32FanElectricalToolProvisionPackR1;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
// Fixed independent method inventory. Never infer completeness by emitted count
// or permit a coordinated removal from both the source pack and definition.
const INVENTORY: Readonly<Record<string, readonly [string, string, string]>> = {
  stripper: ['equipment', 'item', '1'], 'jacket-tool': ['equipment', 'item', '1'],
  'jacket-cap': ['equipment', 'item', '1'], 'jacket-spare-blade': ['equipment', 'item', '1'],
  'needle-pliers': ['equipment', 'item', '1'],
  'driver-slot15': ['equipment', 'item', '1'], 'driver-slot20': ['equipment', 'item', '1'],
  'driver-slot25': ['equipment', 'item', '1'], 'driver-slot30': ['equipment', 'item', '1'],
  'driver-ph0': ['equipment', 'item', '1'], 'driver-ph00': ['equipment', 'item', '1'],
  'driver-holder': ['equipment', 'item', '1'], 'driver-ph1': ['equipment', 'item', '1'], 'driver-ph2': ['equipment', 'item', '1'],
  'voltage-indicator': ['equipment', 'item', '1'], 'indicator-prods': ['equipment', 'item', '2'],
  'indicator-lead': ['equipment', 'item', '1'], 'prod-shrouds': ['equipment', 'item', '2'],
  prover: ['equipment', 'item', '1'], 'prover-cells': ['material', 'item', '6'],
  'prover-hanger': ['equipment', 'item', '1'], 'instrument-case': ['equipment', 'item', '1'],
  'tool-case': ['equipment', 'item', '1'], 'clean-cloth': ['material', 'item', '1'],
};

const RESOURCE_KINDS:Readonly<Record<string,string>>={
 'stripper':'TOOL',
 'jacket-tool':'TOOL',
 'jacket-cap':'ACCESSORY',
 'jacket-spare-blade':'ACCESSORY',
 'needle-pliers':'TOOL',
 'driver-slot15':'TOOL',
 'driver-slot20':'TOOL',
 'driver-slot25':'TOOL',
 'driver-slot30':'TOOL',
 'driver-ph0':'TOOL',
 'driver-ph00':'TOOL',
 'driver-holder':'ACCESSORY',
 'driver-ph1':'TOOL',
 'driver-ph2':'TOOL',
 'voltage-indicator':'EQUIPMENT',
 'indicator-prods':'ACCESSORY',
 'indicator-lead':'ACCESSORY',
 'prod-shrouds':'ACCESSORY',
 'prover':'EQUIPMENT',
 'prover-cells':'CONSUMABLE',
 'prover-hanger':'ACCESSORY',
 'instrument-case':'ACCESSORY',
 'tool-case':'ACCESSORY',
 'clean-cloth':'CONSUMABLE'
};
const factory = { kind: 'or', operands: pack.factoryChoices.map(value => ({ kind: 'equals', parameterId: pack.factorySelectorId, value })) };
const method = { kind: 'selected', parameterId: pack.selectorId, value: pack.selectedMethod };
const fit = { kind: 'selected', parameterId: pack.compatibilityId, value: pack.compatibleChoice };
const active = { kind: 'and', operands: [factory, method, fit] };
function target(key: string) {
  const result = pack.targets.find(t => t.key === key);
  if (!result) throw Error('MASTER32_FAN_TARGET_REQUIRED');
  return result;
}
function snapshot(key: string): Json {
  const t = target(key), c = captured.captures.find(c => c.definition.id === t.parentDefinitionId);
  if (!c) throw Error('MASTER32_FAN_CAPTURE_REQUIRED');
  return clone(c);
}
function rehash<T extends { row_sha256: string }>(row: T): T {
  const { row_sha256: _prior, ...body } = row;
  return { ...body, row_sha256: estimateDeterministicHash(body) } as T;
}
export function master32FanElectricalCoverageR1(): Json {
  return { kind: 'and', operands: [active,
    { kind: 'greater_than', parameterId: pack.frontCountId, value: 0 },
    { kind: 'less_than_or_equal', parameterId: pack.frontCountId, valueParameterId: pack.factoryCountId }] };
}
/** Same-owner metadata forward only; captured computations remain immutable. */
function retainedNeedBindings(key:string){
 const t=target(key),authored=manufacturerDoorFanFactoryDefinitionR1(t.catalogId),prior=snapshot(key),bindings=new Map<string,Json>();
 for(const need of manufacturerDoorFanFactoryKitsPackR1.needs.hvac!){
  const before=prior.resources.find((r:Json)=>r.row_id===need.rowId),after=authored.resources.find(r=>r.row_id===need.rowId);
  const oldOp=before?.resource_graph?.operationCompositionV1,newOp=after?.resource_graph.operationCompositionV1 as Json|undefined;
  if(!before||!after||before.semantic_owner!==t.catalogId+':'+need.rowId
   ||before.formula_id!==need.formulaId||after.formula_id!==need.formulaId
   ||before.unit_id!==need.unitId||after.unit_id!==need.unitId
   ||before.category!==need.category||after.category!==need.category
   ||before.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM'
   ||after.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM'
   ||oldOp?.groupId!==t.groupId||newOp?.groupId!==t.groupId)
    throw Error('MASTER32_RETAINED_EXACT_SOURCE_LINEAGE_REQUIRED:'+need.rowId);
  bindings.set(need.rowId,{operation:newOp,presentation:after.resource_graph.publicResourcePresentationV1});
 }
 return bindings;
}
export function master32FanElectricalParentR1(key: string): AutomaticOwnerDefinition {
  const c = snapshot(key);
  return { parameters: c.parameters, formulas: c.formulas, resources: c.resources,
    runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {},
    ordinaryParameterIds: ['q', pack.factorySelectorId, pack.factoryCountId] } as AutomaticOwnerDefinition;
}
/** Initial physical tool provision, not labour, purchases, testing results,
 * protective measures, safe isolation hardware or complete installation. */
export function appendMaster32FanElectricalToolProvisionR1(key: string,
  parent: AutomaticOwnerDefinition = master32FanElectricalParentR1(key)): AutomaticOwnerDefinition {
  const t = target(key), c = snapshot(key);
  const body = { parameters: parent.parameters, formulas: parent.formulas, resources: parent.resources };
  if (canonicalEstimateSha256HexText(canonicalEstimateStableJson(body)) !== t.parentComputationSha256
    || c.definition.definition_sha256 !== t.parentDefinitionSha256) throw Error('MASTER32_EXACT_FAN_V4_PARENT_REQUIRED');
  const eqMethod = { kind: 'equals' as const, parameterId: pack.selectorId, value: pack.selectedMethod };
  const specs: AutomaticParameterSpec[] = [
    // Shadow declaration validates the peer unit, then is removed; original N is immutable.
    { id: pack.factoryCountId, title: 'Число одинаковых вентиляторов', kind: 'ordinary', valueType: 'integer', unitId: 'piece', min: 1, max: 1000000 },
    { id: pack.selectorId, title: 'Как обеспечен инструмент электрического подключения?', kind: 'conditional', valueType: 'enum', unitId: null,
      values: [pack.selectedMethod, pack.unresolvedMethod] },
    { id: pack.compatibilityId, title: 'Совместимы ли кабель, клеммы и рабочий пост с выбранным инструментом?', kind: 'conditional', valueType: 'enum', unitId: null,
      values: [pack.compatibleChoice, pack.unconfirmedChoice], requiredWhen: eqMethod },
    { id: pack.frontCountId, title: 'Число одновременно действующих постов электрического подключения', kind: 'conditional', valueType: 'integer', unitId: 'piece', min: 1, max: 1000000,
      numericPeerConstraints: { lessThanOrEqualParameter: pack.factoryCountId }, requiredWhen: eqMethod },
    ...pack.additionalNeeds.map(n => ({ id: n.parameterId, title: n.titleRu, kind: 'conditional' as const, valueType: 'decimal' as const, unitId: n.unitId, min: 0 })),
  ];
  const rows: AutomaticRowSpec[] = [
    { rowId: pack.ownerRowId, formulaId: pack.prefix + ':formula:provision', title: pack.ownerTitleRu,
      section: 'Инструментальный пост электрического подключения', category: 'equipment', unitId: 'set',
      expression: pack.frontCountId, costTreatment: 'OWN_COST', procurement: false },
    ...pack.parts.map(p => ({ rowId: p.rowId, formulaId: p.formulaId, title: p.titleRu,
      section: 'Состав инструментального поста', category: p.category, unitId: p.unitId,
      expression: pack.frontCountId + '*' + p.perFront, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS' as const, procurement: false })),
    ...pack.additionalNeeds.map(n => ({ rowId: n.rowId, formulaId: n.formulaId, title: n.titleRu,
      section: 'Нерассчитанное обслуживание инструментария', category: n.category, unitId: n.unitId,
      expression: n.parameterId, costTreatment: 'INFORMATIONAL_SCOPE' as const, procurement: false })),
  ];
  const manual = pack.sources.find(s => s.key === 'v233')!;
  const built = buildAutomaticConstructionOwnerR1({ contract: pack.contract, semanticOwner: pack.prefix,
    sourceId: t.sourceId, normId: pack.normId,
    sourceMetadata: { source_title: 'Физическое оснащение электрического подключения по организационному методу',
      source_document_version: pack.engineeringMethod.version, definition_hash: manual.sha256,
      artifact_sha256: manual.sha256, exact_locator: manual.locator },
    applicabilityRu: pack.compatibilityObjectFactsRu.join(' '), ordinary: [], profile: [], conditional: specs,
    rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [pack.engineeringMethod.priceScope] });
  const oldIds = new Set(parent.parameters.map(p => p.parameter_id));
  const parameters = [...parent.parameters, ...built.parameters.filter(p => !oldIds.has(p.parameter_id)).map((p, i) => {
    const need = pack.additionalNeeds.find(n => n.parameterId === p.parameter_id);
    if (need) return { ...p, ordinal: parent.parameters.length + i, required: false,
      truth_metadata: unresolvedApplicationNormTruthR1(p.truth_metadata, need.reasonRu) };
    return { ...p, ordinal: parent.parameters.length + i, required: false,
      truth_metadata: { ...p.truth_metadata, value_source_role: 'PROJECT_SPECIFIC_INPUT', source_confirmation_required: false,
        visible_when: p.parameter_id === pack.selectorId ? factory : { kind: 'and', operands: [factory, method] },
        provenance: { consumer_input_role_v1: 'OBJECT_FACT' },
        guide: { ...p.truth_metadata.guide as Json, guide_kind: 'PROJECT_DEFINED', source_role: 'PROJECT_DOCUMENTATION',
          guide_short_ru: p.parameter_id === pack.compatibilityId ? pack.compatibilityObjectFactsRu.join(' ')
            : p.parameter_id === pack.frontCountId ? 'Укажите фактическое число одновременно работающих постов. Один целый комплект используется последовательно на каждом посту; N вентиляторов, q, часы и покупки не подставляются.'
              : 'Выберите организационный способ обеспечения инструментом. Это не результат проверки напряжения, подтверждение квалификации, отключения питания, СИЗ или допуска работ.' } } };
  })];
  const additions = built.resources.map((r, i) => {
    const p = pack.parts.find(p => p.rowId === r.row_id), n = pack.additionalNeeds.find(n => n.rowId === r.row_id);
    const source = pack.sources.find(s => s.key === (p?.sourceKey ?? n?.sourceKey));
    return rehash({ ...r, ordinal: parent.resources.length + i, inclusion_ast: active,
      ...(p ? { cost_owner_id: pack.ownerRowId } : {}),
      resource_graph: { ...r.resource_graph,
        ...(p ? { parentCostOwnerId: pack.ownerRowId, includedInResourceOwnerRowId: pack.ownerRowId } : {}),
        ...(!n ? { derivedQuantityEditPolicyV1: { contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY',
          unitId: r.unit_id, parameterIds: [pack.frontCountId], reasonRu: 'Физическое оснащение определяется числом постов, не числом вентиляторов или ручным количеством строки.' } } : {}),
        operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1', groupId: t.groupId,
          groupTitleRu: t.groupTitleRu, operationId: n?n.rowId+':operation':pack.actualUseOperationId,
          operationTitleRu: n?n.titleRu:'Установка и подключение вытяжного вентилятора', processOrdinal: 30,
          completionCriterionRu: 'Первоначально исправный комплект доступен; подключение, безопасное отключение и фактические проверки не приняты.',
 },
        publicResourcePresentationV1: { contractVersion: 'canonical-public-resource-presentation/v1', resourceKind:n?(n.key==='battery-renewal'?'CONSUMABLE':n.key==='tool-maintenance'?'ACCESSORY':'SERVICE'):p?RESOURCE_KINDS[p.key]:'EQUIPMENT', nameRu: r.title_ru,
          sourceTitleRu: r.title_ru, brandAndModelRu: null, specificationRu: null, detailsRu: [] } },
      source_metadata: { ...r.source_metadata, sourceRole: n ? 'UNRESOLVED_APPLICATION_NORM' : 'VERSIONED_ORGANISATIONAL_PHYSICAL_PROVISION_NOT_CONSUMPTION_NORM',
        normativeTrace: !n && source ? [{ sourceId: t.sourceId, source_id: t.sourceId, normId: pack.normId,
          official_url: source.officialUrl, artifact_sha256: source.sha256, exact_locator: source.locator,
          evidenceRole: 'MANUFACTURER_CAPABILITY_OR_BOM_ONLY', quantityNormClaimed: false }] : [],
        ...(n ? { normative_source_ids: [], missingPhysicalQuantityReasonRu: n.reasonRu, commercialScopeUnresolved: true }
          : { physicalProvisionAccepted: true, sourceNormQuantityAccepted: false, initialUsableInventoryOnly: true,
            physicalProvisionMethodEvidence: { kind: 'ENGINEERING_ORGANIZATION', methodVersion: pack.engineeringMethod.version,
              sourcePackPath: 'data/estimate-benchmarks/source-packs/master32-fan-electrical-tool-provision-r1.json',
              quantityParameterId: pack.frontCountId, inventoryPerFront: p?.perFront ?? '1', manufacturerQuantityNormClaimed: false },
            internalSelectedSourceModel: p?.sourceBoundary ?? null }),
        automaticGenericPriceInheritanceAllowed: false, automaticLegacyPriceOrQuantityTransferAllowed: false,
        actualElectricalTestsOrSafeIsolationProved: false, full_technical_acceptance: false, completeInstallation: false,
        stockOrPurchasesInferred: false, onsiteInstallationQuantitiesAdmitted: false, costAndSupplyScope: pack.engineeringMethod.priceScope } });
  });
  const metadata=retainedNeedBindings(key);
  const forwarded=parent.resources.map(r=>{const binding=metadata.get(r.row_id);return binding?rehash({...r,resource_graph:{...r.resource_graph,operationCompositionV1:binding.operation,publicResourcePresentationV1:binding.presentation}}):r;});
  const retained = forwarded.map(r => r.row_id !== pack.closedOldNeedRowId ? r : rehash({ ...r,
    inclusion_ast: { kind: 'and', operands: [r.inclusion_ast, { kind: 'not', operand: master32FanElectricalCoverageR1() }] },
    source_metadata: { ...r.source_metadata, completionNeedTransitionV1: { featureContract: pack.contract,
      selectedMethodParameterId: pack.selectorId, resolvedOnlyForMethod: pack.selectedMethod,
      resolvedThroughPaidOwnerRowId: pack.ownerRowId, automaticLegacyPriceOrQuantityTransferAllowed: false } } }));
  const result = { ...parent, parameters, formulas: [...parent.formulas, ...built.formulas], resources: [...retained, ...additions] };
  assertMaster32FanElectricalToolProvisionR1(result, key);
  return result;
}

export function assertMaster32FanElectricalToolProvisionR1(d: AutomaticOwnerDefinition, key: string): void {
  const t = target(key);
  if (pack.parts.length !== 24 || JSON.stringify(pack.parts.map(p => p.key).sort()) !== JSON.stringify(Object.keys(INVENTORY).sort()))
    throw Error('MASTER32_FIXED_COMPLETE_ROSTER_REQUIRED');
  const f = d.parameters.find(p => p.parameter_id === pack.frontCountId);
  if (!f || f.unit_id !== 'piece' || f.value_type !== 'integer' || f.default_value !== null) throw Error('MASTER32_EXPLICIT_FRONT_FACT_REQUIRED');
  const owner = d.resources.find(r => r.row_id === pack.ownerRowId);
  if (!owner || owner.resource_graph.costTreatment !== 'OWN_COST' || owner.unit_id !== 'set' || owner.procurement_eligible
    || owner.source_metadata?.automaticGenericPriceInheritanceAllowed !== false) throw Error('MASTER32_SEPARATE_PROVISION_OWNER_REQUIRED');
  for (const p of [{ key: 'provision', rowId: pack.ownerRowId, formulaId: pack.prefix + ':formula:provision', category: 'equipment', unitId: 'set', perFront: '1' }, ...pack.parts]) {
    const expected = p.key === 'provision' ? ['equipment', 'set', '1'] : INVENTORY[p.key];
    const row = d.resources.find(r => r.row_id === p.rowId), formula = d.formulas.find(f => f.formula_id === p.formulaId);
    const op = row?.resource_graph.operationCompositionV1 as Json | undefined;
    const policy = row?.resource_graph.derivedQuantityEditPolicyV1 as Json | undefined;
    if (!expected || p.category !== expected[0] || p.unitId !== expected[1] || p.perFront !== expected[2]
      || !row || row.unit_id !== expected[1] || row.category !== expected[0] || row.procurement_eligible
      || row.source_metadata?.automaticGenericPriceInheritanceAllowed !== false
      || !formula || formula.expression_source !== pack.frontCountId + (p.key === 'provision' ? '' : '*' + expected[2])
      || JSON.stringify(formula.input_parameter_ids) !== JSON.stringify([pack.frontCountId])
      || JSON.stringify(policy?.parameterIds) !== JSON.stringify(formula.input_parameter_ids)
      || op?.groupId !== t.groupId || op?.operationId !== pack.actualUseOperationId
      || (p.key !== 'provision' && (row.cost_owner_id !== pack.ownerRowId
        || row.resource_graph.costTreatment !== 'INCLUDED_IN_RESOURCE_ROWS'
        || row.resource_graph.parentCostOwnerId !== pack.ownerRowId || row.resource_graph.includedInResourceOwnerRowId !== pack.ownerRowId)))
      throw Error('MASTER32_WHOLE_INVENTORY_UNIT_OWNER_OR_DEPENDENCY_INVALID:' + p.key);
  }
}

export function master32FanElectricalCompletenessR1(key: string): Json {
  const t = target(key), prior = snapshot(key).contentPassport.decision.independentCompletenessMap;
  const metadata=retainedNeedBindings(key);
  const forwardedEntries=prior.entries.map((e:Json)=>{const binding=metadata.get(e.resolution?.rowId);return binding?{...e,operationId:binding.operation.operationId,requiredOperationIds:[binding.operation.operationId]}:e;});
  const common = { sourceId: t.sourceId, condition: 'EXPLICIT_METHOD_COMPATIBLE_OBJECT_AND_VALID_F_ONLY',
    exactTechnologyChoice: master32FanElectricalCoverageR1(), operationId: pack.actualUseOperationId,
    requiredOperationIds: [pack.actualUseOperationId],
    quantityRule: 'VERSIONED_INITIAL_FUNCTIONAL_INVENTORY_PER_ACTIVE_FRONT_NOT_CONSUMPTION' };
  return { ...prior, sourceKind: 'PROJECT_SYSTEM', generatedFromCurrentRows: false, fullTechnicalAcceptance: false, completeInstallation: false,
    evidenceSha256: canonicalEstimateSha256HexText(canonicalEstimateStableJson({ retainedParentEvidence: prior.evidenceSha256,
      method: pack.engineeringMethod, independentRoster: INVENTORY, sources: pack.sources, requiredObjectFit: pack.compatibilityObjectFactsRu })),
    evidenceReferences: [...prior.evidenceReferences, ...pack.sources.map(s => s.officialUrl + ' ' + s.locator)],
    entries: [...forwardedEntries.map((e: Json) => e.resolution?.rowId === pack.closedOldNeedRowId
      ? { ...e, exactTechnologyChoice: { kind: 'not', operand: master32FanElectricalCoverageR1() }, condition: 'Original unresolved tool need retained unless exact whole station is applicable and resolved.' } : e),
      { ...common, expectedResourceId: t.sourceId + ':provision', category: 'equipment', unitId: 'set', specification: pack.ownerTitleRu,
        formulaId: pack.prefix + ':formula:provision', resolution: { kind: 'ROW', rowId: pack.ownerRowId } },
      ...pack.parts.map(p => ({ ...common, expectedResourceId: t.sourceId + ':' + p.key, category: p.category, unitId: p.unitId,
        specification: p.sourceBoundary, formulaId: p.formulaId, resolution: { kind: 'INCLUDED_COMPONENT_ROW', rowId: p.rowId, parentRowId: pack.ownerRowId } })),
      ...pack.additionalNeeds.map(n => ({ ...common, operationId:n.rowId+':operation',requiredOperationIds:[n.rowId+':operation'], expectedResourceId: t.sourceId + ':need:' + n.key, category: n.category, unitId: n.unitId,
        quantityRule: 'UNRESOLVED_NOT_ZERO_NOT_INCLUDED_IN_INITIAL_PROVISION_PRICE', specification: n.reasonRu, formulaId: n.formulaId,
        resolution: { kind: 'ROW', rowId: n.rowId } }))],
    unresolvedOnsiteNeedRowIds: [...pack.oldNeedRowIds, ...pack.additionalNeeds.map(n => n.rowId)],
    conditionalRetainedNeedRowIds: [pack.closedOldNeedRowId],
    conditionalCompleteProvision: { coverageCondition: master32FanElectricalCoverageR1(), resolvedNeedRowIds: [pack.closedOldNeedRowId],
      selectedScopeUnresolvedNeedRowIds: [...pack.oldNeedRowIds.filter(id => id !== pack.closedOldNeedRowId), ...pack.additionalNeeds.map(n => n.rowId)],
      actualElectricalTestsOrSafeIsolationProved: false, completeInstallation: false } };
}

/** New source-owned whole replacement input, not a retained-parent projection.
 * No current/captured resource is filtered, copied or rebound by this builder.
 * The reference object conditions are explicit DEMO/PPR conditions, not facts
 * about an existing saved estimate. The ordinary compiler remains authoritative.
 */
export const fanPreparedOpeningReferenceArtifactSha256R610='79a157a5cc9886fe179413f2840b97689de5ec4912c877ec8d5c9a493c817acd';
export function fanPreparedOpeningReferenceDefinitionR610(catalogId:string):AutomaticOwnerDefinition{
 const reference=referenceMethodArtifact as unknown as Json;
 if(catalogId!==reference.catalogId||reference.sourceKind!=='PROJECT_SYSTEM'||reference.generatedFromCurrentRows!==false)
  throw Error('FAN_REFERENCE_R610_EXACT_SOURCE_SCOPE_REQUIRED');
 const profile=manufacturerDoorFanFactoryKitsPackR1.profiles.find(p=>p.key===reference.manufacturerProfileKey);
 if(!profile||profile.family!=='hvac'||profile.key!=='axial-100-plain'
  ||reference.manufacturerManualSha256!==manufacturerDoorFanFactoryKitsPackR1.sources.find(s=>s.key==='fan-manual')?.sha256
  ||JSON.stringify(reference.selectedToolKeys)!==JSON.stringify(['driver-ph1','driver-slot15','voltage-indicator','indicator-prods','indicator-lead','prod-shrouds','prover','prover-cells','prover-hanger','instrument-case','clean-cloth']))
  throw Error('FAN_REFERENCE_R610_EXACT_PRIMARY_AND_TOOL_SOURCE_REQUIRED');
 const sourceRows=reference.rows as Json[],operations=reference.operationRoster as Json[];
 for(const row of sourceRows){
  const lineage=row.sourceLineage;
  if(lineage.kind==='FIXED24_INITIAL_TOOL_PART'){
   const part=pack.parts.find(p=>p.key===lineage.sourceKey);
   if(!part||part.rowId!==row.rowId||part.unitId!==row.unitId||part.perFront!==lineage.perFront
    ||row.expression!==reference.frontCountId+'*'+part.perFront||part.titleRu!==row.sourceTitleRu||part.category!==row.category||RESOURCE_KINDS[part.key]!==row.resourceKind)
    throw Error('FAN_REFERENCE_R610_TOOL_PHYSICAL_LINEAGE_REQUIRED');
  }else if(lineage.kind==='FACTORY_OWNER'){
   if(profile.ownerRowId!==row.rowId||profile.ownerTitleRu!==row.sourceTitleRu||profile.ownerUnitId!==row.unitId||row.expression!==reference.primaryCountId)
    throw Error('FAN_REFERENCE_R610_FACTORY_OWNER_LINEAGE_REQUIRED');
  }else if(lineage.kind==='FACTORY_COMPONENT'){
   const component=profile.bom.find(b=>b.rowId===row.rowId);
   if(!component||component.titleRu!==row.sourceTitleRu||component.unitId!==row.unitId
    ||component.countPerFactoryUnit!==lineage.countPerFactoryUnit||row.expression!==reference.primaryCountId+'*'+component.countPerFactoryUnit
    ||row.costOwnerRowId!==profile.ownerRowId||row.procurement!==false)
    throw Error('FAN_REFERENCE_R610_INCLUDED_FACTORY_LINEAGE_REQUIRED');
  }else if(lineage.kind!=='PROJECT_SYSTEM_REFERENCE_NEED'||!row.quantityUnknown||row.costTreatment==='INCLUDED_IN_RESOURCE_ROWS')
    throw Error('FAN_REFERENCE_R610_REAL_PROJECT_NEED_REQUIRED');
 }
 const selection={kind:'equals' as const,parameterId:reference.selectorId,value:reference.selectorValue};
 const scope={kind:'and' as const,operands:[selection,...reference.scopeChoices.map((c:Json)=>({kind:'equals',parameterId:c.parameterId,value:c.value}))]};
 const ordinary:AutomaticParameterSpec[]=[
  {id:reference.selectorId,title:'Выбранный способ монтажа вентилятора',kind:'ordinary',valueType:'enum',unitId:null,values:[reference.selectorValue]},
  {id:reference.primaryCountId,title:'Фактическое число выбранных вентиляторов',kind:'ordinary',valueType:'integer',unitId:'set',min:1,max:1000000},
 ];
 const conditional:AutomaticParameterSpec[]=[
  {id:reference.frontCountId,title:'Фактическое число пригодных выделенных инструментальных постов',kind:'conditional',valueType:'integer',unitId:'piece',min:1,max:1000000,requiredWhen:selection},
  {id:reference.projectReferenceId,title:'Документ условий монтажа и фактической применимости',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selection},
  ...reference.scopeChoices.map((c:Json)=>({id:c.parameterId,title:c.titleRu,kind:'conditional' as const,valueType:'enum' as const,unitId:null,values:[c.value],requiredWhen:selection})),
  ...sourceRows.filter(r=>r.quantityUnknown).map((r:Json)=>({id:r.quantityParameterId,title:r.publicNameRu,kind:'internal' as const,valueType:(['pcs','pair'].includes(r.unitId)?'integer':'decimal') as 'integer'|'decimal',unitId:r.unitId})),
 ];
 const specs:AutomaticRowSpec[]=sourceRows.map(r=>({rowId:r.rowId,formulaId:r.formulaId,title:r.sourceTitleRu,section:'Монтаж вентилятора в готовом проёме',
  category:r.category,unitId:r.unitId,expression:r.expression,costTreatment:r.costTreatment,procurement:r.procurement,inclusion:scope}));
 const built=buildAutomaticConstructionOwnerR1({contract:reference.contract,semanticOwner:catalogId,sourceId:reference.sourceId,normId:'PROJECT_REFERENCE_METHOD_NO_NEW_INSTALLATION_NORM',
  sourceMetadata:{source_title:'Проектный способ монтажа вентилятора в готовом проёме',source_document_version:reference.contract,
   definition_hash:fanPreparedOpeningReferenceArtifactSha256R610,artifact_sha256:fanPreparedOpeningReferenceArtifactSha256R610,exact_locator:'Source-owned PROJECT_SYSTEM scope/rows/operationRequirements; DEMO, not authenticated site facts.'},
  applicabilityRu:reference.sourceScope.join(' '),ordinary,profile:[],conditional,rows:specs,deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:reference.remainingActualAdmissionNeeds});
 const sourceGuideEvidence={guide_version:reference.contract,source_snapshot_hash:fanPreparedOpeningReferenceArtifactSha256R610,
  applicability:reference.sourceScope.join(' '),verified_at:'2026-10-27T08:14:34Z',guide_validation_policy:'MANDATORY_BLOCK',
  evidence_review_scope:'SOURCE_GUIDE_ONLY_NOT_OBJECT_AUTHENTICATION_OR_EXECUTION'};
 const parameters=built.parameters.map(p=>{
  const row=sourceRows.find(r=>r.quantityParameterId===p.parameter_id);
  const {guide:_unearned,...truth}=p.truth_metadata;
  return{...p,default_value:null,truth_metadata:row?{...unresolvedApplicationNormTruthR1(truth,
   'Фактическое количество и норма для ресурса не заданы; единица определена отдельной авторской методикой учёта. UNKNOWN не подменяется нулём или единицей.'),guide:{...sourceGuideEvidence,guide_kind:'PROJECT_DEFINED',source_role:'UNRESOLVED_APPLICATION_NORM',guide_short_ru:'Количество остаётся неизвестным; единица задана авторской методикой учёта.',source_document:reference.sourceId,source_locator:'AUTHOR_SELECTED_MEASUREMENT_BASIS; source-owned quantityUnknown; no installation norm'}}:
   {...truth,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'USER_INPUT',source_confirmation_required:false,
    provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...sourceGuideEvidence,guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_SYSTEM_REFERENCE_REQUIRES_ACTUAL_SCOPE',
     guide_short_ru:'Условия способа монтажа и документы объекта требуют отдельного подтверждения.',source_document:reference.sourceId,source_locator:'Source scope and explicit project choices'}}};
 });
 const resources=built.resources.map(r=>{
  const declaration=sourceRows.find(d=>d.rowId===r.row_id)!;
  const uses=declaration.operationKeys.map((key:string)=>operations.find(o=>o.operationId.endsWith(':'+key)));
  if(uses.length===0||uses.some((o:Json|undefined)=>!o))throw Error('FAN_REFERENCE_R610_EXACT_OPERATION_MEMBERSHIP_REQUIRED');
  return rehash({...r,cost_owner_id:declaration.costOwnerRowId,resource_graph:{...r.resource_graph,
   inputParameterIds:[...new Set([...(Array.isArray(r.resource_graph.inputParameterIds)?r.resource_graph.inputParameterIds.filter((id:unknown):id is string=>typeof id==='string'):[]),reference.projectReferenceId])],
   operationCompositionV1:{...uses[0],additionalOperations:uses.slice(1)},
   ...(declaration.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'?{parentCostOwnerId:declaration.costOwnerRowId,includedInResourceOwnerRowId:declaration.costOwnerRowId}:{}),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:declaration.publicNameRu,sourceTitleRu:r.title_ru,
    resourceKind:declaration.resourceKind,brandAndModelRu:null,specificationRu:null,detailsRu:declaration.quantityUnknown?['Количество не определено; авторская единица учёта не является нормой расхода.']:[]}},
   source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:'PROJECT_SYSTEM_REFERENCE_METHOD_NOT_OBJECT_AUTHENTICATED',
    sourceLineage:declaration.sourceLineage,...(declaration.measurementBasis?{measurementBasis:declaration.measurementBasis}:{}),sourceMethodArtifactSha256:fanPreparedOpeningReferenceArtifactSha256R610,
    actualExecutionProved:false,actualProjectAuthenticated:false,publicationAllowed:false,automaticGenericPriceInheritanceAllowed:false,
    quantityNormAuthored:false,referenceWholeSourceReplacement:true}});
 });
 return{...built,parameters,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[reference.selectorId,reference.primaryCountId]};
}
export function fanPreparedOpeningReferenceAdmissionInputR610(catalogId:string){
 const reference=referenceMethodArtifact as unknown as Json,model=fanPreparedOpeningReferenceDefinitionR610(catalogId);
 const entries=reference.rows.map((r:Json)=>({expectedResourceId:reference.sourceId+':'+r.rowId,sourceId:reference.sourceId,
  condition:'EXPLICIT_REFERENCE_METHOD_AND_ALL_OBJECT_SCOPE_CHOICES_REQUIRED_NOT_AUTHENTICATED_BY_DEMO',
  operationId:reference.operationRoster.find((o:Json)=>o.operationId.endsWith(':'+r.operationKeys[0])).operationId,
  requiredOperationIds:r.operationKeys.map((key:string)=>reference.operationRoster.find((o:Json)=>o.operationId.endsWith(':'+key)).operationId),
  publicNameRu:r.publicNameRu,resourceKind:r.resourceKind,category:r.category,unitId:r.unitId,formulaId:r.formulaId,
  ...(r.quantityUnknown?{quantityUnknown:true,measurementBasis:r.measurementBasis}:{}),resolution:r.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'
   ?{kind:'INCLUDED_COMPONENT_ROW',rowId:r.rowId,parentRowId:r.costOwnerRowId}:{kind:'ROW',rowId:r.rowId}}));
 return{status:'SOURCE_HELD_REFERENCE_INPUT_NOT_PUBLISHED',model,
  independentCompletenessMap:{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
   evidenceSha256:fanPreparedOpeningReferenceArtifactSha256R610,operationResourceBindingRequired:true,operationRoster:reference.operationRoster,
   operationRequirements:reference.operationRequirements,entries},
  applicability:{primaryMeasureParameterId:reference.primaryCountId,primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',
   selectorParameterId:reference.selectorId,selections:[{selectorValue:reference.selectorValue,primaryMeasureParameterId:reference.primaryCountId,unitId:'set'}]},
   newRootOnly:true,automaticMigrationAllowed:false,actualProjectAuthenticated:false},
  passport:{quantityScope:'PARTIAL',unresolvedApplicableResourceRowIds:reference.unknownQuantityRows,fullTechnicalAcceptance:false},
  referenceDemoInput:{...reference.referenceDemoInput},
  sourcePaths:['data/estimate-benchmarks/source-packs/fan-prepared-opening-reference-method-r610-r1.json',
   'data/estimate-benchmarks/source-packs/manufacturer-door-fan-factory-kits-r1.json','data/estimate-benchmarks/source-packs/master32-fan-electrical-tool-provision-r1.json',
   'src/lib/estimate/v4/master32FanElectricalToolProvisionR1.ts'],
  currentCapture:null,newSourceRegistryReceipt:null,actualAdmissionReceipt:null};
}
