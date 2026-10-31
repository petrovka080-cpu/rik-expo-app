import assert from 'node:assert/strict';
import pack from '../../../../data/estimate-benchmarks/source-packs/panel-ready-grid-whole-post-project-r287.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec}
  from '../../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {estimateDeterministicHash as hash} from '../../../../src/lib/estimate/estimateDeterministicHash';
import type {CanonicalEstimateOperationReference} from '../../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
export const panelReadyGridWholePackR287=pack;
export const panelReadyGridWholeRowR287=(suffix:string)=>pack.prefix+':'+suffix;
const selected=(parameterId:string,value:string)=>({kind:'selected',parameterId,value});
export function panelReadyGridWholePostR287(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
  assert.equal(parent.parameters.length,30,'ACTUAL_PANEL_V5_PARAMETERS');assert.equal(parent.formulas.length,112,'ACTUAL_PANEL_V5_FORMULAS');assert.equal(parent.resources.length,112,'ACTUAL_PANEL_V5_ROWS');
  const prior=new Set(parent.parameters.map(p=>p.parameter_id)),f=pack.fields,rid=panelReadyGridWholeRowR287;
  for(const id of [pack.countParameterId,pack.retainedFactory.selectorId,pack.retainedToolPost.methodId,pack.retainedToolPost.fitId])assert(prior.has(id),'RETAINED_PANEL_METHOD_REQUIRED:'+id);
  for(const id of [pack.retainedFactory.ownerRowId,pack.retainedToolPost.ownerRowId,...pack.conditionallyReplacedOldNeedIds,...pack.protectedOldNeedIds])assert(parent.resources.some(r=>r.row_id===id),'CURRENT_RETAINED_ROW_REQUIRED:'+id);
  const positive={kind:'greater_than',parameterId:pack.countParameterId,value:0};
  const active={kind:'and',operands:[selected(pack.retainedFactory.selectorId,pack.retainedFactory.choiceRu),
    selected(pack.retainedToolPost.methodId,pack.retainedToolPost.methodRu),selected(pack.retainedToolPost.fitId,pack.retainedToolPost.fitRu),
    selected(f.method,pack.methodRu),selected(f.qualification,pack.qualificationRu),positive]};
  const required={kind:'equals' as const,parameterId:f.method,value:pack.methodRu};
  const conditional:AutomaticParameterSpec[]=[
    {id:f.method,title:'Полный монтажный пост по фактическому ППР',kind:'conditional',valueType:'enum',unitId:null,values:[pack.methodRu,pack.unconfirmedMethodRu]},
    {id:f.qualification,title:'Квалификация фактического полного поста и поданных ресурсов',kind:'conditional',valueType:'enum',unitId:null,values:[pack.qualificationRu],requiredWhen:required},
    {id:f.ppr,title:'Документ ППР, ведомость мест, труд, программа проверок и завершение участка',kind:'conditional',valueType:'text',unitId:null,requiredWhen:required},
    {id:f.labourHours,title:'Фактический общий труд поста по ППР, включая подключение, проверки и завершение',kind:'conditional',valueType:'decimal',unitId:'man_hour',min:0.000001,requiredWhen:required},
    {id:f.qaCount,title:'Фактическое число проверок по принятой программе ППР',kind:'conditional',valueType:'integer',unitId:'test',min:1,requiredWhen:required},
    {id:f.quoteScope,title:'Состав фактической цены труда и услуг, исключающий повтор уже оплачиваемых ресурсов',kind:'conditional',valueType:'text',unitId:null,requiredWhen:required},
    {id:f.deliveryTrips,title:'Фактические рейсы внешней доставки по ППР',kind:'conditional',valueType:'integer',unitId:'trip',min:0,requiredWhen:required},
    {id:f.wasteTrips,title:'Фактические рейсы внешнего вывоза упаковки и отходов по ППР',kind:'conditional',valueType:'integer',unitId:'trip',min:0,requiredWhen:required}];
  assert(conditional.every(p=>!prior.has(p.id)),'PANEL_NEW_PARAMETER_COLLISION_NO_ALIAS');
  const facts=[f.method,f.qualification,f.ppr],costFacts=[...facts,f.quoteScope],n=pack.countParameterId,one=`min(1,${n})`;
  const rows:AutomaticRowSpec[]=[
    {rowId:rid('measured-panels'),formulaId:rid('formula:measured-panels'),section:'Полный монтажный пост',category:'work',title:'Светильники',unitId:'pcs',expression:n,costTreatment:'INFORMATIONAL_SCOPE',procurement:false,inputParameterIds:facts},
    {rowId:rid('whole-labour'),formulaId:rid('formula:whole-labour'),section:'Полный монтажный пост',category:'work',title:'Труд монтажа светильников',unitId:'man_hour',expression:f.labourHours,costTreatment:'OWN_COST',procurement:false,inputParameterIds:[...costFacts,f.qaCount]},
    {rowId:rid('mount-included'),formulaId:rid('formula:mount-included'),section:'Включённые операции поста',category:'work',title:'Установка панели в потолочную решётку',unitId:'pcs',expression:n,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,inputParameterIds:facts},
    {rowId:rid('connection-included'),formulaId:rid('formula:connection-included'),section:'Включённые операции поста',category:'work',title:'Подключение светильника',unitId:'pcs',expression:n,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,inputParameterIds:facts},
    {rowId:rid('readiness-included'),formulaId:rid('formula:readiness-included'),section:'Включённые операции поста',category:'work',title:'Подготовка монтажного участка',unitId:'set',expression:one,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,inputParameterIds:facts},
    {rowId:rid('qa-included'),formulaId:rid('formula:qa-included'),section:'Включённые операции поста',category:'work',title:'Проверка подключения',unitId:'test',expression:f.qaCount,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,inputParameterIds:facts},
    {rowId:rid('completion-included'),formulaId:rid('formula:completion-included'),section:'Включённые операции поста',category:'work',title:'Уборка монтажного участка',unitId:'set',expression:one,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,inputParameterIds:facts},
    {rowId:rid('delivery'),formulaId:rid('formula:delivery'),section:'Внешние услуги по ППР',category:'service',title:'Доставка комплектов',unitId:'trip',expression:f.deliveryTrips,costTreatment:'OWN_COST',procurement:true,inputParameterIds:costFacts},
    {rowId:rid('waste'),formulaId:rid('formula:waste'),section:'Внешние услуги по ППР',category:'service',title:'Вывоз упаковки',unitId:'trip',expression:f.wasteTrips,costTreatment:'OWN_COST',procurement:true,inputParameterIds:costFacts}];
  const subject=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:'Точный метод принятой панели и фактический проектный пост; без авторства нормы часов',source_document_version:pack.primary.edition,definition_hash:pack.primary.sha256,artifact_sha256:pack.primary.sha256,exact_locator:pack.primary.locatorRu},
    applicabilityRu:pack.scopeRu,ordinary:[{id:n,title:'Сохранённое число выбранных заводских панелей',kind:'ordinary',valueType:'integer',unitId:'pcs',min:0,max:1000000}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:['Не вводит нормочасы или число соединителей на панель.','Не повторяет заводской комплект или оснащение Master30/32.','Не подтверждает ППР, цену или отсутствие пересечения цены одной строкой.']});
  const addedParameters=subject.parameters.filter(p=>!prior.has(p.parameter_id)).map((p,i)=>{
    const provenance=p.truth_metadata.provenance;assert(provenance===undefined||(provenance!==null&&typeof provenance==='object'&&!Array.isArray(provenance)));
    // The product/method passport does not authenticate a PPR, actual hours,
    // QA count, price scope or trips. Preserve source facts separately and do
    // not inherit the builder's fixed verification stamp for object inputs.
    const oldGuide=p.truth_metadata.guide;
    const {verified_at:_unearned,source_snapshot_hash:_methodNotObjectEvidence,...guide}=
      oldGuide!==null&&typeof oldGuide==='object'&&!Array.isArray(oldGuide)?oldGuide as Record<string,unknown>:{};
    return {...p,ordinal:parent.parameters.length+i,truth_metadata:{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',projectAuthenticated:false,source_confirmation_required:false,
      provenance:{...(provenance??{}),consumer_input_role_v1:'OBJECT_FACT'},
      guide:{...guide,guide_kind:'PROJECT_DEFINED',source_role:'ACTUAL_PROJECT_DOCUMENT_REQUIRES_SERVER_BINDING',
        source_document:pack.sourceId,source_locator:p.title_ru},sourceAuthorityPromoted:false}};});
  const groupId=pack.prefix+':whole',operations:CanonicalEstimateOperationReference[]=pack.operations.map((op,i)=>({contractVersion:'canonical-operation-resource/v1',groupId,
    groupTitleRu:'Монтажный пост панели в принятой решётке',operationId:pack.prefix+':'+op.id,operationTitleRu:op.titleRu,processRole:'PROCESS',processOrdinal:i,
    completionCriterionRu:'Принята операция и фактические ресурсы по ППР; отдельные часы и повторная оплата включённых операций отсутствуют.'}));
  const replaced=new Set(pack.conditionallyReplacedOldNeedIds);
  const retained=parent.resources.map(row=>{
    if(!replaced.has(row.row_id))return row;
    const {row_sha256:_oldHash,...body}=row,next={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'not',operand:active}]}};return {...next,row_sha256:hash(next)};});
  assert(subject.formulas.every(f=>!parent.formulas.some(p=>p.formula_id===f.formula_id)),'PANEL_FORMULA_COLLISION_NO_ALIAS');
  const roleEntries=new Map(Object.entries(pack.resourceOperationRoles));
  const added=subject.resources.map((row,i)=>{
    assert(!parent.resources.some(p=>p.row_id===row.row_id),'PANEL_ROW_COLLISION_NO_ALIAS');
    const suffix=row.row_id.slice(pack.prefix.length+1),roles=roleEntries.get(suffix);assert(roles&&roles.length>0,'EXACT_PANEL_OPERATION_ROLE_REQUIRED:'+suffix);
    const refs=roles.map(role=>{const op=operations.find(p=>p.operationId===pack.prefix+':'+role);assert(op,'EXACT_PANEL_OPERATION_REFERENCE');return op;});
    const included=['mount-included','connection-included','readiness-included','qa-included','completion-included'].includes(suffix),owner=rid('whole-labour');
    const {row_sha256:_hash,...body}=row,next={...body,ordinal:parent.resources.length+i,inclusion_ast:active,resource_graph:{...row.resource_graph,
      operationCompositionV1:{...refs[0],additionalOperations:refs.slice(1)},...(included?{parentCostOwnerId:owner,includedInResourceOwnerRowId:owner}:{}),
      ...(['whole-labour','delivery','waste'].includes(suffix)?{priceCoverage:'ROOT_OWNER_REVIEW_HOLD'}:{}),
      ...(['delivery','waste'].includes(suffix)?{excludeKnownZeroQuantityV1:true}:{}),
      retainedPanelProjectWorkpostV1:{sourceNormHoursAuthored:false,projectAuthenticated:false,existingPaidToolProvisionOwnerRetained:pack.retainedToolPost.ownerRowId,quoteNonoverlapAuthenticated:false}}};
    return {...next,row_sha256:hash(next)};});
  return {...parent,parameters:[...parent.parameters,...addedParameters],formulas:[...parent.formulas,...subject.formulas],resources:[...retained,...added]};
}
