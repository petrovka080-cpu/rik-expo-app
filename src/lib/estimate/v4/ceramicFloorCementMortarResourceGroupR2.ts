import pack from '../../../../data/estimate-benchmarks/source-packs/ceramic-floor-cement-mortar-resource-group-r2.json';
import skirtingReuse from '../../../../data/estimate-benchmarks/source-packs/ceramic-skirting-m150-krer11-039-04-completion-r1.json';
import {ceramicFloor02703DefinitionR1,ceramicFloor02703CompletenessMapR1,ceramicFloor02703PackR1 as parentPack} from './ceramicFloorCementMortarKrer11Column03R1';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

export const ceramicFloorM150ResourceGroupPackR2=pack;
const prefix=parentPack.prefix,area=pack.primaryParameterId,length=pack.skirtingLengthParameterId;
const id=(key:string)=>prefix+':r2:'+key;
const selector='ceramic_m150_r2_technology_profile';
export const ceramicFloorM150TechnologyProfileR2='Ручная поштучная укладка 100/150 мм на готовом М150; одна бригада 6 человек; сетевой водяной пост 20–25 м';
const selected={kind:'equals' as const,parameterId:selector,value:ceramicFloorM150TechnologyProfileR2};
const positiveLength={kind:'greater_than' as const,parameterId:length,value:0};
const factIds=[...parentPack.scopeFacts.map(f=>f.id),...parentPack.requiredProjectReferences];
const profileItems=[...pack.tools,...pack.ppe.map(p=>({...p,specificationRu:'Личная защита при работе с цементным раствором и ручной резке плитки',tableRows:p.tableRow?[p.tableRow]:[]}))];
const skirtingRate=(key:string)=>{const r=skirtingReuse.physicalRows.find(r=>r.id===key);if(!r)throw Error('CERAMIC_SKIRTING_REUSE_RATE_REQUIRED:'+key);return r.ratePer100M;};
const knownReplacements=new Set([prefix+':skirting',prefix+':hand-tools-ppe']);
const blockedQuantity='ceramic_m150_r2_unresolved_provision_cost_quantity';

function assertProfile(){
 if(pack.crew.workers!==6||pack.crew.links*pack.crew.workersPerLink!==6||pack.crew.parallelBrigades!==1||pack.crew.scaleWithArea||pack.crew.purchasePerStage
  ||profileItems.length!==44||new Set(profileItems.map(x=>x.id)).size!==44||profileItems.some(x=>x.count<=0)
  ||pack.tools.find(x=>x.id==='lever-cutter')?.count!==Math.max(1,3)
  ||pack.ppe.some(p=>p.count!==p.countPerLink*3)||pack.skirting.laborPer100M!=='23.60'||pack.skirting.mortarPer100M!=='0.16')throw Error('CERAMIC_M150_R2_PROFILE_OR_SOURCE_RATE_INVALID');
}
const operation=(key:string)=>{
 const o=pack.operations.find(x=>x.id===key);if(!o)throw Error('CERAMIC_M150_R2_OPERATION_UNKNOWN:'+key);
 return{operationId:id('operation:'+o.id),operationTitleRu:o.titleRu,processOrdinal:o.ordinal*10,processRole:'PROCESS' as const,
  completionCriterionRu:({control:'Контроль выполнен и зарегистрирован; одна ровность не заменяет контроль толщины.',cleanup:'Покрытие очищено/промыто; фактические отходы переданы по отдельной подтверждённой схеме.'} as Record<string,string>)[key]??'Подработа выполнена по точной технологииМ150; обеспечение раскрыто отдельно.'};
};
function composition(keys:readonly string[]){return{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,...operation(keys[0]!),additionalOperations:keys.slice(1).map(operation)};}
function rehash<T extends {row_sha256:string}>(row:T,change:Record<string,unknown>):T{
 const{row_sha256:_old,...body}=row,content={...body,...change};return{...content,row_sha256:hash(content)} as T;
}
function expression(formula:AutomaticOwnerDefinition['formulas'][number],source:string){const g=compileFormulaGraph(source);return{...formula,expression_source:source,ast:g.ast,input_parameter_ids:g.inputParameterIds,ast_sha256:hash(g.ast)};}

/** Additive source-authoring successor. R1 and saved revisions are untouched.
 * Tool counts are one six-person brigade's concurrent inventory, never a per-m2
 * consumption or a new purchase per stage. Its measured organisational owner is
 * a provision plan with an unknown price, not proof of actual stock or a quote.
 * Real unresolved physical demands remain explicit preliminary needs. */
