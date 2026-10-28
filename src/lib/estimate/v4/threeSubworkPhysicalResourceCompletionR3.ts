import screedCycle from '../../../../data/estimate-benchmarks/source-packs/cement-screed20mm-current-physical-cycle-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {floorCementScreed20mmCompletenessMapR1} from './floorCementScreed20mmKrer11Column01R1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import pack from '../../../../data/estimate-benchmarks/source-packs/three-subwork-physical-resource-completion-r3.json';
import {facadeMineralWoolOperationCompositionR2} from './facadeMineralWoolOperationCompositionR2';
import {facadeCeresitCt190PackR1 as ct,facadeCeresitCt190ChoiceParameterR1 as choice} from './facadeCeresitCt190MaterialSubworksR1';
import {floorConcreteSimplePresentationR2,floorScreed20mmSimplePresentationR2} from './floorSimpleResourcePresentationR2';
import {floorConcreteUnderlayerPackR1 as concrete} from './floorConcreteUnderlayerKrer11Column09R1';
import {floorCementScreed20mmPackR1 as screed} from './floorCementScreed20mmKrer11Column01R1';
import {appendProjectSubworkResourceScheduleR1,projectResourceParameterPrefixR1,type ProjectSubworkResourcePositionR1,type ProjectSubworkResourceScheduleR1} from './projectSubworkResourceScheduleR1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';

function cleanup(key:'facade'|'concrete'|'screed'){
 const parent=key==='facade'?facadeMineralWoolOperationCompositionR2():key==='concrete'?floorConcreteSimplePresentationR2():floorScreed20mmSimplePresentationR2();
 const operation=canonicalEstimateOperationReferences(parent.resources[0]!.resource_graph.operationCompositionV1)[0]!;
 const {additionalOperations:_old,whenResourcePresent:_condition,...group}=operation;
 return [{...group,operationId:operation.groupId+':cleanup',operationTitleRu:'Убрать место работ и вывезти отходы',processOrdinal:90,
  completionCriterionRu:'Отходы собраны и переданы по подтверждённым условиям; включённые уборка и вывоз повторно не оплачиваются.'}];
}

