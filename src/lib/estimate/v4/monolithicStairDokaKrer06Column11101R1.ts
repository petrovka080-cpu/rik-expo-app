// Source-bound quantity tests only. No real catalog/classification or machine-price admission.
import pack from '../../../../data/estimate-benchmarks/source-packs/monolithic-stair-doka-krer06-111-01-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

type Json=Record<string,unknown>;
export const monolithicStair111PackR1=pack;
export const monolithicStair111PrefixR1=pack.prefix;
export const monolithicStair111TestCatalogIdR1='test-only:unclassified:monolithic-stair-krer06-01-111-01';
const prefix=pack.prefix,area=pack.primaryMeasureParameterId;
const positiveArea={kind:'greater_than' as const,parameterId:area,value:0};

export function monolithicStair111DefinitionR1():AutomaticOwnerDefinition{
 const facts=[...pack.scopeFacts.map(f=>f.id),...pack.requiredProjectReferences,pack.workElevationParameterId];
 const conditional:AutomaticParameterSpec[]=[
  ...pack.scopeFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[f.value],requiredWhen:positiveArea})),
  {id:pack.workElevationParameterId,title:'Надземная отметка производства работ от поверхности земли, до15м включительно',valueType:'decimal',unitId:'m',kind:'conditional',min:0,max:15,requiredWhen:positiveArea},
  ...pack.requiredProjectReferences.map(id=>({id,title:({approved_structural_design_reference:'Утверждённый КЖ прямоугольного марша',approved_formwork_method_reference:'Утверждённая раскладка Doka/Dokaflex и ППР',approved_flight_volume_reference:'Проектный расчёт объёма железобетона марша',supply_payment_scope_reference:'Граница материального обеспечения и единой оплаты работ/машин'} as Record<string,string>)[id],valueType:'text' as const,unitId:null,kind:'conditional' as const,requiredWhen:positiveArea})),
  ...pack.machines.map(m=>({id:m.parameterId,title:'Фактическое обеспечение: '+m.nameRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[m.ownValue,m.hiredValue],requiredWhen:positiveArea})),
 ];
 const rows:AutomaticRowSpec[]=[];
 const positive=(unitId:string)=>({schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId,exclusiveMinimum:0,reasonRu:'Положительный применимый исходный ресурс.'});
 const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>{
  rows.push({rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
 };
 add('whole-labor','Труд рабочих среднего разряда3,1; вся исходная операция лестничного марша Doka','labor','man_hour',`${area}*${pack.wholeLaborRatePer100M3}/100`,{formulaOutputBounds:positive('man_hour')});
 add('operator-information','Исходные затраты труда машинистов — справочно, без второй оплаты','labor','man_hour',`${area}*${pack.operatorInformationRatePer100M3}/100`,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive('man_hour')});
 for(const m of pack.machines){
  const effective=effectiveResourceQuantityParameterId(prefix+':'+m.id+'-consumed');
  add(m.id+'-consumed','Нормативная работа: '+m.nameRu,'equipment','machine_hour',`${area}*${m.ratePer100M3}/100`,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive('machine_hour'),effectiveQuantityOutput:{parameterId:effective,unitId:'machine_hour'}});
  for(const [kind,value] of [['own',m.ownValue],['hired',m.hiredValue]] as const){
   add(m.id+'-'+kind,m.nameRu+(kind==='own'?' — собственная эксплуатация':m.operator==='DRIVER'?' — аренда с водителем':' — аренда с машинистом'),'equipment','machine_hour',effective,
    {procurement:kind==='hired',inclusion:{kind:'equals',parameterId:m.parameterId,value},formulaOutputBounds:positive('machine_hour')});
  }
 }
 for(const m of pack.materials){
  conditional.push({id:m.specificationId,title:'Фактическая совместимая спецификация: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:positiveArea},
   {id:m.parameterPrefix+'_stock_compatibility_reference',title:'Совместимость положительного наличия: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:{kind:'greater_than',parameterId:m.parameterPrefix+'_stock',value:0}});
  for(const [suffix,title,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Фактическая кратность поставки',0.000000001]] as const){
   conditional.push({id:m.parameterPrefix+'_'+suffix,title:title+': '+m.nameRu,valueType:'decimal',unitId:m.unitId,kind:'conditional',min,requiredWhen:positiveArea});
  }
  const owner=prefix+':'+m.id+'-order',effective=effectiveResourceQuantityParameterId(prefix+':'+m.id+'-consumed');
  add(m.id+'-consumed','Нормативный расход: '+m.nameRu,'material',m.unitId,`${area}*${m.ratePer100M3}/100`,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive(m.unitId),effectiveQuantityOutput:{parameterId:effective,unitId:m.unitId},purchaseBalanceOwnerRowId:owner});
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:m.unitId,consumed:effective,stock:m.parameterPrefix+'_stock',reserve:m.parameterPrefix+'_reserve',quantum:m.parameterPrefix+'_quantum'});
  add(m.id+'-order',m.nameRu,'material',m.unitId,`ceil(max(0,${effective}+${m.parameterPrefix}_reserve-${m.parameterPrefix}_stock)/${m.parameterPrefix}_quantum)*${m.parameterPrefix}_quantum`,
   {...balance.owner,procurement:true,inputParameterIds:[...facts,m.specificationId,m.parameterPrefix+'_stock_compatibility_reference'],titleParameterIds:[m.specificationId]});
 }
 for(const o of pack.operations)add(o.id,o.nameRu,'work','m3',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 for(const g of pack.gaps){
  const id='open_scope_qty_'+g.id.replaceAll('-','_');
  conditional.push({id,title:g.nameRu,valueType:'decimal',unitId:null,kind:'conditional',min:0});
  add(g.id,g.nameRu,g.category,'',id);
 }
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  applicabilityRu:pack.scopeRu,ordinary:[{id:area,title:'Проектный объём железобетона прямоугольного марша в деле',valueType:'decimal',unitId:'m3',kind:'ordinary',min:0.000000001}],
  profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
 const parameters=built.parameters.map(p=>{
  if(p.parameter_id.startsWith('open_scope_qty_'))return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Источник этой дополнительной потребности не задаёт применимость, единицу, количество и отдельную оплату. Ручное0/1 не заменяет источник.')};
  if(p.truth_metadata.visibility_role==='INTERNAL_ONLY')return p;
  const guide=p.truth_metadata.guide as Json,id=p.parameter_id,m=pack.materials.find(m=>id===m.specificationId||id.startsWith(m.parameterPrefix+'_')),machine=pack.machines.find(m=>m.parameterId===id);
  const guideRu=id===area?'Укажите утверждённый проектный объём железобетона именно прямоугольного марша. Не выводите его из одной площади, числа ступеней или объёма соседней площадки; площадь контакта опалубки и BBS заданы отдельно.':machine?(machine.operator==='NO_ADDITIONAL_OPERATOR_NORM'?'Выберите фактическое обеспечение оборудования. Одна цена эксплуатации не оплачивает повторно рабочего: обслуживание сварки, вибратора или пилы входит в цельный труд исходной операции. Дополнительный машинист не назначен.':'Выберите реальное обеспечение. Собственная эксплуатация и аренда взаимоисключающие; одна полная цена машино-часа включает предусмотренного нормой машиниста/водителя. Информационные часы отдельно не оплачиваются.'):
   m&&id===m.specificationId?m.identityGuideRu:id.endsWith('_stock_compatibility_reference')?'При положительном наличии нужен документ соответствия точной позиции, единицы и пригодности. Несовместимый остаток не вычитается.':
   m?'Фактические наличие, сохраняемый резерв или кратность поставки в '+m.unitId+'. Нормативный расход приложение рассчитывает отдельно.':guide.guide_short_ru;
  return {...p,required:id===area||facts.includes(id)||pack.materials.some(m=>m.specificationId===id),truth_metadata:{...p.truth_metadata,
   value_source_role:id===area?'USER_INPUT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   ...(p.constraints_json?.requiredWhen?{required_when:p.constraints_json.requiredWhen}:{}),
   provenance:{consumer_input_role_v1:id===area?'OBJECT_GEOMETRY':'OBJECT_FACT'},guide:{...guide,guide_short_ru:guideRu}}};
 });
 const resources=built.resources.map(r=>{
  const key=r.row_id.slice(prefix.length+1),material=pack.materials.find(m=>key===m.id+'-consumed'||key===m.id+'-order'),machine=pack.machines.find(m=>key.startsWith(m.id+'-')),
   operation=pack.operations.find(o=>o.id===key),gap=pack.gaps.find(g=>g.id===key),quote=!!machine&&!key.endsWith('-consumed');
  const paid=quote||!!material&&key.endsWith('-order'),formula=built.formulas.find(f=>f.formula_id===r.formula_id)!;
  const resourceGraph:Json={...r.resource_graph,
   ...(!gap&&!paid?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],reasonRu:'Исходное количество меняется через объём и подтверждённые проектные факты; ручное количество строки не подменяет норму111-01.'}}:{}),
   ...(operation?{parentCostOwnerId:prefix+':whole-labor',includedInResourceOwnerRowId:prefix+':whole-labor'}:{}),
   ...(machine?{physicalNormOwnerRowId:prefix+':'+machine.id+'-consumed',operatorCostOwnership:machine.operator==='NO_ADDITIONAL_OPERATOR_NORM'?'HANDLING_INCLUDED_IN_WHOLE_WORKER_NO_EXTRA_OPERATOR':'INCLUDED_IN_SELECTED_FULL_MACHINE_PRICE'}:{}),
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':operation:'+(gap?.id??machine?.id??'installation'),operationTitleRu:gap?.nameRu??machine?.nameRu??'Прямоугольный монолитный марш Doka',processOrdinal:gap?80:20,completionCriterionRu:gap?'Подтверждены применимость, единица, количество и отдельная оплата.':'Выполнена исходная операция06-01-111-01.'},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:material?.nameRu??null,
    detailsRu:gap?[gap.reasonRu,gap.nextTaskRu,gap.acceptanceRu]:[pack.scopeRu,operation?'Включено в цельный труд2412.60ч на100м³; отдельные часы не выделены.':
     key==='operator-information'?'Исходные56.59ч на100м³ сохранены справочно, без второй зарплаты. Дополнительный оператор не назначается сварке, вибратору и пиле, обслуживаемым в составе общего труда.':
      machine?machine.ratePer100M3+'маш.-ч на100м³; одна выбранная форма обеспечения.':material?material.ratePer100M3+' '+material.unitId+' на100м³; '+material.identityGuideRu:'Труд всей операции2412.60ч на100м³.']},
  };
  const sourceMetadata:Json={...r.source_metadata,sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':key.endsWith('-order')?'DERIVED_PURCHASE_BALANCE':quote?'EXCLUSIVE_MACHINE_FULFILLMENT_OF_SOURCE_CONSUMPTION':'OFFICIAL_NORM',
   normativeTrace:gap?[]:((r.source_metadata?.normativeTrace??[]) as Json[]).map(t=>({...t,sourceRole:'OFFICIAL_NORM',artifact_sha256:pack.source.sha256})),
   ...(quote?{normativeResourceCode:machine!.resourceCode,machinePriceCoverageRequired:machine!.operator==='DRIVER'?'FULL_OPERATED_VEHICLE_HOUR_DRIVER_INCLUDED_NOT_IN_INFO':machine!.operator==='NO_ADDITIONAL_OPERATOR_NORM'?'EQUIPMENT_OPERATION_NO_ADDITIONAL_OPERATOR_NORM_ADMITTED':'FULL_OPERATED_MACHINE_HOUR',machinePriceOperationScope:'FULL_SOURCE_OPERATION'}:{}),
   official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,exact_column:pack.normId,quantityUnitUnconfirmed:!!gap,full_technical_acceptance:false,sourceAdmission:'QUANTITY_TEST_ONLY_NOT_CATALOG_ADMITTED',test_only_unclassified:true,machinePriceAdmissionPending:quote};
  const {row_sha256:_old,...body}=r;
  const updated={...body,cost_owner_id:operation?prefix+':whole-labor':r.cost_owner_id,resource_graph:resourceGraph,source_metadata:sourceMetadata};
  return {...updated,row_sha256:estimateDeterministicHash(updated)};
 });
 return {...built,parameters,resources};
}

