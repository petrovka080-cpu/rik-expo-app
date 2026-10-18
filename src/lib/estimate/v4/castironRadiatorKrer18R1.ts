// WORK-only quantity design. No registered consumer, machine-price or radiator-SKU admission.
import pack from '../../../../data/estimate-benchmarks/source-packs/castiron-radiator-krer18-install-prep-r1.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const castironRadiatorPackR1=pack;
export const castironRadiatorPrefixR1=pack.prefix;
const primary=pack.primaryMeasureParameterId,prep=pack.preparationParameterId,mode=pack.preparationModeParameterId;
const rid=(id:string)=>pack.prefix+':'+id;
const positive={kind:'greater_than' as const,parameterId:primary,value:0};
const requiresPrep={kind:'equals' as const,parameterId:mode,value:'REQUIRES_PREPARATION'};
const gapParam=(id:string)=>'radiator_open_'+id.replaceAll('-','_');
const branchMeasure=(branch:string)=>branch==='INSTALL'?primary:prep;
const branchInclusion=(branch:string)=>branch==='PREPARATION'?requiresPrep:undefined;

export function castironRadiatorDefinitionR1():AutomaticOwnerDefinition {
  if(pack.catalogBinding!==null||pack.publicationAllowed||pack.normId!=='18-03-001-01+04'||pack.materials.length!==8
    ||pack.machines.length!==4||pack.operations.length!==6||pack.gaps.length!==8||pack.radiatorSource.pcsBridgeAdmitted
    ||pack.machines.some(m=>m.paidPriceOwnerAdmitted||m.codeSpecificRole!==null||m.operationScope!==null))
      throw Error('CASTIRON_RADIATOR_SOURCE_BOUNDARY_REQUIRED');
  const installFacts=[...pack.scopeFacts,...pack.projectReferenceFacts].map(f=>f.id).concat(mode);
  const prepFacts=[...installFacts,'preparation_method_reference'];
  const conditional:AutomaticParameterSpec[]=[
    ...pack.scopeFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[f.value],requiredWhen:positive})),
    ...pack.projectReferenceFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'text' as const,unitId:null,kind:'conditional' as const,requiredWhen:positive})),
    {id:mode,title:'Фактическая необходимость подготовки04',valueType:'enum',unitId:null,kind:'conditional',
      values:['FACTORY_READY_NO_PREPARATION','REQUIRES_PREPARATION'],requiredWhen:positive},
    {id:prep,title:'Номинальная мощность только требующих подготовки радиаторов',valueType:'decimal',unitId:'kW',kind:'conditional',
      min:0.000000001,numericPeerConstraints:{lessThanOrEqualParameter:primary},requiredWhen:{parameterId:mode,value:'REQUIRES_PREPARATION'}},
    {id:'preparation_method_reference',title:'Подтверждение перегруппировки/прокладок/опрессования04',valueType:'text',unitId:null,
      kind:'conditional',requiredWhen:{parameterId:mode,value:'REQUIRES_PREPARATION'}},
  ];
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,category:string,unitId:string,expression:string,branch:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
    rowId:rid(id),formulaId:rid('formula:'+id),section:pack.titleRu,category,title,unitId,expression,procurement:false,
    inputParameterIds:branch==='PREPARATION'?prepFacts:installFacts,inclusion:branchInclusion(branch),...extra});
  for(const [branch,labor] of Object.entries(pack.worker))
    add(labor.id,'Единый труд рабочих разряда3,4: '+(branch==='INSTALL'?'установка01':'подготовка04'),
      'labor','man_hour',branchMeasure(branch)+'*'+labor.ratePer100KW+'/100',branch);
  add(pack.operators.id,'Труд машинистов, уже учитываемый в эксплуатации: только справочный агрегат','labor','man_hour',primary+'*2.72/100','INSTALL',{costTreatment:'INFORMATIONAL_SCOPE'});
  for(const m of pack.machines)add(m.id,m.titleRu+' — исходное время; ставка пока не допущена','equipment','machine_hour',
    primary+'*'+m.ratePer100KW+'/100','INSTALL',{costTreatment:'INFORMATIONAL_SCOPE'});
  add(pack.radiatorSource.id,'Радиаторы чугунные — исходная номинальная мощность, SKU/pcs не допущены','equipment','kW',primary,'INSTALL',{costTreatment:'INFORMATIONAL_SCOPE'});
  for(const m of pack.materials){
    const key=m.parameterPrefix,consumedId=m.id+'-consumed',measure=branchMeasure(m.branch);
    if(!(m.sourceUnitId===m.orderUnitId&&m.sourceToOrderMultiplier==='1')
      &&!(m.sourceUnitId==='t'&&m.orderUnitId==='kg'&&m.sourceToOrderMultiplier==='1000'))throw Error('CASTIRON_RADIATOR_ORDER_CONVERSION_NOT_ADMITTED');
    const when=m.branch==='INSTALL'?positive:{kind:'greater_than' as const,parameterId:prep,value:0};
    conditional.push({id:key+'_specification',title:'Точная спецификация: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:when});
    for(const [suffix,title,min] of [['stock','Пригодное совместимое наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Фактическая кратность',0.000000001]] as const)
      conditional.push({id:key+'_'+suffix,title:title+': '+m.nameRu,valueType:'decimal',unitId:m.orderUnitId,kind:'conditional',min,requiredWhen:when});
    conditional.push({id:key+'_stock_reference',title:'Подтверждение совместимости наличия: '+m.nameRu,valueType:'text',unitId:null,
      kind:'conditional',requiredWhen:{kind:'greater_than',parameterId:key+'_stock',value:0}});
    const effective=effectiveResourceQuantityParameterId(rid(consumedId));
    const consumed=m.sourceToOrderMultiplier==='1'?effective:effective+'*1000';
    add(consumedId,'Исходный расход: '+m.nameRu,'material',m.sourceUnitId,measure+'*'+m.ratePer100KW+'/100',m.branch,
      {costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:effective,unitId:m.sourceUnitId},purchaseBalanceOwnerRowId:rid(m.id)});
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:rid(m.id),orderUnitId:m.orderUnitId,consumed,
      stock:key+'_stock',reserve:key+'_reserve',quantum:key+'_quantum'});
    add(m.id,m.nameRu,'material',m.orderUnitId,'ceil(max(0,('+consumed+')+'+key+'_reserve-'+key+'_stock)/'+key+'_quantum)*'+key+'_quantum',m.branch,
      {...balance.owner,procurement:true,titleParameterIds:[key+'_specification'],inputParameterIds:[...(m.branch==='INSTALL'?installFacts:prepFacts),key+'_specification',key+'_stock_reference']});
    for(const [id,title,unit,expression] of [['packages','Партии к заказу','pcs',balance.packages],['remaining','Остаток',m.orderUnitId,balance.remaining],
      ['free','Свободный остаток сверх резерва',m.orderUnitId,balance.free],['shortage','Недостаток для расхода',m.orderUnitId,balance.consumptionShortage],
      ['reserve-deficit','Недостаток сохраняемого резерва',m.orderUnitId,balance.reserveDeficit]] as const)
      add(m.id+':'+id,title+': '+m.nameRu,'material',unit,expression,m.branch,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:rid(m.id),
        ...(['shortage','reserve-deficit'].includes(id)?{inclusion:{kind:'and' as const,operands:[...(m.branch==='PREPARATION'?[requiresPrep]:[]),
          {kind:'formula_greater_than' as const,expression,unitId:m.orderUnitId,value:0}]}}:{})});
  }
  for(const o of pack.operations)add(o.id,o.nameRu+' — включено в исходный труд','equipment','kW',branchMeasure(o.branch),o.branch,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  for(const gap of pack.gaps){
    conditional.push({id:gapParam(gap.id),title:gap.titleRu,valueType:'decimal',unitId:null,kind:'conditional',min:0});
    add('open:'+gap.id,gap.titleRu,'service','',gapParam(gap.id),'INSTALL',{inputParameterIds:[]});
  }
  const base=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,
      artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},applicabilityRu:pack.scopeRu,
    ordinary:[{id:primary,title:'Установленная проектная номинальная мощность чугунных радиаторов',valueType:'decimal',unitId:'kW',kind:'ordinary',min:0.000000001}],
    profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  if(base.resources.length!==pack.expectedDefinitionRows)throw Error('CASTIRON_RADIATOR_EXACT_ROW_COVERAGE_REQUIRED');
  const formulas=new Map(base.formulas.map(f=>[f.formula_id,f]));
  return {...base,parameters:base.parameters.map(p=>{
    if(p.parameter_id.startsWith('radiator_open_'))return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,
      'Конкретные source/application задача, владелец и условие допуска заданы source-pack. Ручные0/1/цена/reference не заменяют проверку и не создают норму.')};
    if(p.truth_metadata.visibility_role==='INTERNAL_ONLY')return p;
    return {...p,required:p.parameter_id===primary,...(p.parameter_id===prep||p.parameter_id==='preparation_method_reference'?{constraints_json:{...p.constraints_json,forbiddenWhen:{kind:'equals',parameterId:mode,value:'FACTORY_READY_NO_PREPARATION'}}}:{}),truth_metadata:{...p.truth_metadata,value_source_role:p.parameter_id===primary?'USER_INPUT':'PROJECT_SPECIFIC_INPUT',
      source_confirmation_required:false,provenance:{consumer_input_role_v1:p.parameter_id===primary?'OBJECT_GEOMETRY':'OBJECT_FACT'},
      guide:{...(p.truth_metadata.guide as Record<string,unknown>),verified_at:pack.verifiedAt,
        ...(p.parameter_id===primary?{guide_short_ru:'Укажите номинальныеkW по проектной спецификации и паспортным температурным условиям. Не число приборов, секций или теплопотери площади.'}:{}),
        ...(p.parameter_id===prep?{guide_short_ru:'Только подтверждённая номинальная мощность требующей подготовки04 подгруппы; не более установленной. Заводски готовая подгруппа сюда не включается.'}:{})}}};
  }),resources:base.resources.map(r=>{
    const id=r.row_id.slice(pack.prefix.length+1),m=pack.materials.find(x=>id===x.id||id===x.id+'-consumed'||id.startsWith(x.id+':'));
    const order=Boolean(m&&id===m.id),control=Boolean(m&&id!==m.id&&id!==m.id+'-consumed');
    const machine=pack.machines.find(x=>x.id===id),gap=pack.gaps.find(x=>'open:'+x.id===id),op=pack.operations.find(x=>x.id===id);
    const labor=Object.entries(pack.worker).find(([,x])=>x.id===id);
    const branch=m?.branch??op?.branch??labor?.[0]??'INSTALL';
    const code=m?.sourceCode??machine?.sourceCode??labor?.[1].sourceCode??(id===pack.radiatorSource.id?pack.radiatorSource.sourceCode:null);
    const {row_sha256:_old,...body}=r;const f=formulas.get(r.formula_id)!;
    const value={...body,cost_owner_id:op?rid(op.parentLaborId):r.cost_owner_id,
      resource_graph:{...r.resource_graph,...(op?{parentCostOwnerId:rid(op.parentLaborId),includedInResourceOwnerRowId:rid(op.parentLaborId)}:{}),
        ...(!gap&&!order?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,
          parameterIds:[...f.input_parameter_ids],reasonRu:'Исходный расход/включённая операция/контроль рассчитываются из параметров. Ручной заказ меняется в отдельной материальной строке.'}}:{}),
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.titleRu,operationId:pack.prefix+':'+(gap?.id??branch.toLowerCase()),
          operationTitleRu:gap?.titleRu??(branch==='INSTALL'?'Установка01':'Подготовка04'),processOrdinal:gap?90:branch==='INSTALL'?30:20,
          completionCriterionRu:gap?gap.acceptanceRu:'Принять фактический исходный цикл по утверждённым проекту/ППР; количество не означает полную техническую готовность.'},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,
          specificationRu:m?.nameRu??null,detailsRu:gap?[gap.sourceOrFactRu,'Владелец: '+gap.missingFactOwnerRu,gap.acceptanceRu]:[pack.scopeRu,
            ...(machine?['Исходное время не является допуском машинной ставки. Нет отдельной новой нормы оператора, нет пропорционирования смен/выездов.']:[]),
            ...(id===pack.radiatorSource.id?['КРЕР задаёт100kW/100kW. Количествоpcs/SKU и цена не получаются из этого равенства.']:[]),
            ...(id===pack.operators.id?['2,72ч — справочный агрегат машинистов; второй оплачиваемый owner не создаётся.']:[]),
            ...(m?[m.identityGuideRu,'Исходный расход и заказ/резерв/наличие/кратность — разные количества.']:[])]}},
      source_metadata:{...r.source_metadata,normativeTrace:gap||order||control?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,
          sourceRole:'OFFICIAL_NORM',normId:pack.normIds[branch as keyof typeof pack.normIds],norm_id:pack.normIds[branch as keyof typeof pack.normIds]})),
        sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':order?'DERIVED_PURCHASE_BALANCE':control?'DERIVED_PURCHASE_CONTROL':'OFFICIAL_NORM',
        normativeResourceCode:order||control||gap||op?null:code,source_artifact_sha256:pack.source.sha256,exact_column:pack.normIds[branch as keyof typeof pack.normIds],
        sourceQuantityDenominatorKW:100,full_technical_acceptance:false,registeredConsumerBindingPending:true,
        ...(m?{printedSourceUnit:m.printedSourceUnit,printedRatePer100KW:m.printedRatePer100KW,exactCanonicalRatePer100KW:m.ratePer100KW,derivedFromSourceResourceCode:m.sourceCode}:{}),
        ...(machine?{machinePriceScopeStatus:'MACHINE_PRICE_SCOPE_PENDING',machineCoverageAdmissionPending:true,machinePriceOwnerAdmitted:false,
          codeSpecificOperatorRole:null,codeSpecificOperationScope:null}:{}),
        ...(id===pack.radiatorSource.id?{radiatorSkuPowerBridgePending:true,paidPriceOwnerAdmitted:false,pcsConversionAdmitted:false}:{}),
        ...(gap?{missingEvidenceTask:gap.titleRu,missingEvidenceOwner:gap.missingFactOwnerRu,missingEvidenceSource:gap.sourceOrFactRu,extraPaymentNotAssumed:true}:{}),
      }};
    return {...value,row_sha256:estimateDeterministicHash(value)};
  })};
}
export function compileCastironRadiatorR1(catalogId:string,input:Record<string,unknown>){
  if(catalogId!==pack.workOnlyTestCatalogId)throw Error('CASTIRON_RADIATOR_CURRENT_CONSUMER_BINDING_REVIEW_REQUIRED');
  return compileAutomaticConstructionOwnerR1({catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:primary,
    definition:castironRadiatorDefinitionR1(),submittedParameters:input});
}
export function castironRadiatorCompletenessMapR1(){
  // This source-shaped mapping includes derived order/control and unresolved tasks explicitly.
  const entry=(id:string,category:string,unitId:string|null,rule:string,extra:Record<string,unknown>={})=>({expectedResourceId:pack.normId+':'+id,
    operationId:pack.prefix,category,unitId,quantityRule:rule,specification:id,condition:pack.scopeRu,sourceId:pack.sourceId,
    formulaId:rid('formula:'+id),resolution:{kind:'ROW',rowId:rid(id)},...extra});
  return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
    evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
      ...Object.values(pack.worker).map(x=>entry(x.id,'labor','man_hour','EXACT_COLUMN_WHOLE_LABOR_PER_100_KW')),
      entry(pack.operators.id,'labor','man_hour','INFORMATIONAL_OPERATOR_AGGREGATE_NO_SECOND_PAYMENT'),
      ...pack.machines.map(x=>entry(x.id,'equipment','machine_hour','EXACT_SOURCE_TIME_PRICE_SCOPE_PENDING')),
      entry(pack.radiatorSource.id,'equipment','kW','EXACT_SOURCE_CAPACITY_SKU_BRIDGE_PENDING'),
      ...pack.materials.flatMap(m=>[entry(m.id+'-consumed','material',m.sourceUnitId,'EXACT_SOURCE_RATE_WITH_PRINTED_UNIT_SCALE'),
        entry(m.id,'material',m.orderUnitId,'DERIVED_ORDER_FROM_EFFECTIVE_CONSUMPTION_STOCK_RESERVE_QUANTUM'),
        ...pack.balanceControlsPerMaterial.map(id=>entry(m.id+':'+id,'material',id==='packages'?'pcs':m.orderUnitId,'DERIVED_EFFECTIVE_BALANCE_CONTROL'))]),
      ...pack.operations.map(o=>entry(o.id,'equipment','kW','INCLUDED_OPERATION_NO_LABOR_SPLIT',{resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:rid(o.id),parentRowId:rid(o.parentLaborId)}})),
      ...pack.gaps.map(g=>entry('open:'+g.id,'service',null,'CONCRETE_SOURCE_APPLICATION_TASK_NO_GUESSED_QUANTITY'))]};
}
