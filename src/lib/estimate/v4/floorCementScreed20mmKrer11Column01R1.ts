import pack from '../../../../data/estimate-benchmarks/source-packs/floor-cement-screed20mm-krer11-011-01-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

type Json=Record<string,unknown>;
export const floorCementScreed20mmPackR1=pack;
const p=pack.prefix,area=pack.measurement.parameterId;
const id=(suffix:string)=>p+':'+suffix;
const needParameter=(key:string)=>'floor_cement_screed20mm_application_need_'+key.replaceAll('-','_');
export const floorCementScreed20mmNeedParameterIdsR1=pack.needs.map(n=>needParameter(n.id));
const positive={kind:'greater_than' as const,parameterId:area,value:0};

/** Exact source-specific subject data over the existing builder, compiler and
 * purchase balances. No source registration, machine admission, I/O or writer. */
export function floorCementScreed20mmDefinitionR1():AutomaticOwnerDefinition {
 if(pack.normId!=='11-01-011-01'||pack.measurement.denominator!=='100'
  ||pack.source.sha256!=='e56ef148df993609c325b7d505c54b1806e8185a4fd7a1550b15266144538223'
  ||pack.worker.ratePer100M2!=='39.51'||pack.operator.ratePer100M2!=='1.27'
  ||pack.machines.map(m=>m.ratePer100M2).join(',')!=='1.27,9.07'
  ||pack.materials.map(m=>m.ratePer100M2).join(',')!=='3.5,2.04'
  ||pack.catalogId!==null||pack.identityAdmitted||pack.publicationAllowed)
  throw Error('SCREED01101_EXACT_SOURCE_ONLY_REQUIRED');
 const conditional:AutomaticParameterSpec[]=[{id:pack.scopeFact.id,title:pack.scopeFact.titleRu,
  valueType:'enum',unitId:null,kind:'conditional',values:[pack.scopeFact.valueRu],requiredWhen:positive}];
 const rows:AutomaticRowSpec[]=[];
 const add=(key:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>
  rows.push({rowId:id(key),formulaId:id('formula:'+key),title,section:pack.titleRu,category,unitId,expression,
   procurement:false,inclusion:positive,inputParameterIds:[pack.scopeFact.id],...extra});
 add('whole-labor',pack.worker.titleRu,'labor','man_hour',area+'*39.51/100');
 add('operator-information','Труд машинистов: справочная исходная величина','labor','man_hour',area+'*1.27/100',
  {costTreatment:'INFORMATIONAL_SCOPE'});
 for(const machine of pack.machines){
  const expression=area+'*'+machine.ratePer100M2+'/100';
  add(machine.id+'-consumed','Нормативная работа: '+machine.titleRu,'equipment','machine_hour',expression,{costTreatment:'INFORMATIONAL_SCOPE'});
  conditional.push({id:machine.fulfillmentParameterId,title:'Как обеспечить: '+machine.titleRu+'?',valueType:'enum',unitId:null,
   kind:'conditional',values:['Собственный механизм','Арендованный механизм'],requiredWhen:positive});
  for(const [kind,choice]of[['own','Собственный механизм'],['hired','Арендованный механизм']]as const)
   add(machine.id+'-'+kind,machine.titleRu+(kind==='own'?': собственная эксплуатация':': аренда'),'equipment','machine_hour',expression,
    {costTreatment:'INFORMATIONAL_SCOPE',inputParameterIds:[pack.scopeFact.id,machine.fulfillmentParameterId],
     inclusion:{kind:'and',operands:[positive,{kind:'equals',parameterId:machine.fulfillmentParameterId,value:choice}]}});
 }
 for(const m of pack.materials){
  const key=m.parameterPrefix,consumed=area+'*'+m.ratePer100M2+'/100',owner=id(m.id+'-order');
  conditional.push({id:key+'_specification',title:'Что будет поставлено: '+m.titleRu+'?',valueType:'text',unitId:null,kind:'conditional',requiredWhen:positive},
   {id:key+'_stock_reference',title:'Чем подтверждено пригодное наличие: '+m.titleRu+'?',valueType:'text',unitId:null,kind:'conditional',
    requiredWhen:{kind:'greater_than',parameterId:key+'_stock',value:0}});
  for(const [suffix,title,min]of[['stock','Сколько пригодного материала уже есть',0],['reserve','Сколько оставить в резерве',0],
   ['quantum','Какая кратность поставки',0.000000001]]as const)
   conditional.push({id:key+'_'+suffix,title:title+': '+m.titleRu+'?',valueType:'decimal',unitId:m.unitId,kind:'conditional',min,requiredWhen:positive});
  add(m.id+'-consumed','Нормативный расход: '+m.titleRu,'material',m.unitId,consumed,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner});
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:m.unitId,consumed,stock:key+'_stock',reserve:key+'_reserve',quantum:key+'_quantum'});
  add(m.id+'-order',m.titleRu,'material',m.unitId,`ceil(max(0,(${consumed})+${key}_reserve-${key}_stock)/${key}_quantum)*${key}_quantum`,
   {...balance.owner,procurement:true,titleParameterIds:[key+'_specification'],inputParameterIds:[pack.scopeFact.id,key+'_specification',key+'_stock_reference']});
  for(const [suffix,title,unitId,expression]of[
   ['available','Пригодное наличие',m.unitId,key+'_stock'],['required-reserve','Сохраняемый резерв',m.unitId,key+'_reserve'],
   ['supply-quantum','Кратность поставки',m.unitId,key+'_quantum'],['order-multiples','Единицы кратности заказа','item',balance.packages],
   ['remaining','Остаток после стяжки',m.unitId,balance.remaining],['free','Свободный остаток сверх резерва',m.unitId,balance.free],
   ['shortage','Недостача для расхода',m.unitId,balance.consumptionShortage],['reserve-deficit','Непокрытый резерв',m.unitId,balance.reserveDeficit]]as const)
   add(m.id+'-'+suffix,title+': '+m.titleRu,'material',unitId,expression,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner});
 }
 for(const o of pack.operations)add('included-'+o.id,o.titleRu,'work','m2',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 for(const n of pack.needs){
  const parameter=needParameter(n.id);
  conditional.push({id:parameter,title:n.titleRu,valueType:'decimal',unitId:null,kind:'conditional',min:0});
  add('open-'+n.id,n.titleRu,n.category,'',parameter,{costTreatment:'INFORMATIONAL_SCOPE'});
 }
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p,operationCompositionGroupId:p,
  sourceId:pack.sourceId,normId:pack.normId,sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,
   definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  applicabilityRu:pack.selectionRestrictionRu,ordinary:[{id:area,title:'Какая чистая площадь стяжки 20 мм?',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0}],
  profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusionsRu});
 const parameters=built.parameters.map(q=>{
  if(floorCementScreed20mmNeedParameterIdsR1.includes(q.parameter_id))return{...q,required:false,
   truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,'Не хватает применимости, источника отдельного ресурса и границы оплаты. Цена или пользовательское 0/1/77 не заменяют техническое решение.')};
  if(q.truth_metadata.visibility_role==='INTERNAL_ONLY')return q;
  const m=pack.materials.find(m=>q.parameter_id.startsWith(m.parameterPrefix+'_'));
  const guide=q.parameter_id===area?'Укажите площадь по плану полов или обмеру, например 125 м². Участки без этой стяжки исключите; толщина здесь только 20 мм.'
   :q.parameter_id===pack.scopeFact.id?pack.scopeFact.guideRu
   :q.parameter_id.endsWith('_supply')?'Выберите по договору, чей механизм используется. До проверки состава ставки часы показывают физическую потребность; оплату и заказ ещё не создают.'
   :q.parameter_id.endsWith('_specification')?'Укажите точный материал и условия поставки из согласованного предложения. Сверьте ресурс и единицу в подробностях.'
   :q.parameter_id.endsWith('_stock_reference')?'Укажите складскую проверку или документ, подтверждающий пригодность именно выбранного материала.'
   :q.parameter_id.endsWith('_stock')?'Укажите проверенный пригодный остаток в м³, например 0 при отсутствии. Неизвестный остаток оставьте пустым: заказ пока не подтверждён.'
   :q.parameter_id.endsWith('_reserve')?'Укажите дополнительный сохраняемый запас в м³, например 0 без резерва. Нормативный расход уже учтён.'
   :'Укажите шаг заказа из предложения поставщика, например 0,1 м³. Это кратность поставки, а не рейсы или число упаковок.';
  return{...q,truth_metadata:{...q.truth_metadata,source_confirmation_required:false,value_source_role:q.parameter_id===area?'USER_INPUT':'PROJECT_SPECIFIC_INPUT',
   provenance:{consumer_input_role_v1:m?'ADVANCED_OPTION':'OBJECT_FACT'},guide:{...(q.truth_metadata.guide as Json),guide_short_ru:guide,
    verified_at:pack.source.reviewedAt,applicability:pack.selectionRestrictionRu,
    full_condition_ru:[pack.source.locatorRu,q.parameter_id===area?pack.measurement.ruleRu:m?.specificationRu??pack.selectionRestrictionRu,m?.quantityCautionRu??'Цельные часы между этапами не распределены.'].join(' ')}}};
 });
 const operation=(key:string)=>{
  const o=pack.operations.find(o=>o.id===key)!;
  return{operationId:id('operation:'+key),operationTitleRu:o.titleRu,completionCriterionRu:o.criterionRu,processOrdinal:o.ordinal,processRole:'PROCESS' as const};
 };
 const resources=built.resources.map(r=>{
  const key=r.row_id.slice(p.length+1),material=pack.materials.find(m=>key.startsWith(m.id+'-')),
   machine=pack.machines.find(m=>key.startsWith(m.id+'-')),included=pack.operations.find(o=>key==='included-'+o.id),
   need=pack.needs.find(n=>key==='open-'+n.id),whole=key==='whole-labor',operator=key==='operator-information',consumed=key.endsWith('-consumed');
  const main=need?operation(need.operationId):operation(included?.id??material?.operationIds[0]??(whole?'preparation':'placing'));
  const related=whole?pack.operations.slice(1).map(o=>operation(o.id)):material?material.operationIds.slice(1).map(operation):[];
  const formula=built.formulas.find(f=>f.formula_id===r.formula_id)!,order=!!material&&key===material.id+'-order';
  const {row_sha256:_old,...body}=r;
  const changed={...body,cost_owner_id:included?id('whole-labor'):r.cost_owner_id,
   resource_graph:{...r.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:p,groupTitleRu:pack.titleRu,...main,
    ...(related.length?{additionalOperations:related}:{})},
    ...(included?{parentCostOwnerId:id('whole-labor'),includedInResourceOwnerRowId:id('whole-labor')} :{}),
    ...(!need&&!order?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,
     parameterIds:[...formula.input_parameter_ids],reasonRu:'Измените площадь или условия поставки. Ручная строка не заменяет норму 11-01-011-01.'}}:{}),
    ...(machine?{physicalNormOwnerRowId:id(machine.id+'-consumed'),machinePriceAdmissionPending:true}:{}),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
     brandAndModelRu:null,specificationRu:material?.specificationRu??null,detailsRu:need?[need.reasonRu,need.nextTaskRu,'Кто уточняет: '+need.ownerRu]
      :[pack.selectionRestrictionRu,pack.source.locatorRu,material?.quantityCautionRu??machine?.priceScopeRu??(operator?pack.operator.reasonRu:'Цельный труд рабочих среднего разряда 2,2: 39,51 чел.-ч/100 м² включает все три стадии. Разряд не является множителем; отдельно труд стадий не начисляется.')] }},
   source_metadata:{...r.source_metadata,sourceRole:need?'UNRESOLVED_APPLICATION_NORM':included?'INCLUDED_OFFICIAL_OPERATION':order?'DERIVED_PURCHASE_BALANCE'
    :whole||operator||consumed?'OFFICIAL_EXACT_COLUMN_QUANTITY':machine?'EXCLUSIVE_MACHINE_FULFILLMENT_PRICE_SCOPE_PENDING':'DERIVED_PURCHASE_BALANCE_CONTROL',
    normativeTrace:need?[]:(Array.isArray(r.source_metadata?.normativeTrace)?r.source_metadata.normativeTrace:[]).map((trace:Json)=>({...trace,sourceRole:'OFFICIAL_NORM',artifact_sha256:pack.source.sha256})),
    normativeResourceCode:whole?pack.worker.code:machine?.code??material?.code??null,source_artifact_sha256:pack.source.sha256,exact_column:pack.normId,
    official_url:pack.source.officialUrl,exact_locator:pack.source.locatorRu,sourceNormQuantityAccepted:!need&&(whole||operator||consumed||!!included),
    automaticGenericPriceInheritanceAllowed:whole,
    ...(need?{normative_source_ids:[],quantityUnitUnconfirmed:true,missingFact:need.reasonRu,nextTask:need.nextTaskRu,resolutionOwner:need.ownerRu}:{}),
    ...(machine?{machinePriceOwnerAdmitted:false,operatorRoleNotAdmitted:true,noAdditionalOperatorInferred:false,priceScopeNeedRowId:id('open-machine-price-scope')}:{}),
    ...(operator?{additionalOperatorPaymentAllowed:false,aggregateInformationalNormNotAdditive:true}:{}),
    ...(material?{materialQuantityKind:consumed?'NORMATIVE_CONSUMPTION':order?'COMMERCIAL_ORDER_WITH_SUPPLY_FACTS':'BALANCE_CONTROL',sourceRateIsNotWastePercent:true,physicalPackageCompositionProven:false}:{}),
    sourceAdmissionPending:true,identityAdmissionPending:true,publicationAllowed:false,full_technical_acceptance:false}};
  return{...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 return{...built,parameters,resources};
}

