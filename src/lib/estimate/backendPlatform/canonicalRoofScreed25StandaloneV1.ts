import binding from '../../../../data/estimate-benchmarks/source-packs/roof-screed25-five-bindings-s27-69.json';
import screed15 from '../../../../data/estimate-benchmarks/source-packs/roof-cement-screed15-five-s27-63.json';
import { sourcePinnedRoofNormOwnerR1, sourcePinnedRoofNormGuardsR1, type SourcePinnedRoofNormPackR1 } from '../v4/sourcePinnedRoofNormOwnerR1';
import { ROOF_SCREED25_PACK_V1 as accepted, assertRoofScreed25AcceptedRatesV1,
  ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1, ROOF_SCREED25_DIRECT_BASE_UNKNOWN_V1 } from './canonicalRoofScreed25CompanionV1';
import { roofScreed15DirectBaseParameterV1, roofScreed15DirectBaseRowV1,
  ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1, ROOF_SCREED15_SUPPORTED_BASE_V1,
  ROOF_SCREED15_UNKNOWN_BASE_V1, ROOF_SCREED_DIRECT_BASE_SOURCE_V1 } from './canonicalRoofScreedDirectBaseV1';
import { buildMasterParameterCalculationConsumers } from './canonicalDefinitionParameterConsumersR1';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { parseCanonicalCompositionSelectionV1 } from './canonicalEstimateCompositionSelectionV1';
type Json = Record<string, any>;
type Representative = {definition:Json;parameters:Json[];resources:Json[];formulas:Json[];bindings:Json[];baseline:Json;passport:Json};
const hash = (v: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
export const ROOF_SCREED25_STANDALONE_BINDING_V1 = binding;
export const ROOF_SCREED25_STANDALONE_BINDING_SHA_V1 = hash(binding);
export const ROOF_SCREED25_STANDALONE_QUESTION_IDS_V1 = [accepted.conditionsParameterId, accepted.areaParameterId,
  ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1, screed15.conditionsParameterId, screed15.areaParameterId];
const ids15 = screed15.rates.map(r => `${screed15.prefix}:${r.role}`);
const ids25 = accepted.rates.map(r => `${accepted.prefix}:${r.role}`);
const selected15 = {kind:'equals',parameterId:screed15.systemParameterId,value:screed15.systemYesRu};
const selected25 = {kind:'equals',parameterId:screed15.systemParameterId,value:binding.systemYesRu};
const selected = {kind:'or',operands:[selected15,selected25]};
const operationKey = (prefix:string) => JSON.stringify([prefix, `${prefix}:installation`]);

/** A technology binding, not another calculator: the accepted source owner
 * computes from this work's already measured q, never an installation area. */
export function roofScreed25StandaloneOwnerV1(catalogId:string) {
  if (!binding.targets.some(t => t.catalogId === catalogId)) throw Error('ROOF_SCREED_STANDALONE_CATALOG_REQUIRED');
  assertRoofScreed25AcceptedRatesV1();
  const {measurementParameterId:_id,measurementUnitId:_unit,measurementConditional:_conditional,...source} = accepted;
  const pack: SourcePinnedRoofNormPackR1 = {...source,systemParameterId:screed15.systemParameterId,
    systemYesRu:binding.systemYesRu,measurementTitleRu:'Площадь участка выравнивающей стяжки кровли, м²',
    measurementGuideRu:'Площадь именно этого участка стяжки уже задана в основной работе. Для 25 мм приложение использует её один раз; толщину и нормы вручную вводить не требуется.',
    quantityEditReasonRu:'Изменяйте площадь участка стяжки в исходных данных. Приложение получает нормы выбранного варианта 15 или 25 мм из проверенного источника.'};
  const owner = sourcePinnedRoofNormOwnerR1(pack);
  return {...owner, admitted:sourcePinnedRoofNormGuardsR1(pack).admitted,
    parameters:owner.parameters.filter(p => !['q',screed15.systemParameterId].includes(p.parameter_id)).map(p => ({...p,
      title_ru:p.parameter_id === accepted.conditionsParameterId ? 'Какую подачу раствора предусматривает проект?' : 'Что находится непосредственно под стяжкой 25 мм?',
      constraints_json:{...p.constraints_json,values:p.parameter_id === accepted.conditionsParameterId
        ? [accepted.conditionsYesRu,ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1,'Нужен другой расчёт']
        : [accepted.areaYesRu,ROOF_SCREED25_DIRECT_BASE_UNKNOWN_V1]},
      truth_metadata:{...p.truth_metadata,semantic_parameter_key:`${catalogId}:${p.parameter_id}`}})),
    resources:owner.resources.map(row => ({...row,row_type:row.category,semantic_owner:`${catalogId}:${row.row_id}`,
      cost_owner_id:`${catalogId}:${row.cost_owner_id}`,source_metadata:{...row.source_metadata,
        compositeNormRateV1:accepted.rates.find(r => row.row_id === `${accepted.prefix}:${r.role}`)!.compositeRate},
      resource_graph:{...row.resource_graph,publicResourcePresentationV1:{...row.resource_graph.publicResourcePresentationV1 as Json,
        detailsRu:[accepted.scopeRu,...accepted.rates.find(r => row.row_id === `${accepted.prefix}:${r.role}`)!.detailsRu]}}}))};
}

export function buildRoofScreed25StandaloneSuccessorV1(parent:Representative,locators:{roof:string;design:string}) {
  const catalogId=String(parent.definition.catalog_id),target=binding.targets.find(t => t.catalogId === catalogId);
  if (!target || parent.definition.id !== target.predecessorDefinitionId || parent.definition.definition_version !== 4
    || parent.resources.length !== 127 || parent.parameters.length !== 64 || parent.formulas.length !== 127) throw Error('ROOF_SCREED_STANDALONE_EXACT_PARENT_REQUIRED');
  const result=structuredClone(parent),owner=roofScreed25StandaloneOwnerV1(catalogId),q=result.parameters.find(p => p.parameter_id === 'q');
  const original15=parent.resources.find(r => r.row_id === ids15[0]);
  const pending=parent.resources.find(r => r.row_id === `${screed15.prefix}:remaining:scope_pending`);
  if (!q || !original15 || !pending) throw Error('ROOF_SCREED_STANDALONE_PARENT_SCOPE_REQUIRED');
  const baseFact=roofScreed15DirectBaseParameterV1(q, original15.inclusion_ast, catalogId, 'STANDALONE_OWN_Q');
  result.parameters.find(p => p.parameter_id === screed15.systemParameterId)!.constraints_json.values.push(binding.systemYesRu);
  // q remains the same semantic fact. Only its guide covers both admitted variants.
  q.truth_metadata.guide.guide_short_ru='Введите проектную площадь именно этого участка выравнивающей стяжки кровли. Она применяется один раз к выбранному варианту 15 или 25 мм. Площади другой сметы и нормы толщины автоматически не переносятся.';
  result.resources=result.resources.map(row => {
    if(ids15.includes(row.row_id)) return roofScreed15DirectBaseRowV1(row);
    if(row.row_id === pending.row_id) return {...row,inclusion_ast:{kind:'not',operand:selected}};
    if(row.row_id.startsWith(`${screed15.prefix}:remaining:`)) return {...row,inclusion_ast:selected,
      resource_graph:{...row.resource_graph,publicResourcePresentationV1:{...row.resource_graph.publicResourcePresentationV1,
        detailsRu:['Эта отдельная потребность не закрыта нормой выбранной стяжки 15 или 25 мм. Применимость и количество приложение должно дополнить по проекту и проверенному источнику.']}}};
    return row;
  });
  let ordinal=Math.max(...result.parameters.map(p => Number(p.ordinal)))+1;
  const addedParameters=[...owner.parameters,baseFact];
  result.parameters.push(...addedParameters.map(p => ({...p,ordinal:ordinal++})));
  result.formulas.push(...owner.formulas.map(f => ({...f,ast_sha256:hash(f.ast)})));
  let rowOrdinal=Math.max(...result.resources.map(r => Number(r.ordinal)))+1;
  const added:Json[]=owner.resources.map(r => ({...r,ordinal:rowOrdinal++}));
  const scope=(rowId:string,titleRu:string,rule:Json,operation:Json|undefined,inclusion:Json) => ({...structuredClone(pending),
    id:`resource-${rowId.replaceAll(':','-')}`,row_id:rowId,ordinal:rowOrdinal++,title_ru:titleRu,inclusion_ast:inclusion,
    semantic_owner:`${catalogId}:${rowId}`,cost_owner_id:`${catalogId}:${rowId}`,
    resource_graph:{...pending.resource_graph,semanticOwnerId:`${catalogId}:${rowId}`,
      ...(operation ? {operationCompositionV1:operation} : {}),scopeRequirementV1:rule,
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:titleRu,sourceTitleRu:titleRu,detailsRu:[rule.reasonRu]}},
    source_metadata:{...pending.source_metadata,scopeClassificationContract:binding.contract,numericNormClosed:false}});
  const paid25=added.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id);
  added.push(scope(`${accepted.prefix}:standalone-project-scope`,'Стяжка 25 мм: применимость расчёта',{
    contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:accepted.prefix,groupTitleRu:accepted.groupTitleRu,titleRu:'Применимость стяжки 25 мм',
    reasonRu:accepted.systemRu,contextWhen:selected25,exactScopeWhen:owner.admitted,
    objectFactParameterId:accepted.conditionsParameterId,unknownObjectValues:[ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1],
    requiredFactParameterIds:['q',accepted.areaParameterId],operationExclusionSatisfiesScopeV1:true,
    coveringRowIds:paid25,originalRowIds:[],sourceEvidence:accepted.sources.map(s => ({sha256:s.sha256,locator:s.locators}))},
    added[0]!.resource_graph.operationCompositionV1,selected25));
  // Independent, non-excludable fact check: never a primary member of the15 operation.
  added.push(scope(`${screed15.prefix}:standalone-direct-base-check`,'Непосредственное основание стяжки 15 мм',{
    contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:`${screed15.prefix}:direct-base`,
    groupTitleRu:'Основание участка стяжки 15 мм',titleRu:'Проверка непосредственного основания',
    reasonRu:'Непосредственное основание проверяется для своего участка. По засыпному утеплителю требуется вариант 25 мм; исключение оплаты утепления не меняет основание.',
    objectFactMode:'PROJECT_APPLICABILITY_ONLY',objectFactParameterId:ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1,
    unknownObjectValues:[ROOF_SCREED15_UNKNOWN_BASE_V1],exactScopeWhen:{kind:'equals',parameterId:ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1,value:ROOF_SCREED15_SUPPORTED_BASE_V1},
    projectOperationContextsV1:[{when:selected15,resourceRowIds:ids15}],coveringRowIds:[],originalRowIds:[],sourceEvidence:[ROOF_SCREED_DIRECT_BASE_SOURCE_V1]},
    undefined,{kind:'literal',value:true}));
  result.resources.push(...added);
  for(const row of added) result.bindings.push({row_id:row.row_id,locator_id:row.row_id.endsWith('direct-base-check') ? locators.design : locators.roof,
    applicability:{contract:binding.contract,reusedSubworkContract:accepted.contract,normId:accepted.normId,
      ownMeasureParameterId:'q',numericQuantityAdmitted:row.resource_graph.costTreatment === 'OWN_COST',completeTechnicalEstimateAccepted:false}});
  const consumers=buildMasterParameterCalculationConsumers(result);
  for(const p of result.parameters){const id=p.parameter_id;
    p.truth_metadata={...p.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
    result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
    result.baseline.uom_by_parameter[id]=p.unit_id;
    if(addedParameters.some(a => a.parameter_id === id)){result.baseline.normative_source_ids[id]=[accepted.contract+(id === ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1 ? ':design' : ':roof')];
      result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide.guide_short_ru;}}
  result.baseline.parameter_schema_sha256=hash(result.parameters.map(p => ({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
  for(const r of result.resources){const {row_sha256:_h,...body}=r;r.row_sha256=hash(body);}
  const open=new Set(result.parameters.filter(p => p.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM').map(p => p.parameter_id));
  const unresolvedResourceRowIds=result.resources.filter(r => result.formulas.some(f => f.formula_id === r.formula_id && f.input_parameter_ids.some((id:string) => open.has(id)))).map(r => r.row_id);
  result.passport.decision={...result.passport.decision,unresolvedResourceRowIds,quantityScope:'PARTIAL',completeTechnicalEstimateAccepted:false,wholeRoofGroupComplete:false};
  result.passport.capability_matrix=result.passport.capability_matrix.map((c:Json) => c.capability === 'FULL_APPLICABLE_SCOPE' ? {...c,unresolvedResourceRowIds} : c);
  result.passport.physical_result_ru='Выравнивающая стяжка кровли выбранного варианта 15 или 25 мм на своём участке. Остальные подработы ещё не завершены.';
  result.passport.included_scope_ru=[...result.passport.included_scope_ru,accepted.scopeRu];
  result.definition.passport={...result.definition.passport,rowCount:result.resources.length,roofScreed25StandaloneContract:binding.contract,physicalResultRu:result.passport.physical_result_ru,fullTechnicalEstimateAccepted:false};
  result.definition.applicability={...result.definition.applicability,physicalResultRu:result.passport.physical_result_ru,includedScopeRu:result.passport.included_scope_ru};
  return {representative:result,addedRowIds:added.map(r => r.row_id),addedParameterIds:addedParameters.map(p => p.parameter_id)};
}

export function roofScreed25StandaloneSuccessorModelV1(from:{resources:readonly Json[];formulas:readonly Json[];parameters:readonly Json[]},catalogId:string) {
  const target=binding.targets.find(t => t.catalogId === catalogId);
  if(!target) throw Error('ROOF_SCREED_STANDALONE_CATALOG_REQUIRED');
  return buildRoofScreed25StandaloneSuccessorV1({definition:{id:target.predecessorDefinitionId,catalog_id:catalogId,definition_version:4,passport:{},applicability:{}},
    resources:[...from.resources],formulas:[...from.formulas],parameters:[...from.parameters],bindings:[],
    baseline:{formula_consumer_ids:{},resource_consumer_row_ids:{},uom_by_parameter:{},normative_source_ids:{},guide_provenance_ru:{}},
    passport:{decision:{},capability_matrix:[],included_scope_ru:[]}}, {roof:'semantic-check',design:'semantic-check'}).representative;
}

/** Immutable catalog identity and exact application marker bound the projection.
 * A row-only/price exclusion cannot make the applicability question disappear. */
export function roofScreed25StandaloneInactiveParameterIdsV1(input:{catalogId:unknown;definitionVersion:unknown;metadata:unknown;selection:unknown}) {
  const meta=input.metadata as Json|null;
  if(!binding.targets.some(t => t.catalogId === input.catalogId) || input.definitionVersion !== 5
    || meta?.roofScreed25StandaloneBindingV1 !== ROOF_SCREED25_STANDALONE_BINDING_SHA_V1) return [];
  const selection=parseCanonicalCompositionSelectionV1(input.selection);
  const excluded=(prefix:string) => selection?.excludedOperationKeys.includes(operationKey(prefix));
  return [...(excluded(accepted.prefix) ? [accepted.conditionsParameterId,accepted.areaParameterId] : []),
    ...(excluded(screed15.prefix) ? [ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1,screed15.conditionsParameterId,screed15.areaParameterId] : [])];
}