export function ceramicFloorM150ResourceGroupDefinitionR2():AutomaticOwnerDefinition{
 assertProfile();const base=ceramicFloor02703DefinitionR1();
 const conditional:AutomaticParameterSpec[]=[
  {id:selector,title:'Предварительный технологический профиль обеспечения',valueType:'enum',unitId:null,kind:'profile',values:[ceramicFloorM150TechnologyProfileR2],defaultValue:ceramicFloorM150TechnologyProfileR2},
  {id:blockedQuantity,title:'Подтверждённый состав и владелец цены обеспечения инструментом/СИЗ/контролем',valueType:'decimal',unitId:'m2',kind:'internal',min:0},
  {id:'ceramic_skirting_specification',title:'Фактическая совместимая спецификация прямой плинтусной плитки',valueType:'text',unitId:null,kind:'conditional',requiredWhen:positiveLength},
  ...(['stock','reserve','quantum'] as const).map(key=>({id:'ceramic_skirting_'+key,title:({stock:'Пригодное наличие',reserve:'Сохраняемый резерв',quantum:'Фактическая кратность поставки'} as Record<string,string>)[key]+': прямая плинтусная плитка',valueType:'decimal' as const,unitId:'linear_m',kind:'conditional' as const,min:key==='quantum'?0.000000001:0,requiredWhen:positiveLength})),
  {id:'ceramic_skirting_stock_reference',title:'Совместимость положительного наличия плинтусной плитки',valueType:'text',unitId:null,kind:'conditional',requiredWhen:{kind:'greater_than',parameterId:'ceramic_skirting_stock',value:0}},
  {id:'ceramic_m150_r2_paste_fire_access_qty',title:'Точный состав защиты кожи, противопожарного обеспечения и безопасного доступа',valueType:'decimal',unitId:null,kind:'internal',min:0},
 ];
 const rows:AutomaticRowSpec[]=[];
 const add=(key:string,title:string,category:string,unitId:string,expr:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({rowId:id(key),formulaId:id('formula:'+key),section:pack.titleRu,category,title,unitId,expression:expr,procurement:false,inclusion:selected,...extra});
 add('provision-owner','Обеспечение инструментом, СИЗ и контролем','service','m2',blockedQuantity);
 for(const item of profileItems)add(item.id,item.titleRu,'tool',item.unitId,`min(1,ceil(${area}))*${item.count}`,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 add('paste-fire-access','Защита кожи, пожарное обеспечение и безопасный доступ','service','','ceramic_m150_r2_paste_fire_access_qty');
 for(const check of pack.quality)add('quality-'+check.id,check.titleRu,'service','m2',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 add('skirting-labor','Установка прямого керамического плинтуса на М150','labor','man_hour',`${length}*${skirtingRate('whole-skirting-labour')}/100`,{inclusion:positiveLength,inputParameterIds:factIds});
 const consumed=id('skirting-tile-consumed'),owner=id('skirting-tile-order'),effective=effectiveResourceQuantityParameterId(consumed);
 const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'linear_m',consumed:effective,stock:'ceramic_skirting_stock',reserve:'ceramic_skirting_reserve',quantum:'ceramic_skirting_quantum'});
 add('skirting-tile-consumed','Прямая плинтусная плитка: расход','material','linear_m',`${length}*${skirtingRate('straight-ceramic-skirting')}/100`,{inclusion:positiveLength,costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:effective,unitId:'linear_m'},purchaseBalanceOwnerRowId:owner,inputParameterIds:factIds});
 add('skirting-tile-order','Плитки керамические плинтусные прямые','material','linear_m',`ceil(max(0,${effective}+ceramic_skirting_reserve-ceramic_skirting_stock)/ceramic_skirting_quantum)*ceramic_skirting_quantum`,
  {inclusion:positiveLength,procurement:true,...balance.owner,inputParameterIds:[...factIds,'ceramic_skirting_specification','ceramic_skirting_stock_reference'],titleParameterIds:['ceramic_skirting_specification']});
 const extra=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.source.id,normId:pack.contract,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  applicabilityRu:pack.profileScopeRu,ordinary:[{id:length,title:'Измеренная длина прямого керамического плинтуса, м;0 только при его отсутствии',valueType:'decimal',unitId:'linear_m',kind:'ordinary',min:0}],
  profile:conditional.filter(p=>p.kind==='profile'),conditional:[...conditional.filter(p=>p.kind!=='profile'),...factIds.map(id=>{const p=base.parameters.find(p=>p.parameter_id===id)!;return{id,title:p.title_ru,valueType:p.value_type as 'enum'|'text',unitId:p.unit_id,kind:'conditional' as const,values:(p.constraints_json as {values?:string[]}).values};})],
  rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.remaining.map(x=>x.reasonRu)});
 // One material stock/reserve/rounding owner for the very same readyM150 source code.
 // One selected truck fulfillment owner consumes the sum of both exact columns.
 const changedExpressions=new Map<string,string>([
  [prefix+':formula:ready-mortar-m150-consumed',`${area}*1.30/100+${length}*${skirtingRate('ready-mortar-m150')}/100`],
  [prefix+':formula:truck5t-consumed',`${area}*0.28/100+${length}*${skirtingRate('flatbed-truck')}/100`],
 ]);
 const removedFormulaIds=new Set(base.resources.filter(r=>knownReplacements.has(r.row_id)).map(r=>r.formula_id));
 const parameters=[...base.parameters.filter(p=>!['open_scope_qty_skirting','open_scope_qty_hand_tools_ppe'].includes(p.parameter_id)),...extra.parameters.filter(p=>!base.parameters.some(b=>b.parameter_id===p.parameter_id))].map((p,ordinal)=>{
  if([blockedQuantity,'ceramic_m150_r2_paste_fire_access_qty'].includes(p.parameter_id))return{...p,ordinal,truth_metadata:unresolvedApplicationNormTruthR1({...p.truth_metadata,source_confirmation_required:false},p.parameter_id===blockedQuantity?pack.remaining[4]!.reasonRu:pack.remaining[1]!.reasonRu)};
  return{...p,ordinal};
 });
 const formulas=[...base.formulas.filter(f=>!removedFormulaIds.has(f.formula_id)).map(f=>changedExpressions.has(f.formula_id)?expression(f,changedExpressions.get(f.formula_id)!):f),...extra.formulas];
 const resources=[...base.resources.filter(r=>!knownReplacements.has(r.row_id)).map(r=>{
  const key=r.row_id.slice(prefix.length+1),keys=(pack.parentOperationBindings as Record<string,string[]>)[key]??null;
  const changed=changedExpressions.has(r.formula_id),shared=key.startsWith('ready-mortar-m150-')||key.startsWith('truck5t-');
  return rehash(r,{resource_graph:{...r.resource_graph,...(keys?{operationCompositionV1:composition(keys)}:{}),
    ...(changed?{derivedQuantityEditPolicyV1:{...(r.resource_graph.derivedQuantityEditPolicyV1 as Record<string,unknown>),parameterIds:[area,length]}}:{}),
    ...(shared?{sharedAcrossSubworksR2:{sourceCodes:[parentPack.normId,pack.skirting.normId],stockAndReserveOwnerRetained:true,noSecondOwner:true}}:{})},
   source_metadata:{...r.source_metadata,successorContract:pack.contract,full_technical_acceptance:false,
    ...(shared?{additionalSourceColumn:pack.skirting.normId,additionalSourceLocator:pack.skirting.locatorRu,additionalSourceSha256:parentPack.source.sha256}:{}),
    ...(changed?{quantityCompositionR2:'SUM_OF_TWO_INDEPENDENT_EXACT_COLUMN_RATES',noRateSubstitution:true}:{})}});
 }),...extra.resources.map(r=>{
  const key=r.row_id.slice((prefix+':r2:').length),item=profileItems.find(x=>x.id===key),quality=pack.quality.find(x=>'quality-'+x.id===key),skirting=key.startsWith('skirting-'),provision=key==='provision-owner',unresolved=key==='paste-fire-access'||provision;
  const keys=item?.operations??quality?.operations??(skirting?['skirting']:['preparation','control','cleanup']);
  const costOwner=item||quality?id('provision-owner'):r.cost_owner_id;
  return rehash(r,{cost_owner_id:costOwner,resource_graph:{...r.resource_graph,operationCompositionV1:composition(keys),
   ...(item||quality?{parentCostOwnerId:costOwner,includedInResourceOwnerRowId:costOwner}:{}),
   ...(item?{physicalProvisionR2:{requiredConcurrentCount:item.count,scope:'ONE_SIX_WORKER_BRIGADE',serialAcrossStages:true,notPurchaseCount:true,noAutomaticStockCredit:true,commercialOwnerPending:true}}:{}),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,
    specificationRu:item?.specificationRu??(skirting?pack.skirting.tileTitleRu:null),detailsRu:[]}},
   source_metadata:{...r.source_metadata,profileScopeRu:pack.profileScopeRu,physicalProvisionLimitRu:item?'Количество всей бригады сохраняется между этапами. Это не новая закупка и не факт наличия; точный коммерческий owner открыт.':null,sourceRole:unresolved?'UNRESOLVED_APPLICATION_NORM':skirting?(key.endsWith('-order')?'DERIVED_PURCHASE_BALANCE':'OFFICIAL_NORM'):'CALCULATED_EXPLICIT_BRIGADE_PROVISION_PROFILE',
    normativeTrace:skirting?[{sourceId:parentPack.sourceId,source_id:parentPack.sourceId,normId:pack.skirting.normId,norm_id:pack.skirting.normId,normVersion:parentPack.source.edition,source_title:parentPack.titleRu,source_document_version:parentPack.source.edition,source_definition_hash:parentPack.source.sha256,definition_hash:parentPack.source.sha256,artifact_sha256:parentPack.source.sha256,exact_locator:pack.skirting.locatorRu,sourceRole:key.endsWith('-order')?'DERIVED_PURCHASE_BALANCE':'OFFICIAL_NORM'}]:[],
    official_url:skirting?parentPack.source.officialUrl:pack.source.url,artifact_sha256:skirting?parentPack.source.sha256:pack.source.sha256,
    exact_locator:skirting?pack.skirting.locatorRu:quality?.locatorRu??(item?'ТКтабл.3/4; номера строк:'+item.tableRows.join(','):'ТК§4.6/4.18; КРнакладныеPDF22–25'),
    ...(item?{sourceTableRows:item.tableRows,sourceCrewWorkers:6,areaScalingForbidden:true,perStagePurchaseForbidden:true}:{}),
    numericNormAccepted:skirting,physicalProvisionAccepted:!!item,physicalResourceCoverageComplete:false,full_technical_acceptance:false,
    quantityUnitUnconfirmed:key==='paste-fire-access',commercialPriceScopeEvidence:pack.overheadSource,commercialScopeNotQuantityNorm:true}});
 })].map((r,ordinal)=>rehash(r,{ordinal}));
 return planningDefinition({...base,parameters,formulas,resources,runtimeInput:{...base.runtimeInput,...extra.runtimeInput},runtimeClassification:{...base.runtimeClassification,...extra.runtimeClassification},runtimeSourceIds:{...base.runtimeSourceIds,...extra.runtimeSourceIds},ordinaryParameterIds:[...base.ordinaryParameterIds,length]});
}