function positions(key:'facade'|'concrete'|'screed'):readonly ProjectSubworkResourcePositionR1[]{
 const rows=pack[key];
 if(pack.contract!=='three-subwork-physical-resource-completion/r3'||pack.fullTechnicalAcceptance||pack.status!=='CANDIDATE_NOT_PUBLISHED'
  ||rows.some(row=>!['material','tool','equipment','service','transport','work'].includes(row.category)))throw Error('THREE_RESOURCE_SOURCE_MATRIX_INVALID');
 const result=rows as readonly ProjectSubworkResourcePositionR1[];
 if(key!=='facade')return result;
 const parent=facadeMineralWoolOperationCompositionR2();
 return result.map(position=>({...position,...(position.operation==='start-profile'
  ?{active:parent.resources.find(row=>row.row_id==='rc09:facade_start_profile')!.inclusion_ast as ProjectSubworkResourceScheduleR1['active']}
  :position.operation==='base-layer'&&!position.sharedOperations.includes('attachment')
   ?{active:{kind:'greater_than' as const,parameterId:'ct190_base_layer_area_m2',value:0}}
   :['attachment','mechanical-fixing'].includes(position.operation)&&!position.sharedOperations.includes('base-layer')
    ?{active:{kind:'greater_than' as const,parameterId:'area_m2',value:0}}:{})}));
}
export function threeSubworkResourceScheduleR3(key:'facade'|'concrete'|'screed'):ProjectSubworkResourceScheduleR1 {
 const source=pack.sources[key==='facade'?0:1]!;
 if(key==='facade')return {key:'facade_ct190_r3',sourceSha256:source.sha256,sourceUrl:source.url,sourceLocatorRu:source.locatorRu,sourceId:ct.sourceId,
  primaryParameterId:'area_m2',active:{kind:'and',operands:[{kind:'equals',parameterId:choice,value:ct.selectedValueRu},
   {kind:'or',operands:[{kind:'greater_than',parameterId:'area_m2',value:0},{kind:'greater_than',parameterId:'ct190_base_layer_area_m2',value:0}]}]},
  includedOwnerRowId:'rc09:facade_mineral_wool_install',positions:positions(key),additionalOperations:cleanup(key),
  sharedOperationResourceConditions:{'start-profile':['rc09:facade_start_profile'],'fire-barrier':['rc09:mineral_wool_fire_barrier_lamella'],
   'base-layer':['subwork-resource:facade_ct190_r3:glass-mesh:separate','subwork-resource:facade_ct190_r3:glass-mesh:included',
    'subwork-resource:facade_ct190_r3:base-coat-work:separate','subwork-resource:facade_ct190_r3:base-coat-work:included']},replacements:{
   [ct.prefix+':open-mesh-layout']:['glass-mesh'],
   [ct.prefix+':open-base-layer-labor']:['base-coat-work'],
   [ct.prefix+':open-mixing-tools']:['mixer','large-notched-float','mesh-notched-float','flat-float','trowel','mixing-container','water-measure'],
   [ct.prefix+':open-delivery']:['material-delivery'],
   [ct.prefix+':open-preparation-protection']:['surface-preparation','ct17-primer','ct29-repair','ct99-treatment','facade-cover','scaffold-rental'],
  }};
 const floor=key==='concrete'?concrete:screed;
 return {key:key==='concrete'?'floor_concrete_r3':'floor_screed20_r3',sourceSha256:source.sha256,sourceUrl:source.url,sourceLocatorRu:source.locatorRu,
  sourceId:floor.sourceId,primaryParameterId:floor.measurement.parameterId,
  active:{kind:'greater_than',parameterId:floor.measurement.parameterId,value:0},includedOwnerRowId:floor.prefix+':whole-labor',positions:positions(key),additionalOperations:cleanup(key),
  replacements:key==='concrete'?{
   [floor.prefix+':open-tools-access']:['straightedge','float','shovel','brush','level','tape-measure','extension-cord','gloves','goggles','temporary-access'],
   [floor.prefix+':open-external-logistics']:['material-delivery','unloading'],
   [floor.prefix+':open-quality-acceptance']:['quality-test'],
  }:{
   [floor.prefix+':open-tools-and-ppe']:['straightedge','float','shovel','brush','level','tape-measure','extension-cord','gloves','goggles'],
   [floor.prefix+':open-additional-logistics-and-waste']:['material-delivery','unloading','waste-bags','waste-transport'],
  }};
}

/** Governed successor candidates. Importing these factories neither mutates a
 * saved estimate nor registers, publishes or activates a catalogue release. */
export const facadePhysicalResourceCompletionR3=()=>appendProjectSubworkResourceScheduleR1(facadeMineralWoolOperationCompositionR2(),threeSubworkResourceScheduleR3('facade'));
export const floorConcretePhysicalResourceCompletionR3=()=>appendProjectSubworkResourceScheduleR1(floorConcreteSimplePresentationR2(),threeSubworkResourceScheduleR3('concrete'));
export const floorScreedPhysicalResourceCompletionR3=()=>appendProjectSubworkResourceScheduleR1(floorScreed20mmSimplePresentationR2(),threeSubworkResourceScheduleR3('screed'));


export const floorScreedPhysicalCyclePackR1=screedCycle;
/** Canonical JSON content hash; raw manifest bytes are pinned by the receipt. */
export const floorScreedPhysicalCycleContentHashR1=hash(screedCycle);
export const floorScreedPhysicalCycleFactR1=(key:string)=>'floor_screed20_cycle_'+key;
export const floorScreedPhysicalCycleUnknownR1=(key:string)=>'floor_screed20_cycle_unknown_'+key.replaceAll('-','_');

/** Optional SOURCE_ONLY overlay of the actual retained current whole parent.
 * R672 pins its v3 identity and shape; a historical R3 factory is never used
 * here as a replacement for that parent. The standard
 * method establishes physical functions and bounded control minima only; site
 * facts, tools, routes, material additions and machine payment need readback. */
