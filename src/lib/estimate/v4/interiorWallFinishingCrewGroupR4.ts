import profile from '../../../../data/estimate-benchmarks/source-packs/interior-wall-finishing-crew-group-r4.json';
import {interiorWallFinishingGeometryGroupDefinitionR3, interiorWallFinishingGeometryPackR3 as basePack,
 interiorWallFinishingGeometryRowR3 as r, interiorWallFinishingGeometryParameterR3 as p,
 interiorWallFinishingIndependentCompletenessMapR3} from './interiorWallFinishingGeometryGroupR3';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1, type AutomaticOwnerDefinition,
 type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

type Json = Record<string, any>;
export type InteriorWallFinishingBranchR4 = 'improved-wall-01' | 'high-quality-wall-05' | 'deep-primer-00603';
export const interiorWallFinishingCrewPackR4 = profile;
const a = p(basePack.areaId), whole = r('whole-work');
const positive = {kind:'greater_than' as const, parameterId:a, value:0};
const hashRow = (row: any) => {const {row_sha256:_old,...body}=row; return {...body,row_sha256:estimateDeterministicHash(body)};};
const opId = (key:string) => r('operation:'+key);
const shortNames: Record<string,string> = {
 'whole-work':'Работы по отделке стен', 'workers':'Рабочие-строители, разряд 3,2',
 'workers-preputty':'Рабочие грунтования, разряд 4,0', 'operators':'Машинисты',
 'tool-putty-spatula':'Шпатель STAYER 10041-12, 120 мм',
 'tool-waterborne-brush':'Кисть ЗУБР 4-01013-100, 100 мм',
 'tool-application-pail':'Ёмкость Wooster Pelican 8619', 'tool-application-pail-lid':'Крышка Wooster Pelican 8659',
 'tool-sanding-holder':'Держатель STAYER 3566-212, 105 × 212 мм',
 'tool-waste-bin':'Ведро Wooster 8616, 4 US gal', 'tool-waste-bin-lid':'Крышка Wooster 8626',
 'abrasive-sheet-provision':'Шкурка БАЗ KT10CW P60, 230 × 280 мм',
 'tool-paper-rule':'Линейка металлическая, 300 мм',
 'preputty-primer-order':'Грунтовка VGT ВД-АК 0301, 1 кг',
 'primer-order':'Укрывающая грунтовка VGT, 3 кг',
 'paint-order':'Краска VGT ВД-АК 2180, 1,5 кг',
 'ready-putty-order':'Готовая шпаклёвка VGT, 1 кг',
 'abrasive-consumed':'Шкурка шлифовальная 40/25', 'rags-consumed':'Ветошь',
 'lift':'Подъёмник 500 кг, до 25 м', 'lift-preputty':'Подъёмник 500 кг, до 45 м',
 'truck':'Бортовой автомобиль, до 5 т',
 'open-washing-water':'Вода для промывки инструмента', 'open-access':'Условия применения площадки',
 'open-ppe':'Средства индивидуальной защиты', 'open-handling-profile':'Средства подачи материалов',
};

/** One source-owned kit adapter for three exclusive technology branches.
 * Existing rows/norms are reused. This is neither a compiler nor a publisher;
 * it never supplies an unknown source norm through customer input. */
