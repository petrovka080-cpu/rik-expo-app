import assert from 'node:assert/strict';
import pack from '../../../../data/estimate-benchmarks/source-packs/socket-complete-surface-2pe-project-r266.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec}
  from '../../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from '../../../../src/lib/estimate/v4/effectivePurchaseBalanceR1';
import {estimateDeterministicHash as hash} from '../../../../src/lib/estimate/estimateDeterministicHash';
import type {CanonicalEstimateOperationReference} from '../../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

export const socketCompleteSurfacePackR266=pack;
export const socketCompleteSurfaceRowR266=(suffix:string)=>pack.prefix+':'+suffix;
export const socketCompleteSurfaceFieldsR266={reference:'socket_complete_surface_ppr_reference',
  qualification:'socket_complete_surface_scope_accepted',fixingMode:'socket_complete_surface_fixing_mode',
  toolkitCount:'socket_complete_surface_owned_toolkit_count',toolkitAccepted:'socket_complete_surface_own_tools_accepted',
  labourHours:'socket_complete_surface_total_labour_h',qaCount:'socket_complete_surface_qa_count',
  deliveryTrips:'socket_complete_surface_delivery_trips',wasteTrips:'socket_complete_surface_waste_trips',
  quoteReference:'socket_complete_surface_price_scope_reference'} as const;
const f=socketCompleteSurfaceFieldsR266;
const active={kind:'selected',parameterId:pack.methodParameterId,value:pack.method};
const required={kind:'equals' as const,parameterId:pack.methodParameterId,value:pack.method};
const anchorsRequired={kind:'and' as const,operands:[required,{kind:'equals' as const,parameterId:f.fixingMode,value:pack.fixingModes[1]}]};
const anchorsActive={kind:'and',operands:[active,{kind:'equals',parameterId:f.fixingMode,value:pack.fixingModes[1]}]};
const commonFacts=[pack.countParameterId,f.reference,f.qualification];
export const socketCompleteSurfaceMaterialsR266=[
  {key:'assembly',quantityId:pack.countParameterId,title:pack.publicAssemblyTitle,specificationId:null,requiredWhen:required},
  {key:'screws',quantityId:'socket_complete_surface_screw_piece_count',title:'Винты крепления накладного корпуса по ведомости',
    specificationId:'socket_complete_surface_screw_specification',requiredWhen:required},
  {key:'anchors',quantityId:'socket_complete_surface_anchor_piece_count',title:'Дюбели крепления накладного корпуса по ведомости',
    specificationId:'socket_complete_surface_anchor_specification',requiredWhen:anchorsRequired},
] as const;

/** One new qualified profile in the actual existing socket owner. The old
 * source-free63 rows remain exact legacy economics, never new physical norms. */
