import pack from '../../../../data/estimate-benchmarks/source-packs/interior-wall-finishing-provision-group-r6.json';
import {interiorWallFinishingCrewGroupDefinitionR4,interiorWallFinishingCrewPackR4,
 type InteriorWallFinishingBranchR4} from './interiorWallFinishingCrewGroupR4';
import {interiorWallFinishingGeometryPackR3 as base,interiorWallFinishingGeometryRowR3 as r,
 interiorWallFinishingGeometryParameterR3 as p} from './interiorWallFinishingGeometryGroupR3';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {marlySkinNormalSupplyExpressionsR1,marlySkinRequiredHandHygieneR1} from './marlySkinNormalProvisionProfileR1';
type Json=Record<string,any>;
export const interiorWallFinishingProvisionPackR6=pack;
const a=p(base.areaId),whole=r('whole-work');
const hashed=(row:any)=>{const {row_sha256:_old,...body}=row;return {...body,row_sha256:estimateDeterministicHash(body)};};

/** Successor data adapter only. The existing R4 factory and common core own
 * all prior quantities, operations, balances and money. No publisher or norm
 * input is introduced. A partial skin profile never closes the full PPE need. */
export function interiorWallFinishingProvisionGroupDefinitionR6(branch:InteriorWallFinishingBranchR4='improved-wall-01'):AutomaticOwnerDefinition {
 const parent=structuredClone(interiorWallFinishingCrewGroupDefinitionR4(branch));
 const config=interiorWallFinishingCrewPackR4.branches.find(value=>value.id===branch)!;
 const plan=pack.skin.plan[branch];
 if(pack.fullTechnicalAcceptance||pack.skin.renewalHours!==4||pack.skin.normalHandApplicationsPerCan!==150
  ||pack.skin.canVolumeMl!==100||pack.skin.documentedSupplyBlock.cans!==3||pack.skin.documentedSupplyBlock.plannedNormalHandApplications!==400
  ||!plan||pack.physicalNeedsClosed.length)throw Error('VGT_R6_EXACT_FINITE_SOURCE_PROFILE_REQUIRED');
 const applications=`ceil(${a}/100*${plan.totalWorkerHoursPer100M2}/4)+${plan.continuousPhaseCount-1}`;
 const expression=marlySkinNormalSupplyExpressionsR1(applications).orderCans;
 const hygiene=marlySkinRequiredHandHygieneR1.filter(value=>value.key!=='handwash-water');
 const source=pack.sources.find(value=>value.id===pack.skin.sourceId)!;
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:'vgt-source-provision-r6',sourceId:source.id,
  normId:'MANUFACTURER_APPROXIMATE_CAN_YIELD_AND_SELECTED_FINITE_SERIAL_PHASE_SCHEDULE',operationCompositionGroupId:base.namespace,
  sourceMetadata:{source_title:source.title,source_document_version:pack.contract,definition_hash:source.sha256,
   artifact_sha256:source.sha256,exact_locator:source.locatorRu},
  applicabilityRu:pack.skin.applicationRu,ordinary:[{id:a,title:'Площадь стен,м²',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0,max:1e9}],
  profile:[],conditional:hygiene.map(value=>({id:p('need_'+value.key.replaceAll('-','_')),title:value.titleRu,
   kind:'internal' as const,valueType:value.unitId==='pcs'?'integer' as const:'decimal' as const,unitId:value.unitId,min:0})),
  excludedUnownedAssumptions:[],deferMissingProjectFactsToRows:true,
  rows:[{rowId:whole,formulaId:r('formula:whole-work'),title:'Работы по отделке стен',section:config.titleRu,category:'work',unitId:'m2',
   expression:a,inclusion:{kind:'greater_than',parameterId:a,value:0},costTreatment:'OWN_COST'},
   {rowId:r(pack.skin.resourceKey),formulaId:r('formula:'+pack.skin.resourceKey),title:pack.skin.nameRu,section:config.titleRu,
   category:'material',unitId:'item',expression,inclusion:{kind:'greater_than',parameterId:a,value:0},procurement:false,
   costTreatment:'INCLUDED_IN_RESOURCE_ROWS',purchaseBalance:{unitId:'item',consumedExpression:expression,
    stockExpression:'0',reserveExpression:'0',orderQuantumExpression:'1'}},
   ...hygiene.map(value=>({rowId:r('open-'+value.key),formulaId:r('formula:open-'+value.key),title:value.titleRu,
    section:config.titleRu,category:'material',unitId:value.unitId,expression:p('need_'+value.key.replaceAll('-','_')),
    inclusion:{kind:'greater_than' as const,parameterId:a,value:0},procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const}))]});
 const refs=canonicalEstimateOperationReferences(parent.resources.find(row=>row.row_id===whole)!.resource_graph.operationCompositionV1)
  .map(({processRole:_role,processOrdinal:_ordinal,...operation})=>operation);
 const skin=built.resources.filter(row=>row.row_id!==whole).map(row=>{
  const isSkin=row.row_id===r(pack.skin.resourceKey),physical=hygiene.find(value=>row.row_id===r('open-'+value.key));
  return hashed({...row,...(isSkin?{cost_owner_id:whole}:{}),resource_graph:{...row.resource_graph,
  ...(isSkin?{parentCostOwnerId:whole,includedInResourceOwnerRowId:whole}:{}),
  operationCompositionV1:{...refs[0],additionalOperations:refs.slice(1)},
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,
   nameRu:isSkin?pack.skin.nameRu:physical!.titleRu,brandAndModelRu:isSkin?'MARLY SKIN':null,
   specificationRu:isSkin?'Защитная пена для рук,баллон100мл':null,detailsRu:[source.locatorRu]}},
  source_metadata:{...row.source_metadata,sourceRole:isSkin?pack.skin.yieldRole:'UNRESOLVED_HAND_HYGIENE_CONSUMED_MATERIAL',selectedSkinProtectionProfileR6:pack.skin,
   activeFiniteScheduleR6:plan,...(isSkin?{quantifiedComponentId:'skin-protection-paste-demand'}:{requiredPhysicalHygieneProfile:physical}),fullPpeAccepted:false,
   fullTechnicalAcceptance:false,manufacturerCrewNormClaimed:false,labourAdded:false,
   normativeTrace:[{sourceId:source.id,normId:'MANUFACTURER_PURCHASING_EXAMPLE_THREE_100ML_CANS_FOR_400_NORMAL_HAND_APPLICATIONS',
    sourceDocument:source.title,sourceLocator:source.locatorRu,sourceSnapshotHash:source.sha256}],
   quantityRole:isSkin?'WHOLE_CANS_FOR_SELECTED_FINITE_SOURCE_LABOUR_PHASE_BUDGET_NOT_ML_APPLIED':'UNKNOWN_APPLICATION_QUANTITY_NOT_USER_EDITABLE_NORM',
   automaticGenericPriceInheritanceAllowed:false,prospectiveCostOwnerRowId:whole}});
 });
 const materialIds=branch==='deep-primer-00603'?['vgt-current-deep-primer0301-r3']
  :['vgt-current-ready-putty-r3','vgt-current-deep-primer0301-r3','vgt-current-covering-primer-r3','vgt-current-wall-paint-2180-r3'];
 const materialSources=base.sources.filter(value=>materialIds.includes(value.id));
 const resources=[...parent.resources,...skin].map((row,ordinal)=>{
  const need=pack.requiredNeeds.find(value=>row.row_id===r('open-'+value.id));
  const normSources=branch==='deep-primer-00603'?interiorWallFinishingCrewPackR4.sources.filter(value=>value.id==='kg-krer15-wall-primer150400603-source-r4')
   :[base.sources[0],...interiorWallFinishingCrewPackR4.sources.filter(value=>value.id==='kg-krer15-wall-primer150400603-source-r4')];
  const evidence=need?.id==='handling-profile'?normSources:need?[...materialSources,...pack.sources.filter(value=>need.id==='washing-water'
   ?value.id==='storch-colorfree50-primary-r6'||value.id.startsWith('marly-'):need.id==='ppe'?value.id==='uvex-respiratory-guide-primary-r6'||value.id.startsWith('marly-'):need.id.startsWith('hand-')?value.id.startsWith('marly-'):false)]:[];
  const water=row.row_id===r('open-washing-water'),title=water?pack.hygiene.combinedWaterNameRu:row.title_ru;
  return hashed({...row,ordinal,title_ru:title,resource_graph:{...row.resource_graph,...(water?{
   operationCompositionV1:{...refs[0],additionalOperations:refs.slice(1)},
   publicResourcePresentationV1:{...(row.resource_graph.publicResourcePresentationV1 as Json),sourceTitleRu:title,nameRu:title}}:{})},
   source_metadata:{...row.source_metadata,provisionSuccessorContractR6:pack.contract,
   ...(row.row_id===whole?{provisionComponentClosuresR6:pack.newQuantitativeComponents,fullTechnicalAcceptance:false}:{}),
   ...(need?{unresolvedPhysicalResourceReasonRu:need.reasonRu,provisionRequirementsR6:{...need,
    activeMaterialSourceIds:materialIds,activeSourceEvidence:evidence,fullDrySandingIncluded:branch!=='deep-primer-00603',
    quantitySourceAdmitted:false,knownResourceRowIds:need.knownResourceKeys.map(r).filter(id=>[...parent.resources,...skin].some(resource=>resource.row_id===id))},
    normativeTrace:evidence.map(value=>({sourceId:value.id,normId:'REQUIRED_PROVISION_WITHOUT_ADMITTED_TOTAL_QUANTITY',
     sourceDocument:value.title,sourceLocator:value.locatorRu,sourceSnapshotHash:value.sha256}))}:{})}});
 });
 const formulas=[...parent.formulas,...built.formulas.filter(formula=>formula.formula_id!==r('formula:whole-work'))];
 const parameters=[...parent.parameters,...built.parameters.filter(parameter=>parameter.parameter_id!==a)].map((parameter,ordinal)=>{
  const need=pack.requiredNeeds.find(value=>parameter.parameter_id===p('need_'+value.id.replaceAll('-','_')));
  const truth=need?unresolvedApplicationNormTruthR1(parameter.truth_metadata,need.reasonRu):parameter.truth_metadata;
  return {...parameter,ordinal,truth_metadata:{...truth,formula_consumers:formulas.filter(formula=>formula.input_parameter_ids.includes(parameter.parameter_id)).map(formula=>formula.formula_id)}};
 });
 return {...parent,parameters,formulas,resources};
}