export function interiorWallFinishingCrewGroupDefinitionR4(branch:InteriorWallFinishingBranchR4='improved-wall-01'):AutomaticOwnerDefinition {
 const config=profile.branches.find(value=>value.id===branch);
 if(!config||profile.fullTechnicalAcceptance||profile.selectedOrganisation.simultaneousPositions!==1
  ||profile.selectedOrganisation.simultaneousWorkers!==1||profile.selectedOrganisation.parallelBrigadesAdmitted
  ||new Set(profile.assets.map(asset=>asset.key)).size!==profile.assets.length)
  throw Error('READY_FINISH_R4_EXACT_SOURCE_BRANCH_AND_SERIAL_KIT_REQUIRED');
 const parent=structuredClone(interiorWallFinishingGeometryGroupDefinitionR3());
 const operations=new Map(basePack.operations.map(operation=>[operation.id,
  canonicalEstimateOperationReferences(parent.resources.find(row=>row.row_id===r('process-'+operation.id))!.resource_graph.operationCompositionV1)[0]!]));
 const source=(id:string)=>profile.sources.find(value=>value.id===id)??basePack.sources.find(value=>value.id===id)!;
 const assetRows:AutomaticRowSpec[]=profile.assets.map(asset=>({rowId:r(asset.key),formulaId:r('formula:'+asset.key),
  title:asset.nameRu,section:config.titleRu,category:'equipment',unitId:asset.unitId,expression:String(asset.count),
  inclusion:positive,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',
  purchaseBalance:{unitId:asset.unitId,consumedExpression:String(asset.count),stockExpression:'0',reserveExpression:'0',orderQuantumExpression:'1'}}));
 const owner=parent.resources.find(row=>row.row_id===whole)!;
 const built=buildAutomaticConstructionOwnerR1({contract:profile.contract,semanticOwner:'ready-finishing-serial-crew-r4',
  sourceId:basePack.sources[2].id,normId:config.normId,operationCompositionGroupId:basePack.namespace,
  sourceMetadata:{source_title:config.titleRu,source_document_version:profile.contract,definition_hash:basePack.sources[2].sha256,
   artifact_sha256:basePack.sources[2].sha256,exact_locator:basePack.sources[2].locatorRu},
  applicabilityRu:'Один последовательный ручной пост VGT; комплектность и условия проверяются раздельно.',
  ordinary:[{id:a,title:'Площадь стен, м²',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0,max:1e9}],profile:[],conditional:[],
  rows:[{rowId:whole,formulaId:r('formula:whole-work'),title:owner.title_ru,section:config.titleRu,category:'work',unitId:'m2',expression:a,
   inclusion:positive,costTreatment:'OWN_COST'},...assetRows],excludedUnownedAssumptions:[],deferMissingProjectFactsToRows:true});
 let resources=parent.resources.filter(row=>row.row_id!==r('open-stirring-tool'));
 let formulas=parent.formulas.filter(formula=>formula.formula_id!==r('formula:open-stirring-tool'));
 let parameters=parent.parameters.filter(parameter=>parameter.parameter_id!==p('need_stirring_tool'));
 formulas=[...formulas,...built.formulas.filter(formula=>formula.formula_id!==r('formula:whole-work'))];
 resources=[...resources,...built.resources.filter(row=>row.row_id!==whole).map(row=>{
  const asset=profile.assets.find(asset=>r(asset.key)===row.row_id)!,evidence=source(asset.sourceId);
  const refs=asset.operationIds.map(id=>operations.get(id)!);
  return hashRow({...row,cost_owner_id:whole,resource_graph:{...row.resource_graph,parentCostOwnerId:whole,includedInResourceOwnerRowId:whole,
   operationCompositionV1:{...refs[0],additionalOperations:refs.slice(1)},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,
    nameRu:asset.nameRu,brandAndModelRu:null,specificationRu:asset.specificationRu,detailsRu:[evidence.locatorRu]}},
   source_metadata:{...row.source_metadata,sourceRole:'SELECTED_EXACT_CLASS_SERIAL_STATION_ASSET_WITH_PERSONAL_BALANCE',
    normativeTrace:[{sourceId:evidence.id,normId:'ITEM_SPECIFICATION_AND_SELECTED_ENGINEERING_PROFILE_NOT_CREW_NORM',
     sourceDocument:evidence.title,sourceLocator:evidence.locatorRu,sourceSnapshotHash:evidence.sha256}],
    selectedOrganisation:profile.selectedOrganisation,requiredFunctionalCount:asset.count,manufacturerCrewNormClaimed:false,
    selectedManualMixingProfile:asset.role==='MANUAL_MIXING'?profile.manualMixing:null,
    selectedAccessProfile:asset.role==='ACCESS'?profile.access:null,
    actualSiteInventoryConfirmed:false,renewalIsIncludedFunctionalAvailabilityNotInventedWearRate:true,
    prospectiveCostOwnerRowId:whole,fullTechnicalAcceptance:false}});
 })];
 const rewrite=(key:string,expression:string)=>{
  const id=r('formula:'+key),compiled=compileFormulaGraph(expression);
  if(!formulas.some(formula=>formula.formula_id===id))throw Error('READY_FINISH_R4_REUSED_FORMULA_REQUIRED:'+key);
  formulas=formulas.map(formula=>formula.formula_id!==id?formula:{...formula,expression_source:expression,ast:compiled.ast,
   input_parameter_ids:compiled.inputParameterIds,ast_sha256:estimateDeterministicHash(compiled.ast)});
 };
 const keyOf=(row:{row_id:string})=>row.row_id.slice((basePack.namespace+'work:').length);
 if(branch==='high-quality-wall-05') {
  for(const [key,rate]of Object.entries({workers:'68.37','workers-total':'74.92',operators:'0.04',lift:'0.03',truck:'0.21',
   'rags-contribution-finish':'0.36','truck-contribution-finish':'0.20'}))rewrite(key,`${a}/100*${rate}`);
  rewrite('rags-consumed',`${a}*0.0046`); rewrite('abrasive-consumed',`${a}*0.0088`);
  const paper=`ceil(max(1,ceil(${a}*0.0088/0.0322))/2)`;rewrite('abrasive-sheet-provision',paper);
  // The complete labor/resource column is known. Total selected VGT demand
  // for this higher quality result has NOT been inferred from another coat.
  const demand=p('high_quality_vgt_putty_kg_m2');
  const template=parameters.find(parameter=>parameter.parameter_id===p('need_washing_water'))!;
  parameters=[...parameters,{...template,parameter_id:demand,title_ru:'Применимая суммарная потребность VGT для высококачественного результата',
   unit_id:'kg_per_m2',required:false,truth_metadata:unresolvedApplicationNormTruthR1({...template.truth_metadata,
    semantic_parameter_key:demand},profile.sourceConstraintRu.highQualityPutty)}];
  for(const formula of [...formulas])if(formula.formula_id.includes('formula:ready-putty-'))
   rewrite(formula.formula_id.slice((basePack.namespace+'work:formula:').length),String(formula.expression_source).replaceAll(`${a}*1.4`,`${a}*${demand}`));
  resources=resources.map(row=>{
   const key=keyOf(row),graph=row.resource_graph as Json,metadata=row.source_metadata as Json;
   const original=row.row_id===whole?{...row,title_ru:'Высококачественная отделка готовыми составами VGT'}:row;
   return hashRow({...original,resource_graph:{...graph,
    ...(key==='abrasive-sheet-provision'?{purchaseBalanceV1:{...(graph.purchaseBalanceV1 as Json),consumedExpression:paper}}:{}),
    ...(key==='ready-putty-order'?{purchaseBalanceV1:{...(graph.purchaseBalanceV1 as Json),
     consumedExpression:`${a}*${demand}`}}:{}),
    publicResourcePresentationV1:{...(graph.publicResourcePresentationV1 as Json),sourceTitleRu:original.title_ru}},
    source_metadata:{...metadata,sourceSpecificWholeNormR4:config,
     selectedSandingSupplyProfile:key==='abrasive-sheet-provision'?{...(metadata.selectedSandingSupplyProfile as Json),grossNormPer100M2:'0.88'}:metadata.selectedSandingSupplyProfile,
     highQualityVgtPuttyDemandAdmitted:false,fullTechnicalAcceptance:false}});
  });
 }
 if(branch==='deep-primer-00603') {
  const keep=new Set([...profile.primerExpectedKeys,...profile.assets.filter(asset=>asset.role!=='MANUAL_MIXING').map(asset=>asset.key)]);
  resources=resources.filter(row=>keep.has(keyOf(row)));
  for(const [key,rate]of Object.entries({'workers-total':'6.55',operators:'0.01',truck:'0.01'}))rewrite(key,`${a}/100*${rate}`);
  rewrite('rags-consumed',`${a}*0.001`);
 }
 const allowedOps=new Set(config.operationIds.map(opId));
 const accessIds=profile.assets.filter(asset=>asset.role==='ACCESS').map(asset=>r(asset.key));
 resources=resources.map(row=>{
  const key=keyOf(row),graph=row.resource_graph as Json,metadata=row.source_metadata as Json;
  const refs=canonicalEstimateOperationReferences(graph.operationCompositionV1).filter(ref=>allowedOps.has(ref.operationId));
  if(!refs.length)throw Error('READY_FINISH_R4_OPERATION_CONTEXT_REQUIRED:'+key);
  const name=key==='whole-work'&&branch==='deep-primer-00603'?'Грунтование стен'
   :key==='whole-work'&&branch==='high-quality-wall-05'?'Высококачественная отделка стен'
   :shortNames[key]??(graph.publicResourcePresentationV1 as Json)?.nameRu??row.title_ru;
  return hashRow({...row,resource_graph:{...graph,operationCompositionV1:{...refs[0],additionalOperations:refs.slice(1)},
   ...(graph.derivedQuantityEditPolicyV1?{derivedQuantityEditPolicyV1:{...(graph.derivedQuantityEditPolicyV1 as Json),
    parameterIds:formulas.find(formula=>formula.formula_id===row.formula_id)!.input_parameter_ids}}:{}),
   publicResourcePresentationV1:{...(graph.publicResourcePresentationV1 as Json),nameRu:name,
    ...(key==='open-access'?{rowKind:'PROCESS_NOTE'}:{})},
   ...(key==='open-access'?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'PROJECT_SCOPE',
    groupId:basePack.namespace,groupTitleRu:config.titleRu,titleRu:'Условия применения площадки',reasonRu:profile.access.applicabilityIsNotAssumedRu,
    exactScopeWhen:positive,sourceEvidence:[{sha256:profile.sources[1].sha256,locator:profile.sources[1].locatorRu}],
    coveringRowIds:accessIds,originalRowIds:[]}}:{})},
   source_metadata:{...metadata,selectedBranchR4:config,fullTechnicalAcceptance:false,
    inheritedSubjectScopeRu:basePack.physicalScopeRu,
    activeSubjectScopeRu:branch==='deep-primer-00603'
     ?'Однократное грунтование VGT 0301 готовых плоских сухих прочных оштукатуренных стен. Цельная норма 15-04-006-03; обычное обеспечение и уборка включены. Шпаклёвка и окраска не входят.'
     :branch==='high-quality-wall-05'
      ?'Высококачественная отделка по цельной норме 15-04-007-05 с первичным грунтованием 00603. Суммарный расход выбранной VGT шпаклёвки для требуемых проходов/толщины пока не доказан.'
      :basePack.physicalScopeRu,
    ...(branch==='high-quality-wall-05'?{mainProductProcurementComplete:false,
     normativeTrace:Array.isArray(metadata.normativeTrace)?metadata.normativeTrace.map((trace:Json)=>
      trace.sourceId!==basePack.sources[0].id?trace:{...trace,sourceId:profile.sources[4].id,
       normId:trace.normId==='15-04-007-01'?'15-04-007-05':trace.normId,sourceLocator:profile.sources[4].locatorRu}):metadata.normativeTrace}:{}),
    ...(branch==='deep-primer-00603'?{normativeTrace:Array.isArray(metadata.normativeTrace)?metadata.normativeTrace.map((trace:Json)=>
      trace.sourceId!==basePack.sources[0].id?trace:{...trace,sourceId:profile.sources[5].id,
       normId:'15-04-006-03',sourceLocator:profile.sources[5].locatorRu}):metadata.normativeTrace,
     exactStandaloneLabourNormReused:true,wholePaintingLabourNotAllocated:true}:{}),
    ...(key==='open-access'?{sourceRole:'UNRESOLVED_SITE_CONDITION_WITH_EXPLICIT_KNOWN_ACCESS_ASSETS',
     numericProvisionAlreadyInRowIds:accessIds,unresolvedPhysicalResourceReasonRu:profile.access.applicabilityIsNotAssumedRu}:{}),
    ...(key==='open-ppe'?{unresolvedPhysicalResourceReasonRu:profile.sourceConstraintRu.ppe}:{}),
    ...(key==='open-washing-water'?{unresolvedPhysicalResourceReasonRu:profile.sourceConstraintRu.water}:{})}});
 });
 // The thirteen physical access components are quantified above. The retained
 // open site condition follows the existing non-quantity scope contract.
 parameters=parameters.map(parameter=>parameter.parameter_id!==p('need_access')?parameter:{...parameter,
  unit_id:null,constraints_json:{},truth_metadata:{...parameter.truth_metadata,
   value_source_role:'COMPILER_DERIVED_RESOURCE_QUANTITY',input_origin_class:'APPROVED_PROJECT_OR_METHOD_STATEMENT',
   preliminary_compilation_allowed:false,guide:{...(parameter.truth_metadata.guide as Json),
    guide_kind:'PROJECT_DEFINED',guide_short_ru:profile.access.applicabilityIsNotAssumedRu}}});
 formulas=formulas.map(formula=>formula.formula_id!==r('formula:open-access')?formula:{...formula,output_unit_id:''});
 resources=resources.map(resource=>resource.row_id!==r('open-access')?resource:hashRow({...resource,unit_id:''}));
 const usedFormulas=new Set(resources.map(row=>row.formula_id));formulas=formulas.filter(formula=>usedFormulas.has(formula.formula_id));
 const usedParameters=new Set(formulas.flatMap(formula=>formula.input_parameter_ids));
 parameters=parameters.filter(parameter=>usedParameters.has(parameter.parameter_id)).map(parameter=>({...parameter,
  truth_metadata:{...parameter.truth_metadata,formula_consumers:formulas.filter(formula=>formula.input_parameter_ids.includes(parameter.parameter_id)).map(formula=>formula.formula_id)}}));
 return {...parent,parameters,formulas,resources:resources.map((row,ordinal)=>hashRow({...row,ordinal}))};
}