/** Planning uses source-compatible generic products and grants no stock credit.
 * Acts, real inventory, quoted pack quanta and prices are not physical norms.
 * This is a successor only; the old actual-stock factory stays immutable. */
function planningDefinition(d:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 const omitRows=new Set([prefix+':acceptance-testing',prefix+':extra-protection-control']);
 const omitParameters=new Set([blockedQuantity,'open_scope_qty_acceptance_testing','open_scope_qty_extra_protection_control',...parentPack.requiredProjectReferences,
  ...parentPack.materials.flatMap(m=>[m.specificationId,m.parameterPrefix+'_stock_compatibility_reference',m.parameterPrefix+'_stock',m.parameterPrefix+'_reserve',m.parameterPrefix+'_quantum']),
  'ceramic_skirting_specification','ceramic_skirting_stock','ceramic_skirting_reserve','ceramic_skirting_quantum','ceramic_skirting_stock_reference']);
 const formulas=d.formulas.filter(f=>!d.resources.some(r=>omitRows.has(r.row_id)&&r.formula_id===f.formula_id)).map(f=>f.formula_id===id('formula:provision-owner')?expression(f,area):f.formula_id===id('formula:paste-fire-access')?{...f,output_unit_id:'l'}:f);
 const sourceFacts=new Map([...parentPack.scopeFacts.map(f=>[f.id,f.value] as [string,string]),...parentPack.machines.map(m=>[m.parameterId,m.ownValue] as [string,string])]);
 const runtimeInput={...d.runtimeInput,...Object.fromEntries(sourceFacts)};
 const runtimeClassification={...d.runtimeClassification,...Object.fromEntries([...sourceFacts.keys()].map(k=>[k,'ASSUMPTION' as const]))};
 const runtimeSourceIds=Object.fromEntries(Object.keys(runtimeInput).map(k=>[k,[pack.publicationSourceId]]));
 const parameters=d.parameters.filter(p=>!omitParameters.has(p.parameter_id)).map((p,ordinal)=>(sourceFacts.has(p.parameter_id)||p.parameter_id===selector)?{...p,ordinal,required:false,
  truth_metadata:{...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',runtime_profile_value:true,
   runtime_profile_classification:'ASSUMPTION',source_confirmation_required:false,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   profileScopeNotObjectAcceptance:true}}:{...p,ordinal,
   ...(p.parameter_id===length?{truth_metadata:{...p.truth_metadata,provenance:{
    ...(p.truth_metadata?.provenance as Record<string,unknown>|undefined),consumer_input_role_v1:'OBJECT_GEOMETRY',
    measured_quantity_labels_ru_v1:['плинтус','длина плинтуса','длина прямого керамического плинтуса']}}}:{}),
   ...(p.parameter_id==='ceramic_m150_r2_paste_fire_access_qty'?{unit_id:'l',title_ru:'Защитное средство для кожи при работе с цементным раствором'}:{})});
 const valid=new Set(parameters.map(p=>p.parameter_id));
 const resources=d.resources.filter(r=>!omitRows.has(r.row_id)).map(r=>{
  const owner=parentPack.materials.find(m=>r.row_id===prefix+':'+m.id+'-order'),skirting=r.row_id===id('skirting-tile-order'),provision=r.row_id===id('provision-owner'),skin=r.row_id===id('paste-fire-access');
  let graph={...r.resource_graph};
  if(owner||skirting){const consumed=effectiveResourceQuantityParameterId(owner?prefix+':'+owner.id+'-consumed':id('skirting-tile-consumed'));
   const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:r.row_id,orderUnitId:r.unit_id,consumed,stock:'0',reserve:'0',quantityMode:'canonical_decimal',balanceScope:'new_order_vs_required_consumption'});
   const at=formulas.findIndex(f=>f.formula_id===r.formula_id);formulas[at]=expression(formulas[at]!,consumed);
   graph={...graph,purchaseBalanceV1:balance.owner.purchaseBalance,effectiveQuantityOutputV1:balance.owner.effectiveQuantityOutput};
   delete graph.titleSpecificationParameterIds;delete graph.titleSpecificationMode;delete graph.titleSpecificationSeparator;
  }
  if(Array.isArray(graph.inputParameterIds))graph.inputParameterIds=graph.inputParameterIds.filter(x=>valid.has(String(x)));
  const publicView=graph.publicResourcePresentationV1 as Record<string,unknown>|undefined;
  const title=provision?'Обеспечение инструментом, СИЗ и контролем':skin?'Защитное средство для кожи при работе с цементным раствором':r.title_ru;
  if(publicView)graph.publicResourcePresentationV1={...publicView,nameRu:title,sourceTitleRu:title,detailsRu:[]};
  if(skin)graph={...graph,costTreatment:'OWN_COST'};
  if(graph.physicalProvisionR2)graph.physicalProvisionR2={...(graph.physicalProvisionR2 as Record<string,unknown>),commercialOwnerPending:false,plannedOwnerRowId:id('provision-owner'),actualWarehouseClaimed:false};
  return rehash(r,{title_ru:title,...(skin?{category:'material',unit_id:'l',procurement_eligible:true}:{}),resource_graph:graph,
   source_metadata:{...r.source_metadata,...(owner||skirting?{sourceRole:'DERIVED_DECIMAL_NEW_ORDER_PLAN',stockCreditAssumed:false,supplierPackQuantumAssumed:false,physicalDemandKnownBeforeQuote:true}:{}),
    ...(provision?{sourceRole:'MEASURED_AREA_ORGANISATIONAL_PROVISION_PLAN',quantityUnitUnconfirmed:false,physicalProvisionPlanKnown:true,priceUnknownDoesNotCreateQuantityNeed:true}:{}),
    ...(skin?{sourceRole:'UNRESOLVED_APPLICATION_NORM',unresolvedReasonRu:pack.actualRemaining[2]!.reasonRu,quantityUnitUnconfirmed:false,doseMlPerApplication:1,applicationCountUnknown:true,primarySkinProtectionEvidence:pack.skinProtectionSource}:{}),
    ...(graph.physicalProvisionR2?{physicalProvisionLimitRu:'План обеспечения одной бригады; инструмент повторно используется между этапами, цена остаётся неизвестной. Фактический склад не утверждается.'}:{}),
    technologyConditions:pack.technologyConditions,profileIsNotProofOfSiteAcceptance:true,planningAllocationNotActualWarehouseOrBooking:true,...(r.row_id===id('knee-pads')?{exact_locator:'ТК§4.6; одна личная пара на каждого из6работников',physicalProvisionBasis:'PERSONAL_FUNCTIONAL_PROVISION_FROM_EXPLICIT_SIX_WORKER_PROFILE'}:{}),full_technical_acceptance:false}});
 });
 return{...d,parameters,formulas,resources,runtimeInput,runtimeClassification,runtimeSourceIds};
}