/** Whole-stage oracle originates in source data, including inherited R4 tools,
 * machine-hours, main materials and shared owner. Never infer it from rows. */
export function interiorWallFinishingProvisionCompletenessMapR6(branch:InteriorWallFinishingBranchR4='improved-wall-01') {
 const config=interiorWallFinishingCrewPackR4.branches.find(value=>value.id===branch)!;
 const ops=new Set(config.operationIds),primer=new Set(interiorWallFinishingCrewPackR4.primerExpectedKeys);
 const entries=pack.independentExpected.filter(entry=>branch!=='deep-primer-00603'||primer.has(entry.key)
  ||entry.key===pack.skin.resourceKey||pack.hygiene.additionalNeedIds.some(id=>entry.key==='open-'+id)
  ||('assetRole'in entry&&entry.assetRole!=='MANUAL_MIXING')).map(entry=>{
  const operationIds=entry.operationIds.filter(id=>ops.has(id));
  if(!operationIds.length)throw Error('VGT_R6_INDEPENDENT_EXPECTED_OPERATION_REQUIRED:'+entry.key);
  return {expectedResourceId:entry.key,category:entry.category,unitId:entry.unitId,
   operationId:r('operation:'+operationIds[0]),requiredOperationIds:operationIds.map(id=>r('operation:'+id)),
   condition:'EXACT_R4_SOURCE_BRANCH_WITH_SELECTED_FINITE_PROVISION_R6',sourceId:pack.contract,
   quantityRule:entry.key===pack.skin.resourceKey?'SOURCE_HAND_DOSE_RENEWAL_FINITE_PHASE_UPPER_BOUND_AND_WHOLE_CAN_YIELD'
    :'REUSED_EXACT_R4_SOURCE_RESOURCE_OR_REQUIRED_UNKNOWN_WITH_EXPLICIT_UNIT_AND_CATEGORY',
   formulaId:r('formula:'+entry.key),resolution:entry.includedComponent
    ?{kind:'INCLUDED_COMPONENT_ROW',rowId:r(entry.key),parentRowId:whole}:{kind:'ROW',rowId:r(entry.key)}};
 });
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,
  operationResourceBindingRequired:true,evidenceSha256:pack.sources[0].sha256,evidenceReferences:pack.sources.map(source=>source.url),
  entries:[...entries,...pack.notApplicableCategories.map(value=>({operationId:'selected-source-scope',expectedResourceId:value.category,
   condition:'EXPLICIT_SELECTED_TECHNOLOGY_BOUNDARY',sourceId:pack.contract,resolution:{kind:'NOT_APPLICABLE',reasonRu:value.reason}}))],
  selectedScopeQuantitiesComplete:false,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,
  normativeResourceQuantitiesComplete:branch!=='high-quality-wall-05',remainingApplicationSourceNeeds:pack.requiredNeeds,
  remainingSourceConditions:pack.remainingSourceConditions,newQuantitativeComponents:pack.newQuantitativeComponents,
  additionalUnresolvedMaterialDemand:branch==='high-quality-wall-05'?{parameterId:p('high_quality_vgt_putty_kg_m2'),resourceRowId:r('ready-putty-order')}:null};
}