/** Reuse the publisher's independent map and exact operation-binding checks.
 * The explicit new composition lives in source data, never read back from rows. */
export function interiorWallFinishingCrewCompletenessMapR4(branch:InteriorWallFinishingBranchR4='improved-wall-01') {
 const config=profile.branches.find(value=>value.id===branch)!;
 const allowed=new Set(config.operationIds),base=interiorWallFinishingIndependentCompletenessMapR3();
 // The primer subset is independently named above and in the contract test;
 // all main source-profile material/labor rows remain compulsory.
 const entries=base.entries.filter((entry:any)=>entry.expectedResourceId!=='open-stirring-tool'
  &&(branch!=='deep-primer-00603'||entry.resolution.kind==='NOT_APPLICABLE'||profile.primerExpectedKeys.includes(entry.expectedResourceId))).map((entry:any)=>({...entry,
   ...(entry.requiredOperationIds?{requiredOperationIds:entry.requiredOperationIds.filter((id:string)=>allowed.has(id.slice((basePack.namespace+'work:operation:').length)))}:{})}));
 for(const asset of profile.assets.filter(asset=>branch!=='deep-primer-00603'||asset.role!=='MANUAL_MIXING'))entries.push({
  expectedResourceId:asset.key,operationId:opId(asset.operationIds[0]),requiredOperationIds:asset.operationIds.filter(id=>allowed.has(id)).map(opId),
  condition:'SELECTED_SERIAL_READY_FINISHING_STATION',sourceId:asset.sourceId,quantityRule:asset.quantityBasis,
  formulaId:r('formula:'+asset.key),resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:r(asset.key),parentRowId:whole}});
 return {...base,contract:base.contract,entries,fullTechnicalAcceptance:false,selectedScopeQuantitiesComplete:false,
  normativeResourceQuantitiesComplete:branch!=='high-quality-wall-05',
  remainingApplicationSourceNeeds:basePack.openSourceNeeds.filter(need=>
   ['washing-water','ppe','handling-profile'].includes(need.id)),
  remainingSourceConditions:['ordinary-access','ordinary-accompanying','open-access'],
  ...(branch==='high-quality-wall-05'?{additionalUnresolvedMaterialDemand:{
   parameterId:p('high_quality_vgt_putty_kg_m2'),resourceRowId:r('ready-putty-order'),reasonRu:profile.sourceConstraintRu.highQualityPutty}}:{})};
}