export function floorScreedPhysicalCycleDefinitionR1(base:AutomaticOwnerDefinition,quantityBasis?:'ACTUAL_MEASURES_R1'):AutomaticOwnerDefinition {
 const p=screedCycle,id=(key:string)=>p.prefix+':'+key,
  fact=floorScreedPhysicalCycleFactR1,unknown=floorScreedPhysicalCycleUnknownR1,
  plan=quantityBasis==='ACTUAL_MEASURES_R1'?p.measuredQuantityPlan:null,
  driverId=(key:string)=>'floor_cement_screed20mm_measure_'+key,
  active={kind:'greater_than' as const,parameterId:screed.measurement.parameterId,value:0};
 if(plan&&hash({parameters:base.parameters,formulas:base.formulas,resources:base.resources})!==p.actualCurrent.retainedBodyEstimateContentHash)
  throw Error('SCREED_PHYSICAL_ACTUAL_R833_BODY_REQUIRED');
 if(screed.proposedIdentity.catalogId!==p.catalogId||screed.normId!=='11-01-011-01'||positions('screed').length!==23
  ||[base.parameters.length,base.formulas.length,base.resources.length].join('/')!==p.currentParent.shape.join('/'))
  throw Error('SCREED_PHYSICAL_EXACT_WHOLE_PARENT_REQUIRED');
 for(const[suffix,unit,expression]of[
  ['whole-labor','man_hour',screed.measurement.parameterId+'*39.51/100'],
  ['hoist500kg45m-consumed','machine_hour',screed.measurement.parameterId+'*1.27/100'],
  ['surface-vibrator-consumed','machine_hour',screed.measurement.parameterId+'*9.07/100'],
  ['water-consumed','m3',screed.measurement.parameterId+'*3.5/100'],
  ['ready-mortar-m150-consumed','m3',screed.measurement.parameterId+'*2.04/100']
 ]as const){const row=base.resources.find(row=>row.row_id===id(suffix)),formula=base.formulas.find(formula=>formula.formula_id===row?.formula_id);
  if(!row||row.unit_id!==unit||formula?.expression_source!==expression)throw Error('SCREED_PHYSICAL_RETAINED_WHOLE_SOURCE_DRIFT:'+suffix);
 }
 if(base.resources.find(row=>row.row_id===id('whole-labor'))?.resource_graph.costTreatment!=='OWN_COST'
  ||positions('screed').some(position=>!base.parameters.some(parameter=>parameter.parameter_id===projectResourceParameterPrefixR1('floor_screed20_r3',position.key)+'_quantity')))
  throw Error('SCREED_PHYSICAL_RETAINED_OWNER_AND_PROJECT_SCHEDULE_REQUIRED');
 const parentGroup=canonicalEstimateOperationReferences(base.resources.find(row=>row.row_id===id('whole-labor'))!.resource_graph.operationCompositionV1)[0];
 if(!parentGroup||parentGroup.groupId!==p.prefix)throw Error('SCREED_PHYSICAL_RETAINED_GROUP_REQUIRED');


 const operation=(key:string)=>{
  const op=p.operations.find(item=>item.key===key);if(!op)throw Error('SCREED_PHYSICAL_OPERATION_REQUIRED:'+key);
  return{operationId:id('operation:'+key),operationTitleRu:op.nameRu,processOrdinal:op.ordinal,processRole:'PROCESS' as const,
   completionCriterionRu:'Физическая функция выполнена по подтверждённому ППР; ресурсы и приёмка не признаются фактическими только по расчёту.'};
 };
 const composition=(keys:readonly string[])=>{
  const[first,...rest]=[...new Set(keys)].map(operation);if(!first)throw Error('SCREED_PHYSICAL_EMPTY_OPERATION');
  return{contractVersion:'canonical-operation-resource/v1',groupId:p.prefix,groupTitleRu:parentGroup.groupTitleRu,...first,
   ...(rest.length?{additionalOperations:rest}:{})};
 };
 const required=(keys:readonly string[])=>[...new Set(['exact_system','inventory_reference','provision_scope','site_access_electrical',
  ...keys.flatMap(key=>key==='preparation'?['ready_base','layout_and_edges','water_connection','environment']:
   key==='layout'?['ready_base','layout_and_edges','joint_scope','edge_scope']:
   key==='supply'?['mortar_approval','supply_route','machine_configuration','quality_plan']:
   key==='placing'?['ready_base','layout_and_edges','mortar_approval','machine_configuration','water_connection','environment']:
   key==='joints'?['joint_scope','edge_scope','layout_and_edges','water_connection','quality_plan']:
   key==='curing'?['care_profile','environment','water_connection','quality_plan']:
   key==='control'?['quality_plan','control_scope','covering_profile','lab_scope','environment']:
   ['water_connection','cleanup_water_scope','waste_receiver','external_waste_scope'])])].map(fact);
 const extra=buildAutomaticConstructionOwnerR1({contract:p.contract,semanticOwner:p.prefix,sourceId:p.contract,
  normId:'WHOLE01101_PHYSICAL_FUNCTIONS_AND_BOUNDED_CONTROL_NOT_NEW_LABOUR_NORM',sourceMetadata:{
   source_title:'Полный физический цикл цементной стяжки 20 мм',source_document_version:'SOURCE_ONLY_UNRUN',
   definition_hash:floorScreedPhysicalCycleContentHashR1,artifact_sha256:p.sources[1]!.sha256,
   exact_locator:p.sources.map(source=>source.locator).join('; ')},
  applicabilityRu:'Только стяжка 20 мм на готовом М150 с исходными механизмами по011-01; Фактический ППР, состав и источник допускаются отдельно.',
  ordinary:[{id:screed.measurement.parameterId,title:'Чистая площадь стяжки',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0.000000001}],profile:[],conditional:[...p.facts.map(item=>({id:fact(item.key),title:item.nameRu,unitId:null,kind:'internal' as const,
   valueType:item.values?'enum' as const:'text' as const,...(item.values?{values:item.values}:{})})),
   ...(plan?.drivers??[]).map(item=>({id:driverId(item.key),title:item.nameRu,unitId:item.unit,kind:'conditional' as const,valueType:'decimal' as const,min:item.min,
    ...(item.key==='additional_wash_meter_after_l'?{numericPeerConstraints:{greaterThanParameter:driverId('additional_wash_meter_before_l')}}:{}),
    requiredWhen:item.additionalWashOnly?{kind:'and' as const,operands:[active,{kind:'equals' as const,parameterId:fact('cleanup_water_scope'),value:'ADDITIONAL_WASH_WATER_REQUIRED'}]}:active})),
   ...p.resources.map(item=>({id:unknown(item.key),title:item.nameRu,unitId:item.unit||null,kind:'internal' as const,
    valueType:item.unit==='piece'||item.unit==='pair'?'integer' as const:'decimal' as const,min:0}))],
  rows:[...p.resources.map(item=>({rowId:id('cycle:'+item.key),formulaId:id('formula:cycle:'+item.key),title:item.nameRu,
   section:'Физический состав стяжки',category:item.kind==='MATERIAL'||item.kind==='CONSUMABLE'?'material':item.kind==='TOOL'||item.kind==='PPE'?'tool':'equipment',
   unitId:item.unit,expression:unknown(item.key),costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false})),
   ...p.knownControls.map(item=>({rowId:id('cycle:'+item.key),formulaId:id('formula:cycle:'+item.key),title:item.nameRu,
    section:'Контроль стяжки',category:'service',unitId:item.unit,expression:item.expression,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false})),
   {rowId:id('cycle:whole-required-scope'),formulaId:id('formula:cycle:whole-required-scope'),title:'Проверка обязательного целого состава стяжки',
    section:'Проверка состава',category:'service',unitId:'document',expression:'1',costTreatment:'INFORMATIONAL_SCOPE',procurement:false}],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:p.prohibitedTransfers});
 let parameters=[...base.parameters,...extra.parameters.filter(parameter=>!base.parameters.some(parent=>parent.parameter_id===parameter.parameter_id)).map(parameter=>{
  const driver=plan?.drivers.find(item=>driverId(item.key)===parameter.parameter_id);
  if(driver)return{...parameter,default_value:null,truth_metadata:{...parameter.truth_metadata,visibility_role:"USER_INPUT",value_source_role:"CONDITIONAL_PROJECT_FACT",source_confirmation_required:false,provenance:{consumer_input_role_v1:"OBJECT_FACT"},resource_branch_consumers:plan!.rules.filter(rule=>rule.drivers.includes(driver.key)).map(rule=>id("cycle:"+rule.key)),guide:{...(parameter.truth_metadata.guide as Record<string,unknown>),guide_kind:"MEASUREMENT_RULE",source_role:"USER_MEASURED",source_document:p.contract,source_snapshot_hash:p.measuredQuantityPlanContentSha256,source_locator:"measuredQuantityPlan.drivers."+driver.key,guide_version:plan!.key,guide_short_ru:driver.nameRu,guide_validation_policy:"MANDATORY_BLOCK"}}};
  const condition=p.facts.find(item=>fact(item.key)===parameter.parameter_id),resource=p.resources.find(item=>unknown(item.key)===parameter.parameter_id);
  if(!condition)return{...parameter,default_value:null,truth_metadata:unresolvedApplicationNormTruthR1(parameter.truth_metadata,resource!.returnWhen)};
  return{...parameter,required:false,default_value:null,constraints_json:{...parameter.constraints_json,requiredWhen:active,
   ...(condition.key==='control_scope'?{forbiddenWhen:{kind:'and',operands:[
    {kind:'equals',parameterId:fact('control_scope'),value:'MINIMUM_ONE_ACTUAL_ROOM_UP_TO_50_M2'},
    {kind:'greater_than',parameterId:screed.measurement.parameterId,value:50}]}}:{})},truth_metadata:{...parameter.truth_metadata,
    visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
    provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}}};
 })].map((parameter,ordinal)=>({...parameter,ordinal}));
 if(plan)parameters=parameters.map(parameter=>{
  const rule=plan.rules.find(item=>item.parameterId===parameter.parameter_id);if(!rule)return parameter;
  const {unresolved_norm_reason:_held,...truth}=parameter.truth_metadata;
  return{...parameter,default_value:null,constraints_json:{...parameter.constraints_json,min:0.000000001},truth_metadata:{...truth,
   visibility_role:'INTERNAL_ONLY',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',source_confirmation_required:false,
   runtime_profile_classification:'PRELIMINARY_SOURCE_FORMULA',runtime_profile_value:true,preliminary_compilation_allowed:true,
   provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',derived_from_actual_measurements:true},
   preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression:rule.expression,when:{kind:'literal',value:true},explicitValuePolicy:'REQUIRE_MATCH'},
   guide:{...(truth.guide as Record<string,unknown>),guide_kind:'DERIVED_VALUE_RULE',source_role:'ENGINEERING_DESIGN',source_document:p.contract,
    source_snapshot_hash:p.measuredQuantityPlanContentSha256,source_locator:'measuredQuantityPlan.rules.'+rule.key,guide_version:plan.key,
    guide_short_ru:'Измерительный баланс обеспечения; не новая норма, заказ или цена.',guide_validation_policy:'MANDATORY_BLOCK'}}};
 });
 const rehash=(row:typeof base.resources[number])=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:hash(body)};};
 const sourcePositions=Object.entries(p.positionConsumers),resources=base.resources.map(row=>{
  const position=sourcePositions.find(([key])=>row.row_id.startsWith('subwork-resource:floor_screed20_r3:'+key+':')),
   refs=canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1),extension=p.wholeConsumerExtensions.find(item=>row.row_id===id(item.rowSuffix)),
   keys=[...new Set([...(position?position[1]:refs.map(ref=>ref.operationId.split(':').at(-1)!)),...(extension?.newOps??[])])],
   valid=keys.length>0&&keys.every(key=>p.operations.some(op=>op.key===key)),oldIds=Array.isArray(row.resource_graph.inputParameterIds)?row.resource_graph.inputParameterIds as string[]:[],
   specific=position?.[0]==='curing-cover'?{kind:'equals',parameterId:fact('care_profile'),value:'FILM_WET_STANDARD'}:
    position?.[0]==='cover-fastening'?{kind:'equals',parameterId:fact('care_profile'),value:'FILM_WET_STANDARD'}:
    position?.[0]==='quality-test'?{kind:'equals',parameterId:fact('lab_scope'),value:'PROJECT_LAB_TEST_REQUIRED'}:null;
  return rehash({...row,inclusion_ast:{kind:'and',operands:[active,row.inclusion_ast,...(specific?[specific]:[])]},resource_graph:{...row.resource_graph,
   inputParameterIds:[...new Set([...oldIds,...required(valid?keys:[])])],...(valid?{operationCompositionV1:composition(keys)}:{})},
   source_metadata:{...row.source_metadata,optionalSourceOnlyUnrun:true,actualObjectFactsAsserted:false,full_technical_acceptance:false,
    physicalResourceCoverageComplete:false,quantityUnitFormulaAndCostOwnerUnchanged:true,
    ...(extension?{addedPhysicalConsumersWithinExistingWholeStage:extension}:{}),
    ...(position?{physicalConsumersFromSourceSchedule:position[1],ordinaryProjectTakeoffStillRequired:true,
     ...(position[0]==='straightedge'?{controlRequiresVerifiedTwoMetreStraightedge:true,controlMeasurementsAreNotToolCount:true}:{}),
     ...(position[0]==='curing-pump'?{sevenDaysNot168MachineHours:true}:{}),
     ...(position[0]==='edge-tape'?{projectIsolationDetailAndOtherStripBalanceRequired:true}:{}),
     ...(position[0]==='quality-test'?{separateLabOnlyOrdinaryAcceptanceNotChargedAgain:true}:{})}:{})}});
 });
 for(const row of extra.resources){
  const item=p.resources.find(item=>row.row_id===id('cycle:'+item.key)),control=p.knownControls.find(item=>row.row_id===id('cycle:'+item.key)),
   keys=item?.ops??control?.ops??['placing'],scope=!item&&!control,
   conditional=item?.condition?[{kind:'equals',parameterId:fact(item.condition.fact),value:item.condition.value}]:
    control?.key==='standard-wet-care-min-days'?[{kind:'or',operands:['FILM_WET_STANDARD','OTHER_WATER_RETAINING_STANDARD'].map(value=>({kind:'equals',parameterId:fact('care_profile'),value}))}]:
    control?.key.startsWith('one-small-room-')?[{kind:'equals',parameterId:fact('control_scope'),value:'MINIMUM_ONE_ACTUAL_ROOM_UP_TO_50_M2'},
     {kind:'less_than_or_equal',parameterId:screed.measurement.parameterId,value:50}]:
    control?.key==='other-covering-gap-limit'?[{kind:'equals',parameterId:fact('covering_profile'),value:'OTHER_COVERING'}]:
    control?.key==='strict-covering-gap-limit'?[{kind:'equals',parameterId:fact('covering_profile'),value:'POLYMER_WOOD_LINOLEUM_OR_LARGE_TILE'}]:[],
   evidence=p.sources[1]!;
  resources.push(rehash({...row,ordinal:resources.length,inclusion_ast:{kind:'and',operands:[active,...conditional]},
   resource_graph:{...row.resource_graph,inputParameterIds:scope?[]:required(keys),operationCompositionV1:composition(keys),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,
     brandAndModelRu:null,specificationRu:null,detailsRu:[item?.evidence??control?.meaning??'Целые исходные труд, вода и готовыйМ150 остаются обязательными.'],
     ...(scope?{rowKind:'PROCESS_NOTE'}:control?{rowKind:'CALCULATION_DETAIL'}:{resourceKind:item!.kind})},
    ...(scope?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:p.prefix,
     groupTitleRu:parentGroup.groupTitleRu,titleRu:row.title_ru,reasonRu:'Исключён обязательный исходный ресурс целой стяжки.',
     exactScopeWhen:active,coveringRowIds:[id('whole-labor'),id('water-order'),id('ready-mortar-m150-order')],originalRowIds:[],costExclusionBreaksScopeV1:true,
     sourceEvidence:[{sha256:p.sources[0]!.sha256,locator:'PDF16–17 exact011-01 whole composition'}]}}:{})},
   source_metadata:{...row.source_metadata,artifact_sha256:evidence.sha256,exact_locator:evidence.locator,
    sourceRole:scope?'WHOLE01101_COVERAGE_CHECK':control?'BOUNDED_METHOD_CONTROL_INFORMATION_ONLY':'AUTHORED_PHYSICAL_FUNCTION_UNKNOWN_QUANTITY',
    numericNormAccepted:false,newPaidOwnerAccepted:false,automaticSecondPaymentForbidden:true,actualObjectFactsAsserted:false,
    formalRootSourceAdmissionPending:true,effectiveDateNotInferred:true,full_technical_acceptance:false,physicalResourceCoverageComplete:false,
    normativeTrace:[],...(item?{sourceQuantityReturnWhen:item.returnWhen,unresolvedUnitNotGuessed:item.unit===''}:{})}}));
 }
 const formulas=[...base.formulas,...extra.formulas],consumers=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
 return{...base,formulas,resources,parameters:parameters.map(parameter=>({...parameter,truth_metadata:{...parameter.truth_metadata,
  formula_consumers:consumers.formulaConsumers[parameter.parameter_id],resource_branch_consumers:consumers.resourceConsumers[parameter.parameter_id]}}))};
}

