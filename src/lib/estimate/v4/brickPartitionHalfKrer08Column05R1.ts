// Source-bound partial005 consumer candidate. Root integrates exact machine-price admission before use.
import pack from '../../../../data/estimate-benchmarks/source-packs/brick-partition-half-unreinforced-krer08-002-05-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const brickPartitionHalfPackR1=pack;
export const brickPartitionHalfPrefixR1=pack.rowPrefix;
const prefix=pack.rowPrefix,area=pack.measurement.parameterId,height=pack.measurement.storyHeightParameterId;
const positiveArea={kind:'greater_than' as const,parameterId:area,value:0};
export const brickPartitionCraneModesR1={own:'OWN_FULL_SOURCE_OPERATION',hired:'HIRED_WITH_OPERATOR_FULL_SOURCE_OPERATION'} as const;

export function brickPartitionHalfDefinitionR1():AutomaticOwnerDefinition{
 const context=[...pack.scopeFacts.map(f=>f.id),height,...pack.requiredProjectReferences];
 const conditional:AutomaticParameterSpec[]=[
  ...pack.scopeFacts.map(f=>({id:f.id,title:f.id==='partition_profile_confirmation'?'Точный проектный профиль неармированной перегородки':'Фактические условия применения нормы',valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[f.value],requiredWhen:positiveArea})),
  {id:height,title:'Высота этажа по проекту, не более4м включительно',valueType:'decimal',unitId:'m',kind:'conditional',min:0.000000001,max:4,requiredWhen:positiveArea},
  ...pack.requiredProjectReferences.map(id=>({id,title:({net_area_opening_deduction_reference:'Проектная ведомость чистой площади с вычетом проёмов по наружному обводу коробок',approved_partition_design_reference:'Утверждённый узел/проект неармированной перегородки и примыканий',supply_and_payment_scope_reference:'Документ границ поставки, работы крана и общего труда'} as Record<string,string>)[id],valueType:'text' as const,unitId:null,kind:'conditional' as const,requiredWhen:positiveArea})),
  {id:'crane_fulfillment',title:'Фактическое обеспечение башенного крана8т',valueType:'enum',unitId:null,kind:'conditional',values:[brickPartitionCraneModesR1.own,brickPartitionCraneModesR1.hired],requiredWhen:positiveArea},
 ];
 const rows:AutomaticRowSpec[]=[];
 const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category,title,unitId,expression,procurement:false,inputParameterIds:context,...extra});
 const bounds=(unitId:string)=>({schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId,exclusiveMinimum:0,reasonRu:'Положительная чистая площадь требует положительного количества исходного ресурса.'});
 add('whole-labor','Труд рабочих-строителей, разряд3,0 — вся исходная операция кладки','labor','man_hour',area+'*'+pack.worker.ratePer100M2+'/100',{formulaOutputBounds:bounds('man_hour')});
 add('operator-information','Труд машиниста, включённый в цену работы крана; без отдельной оплаты','labor','man_hour',area+'*'+pack.operators.ratePer100M2+'/100',{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:bounds('man_hour')});
 const craneQuantity=effectiveResourceQuantityParameterId(prefix+':crane-consumed');
 add('crane-consumed','Нормативная работа: '+pack.machine.titleRu,'equipment','machine_hour',area+'*'+pack.machine.ratePer100M2+'/100',{costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:craneQuantity,unitId:'machine_hour'},formulaOutputBounds:bounds('machine_hour')});
 for(const [mode,value] of Object.entries(brickPartitionCraneModesR1))add('crane-'+mode,pack.machine.titleRu+(mode==='own'?' — собственный, эксплуатация':' — аренда с машинистом'),'equipment','machine_hour',craneQuantity,{inclusion:{kind:'equals',parameterId:'crane_fulfillment',value},procurement:mode==='hired',formulaOutputBounds:bounds('machine_hour')});
 for(const material of pack.materials){
  conditional.push({id:material.specificationParameterId,title:'Точная поставочная спецификация: '+material.titleRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:positiveArea},
   {id:material.id+'_stock_compatibility_reference',title:'Документ пригодности и соответствия имеющегося материала: '+material.titleRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:{kind:'greater_than',parameterId:material.id+'_stock',value:0}});
  for(const [suffix,title,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Реальная кратность поставки',material.unitId==='item'?1:0.000000001]] as const)
   conditional.push({id:material.id+'_'+suffix,title:title+': '+material.titleRu,valueType:material.unitId==='item'?'integer':'decimal',unitId:material.unitId,kind:'conditional',min,requiredWhen:positiveArea});
  const effective=effectiveResourceQuantityParameterId(prefix+':'+material.id+'-consumed');
  add(material.id+'-consumed','Нормативный расход: '+material.titleRu,'material',material.unitId,area+'*'+material.ratePer100M2+'/100',{costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:effective,unitId:material.unitId},purchaseBalanceOwnerRowId:prefix+':'+material.id,formulaOutputBounds:bounds(material.unitId)});
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':'+material.id,orderUnitId:material.unitId,consumed:effective,stock:material.id+'_stock',reserve:material.id+'_reserve',quantum:material.id+'_quantum'});
  add(material.id,material.titleRu,'material',material.unitId,'ceil(max(0,('+effective+')+'+material.id+'_reserve-'+material.id+'_stock)/'+material.id+'_quantum)*'+material.id+'_quantum',{
   ...balance.owner,procurement:true,inputParameterIds:[...context,material.specificationParameterId,material.id+'_stock_compatibility_reference'],titleParameterIds:[material.specificationParameterId]});
 }
 for(const operation of pack.includedOperations)add(operation.id,operation.titleRu,'work','m2',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 for(const gap of pack.sourceNeeds){
  const id='open_scope_qty_'+gap.id.replaceAll('-','_');
  conditional.push({id,title:gap.titleRu,valueType:'decimal',unitId:null,kind:'conditional',min:0});
  add(gap.id,gap.titleRu,'service','',id);
 }
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  applicabilityRu:pack.scopeFacts[0].value+'; высота этажа>0 и<=4м; чистая площадь по§2.10. Подтверждение проекта не является проектированием приложением.',
  ordinary:[{id:area,title:'Чистая проектная площадь перегородок за вычетом проёмов по наружному обводу коробок',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000000001}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excluded});
 return {...built,parameters:built.parameters.map(p=>{
  if(p.parameter_id.startsWith('open_scope_qty_'))return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Для дополнительной потребности источник единицы, объёма, применимости и отдельной оплаты не принят. Ручное0/1 не заменяет источник.')};
  if(p.truth_metadata.visibility_role==='INTERNAL_ONLY')return p;
  const guide=p.truth_metadata.guide as Record<string,unknown>;
  return {...p,required:p.parameter_id===area,truth_metadata:{...p.truth_metadata,value_source_role:p.parameter_id===area?'USER_INPUT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   ...(p.constraints_json?.requiredWhen?{required_when:p.constraints_json.requiredWhen}:{}),provenance:{consumer_input_role_v1:p.parameter_id===area?'OBJECT_GEOMETRY':'OBJECT_FACT'},guide:{...guide,
    guide_short_ru:p.parameter_id===area?'Укажите чистую проектную площадь перегородок. По§2.10 проёмы вычитаются по наружному обводу коробок; площадь пола/объём стены не заменяют этот факт.':p.parameter_id==='crane_fulfillment'?'Выберите фактическое обеспечение крана: собственная эксплуатация либо аренда с машинистом. Цена полного машино-часа включает машиниста без отдельной оплаты.':'Укажите подтверждённый факт объекта/проекта/поставки. Нет значений по умолчанию; иные кирпич, раствор, армирование или высота требуют иной нормы. Текст спецификации не изменяет исходную норму.',verified_at:'2026-10-18'}}};
 }),resources:built.resources.map(r=>{
  const key=r.row_id.slice(prefix.length+1),gap=pack.sourceNeeds.find(g=>g.id===key),operation=pack.includedOperations.find(o=>o.id===key),material=pack.materials.find(m=>key===m.id||key===m.id+'-consumed');
  const materialOrder=!!material&&key===material.id,crane=key.startsWith('crane-'),cranePaid=key==='crane-own'||key==='crane-hired',operator=key==='operator-information';
  const paid=materialOrder||cranePaid,formula=built.formulas.find(f=>f.formula_id===r.formula_id)!;
  const {row_sha256:_old,...body}=r;
  const graph={...r.resource_graph,
   ...(!gap&&!paid?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],reasonRu:'Исходное количество меняется через факты площади/проекта; норму колонки005 ручным количеством строки не подменяют.'}}:{}),
   ...(operation?{parentCostOwnerId:prefix+':whole-labor',includedInResourceOwnerRowId:prefix+':whole-labor'}:{}),
   ...(crane?{physicalNormOwnerRowId:prefix+':crane-consumed',operatorCostOwnership:'INCLUDED_IN_FULL_MACHINE_SOURCE_OPERATION'}:{}),
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':operation:'+(gap?.id??'masonry'),operationTitleRu:gap?.titleRu??'Кладка неармированной перегородки по08-02-002-05',processOrdinal:gap?40:10,completionCriterionRu:gap?'Подтверждены применимость, источник единицы/объёма и отдельный владелец оплаты.':'Выполнена исходная кладка; полный технический цикл пока не принят.'},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:material?.titleRu??null,detailsRu:gap?[gap.nextTaskRu,gap.acceptanceRu]:[
    pack.source.locatorRu,'Вся норма труда143.99ч/100м² сохраняется без разделения. Переноска кирпича до5м включена; внешняя доставка/разгрузка не рассчитана.',
    ...(material?[material.sourcePer100M2+' '+material.sourceUnitLabel+' на100м²; нормализация в '+material.unitId+' коэффициентом'+material.normalizationFactor+'. Заказ — отдельно по фактам наличия/резерва/кратности.']:[]),
    ...(operator?['Информационные4.11ч/100м² включены в цену работы крана. Отдельного оплачиваемого машиниста нет.']:[]),
    ...(cranePaid?['Один взаимоисключающий владелец полного часа крана с машинистом. Нужна ставка полного машино-часа без минимальной смены и фиксированного выезда.']:[])]},
  };
  const updated={...body,cost_owner_id:operation?prefix+':whole-labor':r.cost_owner_id,resource_graph:graph,source_metadata:{...r.source_metadata,
   normativeTrace:gap?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_NORM'})),
   sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':materialOrder?'DERIVED_PURCHASE_BALANCE':'OFFICIAL_NORM',sourceCode:material?.code??(crane?pack.machine.code:key==='whole-labor'?pack.worker.code:null),
   official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,exact_column:pack.normId,sourceMeasure:'100_NET_SQUARE_METRES_OF_PARTITIONS',
   ...(material?{sourceUnitLabel:material.sourceUnitLabel,sourcePer100M2:material.sourcePer100M2,normalizationFactor:material.normalizationFactor}:{}),
   ...(cranePaid?{normativeResourceCode:pack.machine.code,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:pack.machine.priceScope}:{}),
   ...(operator?{operatorPriceIncludedInMachineSourceCode:pack.machine.code,informationalNotAdditionalPaidOwner:true}:{}),
   quantityUnitUnconfirmed:!!gap,full_technical_acceptance:false,sourceAdmission:'EXACT_OFFICIAL_COLUMN005_EXPLICIT_PARTIAL_SCOPE'}};
  return {...updated,row_sha256:estimateDeterministicHash(updated)};
 })};
}

