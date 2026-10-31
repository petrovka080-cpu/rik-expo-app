import pack from '../../../../data/estimate-benchmarks/source-packs/interior-wall-finishing-group-r502.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
export const interiorWallFinishingGroupPackR502=pack;
export const interiorWallCementParameterR502=(key:string)=>pack.namespace+key;
export const interiorWallCementRowR502=(key:string)=>pack.namespace+'work:'+key;
const eq=(parameterId:string,value:string)=>({kind:'equals' as const,parameterId,value});
/** Selected finish over already level sound cement plaster. This data factory
 * uses the existing compiler/owners. Prior plaster construction is outside
 * this composition; no incomplete alternative is emitted. */
export function interiorWallFinishingGroupDefinitionR502():AutomaticOwnerDefinition {
  const c=pack,p=interiorWallCementParameterR502,r=interiorWallCementRowR502;
  const operations=c.operations;
  const materials=c.materials;
  const primerStages=['before-paint'];
  const a=p(c.areaId),tp=p(c.puttyThicknessId),whole=r('whole-work');
  const positive={kind:'greater_than' as const,parameterId:a,value:0};
  const base=eq(p(c.baseId),c.baseReadyRu),site=eq(p(c.siteId),c.siteReadyRu);
  const ready={kind:'and' as const,operands:[positive,base,site]};
  const rows:AutomaticRowSpec[]=[],bindings=new Map<string,{sourceIndex:number;stage:string;materialId?:string;included?:boolean;check?:'base'|'site';normId?:string}>();
  const add=(key:string,title:string,unitId:string,expression:string,binding:{sourceIndex:number;stage:string;materialId?:string;included?:boolean;check?:'base'|'site';normId?:string},extra:Partial<AutomaticRowSpec>={})=>{
    rows.push({rowId:r(key),formulaId:r('formula:'+key),title,unitId,expression,section:c.titleRu,category:'material',procurement:false,
      costTreatment:'INFORMATIONAL_SCOPE',inclusion:ready,...extra});bindings.set(r(key),binding);
  };
  for(const m of materials){
    const consumed=m.id==='ct225'?`${a}*${tp}*${m.ratePerM2PerMm}`:
      m.id==='primer'?primerStages.map(()=>`(${a}*${m.ratePerApplication})`).join('+'):`${a}*${m.rateForTwoCoats}`;
    const owner=r(m.id+'-order'),b={sourceIndex:m.sourceIndex,stage:m.stage,materialId:m.id};
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:m.unit,consumed,stock:'0',reserve:'0',quantum:String(m.package)});
    add(m.id+'-consumed',m.nameRu+': плановый расход',m.unit,consumed,b,{purchaseBalanceOwnerRowId:owner});
    add(m.id+'-order',m.nameRu+': заказ целыми упаковками',m.unit,`ceil((${consumed})/${m.package})*${m.package}`,b,
      {costTreatment:'OWN_COST',procurement:true,...balance.owner,purchaseBalance:{unitId:m.unit,consumedExpression:consumed,stockExpression:'0',reserveExpression:'0',orderQuantumExpression:String(m.package),quantityMode:'supply_quantum',
        balanceScope:'new_order_vs_required_consumption',requirementBasis:'selected_supply_order',plannedConsumptionExpression:consumed}});
    for(const [suffix,title,unit,expr]of [['packages','Упаковки в заказе','item',balance.packages],['remaining','Остаток после расхода',m.unit,balance.remaining],
      ['shortage','Непокрытая потребность',m.unit,balance.consumptionShortage]]as const)
      add(m.id+'-'+suffix,title+': '+m.nameRu,unit,expr,b,{purchaseBalanceOwnerRowId:owner});
    if(m.id==='primer')for(const stage of primerStages)add('primer-contribution-'+stage,'Грунтовка: расход перед окраской',
      m.unit,`${a}*${m.ratePerApplication}`,{...b,stage},{purchaseBalanceOwnerRowId:owner});
  }
  add('whole-work','Финишная отделка стен: труд и обычное обеспечение','m2',a,{sourceIndex:4,stage:'preparation'},
    {category:'work',costTreatment:'OWN_COST'});
  for(const op of operations)add('process-'+op.id,op.titleRu,'m2',a,{sourceIndex:op.id==='paint'?1:op.id==='before-paint'?3:op.id==='putty'?0:5,stage:op.id,included:true},{category:'work',costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  const normRows=[
    ['paint-putty-primer-workers','Шпаклевание, грунтование и две окраски: цельная норма труда','man_hour',c.labour.workersManH,'paint',c.labour.normId],
    ['paint-operators','Машинисты отделки, уже в эксплуатации машин','man_hour',c.labour.paintOperatorsManH,'paint',c.labour.normId],
    ['paint-lift','Подъёмник: нормативная эксплуатация при отделке','machine_hour',c.labour.liftMachineH,'paint',c.labour.normId],
    ['paint-truck','Бортовой автомобиль до5т: нормативная эксплуатация','machine_hour',c.labour.truckMachineH,'paint',c.labour.normId],
    ['sanding-sheet','Шлифовальная шкурка для отделки','m2',c.labour.sandingM2,'putty',c.labour.normId],
    ['rags','Ветошь для отделки','kg',c.labour.ragsKg,'completion',c.labour.normId],
  ]as const;
  for(const [key,title,unit,rate,stage,normId]of normRows)add(key,title,unit,`${a}/100*${rate}`,{sourceIndex:4,stage,included:true,normId},
    {category:key.includes('workers')||key.includes('operators')?'labor':key==='sanding-sheet'||key==='rags'?'material':'equipment',costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  for(const included of c.included)add('included-'+included.id,included.titleRu,'',p('included_'+included.id.replaceAll('-','_')),
    {sourceIndex:included.id==='water'?0:5,stage:included.stage,included:true},{category:'service',inclusion:positive});
  for(const key of ['base','site']as const)add('check-'+key,key==='base'?'Проверить исходное основание выбранной отделки':'Проверить условия выбранной отделки','',p('check_'+key),
    {sourceIndex:5,stage:'preparation',check:key},{category:'service',inclusion:positive});
  const source=c.sources[4],built=buildAutomaticConstructionOwnerR1({contract:c.contract,semanticOwner:'existing-interior-wall-cement-finishing-group',
    sourceId:source.id,normId:c.contract,operationCompositionGroupId:c.namespace,sourceMetadata:{source_title:c.titleRu,source_document_version:source.edition,
      definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locatorRu},applicabilityRu:c.physicalScopeRu,
    ordinary:[{id:a,title:'Площадь плоских участков стен без проёмов и откосов, м²',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0,max:1e9},
      {id:p(c.baseId),title:'Какое исходное основание?',kind:'ordinary',valueType:'enum',unitId:null,values:[c.baseReadyRu,c.baseOtherRu],resourceBranchConsumers:[r('check-base')]},
      {id:p(c.siteId),title:'Каковы условия и подготовка участка?',kind:'ordinary',valueType:'enum',unitId:null,values:[c.siteReadyRu,c.siteOtherRu],resourceBranchConsumers:[r('check-site')]},
      {id:tp,title:'Измеренный слой финишной шпаклёвки, мм',kind:'ordinary',valueType:'decimal',unitId:'mm',min:.000001,max:3}],profile:[],
    conditional:[...c.included.map(i=>({id:p('included_'+i.id.replaceAll('-','_')),title:i.titleRu,kind:'internal' as const,valueType:'decimal' as const,unitId:null,min:0})),
      ...['base','site'].map(key=>({id:p('check_'+key),title:'Проверка выбранной области',kind:'internal' as const,valueType:'decimal' as const,unitId:null,min:0}))],
    rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[c.wholeWorkScopeRu,...c.excludedRu]});
  const parameters=built.parameters.map(param=>({...param,truth_metadata:{...param.truth_metadata,source_confirmation_required:false,
    guide:{...param.truth_metadata.guide as Record<string,unknown>,verified_at:pack.verifiedAt},
    formula_consumers:built.formulas.filter(f=>f.input_parameter_ids.includes(param.parameter_id)).map(f=>f.formula_id),
    ...(param.truth_metadata.visibility_role==='INTERNAL_ONLY'?{}:{value_source_role:param.parameter_id===a?'USER_MEASURED':'PROJECT_SPECIFIC_INPUT',
      provenance:{consumer_input_role_v1:'OBJECT_FACT'},visible_when:{kind:'literal',value:true}})}}));
  const resources=built.resources.map(row=>{const b=bindings.get(row.row_id)!,s=c.sources[b.sourceIndex],key=row.row_id.slice((c.namespace+'work:').length),
    material=materials.find(m=>m.id===b.materialId),isScope=row.unit_id==='',isWhole=row.row_id===whole;
    const parent=pack.parents[b.stage==='paint'||b.stage==='before-paint'?1:0];
    const operation=(stage:string)=>{const op=operations.find(o=>o.id===stage)??operations[0];return{operationId:r('operation:'+op.id),operationTitleRu:op.titleRu,
      processOrdinal:operations.indexOf(op)+1,processRole:'PROCESS' as const,completionCriterionRu:'Подготовка и выдержки по паспорту; фактическое выполнение проверяется на объекте.'};};
    const {row_sha256:_old,...body}=row;
    const changed={...body,...(b.included?{cost_owner_id:whole}:{}),resource_graph:{...row.resource_graph,
      ...(b.included?{parentCostOwnerId:whole,includedInResourceOwnerRowId:whole}:{}),
      ...(material&&!key.endsWith('-order')?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,
        parameterIds:built.formulas.find(f=>f.formula_id===row.formula_id)!.input_parameter_ids,reasonRu:'Измените измеренную площадь или фактический слой; расход и упаковка пересчитываются общим ядром.'}}:{}),
      ...(isScope?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:b.check?'OBJECT_SCOPE':'INCLUDED',groupId:c.namespace,
        groupTitleRu:c.titleRu,titleRu:row.title_ru,reasonRu:b.check?c.physicalScopeRu:c.wholeWorkScopeRu,
        exactScopeWhen:b.check?{kind:'and',operands:[positive,b.check==='base'?base:site]}:ready,
        coveringRowIds:b.check?[]:[whole],originalRowIds:[],...(b.check?{objectFactParameterId:p(b.check==='base'?c.baseId:c.siteId),
          objectFactMode:'PROJECT_APPLICABILITY_ONLY',unknownObjectValues:[] }:{costExclusionBreaksScopeV1:true}),
        sourceEvidence:[{sha256:s.sha256,locator:s.locatorRu},{sha256:canonicalEstimateSha256HexText(c.wholeWorkScopeRu),locator:'Объявленный коммерческий состав одной㎡цены R502.'}]}}:{}),
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:c.namespace,groupTitleRu:c.titleRu,...operation(b.materialId==='primer'&&!key.startsWith('primer-contribution-')?primerStages[0]:b.stage),
        ...(isWhole?{processRole:'COST_SUMMARY',processOrdinal:0,additionalOperations:operations.map(op=>operation(op.id))}:{} )},
      existingCatalogMemberReferenceV1:{catalogId:parent.catalogId,definitionId:parent.definitionId,
        role:'EXISTING_WORK_WITH_SOURCE_SPECIFIC_SELECTED_METHOD',automaticPriceInheritance:false},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,
        brandAndModelRu:material?s.title:null,detailsRu:[c.physicalScopeRu,s.locatorRu,material?'Расчётная потребность конкретного продукта; расход изготовителя приблизительный.':c.wholeWorkScopeRu,
          'Цены этого коммерческого состава и поставки задаются отдельно.',...(isWhole?c.transitions.map(t=>t.condition):[])],...(isScope||key.startsWith('process-')?{rowKind:'PROCESS_NOTE'}:!isWhole&&!key.endsWith('-order')?{rowKind:'CALCULATION_DETAIL'}:{})}},
      source_metadata:{...row.source_metadata,sourceRole:material?'SOURCE_SPECIFIC_MANUFACTURER_PLANNING_QUANTITY':b.normId?'KG_KRER_WHOLE_NORM_INCLUDED_IN_ONE_WORK_OWNER':'DECLARED_GROUP_COMMERCIAL_SCOPE',
        normativeTrace:[{sourceId:s.id,normId:b.normId??c.contract+':'+(material?.id??b.stage),sourceDocument:s.title,sourceLocator:s.locatorRu,sourceSnapshotHash:s.sha256}],
        source_title:s.title,source_document_version:s.edition,artifact_sha256:s.sha256,exact_locator:s.locatorRu,official_url:s.url,
        fixedPublicTechnology:c.titleRu,ordinaryObjectFactBudget:4,engineeringAcceptance:false,automaticGenericPriceInheritanceAllowed:false,
        selectedTechnologyTransitions:c.transitions,
        labourDoublePaymentForbidden:true,existingPlasterAlreadyCompleted:true,repeatLevellingNotInSelectedScope:true,selectedScopeQuantitiesComplete:true}};
    return{...changed,row_sha256:estimateDeterministicHash(changed)};
  });
  return{...built,parameters,resources};
}


export function interiorWallFinishingGroupReuseR502(){return{existingParents:structuredClone(pack.parents),
 retainedDefinitionAndPriceIdentities:true,ordinaryDefaultScenario:pack.contract,ordinaryDefaultSourceScope:pack.quantityScope,
 ordinaryObjectFactBudget:4,managedCapturedParentGuardRequired:true,catalogAppend:false,fullTechnicalAcceptance:false};}
