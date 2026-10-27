import pack from '../../../../data/estimate-benchmarks/source-packs/interior-wall-finishing-provision-group-r7.json';
import {interiorWallFinishingProvisionGroupDefinitionR6 as prior,interiorWallFinishingProvisionCompletenessMapR6 as priorMap,
 interiorWallFinishingProvisionPackR6} from './interiorWallFinishingProvisionGroupR6';
import {interiorWallFinishingCrewPackR4,type InteriorWallFinishingBranchR4} from './interiorWallFinishingCrewGroupR4';
import {interiorWallFinishingGeometryPackR3 as base,interiorWallFinishingGeometryRowR3 as r,
 interiorWallFinishingGeometryParameterR3 as p} from './interiorWallFinishingGeometryGroupR3';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {normalHandPreparationCleanserExpressionsR1,normalHandPreparationProvisionPackR1 as common} from './normalHandPreparationProvisionProfileR1';
import {marlySkinNormalSupplyExpressionsR1} from './marlySkinNormalProvisionProfileR1';
import {effectiveResourceQuantityParameterId,effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
type Json=Record<string,any>;
export const interiorWallFinishingProvisionPackR7=pack;
const whole=r('whole-work'),area=p(base.areaId),positive={kind:'greater_than' as const,parameterId:area,value:0};
const hashed=(row:any)=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:estimateDeterministicHash(body)};};

/** Reuses the R6 definition and its admitted preparation budget exactly.
 * Historical source factories/packs and all independent geometry gates stay
 * intact. No readiness bypass, source-norm input or publisher is introduced. */