/** Test controls only: no supplier offer, runtime default or project approval. */
export function floorCementScreed20mmScenarioFactsR1(areaM2='125'):Record<string,unknown>{
 const facts:Record<string,unknown>={[area]:areaM2,[pack.scopeFact.id]:pack.scopeFact.valueRu};
 for(const m of pack.machines)facts[m.fulfillmentParameterId]='Собственный механизм';
 for(const m of pack.materials){facts[m.parameterPrefix+'_specification']='TEST_ONLY exact source-compatible supply';
  facts[m.parameterPrefix+'_stock']='0';facts[m.parameterPrefix+'_reserve']='0';facts[m.parameterPrefix+'_quantum']='0.001';}
 return facts;
}

/** Independent source composition and supply control map; never read back from
 * emitted definition rows to decide which resources ought to exist. */
export function floorCementScreed20mmCompletenessMapR1(){
 const entry=(suffix:string,operationId:string,category:string,unitId:string|null,quantityRule:string,specification:string,included=false)=>({
  expectedResourceId:pack.normId+':'+suffix,operationId,category,unitId,quantityRule,specification,sourceId:pack.sourceId,
  condition:'EXACT01101_READY_M150_CEMENT20MM_NONAGGRESSIVE_PROJECT_SCOPE',formulaId:id('formula:'+suffix),
  resolution:included?{kind:'INCLUDED_COMPONENT_ROW',rowId:id(suffix),parentRowId:id('whole-labor')}:{kind:'ROW',rowId:id(suffix)}});
 const controls=['available','required-reserve','supply-quantum','order-multiples','remaining','free','shortage','reserve-deficit'];
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
  evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
   entry('whole-labor','preparation','labor','man_hour','39.51_WHOLE_MAN_HOUR_PER_100M2_NO_STAGE_SPLIT','000-1002-2: рабочие среднего разряда 2,2; вся колонка 01'),
   entry('operator-information','placing','labor','man_hour','1.27_AGGREGATE_OPERATOR_HOURS_INFORMATION_NOT_ADDITIVE',pack.operator.reasonRu),
   ...pack.machines.flatMap(m=>[entry(m.id+'-consumed','placing','equipment','machine_hour',m.ratePer100M2+'_MACHINE_HOUR_PER_100M2',m.code+': '+m.titleRu),
    ...['own','hired'].map(k=>entry(m.id+'-'+k,'placing','equipment','machine_hour','EXCLUSIVE_FULFILLMENT_QUANTITY_ONLY_NO_FINANCIAL_ADMISSION',m.priceScopeRu))]),
   ...pack.materials.flatMap(m=>[entry(m.id+'-consumed',m.operationIds[0]!,'material',m.unitId,m.ratePer100M2+'_SOURCE_UNIT_PER_100M2',m.specificationRu),
    entry(m.id+'-order',m.operationIds[0]!,'material',m.unitId,'CEIL_MAX0_CONSUMED_PLUS_RESERVE_MINUS_STOCK_DIV_QUANTUM',m.specificationRu),
    ...controls.map(c=>entry(m.id+'-'+c,m.operationIds[0]!,'material',c==='order-multiples'?'item':m.unitId,'EXACT_SUPPLY_BALANCE_CONTROL_REFERENCE_'+c,m.quantityCautionRu))]),
   ...pack.operations.map(o=>entry('included-'+o.id,o.id,'work','m2','SOURCE_OPERATION_INCLUDED_IN_WHOLE_LABOUR_NO_SECOND_PRICE',o.titleRu,true)),
   ...pack.needs.map(n=>entry('open-'+n.id,n.operationId,n.category,null,'UNRESOLVED_APPLICABILITY_UNIT_QUANTITY_PAYMENT',n.nextTaskRu))]};
}