export function socketCompleteSurfaceWholeR266(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
  assert.deepEqual([parent.parameters.length,parent.formulas.length,parent.resources.length],[1,63,63]);
  assert.equal(parent.parameters[0]?.parameter_id,'q');
  const ids=new Set(parent.parameters.map(p=>p.parameter_id));
  const conditional:AutomaticParameterSpec[]=[
    {id:pack.methodParameterId,title:'Подтверждённый профиль установки розетки',kind:'conditional',valueType:'enum',unitId:null,
      values:[pack.legacyMethod,pack.method]},
    {id:pack.countParameterId,title:'Одиночные комплектные розетки по принятой ведомости, шт.',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,requiredWhen:required},
    {id:f.reference,title:'ППР, ведомость мест, узел крепления и программа проверок: документ и строки',kind:'conditional',valueType:'text',unitId:null,requiredWhen:required},
    {id:f.qualification,title:'Квалификация фактического узла по принятой документации',kind:'conditional',valueType:'enum',unitId:null,values:[pack.acceptedQualification],requiredWhen:required},
    {id:f.fixingMode,title:'Принятый способ крепления корпуса к основанию',kind:'conditional',valueType:'enum',unitId:null,values:pack.fixingModes,requiredWhen:required},
    {id:f.toolkitCount,title:'Фактическое число собственных пригодных инструментальных комплектов',kind:'conditional',valueType:'integer',unitId:'set',min:1,requiredWhen:required},
    {id:f.toolkitAccepted,title:'Квалификация собственного монтажного и измерительного инструмента',kind:'conditional',valueType:'enum',unitId:null,values:[pack.toolQualification],requiredWhen:required},
    {id:f.labourHours,title:'Суммарный труд полного узла, включая проверки и уборку, по ППР, чел.-ч',kind:'conditional',valueType:'decimal',unitId:'man_hour',min:0.000001,requiredWhen:required},
    {id:f.qaCount,title:'Фактические электропроверки по принятой программе',kind:'conditional',valueType:'integer',unitId:'test',min:1,requiredWhen:required},
    {id:f.deliveryTrips,title:'Фактические рейсы внешней доставки по ППР',kind:'conditional',valueType:'integer',unitId:'trip',min:0,requiredWhen:required},
    {id:f.wasteTrips,title:'Фактические рейсы внешнего вывоза упаковки и отходов по ППР',kind:'conditional',valueType:'integer',unitId:'trip',min:0,requiredWhen:required},
    {id:f.quoteReference,title:'Документы границ цен поставки, полного труда и внешней логистики',kind:'conditional',valueType:'text',unitId:null,requiredWhen:required},
  ];
  const rows:AutomaticRowSpec[]=[],rid=socketCompleteSurfaceRowR266;
  const balances=socketCompleteSurfaceMaterialsR266.map(material=>{
    const stock='socket_complete_surface_'+material.key+'_stock',reserve='socket_complete_surface_'+material.key+'_reserve';
    const quantum='socket_complete_surface_'+material.key+'_supplier_multiple';
    if(material.key!=='assembly')conditional.push({id:material.quantityId,title:material.title+': фактически установлено по ведомости',
      kind:'conditional',valueType:'integer',unitId:'pcs',min:1,requiredWhen:material.requiredWhen});
    if(material.specificationId!==null)conditional.push({id:material.specificationId,title:'Принятая спецификация: '+material.title,
      kind:'conditional',valueType:'text',unitId:null,requiredWhen:material.requiredWhen});
    conditional.push({id:stock,title:material.title+': пригодный остаток, шт.',kind:'conditional',valueType:'integer',unitId:'pcs',min:0,requiredWhen:material.requiredWhen},
      {id:reserve,title:material.title+': сохраняемый резерв, шт.',kind:'conditional',valueType:'integer',unitId:'pcs',min:0,requiredWhen:material.requiredWhen},
      {id:quantum,title:material.title+': подтверждённая кратность заказа, шт.',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,requiredWhen:material.requiredWhen});
    const owner=rid(material.key+':order'),balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'pcs',
      consumed:material.quantityId,stock,reserve,quantum,manualQuantumViolationPolicy:'retain-raw-and-block-quantum'});
    const facts=[...commonFacts,f.fixingMode,...(material.specificationId===null?[]:[material.specificationId])];
    const add=(key:string,title:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
      rowId:rid(material.key+':'+key),section:'Комплектная накладная розетка',category:'material',title,unitId:'pcs',
      formulaId:rid('formula:'+material.key+':'+key),expression,costTreatment:'INFORMATIONAL_SCOPE',procurement:false,
      inputParameterIds:facts,...extra});
    add('consumed',material.key==='assembly'?'Комплектные корпус, механизм и лицевой элемент розетки по ведомости':material.title+' по принятой ведомости',
      material.quantityId,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',purchaseBalanceOwnerRowId:owner});
    add('order',material.title+' к поставке',`ceil(max(0,${material.quantityId}+${reserve}-${stock})/${quantum})*${quantum}`,{procurement:true,costTreatment:'OWN_COST',
      ...balance.owner,inputParameterIds:[...facts,f.quoteReference]});
    add('remaining',material.title+': остаток после установки',balance.remaining,{purchaseBalanceOwnerRowId:owner});
    add('free',material.title+': свободно сверх резерва',balance.free,{purchaseBalanceOwnerRowId:owner});
    add('shortage',material.title+': недостаёт для установки',balance.consumptionShortage,{purchaseBalanceOwnerRowId:owner});
    add('reserve-deficit',material.title+': недостаёт для сохраняемого резерва',balance.reserveDeficit,{purchaseBalanceOwnerRowId:owner});
    return {key:material.key,owner};
  });
  rows.push({rowId:rid('measured-nodes'),section:'Измеренный объём узлов',category:'service',title:'Одиночные розеточные узлы по принятой ведомости',unitId:'pcs',
    formulaId:rid('formula:measured-nodes'),expression:pack.countParameterId,costTreatment:'INFORMATIONAL_SCOPE',procurement:false,inputParameterIds:commonFacts},
    {rowId:rid('owned-tools'),section:'Собственный инструмент',category:'equipment',title:'Собственный монтажный и электроизмерительный комплект',unitId:'set',
      formulaId:rid('formula:owned-tools'),expression:f.toolkitCount,costTreatment:'INFORMATIONAL_SCOPE',procurement:false,inputParameterIds:[...commonFacts,f.toolkitAccepted]},
    {rowId:rid('whole-labour'),section:'Полный труд узла',category:'construction_work',title:'Труд установки корпуса, механизма, подключения, проверок и уборки',unitId:'man_hour',
      formulaId:rid('formula:whole-labour'),expression:f.labourHours,costTreatment:'OWN_COST',procurement:false,
      inputParameterIds:[...commonFacts,f.toolkitAccepted,f.qaCount,f.quoteReference]},
    {rowId:rid('qa-included'),section:'Проверки и приёмка',category:'service',title:'Электропроверки розеточных узлов по принятой программе',unitId:'test',
      formulaId:rid('formula:qa-included'),expression:f.qaCount,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,
      inputParameterIds:[...commonFacts,f.toolkitAccepted]},
    {rowId:rid('delivery'),section:'Внешняя логистика',category:'service',title:'Внешняя доставка изделий и крепежа по ППР',unitId:'trip',
      formulaId:rid('formula:delivery'),expression:f.deliveryTrips,costTreatment:'OWN_COST',procurement:true,inputParameterIds:[...commonFacts,f.quoteReference]},
    {rowId:rid('waste-removal'),section:'Внешняя логистика',category:'service',title:'Внешний вывоз упаковки и отходов по ППР',unitId:'trip',
      formulaId:rid('formula:waste-removal'),expression:f.wasteTrips,costTreatment:'OWN_COST',procurement:true,inputParameterIds:[...commonFacts,f.quoteReference]});
  assert(conditional.every(p=>!ids.has(p.id)),'NEW_SOCKET_PARAMETER_COLLISION_NO_ALIAS');
  const extension=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:'Комплектная накладная розетка2P+E: точное изделие и фактические ресурсы проекта',
      source_document_version:pack.source.documentId,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locator},
    applicabilityRu:pack.scope,ordinary:[{id:'q',title:'Исторический объём существующей карточки',kind:'ordinary',valueType:'decimal',unitId:'point',min:0}],
    profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:['Нет нормы труда/расхода крепежа изq.','Нет нормы времени по12мм зачистки.','Нет платной аренды поверх полного труда.','Группировка поставки не задаёт её кратность.']});
  const parameters=[...parent.parameters,...extension.parameters.filter(p=>!ids.has(p.parameter_id)).map((p,i)=>{
    const provenance=p.truth_metadata.provenance;assert(provenance===undefined||(provenance!==null&&typeof provenance==='object'&&!Array.isArray(provenance)));
    return {...p,ordinal:parent.parameters.length+i,truth_metadata:{...p.truth_metadata,
      projectAuthenticated:false,...(p.truth_metadata.visibility_role==='INTERNAL_ONLY'?{}:{source_confirmation_required:false,value_source_role:'PROJECT_SPECIFIC_INPUT'}),
      provenance:{...(provenance??{}),consumer_input_role_v1:p.truth_metadata.visibility_role==='INTERNAL_ONLY'?'APPLICATION_TECHNICAL':'OBJECT_FACT'}}};
  })];
  const groupId=pack.prefix+':whole';
  const operations:CanonicalEstimateOperationReference[]=pack.operations.map((op,i)=>({contractVersion:'canonical-operation-resource/v1',groupId,
    groupTitleRu:'Комплектная накладная розетка',operationId:pack.prefix+':'+op.id,operationTitleRu:op.titleRu,
    processRole:'PROCESS',processOrdinal:i,completionCriterionRu:'Выполнено в пределах принятого узла и ППР; единственные владельцы оплаты и закупки сохранены.'}));
  const retained=parent.resources.map(row=>{const {row_sha256:_hash,...body}=row;
    const next={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'not',operand:active}]}};
    return {...next,row_sha256:hash(next)};});
  assert(extension.formulas.every(f=>!parent.formulas.some(old=>old.formula_id===f.formula_id)),'SOCKET_FORMULA_COLLISION_NO_ALIAS');
  assert(extension.resources.every(row=>!parent.resources.some(old=>old.row_id===row.row_id)),'SOCKET_ROW_COLLISION_NO_ALIAS');
  const added=extension.resources.map((row,i)=>{
    const balance=balances.find(item=>row.row_id===rid(item.key+':consumed'));
    const parentOwner=balance?.owner??(row.row_id===rid('qa-included')?rid('whole-labour'):null);
    const isAnchor=row.row_id.startsWith(pack.prefix+':anchors:');
    const suffix=row.row_id.slice(pack.prefix.length+1);
    const role=suffix.endsWith(':consumed')?(suffix.startsWith('assembly:')?'assembly-consumed':'fixing-consumed'):
      suffix.includes(':')?'supply':suffix;
    assert(Object.hasOwn(pack.resourceOperationRoles,role),'EXACT_SOCKET_OPERATION_ROLE_REQUIRED');
    const roleEntry=Object.entries(pack.resourceOperationRoles).find(([key])=>key===role);assert(roleEntry);
    const rowOperations=operations.filter(op=>roleEntry[1].some(id=>op.operationId===pack.prefix+':'+id));
    assert(rowOperations.length>0,'ONE_REAL_OPERATION_CONSUMER_REQUIRED');
    const {row_sha256:_oldHash,...body}=row;
    const next={...body,ordinal:parent.resources.length+i,inclusion_ast:isAnchor?anchorsActive:active,
      resource_graph:{...row.resource_graph,operationCompositionV1:{...rowOperations[0],additionalOperations:rowOperations.slice(1)},
        ...(parentOwner===null?{}:{parentCostOwnerId:parentOwner,includedInResourceOwnerRowId:parentOwner}),
        ...(row.row_id===rid('whole-labour')||row.row_id===rid('delivery')||row.row_id===rid('waste-removal')?{priceCoverage:'ROOT_OWNER_REVIEW_HOLD'}:{}),
        sourceQualifiedCompleteSocketV1:{reference:pack.privateManufacturerReference,readback:pack.readback,
          projectFactsAuthenticated:false,labourRateAuthored:false,legacyQNotCopiedIntoSocketCount:true}}};
    return {...next,row_sha256:hash(next)};
  });
  return {...parent,parameters,formulas:[...parent.formulas,...extension.formulas],resources:[...retained,...added],
    ordinaryParameterIds:[pack.countParameterId]};
}