export function interiorWallFinishingProvisionGroupDefinitionR7(branch:InteriorWallFinishingBranchR4='improved-wall-01'):AutomaticOwnerDefinition{
 const parent=structuredClone(prior(branch)),config=interiorWallFinishingCrewPackR4.branches.find(value=>value.id===branch)!;
 if(pack.fullTechnicalAcceptance||pack.access.scopeKind!=='PROCESS'||pack.access.actualSiteAcceptanceClaimed
  ||pack.access.selectedMaximumRoomHeightM!=='3.50'||pack.access.maximumTotalLoadKg!=='240'
  ||pack.commonHandPreparationContract!==common.contract)throw Error('VGT_R7_EXACT_SOURCE_PROFILE_REQUIRED');
 const inherited=String(parent.formulas.find(formula=>formula.formula_id===r('formula:'+interiorWallFinishingProvisionPackR6.skin.resourceKey))!.expression_source);
 const prefix='ceil((',suffix=')/400)*3';
 if(!inherited.startsWith(prefix)||!inherited.endsWith(suffix))throw Error('VGT_R7_ACCEPTED_R6_PREPARATION_BUDGET_REQUIRED');
 const preparations=inherited.slice(prefix.length,-suffix.length);
 if(marlySkinNormalSupplyExpressionsR1(preparations).orderCans!==inherited)throw Error('VGT_R7_R6_EXPRESSION_REUSE_MISMATCH');
 const effective=effectiveResourceQuantityParameterId(r(pack.cleanser.existingResourceKey));
 const expressions=normalHandPreparationCleanserExpressionsR1(preparations,effective),source=common.sources[0],
  balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:r(pack.cleanser.supplyResourceKey),orderUnitId:'l',
   consumed:effective,stock:'0',reserve:expressions.reserveL,quantum:expressions.orderQuantumL});
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:'vgt-normal-preparation-r7',sourceId:source.id,
  normId:'ONE_SOURCE_NORMAL_PREPARATION_DOSE_PER_ACCEPTED_R6_SKIN_APPLICATION',operationCompositionGroupId:base.namespace,
  sourceMetadata:{source_title:source.title,source_document_version:common.contract,definition_hash:source.sha256,
   artifact_sha256:source.sha256,exact_locator:source.locatorRu},applicabilityRu:common.applicationRu,
  ordinary:[{id:area,title:'Площадь стен,м²',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0,max:1e9}],
  profile:[],conditional:[],excludedUnownedAssumptions:[],deferMissingProjectFactsToRows:true,
  rows:[{rowId:whole,formulaId:r('formula:whole-work'),title:'Работы по отделке стен',section:config.titleRu,category:'work',unitId:'m2',
   expression:area,inclusion:positive,costTreatment:'OWN_COST'},
   {rowId:r(pack.cleanser.existingResourceKey),formulaId:r('formula:'+pack.cleanser.existingResourceKey),title:'Расход средства для подготовки рук перед защитой кожи',
    section:config.titleRu,category:'material',unitId:'l',expression:expressions.nominalUseL,inclusion:positive,procurement:false,
    costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:effective,unitId:'l'},purchaseBalanceOwnerRowId:r(pack.cleanser.supplyResourceKey)},
   {rowId:r(pack.cleanser.supplyResourceKey),formulaId:r('formula:'+pack.cleanser.supplyResourceKey),title:pack.cleanser.nameRu,
    section:config.titleRu,category:'material',unitId:'l',expression:expressions.orderL,inclusion:positive,procurement:false,
    costTreatment:'INCLUDED_IN_RESOURCE_ROWS',...balance.owner},
   {rowId:r(pack.cleanser.dispenserResourceKey),formulaId:r('formula:'+pack.cleanser.dispenserResourceKey),title:pack.cleanser.dispenserNameRu,
    section:config.titleRu,category:'equipment',unitId:'item',expression:expressions.dispenserCount,inclusion:positive,procurement:false,
    costTreatment:'INCLUDED_IN_RESOURCE_ROWS',purchaseBalance:{unitId:'item',consumedExpression:'1',stockExpression:'0',reserveExpression:'0',orderQuantumExpression:'1'}}]});
 const refs=canonicalEstimateOperationReferences(parent.resources.find(row=>row.row_id===whole)!.resource_graph.operationCompositionV1)
  .map(({processRole:_role,processOrdinal:_ordinal,...operation})=>operation);
 const added=built.resources.filter(row=>row.row_id!==whole).map(row=>{const detail=row.row_id===r(pack.cleanser.existingResourceKey);return hashed({...row,
  ...(!detail?{cost_owner_id:whole}:{}),
  resource_graph:{...row.resource_graph,...(!detail?{parentCostOwnerId:whole,includedInResourceOwnerRowId:whole}:{}),
   operationCompositionV1:{...refs[0],additionalOperations:refs.slice(1)},publicResourcePresentationV1:{
    contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,
    brandAndModelRu:row.category==='material'?'SCJP CLEAR FOAM PURE CLR1L':'SCJP TPW1LDS',specificationRu:null,detailsRu:[],
    ...(detail?{rowKind:'CALCULATION_DETAIL'}:{})}},
  source_metadata:{...row.source_metadata,sourceRole:row.category==='material'?'FINITE_NORMAL_PRE_PROTECTION_PREPARATION_CLEANSER'
   :'COMPATIBLE_FUNCTIONAL_DISPENSER_FOR_SELECTED_SERIAL_POST',normalHandPreparationProfileR1:common,
   acceptedR6PreparationsExpression:preparations,acceptedR6SkinOrderExpression:inherited,
   quantityRole:detail?'EFFECTIVE_CONSUMED_DEMAND_DETAIL_RETAINS_LEGACY_MANUAL_QUANTITY':row.category==='material'
    ?'WHOLE_ONE_LITRE_CARTRIDGES_FOR_EFFECTIVE_PREPARATION_DEMAND':'ONE_FUNCTIONAL_ASSET_NOT_NEW_PURCHASE_OR_WEAR_RATE',
   normativeTrace:common.sources.map(evidence=>({sourceId:evidence.id,normId:'NORMAL_PREPARATION_ONE_DOSE_0_7ML_AND_COMPATIBLE_CLR1L_TPW1LDS',
    sourceDocument:evidence.title,sourceLocator:evidence.locatorRu,sourceSnapshotHash:evidence.sha256})),
   prospectiveCostOwnerRowId:whole,automaticGenericPriceInheritanceAllowed:false,actualSiteInventoryConfirmed:false,
   fullTechnicalAcceptance:false,fullPpeAccepted:false,labourAdded:false}});});
 const accessIds=interiorWallFinishingCrewPackR4.assets.filter(asset=>asset.role==='ACCESS').map(asset=>r(asset.key));
 if(accessIds.length!==pack.access.physicalAssetRowCount)throw Error('VGT_R7_COMPLETE_ACCESS_ASSETS_REQUIRED');
 const replaced=new Set(added.map(row=>row.row_id));
 const resources=[...parent.resources.filter(row=>!replaced.has(row.row_id)),...added].map((row,ordinal)=>{
  const access=row.row_id===r('open-access'),graph=row.resource_graph as Json;
  return hashed({...row,ordinal,resource_graph:{...graph,...(access?{scopeRequirementV1:{...(graph.scopeRequirementV1 as Json),
   kind:'PROCESS',reasonRu:pack.access.reasonRu,coveringRowIds:accessIds}}:{})},source_metadata:{...row.source_metadata,
   ...(accessIds.includes(row.row_id)?{selectedAccessProfile:pack.access}:{}),
   provisionSuccessorContractR7:pack.contract,...(access?{sourceRole:'MANDATORY_FUTURE_EXECUTION_WITH_KNOWN_FUNCTIONAL_ACCESS_ASSETS',
    unresolvedPhysicalResourceReasonRu:pack.access.reasonRu,accessExecutionProfileR7:pack.access,actualSiteAcceptanceConfirmed:false}:{}),
   ...(row.row_id===whole?{newQuantitativeComponentsR7:pack.newQuantitativeComponents,fullTechnicalAcceptance:false}:{})}});
 });
 const formulaIds=new Set(added.map(row=>row.formula_id)),formulas=[...parent.formulas.filter(formula=>!formulaIds.has(formula.formula_id)),
  ...built.formulas.filter(formula=>formulaIds.has(formula.formula_id))];
 const extraParameters=built.parameters.filter(parameter=>parameter.parameter_id!==area),
  used=new Set([...formulas.flatMap(formula=>formula.input_parameter_ids),...extraParameters.map(parameter=>parameter.parameter_id)]);
 const parameters=[...parent.parameters.filter(parameter=>used.has(parameter.parameter_id)),...extraParameters].map((parameter,ordinal)=>({...parameter,ordinal,
  truth_metadata:{...parameter.truth_metadata,formula_consumers:formulas.filter(formula=>formula.input_parameter_ids.includes(parameter.parameter_id)).map(formula=>formula.formula_id)}}));
 return{...parent,resources,formulas,parameters};
}