/** Uses the existing common compiler; no engine or source norm is inferred here. */
export function compileMonolithicStair111ForTestR1(submittedParameters:Record<string,unknown>,rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']){
 const d=monolithicStair111DefinitionR1();
 return compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',catalogId:monolithicStair111TestCatalogIdR1,compilerVersion:pack.contract,primaryMeasureParameterId:area,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,
  confirmedParameters:{...d.runtimeInput},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
}

export function monolithicStair111CompletenessMapR1(){
 const entry=(id:string,category:string,unitId:string|null,rule:string,resolution:Record<string,unknown>,specification:string)=>({
  expectedResourceId:pack.normId+':'+id,operationId:'installation',category,specification,condition:pack.scopeRu,sourceId:pack.sourceId,unitId,quantityRule:rule,formulaId:prefix+':formula:'+id,resolution});
 // Independent source list: not a map generated from the emitted runtime resources.
 const sourceRows=[["whole-labor", "labor", "man_hour", "2412.60whole operation"], ["operator-information", "labor", "man_hour", "56.59information not paid"], ["tower-crane8t-consumed", "equipment", "machine_hour", "02-0005:51.7"], ["truck-crane10t-consumed", "equipment", "machine_hour", "02-0075:2.35"], ["forklift5t-consumed", "equipment", "machine_hour", "03-0020:2.54"], ["arc-welder-consumed", "equipment", "machine_hour", "04-0444:3.2"], ["surface-vibrator-consumed", "equipment", "machine_hour", "11-0183:79"], ["chain-saw-consumed", "equipment", "machine_hour", "33-0503:1.21"], ["flatbed8t-consumed", "equipment", "machine_hour", "40-0002:1.51"], ["water-consumed", "material", "m3", "01-0601-0001:0.3066"], ["nails-consumed", "material", "kg", "01-1110-0002:16.000"], ["release-oil-consumed", "material", "kg", "01-4504-0001:173.000"], ["electrodes-consumed", "material", "kg", "01-5005-0024:13.000"], ["facing-consumed", "material", "m2", "01-6002-0001:29.2"], ["timber-bars-consumed", "material", "m3", "01-6302-0094:0.82"], ["boards25-consumed", "material", "m3", "01-6305-0095:0.26"], ["boards44-consumed", "material", "m3", "01-6305-0098:1.02"], ["matting-consumed", "material", "m2", "01-7231-0001:42.9"], ["concrete-consumed", "material", "m3", "03-0206-0060:101.5"], ["wire-consumed", "material", "kg", "10-0105-0036:23.6000"]];
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
  ...sourceRows.map(([id,category,unitId,spec])=>entry(id,category,unitId,'EXACT_OFFICIAL_RATE_PER_100_M3',{kind:'ROW',rowId:prefix+':'+id},spec)),
  ...pack.materials.map(m=>entry(m.id+'-order','material',m.unitId,'DERIVED_PURCHASE_BALANCE_FROM_EXACT_CONSUMPTION_STOCK_RESERVE_QUANTUM',{kind:'ROW',rowId:prefix+':'+m.id+'-order'},m.nameRu)),
  ...pack.operations.map(o=>entry(o.id,'work','m3','INCLUDED_OPERATION_NO_ARBITRARY_LABOUR_SPLIT',{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+o.id,parentRowId:prefix+':whole-labor'},o.nameRu)),
  ...pack.machines.flatMap(m=>['own','hired'].map(kind=>entry(m.id+'-'+kind,'equipment','machine_hour','EXCLUSIVE_FULFILLMENT_OF_SINGLE_EFFECTIVE_PHYSICAL_MACHINE',{kind:'ROW',rowId:prefix+':'+m.id+'-'+kind},m.nameRu))),
  ...pack.gaps.map(g=>entry(g.id,g.category,null,'SOURCE_REQUIRED_NOT_QUANTIFIED',{kind:'ROW',rowId:prefix+':'+g.id},g.nameRu)),
 ]};
}