export function compileBrickPartitionHalfR1(catalogId:string,input:Record<string,unknown>,rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']){
 if(!catalogId.startsWith('canonical-work:'))throw Error('ROOT_REVIEWED_CURRENT_CATALOG_BINDING_REQUIRED');
 const d=brickPartitionHalfDefinitionR1();
 return compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:area,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input,confirmedParameters:{...d.runtimeInput},rowOverrides,
  currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
}

export function brickPartitionHalfCompletenessMapR1(){
 // Independent expected source rows and gap obligations; not inferred by enumerating runtime resources.
 const physical=[['whole-labor','labor','man_hour','143.99ч/100м², вся операция'],['operator-information','labor','man_hour','4.11ч/100м², информация без оплаты'],['crane-consumed','equipment','machine_hour','02-0005,4.11маш.-ч/100м²'],
  ...pack.materials.map(m=>[m.id+'-consumed','material',m.unitId,m.code+':'+m.sourcePer100M2+' '+m.sourceUnitLabel+'/100м²'])];
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
  ...physical.map(([id,category,unitId,specification])=>({expectedResourceId:pack.normId+':'+id,operationId:'masonry',category,unitId,specification,condition:pack.scopeFacts[0].value,sourceId:pack.sourceId,quantityRule:'EXACT_OFFICIAL_RATE_PER_100_NET_M2',formulaId:prefix+':formula:'+id,resolution:{kind:'ROW',rowId:prefix+':'+id}})),
  ...pack.includedOperations.map(o=>({expectedResourceId:pack.normId+':operation:'+o.id,operationId:'masonry',category:'work',unitId:'m2',specification:o.titleRu,condition:pack.scopeFacts[0].value,sourceId:pack.sourceId,quantityRule:'INCLUDED_WHOLE_OPERATION_NO_LABOUR_SPLIT',formulaId:prefix+':formula:'+o.id,resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+o.id,parentRowId:prefix+':whole-labor'}})),
  ...pack.sourceNeeds.map(g=>({expectedResourceId:pack.normId+':open:'+g.id,operationId:g.id,category:'service',unitId:null,specification:g.titleRu,condition:g.acceptanceRu,sourceId:pack.sourceId,quantityRule:'SOURCE_REQUIRED_NOT_QUANTIFIED',formulaId:prefix+':formula:'+g.id,resolution:{kind:'ROW',rowId:prefix+':'+g.id}})),
  ...pack.materials.map(m=>({expectedResourceId:pack.normId+':purchase:'+m.id,operationId:'supply',category:'material',unitId:m.unitId,specification:m.titleRu,condition:'Фактические пригодное наличие, резерв и кратность поставки',sourceId:pack.sourceId,quantityRule:'EXISTING_STOCK_RESERVE_SUPPLY_QUANTUM_BALANCE',formulaId:prefix+':formula:'+m.id,resolution:{kind:'ROW',rowId:prefix+':'+m.id}})),
  ...(['own','hired'] as const).map(mode=>({expectedResourceId:pack.normId+':crane:'+mode,operationId:'crane',category:'equipment',unitId:'machine_hour',specification:pack.machine.titleRu,condition:brickPartitionCraneModesR1[mode],sourceId:pack.sourceId,quantityRule:'EXCLUSIVE_FULL_OPERATION_MACHINE_OWNER_PENDING_PRICE_ADMISSION',formulaId:prefix+':formula:crane-'+mode,resolution:{kind:'ROW',rowId:prefix+':crane-'+mode}})),
 ]};
}