/** Full source-data oracle, including inherited labour, machinery, materials,
 * tools and all operation bindings; never generated from output rows. */
export function interiorWallFinishingProvisionCompletenessMapR7(branch:InteriorWallFinishingBranchR4='improved-wall-01'){
 const config=interiorWallFinishingCrewPackR4.branches.find(value=>value.id===branch)!,ops=new Set(config.operationIds),
  primer=new Set(interiorWallFinishingCrewPackR4.primerExpectedKeys),previous=priorMap(branch);
 const entries=pack.independentExpected.filter(entry=>branch!=='deep-primer-00603'||primer.has(entry.key)
  ||['skin-protection-foam','open-hand-cleanser','open-hand-drying-towels',pack.cleanser.supplyResourceKey,pack.cleanser.dispenserResourceKey].includes(entry.key)
  ||('assetRole'in entry&&entry.assetRole!=='MANUAL_MIXING')).map(entry=>{
  const ids=entry.operationIds.filter(id=>ops.has(id));if(!ids.length)throw Error('VGT_R7_EXPECTED_OPERATION_REQUIRED:'+entry.key);
  return{expectedResourceId:entry.key,category:entry.category,unitId:entry.unitId,operationId:r('operation:'+ids[0]),
   requiredOperationIds:ids.map(id=>r('operation:'+id)),condition:'EXACT_R6_BRANCH_WITH_SOURCE_NORMAL_PREPARATION_R7',sourceId:pack.contract,
   quantityRule:entry.key===pack.cleanser.existingResourceKey?'SOURCE_OR_SAVED_MANUAL_EFFECTIVE_CONSUMED_PREPARATION_DEMAND_DETAIL'
    :entry.key===pack.cleanser.supplyResourceKey?'WHOLE_1L_CARTRIDGE_BALANCE_FOR_EFFECTIVE_CONSUMED_PREPARATION_DEMAND'
    :entry.key===pack.cleanser.dispenserResourceKey?'ONE_COMPATIBLE_FUNCTIONAL_DISPENSER_FOR_SELECTED_SERIAL_POST':'UNCHANGED_R6_SOURCE_QUANTITY_OR_NAMED_UNKNOWN',
   formulaId:r('formula:'+entry.key),resolution:entry.includedComponent?{kind:'INCLUDED_COMPONENT_ROW',rowId:r(entry.key),parentRowId:whole}:{kind:'ROW',rowId:r(entry.key)}};
 });
 return{...previous,entries:[...entries,...pack.notApplicableCategories.map(value=>({operationId:'selected-source-scope',expectedResourceId:value.category,
  condition:'EXPLICIT_SELECTED_TECHNOLOGY_BOUNDARY',sourceId:pack.contract,resolution:{kind:'NOT_APPLICABLE',reasonRu:value.reason}}))],
  evidenceSha256:pack.sources[0].sha256,evidenceReferences:pack.sources.map(source=>source.url),remainingApplicationSourceNeeds:pack.requiredNeeds,
  remainingSourceConditions:pack.remainingSourceConditions,processRequirements:pack.processRequirements,
  physicalNeedsClosed:pack.physicalNeedsClosed,newQuantitativeComponents:[...previous.newQuantitativeComponents,...pack.newQuantitativeComponents],
  selectedScopeQuantitiesComplete:false,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false};
}