/** Independent whole-source and project-position map, not reconstructed from
 * generated row output. No completeness or admission is asserted by existence. */
export function floorScreedPhysicalCycleCompletenessR1(quantityBasis?:'ACTUAL_MEASURES_R1'){
 const p=screedCycle,id=(key:string)=>p.prefix+':'+key;
 return{...floorCementScreed20mmCompletenessMapR1(),generatedFromCurrentRows:false,operationResourceBindingRequired:true,
  physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,evidenceSha256:p.sources[1]!.sha256,
  authoredManifestEstimateContentHash:floorScreedPhysicalCycleContentHashR1,
  evidenceHashPolicy:'PINNED_SP65_PRIMARY_SOURCE_ARTIFACT_SHA256',entries:[...floorCementScreed20mmCompletenessMapR1().entries.map(entry=>({...entry,requiredOperationIds:[...new Set([entry.operationId,...(p.wholeConsumerExtensions.find(item=>id(item.rowSuffix)===String(entry.resolution.rowId))?.newOps??[])])].map(key=>id('operation:'+key))})),
   ...positions('screed').flatMap(position=>{
    const keys=p.positionConsumers[position.key as keyof typeof p.positionConsumers],branches=[...(position.includedOnly?[]:['separate']),'included',
     ...(position.includedInPositionKeys??[]).flatMap(owner=>['included-in-'+owner+'-separate','included-in-'+owner+'-included'])];
    return branches.map(branch=>{const rowId='subwork-resource:floor_screed20_r3:'+position.key+':'+branch;
     return{expectedResourceId:'project:'+position.key+':'+branch,operationId:keys[0]!,requiredOperationIds:keys.map(key=>id('operation:'+key)),
      category:position.category,unitId:position.unitId,specification:position.titleRu,sourceId:screed.sourceId+':explicit-project-resource-schedule',
      condition:'EXACT01101_ACTUAL_PROJECT_PROVISION_AND_PRICE_BOUNDARY',quantityRule:'EXPLICIT_APPROVED_PROJECT_TAKEOFF_NOT_A_NORM',formulaId:rowId+':quantity',
      resolution:{kind:'ROW',rowId}};});
   }),...p.resources.map(item=>({expectedResourceId:'physical:'+item.key,operationId:item.ops[0]!,requiredOperationIds:item.ops.map(key=>id('operation:'+key)),
    category:item.kind==='MATERIAL'||item.kind==='CONSUMABLE'?'material':item.kind==='TOOL'||item.kind==='PPE'?'tool':'equipment',unitId:item.unit||null,
    specification:item.nameRu,sourceId:item.source,condition:item.condition?item.condition.fact+'='+item.condition.value:'EXACT_WHOLE01101_CURRENT_SOURCE_VIEW',
    quantityRule:quantityBasis==='ACTUAL_MEASURES_R1'&&p.measuredQuantityPlan.rules.some(rule=>rule.key===item.key)?'ACTUAL_PEAK_CAPACITY_OR_CLOSED_METER_BALANCE_NOT_ORDER':'UNRESOLVED_APPLICATION_SOURCE_QUANTITY_NOT_USER_ZERO_OR_ONE',formulaId:id('formula:cycle:'+item.key),resolution:{kind:'ROW',rowId:id('cycle:'+item.key)}})),
   ...p.knownControls.map(item=>({expectedResourceId:'control:'+item.key,operationId:item.ops[0]!,requiredOperationIds:item.ops.map(key=>id('operation:'+key)),
    category:'service',unitId:item.unit,specification:item.meaning,sourceId:'sp65',condition:'EXACT_BOUNDED_SOURCE_SCOPE_AND_ACTUAL_PROJECT_READBACK',
    quantityRule:item.meaning,formulaId:id('formula:cycle:'+item.key),resolution:{kind:'ROW',rowId:id('cycle:'+item.key)}}))],
  additionalSources:p.sources,openAuthorObligations:[...screed.needs.map(item=>item.nextTaskRu),...p.resources.map(item=>item.returnWhen)],
  actualSiteReadbackRequired:true,actualCurrentParentPins:p.currentParent,currentWholeByteParityNotClaimed:true,formalSourceIntakePending:true};
}