export function compileCeramicFloorM150ResourceGroupR2(submittedParameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:area,definition:ceramicFloorM150ResourceGroupDefinitionR2(),submittedParameters});}
export function ceramicFloorM150ResourceGroupCompletenessR2(){
 const base=ceramicFloor02703CompletenessMapR1();
 const entry=(key:string,category:string,unitId:string,rule:string,parent?:string)=>({expectedResourceId:'ceramic-m150-r2:'+key,operationId:profileItems.find(x=>x.id===key)?.operations[0]??'control',category,unitId,
  specification:profileItems.find(x=>x.id===key)?.titleRu??key,condition:pack.profileScopeRu,sourceId:key.startsWith('skirting-')?parentPack.sourceId:pack.source.id,quantityRule:rule,formulaId:id('formula:'+key),requiredOperationIds:(profileItems.find(x=>x.id===key)?.operations??pack.quality.find(x=>'quality-'+x.id===key)?.operations??(key.startsWith('skirting-')?['skirting']:['preparation','control','cleanup'])).map(k=>id('operation:'+k)),
  resolution:parent?{kind:'INCLUDED_COMPONENT_ROW',rowId:id(key),parentRowId:parent}:{kind:'ROW',rowId:id(key)}});
 return{...base,contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'TECHNOLOGY_MAP',generatedFromCurrentRows:false,
  operationResourceBindingRequired:true,fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,
  entries:[...base.entries.filter(e=>!knownReplacements.has(String(e.resolution.rowId))&&![prefix+':acceptance-testing',prefix+':extra-protection-control'].includes(String(e.resolution.rowId))).map(e=>{const key=String(e.resolution.rowId).slice(prefix.length+1),keys=(pack.parentOperationBindings as Record<string,string[]>)[key];return{...e,requiredOperationIds:keys?keys.map(k=>id('operation:'+k)):[prefix+':operation:'+key],...(['ready-mortar-m150-consumed','truck5t-consumed'].includes(key)?{quantityRule:'SUM_EXACT_02703_AND_03904_RATES_SINGLE_EFFECTIVE_OWNER'}:{})};}),
   ...profileItems.map(x=>entry(x.id,'tool',x.unitId,'EXACT_CONCURRENT_BRIGADE_PROVISION_REUSED_BETWEEN_OPERATIONS',id('provision-owner'))),
   ...pack.quality.map(x=>entry('quality-'+x.id,'service','m2','WHOLE_INSPECTED_AREA_NOT_INVENTED_TEST_COUNT',id('provision-owner'))),
   entry('provision-owner','service','m2','MEASURED_AREA_EXPLICIT_PROVISION_PLAN_PRICE_CAN_BE_UNKNOWN'),entry('paste-fire-access','material','l','UNRESOLVED_SKIN_CONSUMABLE_TOTAL_APPLICATION_COUNT'),
   entry('skirting-labor','labor','man_hour','KRER11_01_039_04_23_60_PER_100M'),entry('skirting-tile-consumed','material','linear_m','KRER11_01_039_04_101_PER_100M'),entry('skirting-tile-order','material','linear_m','ONE_EFFECTIVE_PURCHASE_BALANCE')],
  additionalSources:[pack.source,pack.overheadSource,pack.skinProtectionSource],sharedQuantitySources:[{ownerRowId:prefix+':ready-mortar-m150-order',sourceColumns:[parentPack.normId,pack.skirting.normId]},{ownerRowId:prefix+':truck5t-consumed',sourceColumns:[parentPack.normId,pack.skirting.normId]}],
  technologyConditions:pack.technologyConditions,gapReaudit:pack.gapReaudit,openAuthorObligations:pack.actualRemaining.map(x=>x.reasonRu)};
}
