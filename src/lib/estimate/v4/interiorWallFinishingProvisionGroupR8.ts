import pack from '../../../../data/estimate-benchmarks/source-packs/interior-wall-finishing-provision-group-r8.json';
import {interiorWallFinishingProvisionGroupDefinitionR7 as prior,interiorWallFinishingProvisionCompletenessMapR7 as priorMap} from './interiorWallFinishingProvisionGroupR7';
import {interiorWallFinishingCrewPackR4,type InteriorWallFinishingBranchR4} from './interiorWallFinishingCrewGroupR4';
import {interiorWallFinishingGeometryPackR3 as base,interiorWallFinishingGeometryRowR3 as r,
 interiorWallFinishingGeometryParameterR3 as p} from './interiorWallFinishingGeometryGroupR3';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {normalHandPreparationDryingExpressionsR1,normalHandPreparationDryingPackR1 as common} from './normalHandPreparationDryingProfileR1';
import {normalHandPreparationCleanserExpressionsR1} from './normalHandPreparationProvisionProfileR1';
import {effectiveResourceQuantityParameterId,effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
type Json=Record<string,any>;
export const interiorWallFinishingProvisionPackR8=pack;
const whole=r('whole-work'),area=p(base.areaId),positive={kind:'greater_than' as const,parameterId:area,value:0};
const hashed=(row:any)=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:estimateDeterministicHash(body)};};

/** One successor over immutable R7. Reuses the admitted preparation budget,
 * complete stage definition and existing balance/operation contracts. Drying
 * is a selected physical protocol; it adds no surgical work or wash norm. */
export function interiorWallFinishingProvisionGroupDefinitionR8(branch:InteriorWallFinishingBranchR4='improved-wall-01'):AutomaticOwnerDefinition{
 const parent=structuredClone(prior(branch)),config=interiorWallFinishingCrewPackR4.branches.find(value=>value.id===branch)!;
 if(pack.fullTechnicalAcceptance||pack.commonDryingProfileContract!==common.contract||pack.physicalNeedsClosed.join(',')!=='hand-drying-towels')
  throw Error('VGT_R8_EXACT_DRYING_PROFILE_AND_HONEST_RESIDUAL_REQUIRED');
 const cleanser=parent.resources.find(row=>row.row_id===r('hand-cleanser-order'))!,
  preparations=(cleanser.source_metadata as Json).acceptedR6PreparationsExpression;
 if(typeof preparations!=='string'||!preparations||normalHandPreparationCleanserExpressionsR1(preparations).nominalUseL
  !==parent.formulas.find(formula=>formula.formula_id===r('formula:open-hand-cleanser'))!.expression_source)
  throw Error('VGT_R8_EXACT_ACCEPTED_R7_PREPARATION_BUDGET_REQUIRED');
 const effective=effectiveResourceQuantityParameterId(r(pack.drying.existingResourceKey)),
  expressions=normalHandPreparationDryingExpressionsR1(preparations,effective),source=common.sources[0],
  balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:r(pack.drying.supplyResourceKey),orderUnitId:'pcs',
   consumed:expressions.consumedPcs,stock:'0',reserve:expressions.reservePcs,quantum:expressions.orderQuantumPcs});
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:'vgt-selected-normal-drying-r8',sourceId:source.id,
  normId:'SELECTED_TWO_FRESH_TOWEL_PHYSICAL_DRYING_METHOD_NOT_CONSTRUCTION_MEDICAL_NORM',operationCompositionGroupId:base.namespace,
  sourceMetadata:{source_title:source.title,source_document_version:common.contract,definition_hash:source.sha256,
   artifact_sha256:source.sha256,exact_locator:source.locatorRu},applicabilityRu:common.applicationRu,
  ordinary:[{id:area,title:'Площадь стен,м²',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0,max:1e9}],
  profile:[],conditional:[],excludedUnownedAssumptions:[],deferMissingProjectFactsToRows:true,
  rows:[{rowId:whole,formulaId:r('formula:whole-work'),title:'Работы по отделке стен',section:config.titleRu,category:'work',unitId:'m2',
   expression:area,inclusion:positive,costTreatment:'OWN_COST'},
   {rowId:r(pack.drying.existingResourceKey),formulaId:r('formula:'+pack.drying.existingResourceKey),title:pack.drying.detailNameRu,
    section:config.titleRu,category:'material',unitId:'pcs',expression:expressions.nominalUsePcs,inclusion:positive,procurement:false,
    costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:effective,unitId:'pcs'},purchaseBalanceOwnerRowId:r(pack.drying.supplyResourceKey)},
   {rowId:r(pack.drying.supplyResourceKey),formulaId:r('formula:'+pack.drying.supplyResourceKey),title:pack.drying.nameRu,
    section:config.titleRu,category:'material',unitId:'pcs',expression:expressions.orderPcs,inclusion:positive,procurement:false,
    costTreatment:'INCLUDED_IN_RESOURCE_ROWS',...balance.owner}]});
 const refs=canonicalEstimateOperationReferences(parent.resources.find(row=>row.row_id===r('skin-protection-foam'))!.resource_graph.operationCompositionV1)
  .map(({processRole:_role,processOrdinal:_ordinal,...operation})=>operation);
 const waste=pack.drying.inheritedWasteResourceKeys.map(r);
 if(waste.some(id=>!parent.resources.some(row=>row.row_id===id)))throw Error('VGT_R8_INHERITED_WASTE_BIN_AND_LID_REQUIRED');
 const added=built.resources.filter(row=>row.row_id!==whole).map(row=>{const detail=row.row_id===r(pack.drying.existingResourceKey);
  return hashed({...row,...(!detail?{cost_owner_id:whole}:{}),resource_graph:{...row.resource_graph,
   ...(!detail?{parentCostOwnerId:whole,includedInResourceOwnerRowId:whole}:{}),operationCompositionV1:{...refs[0],additionalOperations:refs.slice(1)},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,
    brandAndModelRu:'Medline DYNJPE2220A',specificationRu:detail?null:'37×69см,пара2шт',detailsRu:[],...(detail?{rowKind:'CALCULATION_DETAIL'}:{})}},
   source_metadata:{...row.source_metadata,sourceRole:detail?'EFFECTIVE_SELECTED_PHYSICAL_DRYING_CONSUMPTION_DETAIL'
    :'WHOLE_PAIRED_PACK_SUPPLY_FOR_SELECTED_NORMAL_DRYING_METHOD',normalHandPreparationDryingProfileR1:common,
    acceptedR7PreparationsExpression:preparations,prospectiveCostOwnerRowId:whole,automaticGenericPriceInheritanceAllowed:false,
    inheritedNamedWasteRowIds:waste,noNewPowerDriveOrDispenser:true,surgicalClinicalRegimeTransferred:false,
    fullTechnicalAcceptance:false,fullPpeAccepted:false,labourAdded:false,waterQuantityClosed:false,
    normativeTrace:common.sources.map(evidence=>({sourceId:evidence.id,normId:'SELECTED_TWO_FRESH_TOWEL_DRYING_METHOD_AND_EXACT_PAIRED_HAND_TOWEL_SPEC',
     sourceDocument:evidence.title,sourceLocator:evidence.locatorRu,sourceSnapshotHash:evidence.sha256}))}});
 });
 const replaced=new Set(added.map(row=>row.row_id)),resources=[...parent.resources.filter(row=>!replaced.has(row.row_id)),...added].map((row,ordinal)=>{
  const need=pack.requiredNeeds.find(need=>row.row_id===r('open-'+need.id));
  return hashed({...row,ordinal,source_metadata:{...row.source_metadata,provisionSuccessorContractR8:pack.contract,
   ...(need?{unresolvedPhysicalResourceReasonRu:need.reasonRu}:{}),
   ...(row.row_id===whole?{newQuantitativeComponentsR8:['selected-two-fresh-hand-towel-drying-and-paired-pack-balance'],fullTechnicalAcceptance:false}:{})}});
 });
 const ids=new Set(added.map(row=>row.formula_id)),formulas=[...parent.formulas.filter(formula=>!ids.has(formula.formula_id)),
  ...built.formulas.filter(formula=>ids.has(formula.formula_id))],extra=built.parameters.filter(parameter=>parameter.parameter_id!==area),
  used=new Set([...formulas.flatMap(formula=>formula.input_parameter_ids),...extra.map(parameter=>parameter.parameter_id),
   ...parent.resources.flatMap(row=>{const output=row.resource_graph.effectiveQuantityOutputV1 as Json|undefined;return output?[output.parameterId]:[];})]);
 const parameters=[...parent.parameters.filter(parameter=>used.has(parameter.parameter_id)),...extra].map((parameter,ordinal)=>({...parameter,ordinal,
  truth_metadata:{...parameter.truth_metadata,formula_consumers:formulas.filter(formula=>formula.input_parameter_ids.includes(parameter.parameter_id)).map(formula=>formula.formula_id)}}));
 return{...parent,resources,formulas,parameters};
}

/** Static whole-stage source expectation, not generated from definition rows. */
export function interiorWallFinishingProvisionCompletenessMapR8(branch:InteriorWallFinishingBranchR4='improved-wall-01'){
 const previous=priorMap(branch),config=interiorWallFinishingCrewPackR4.branches.find(value=>value.id===branch)!,
  ops=new Set(config.operationIds),primer=new Set(interiorWallFinishingCrewPackR4.primerExpectedKeys);
 const entries=pack.independentExpected.filter(entry=>branch!=='deep-primer-00603'||primer.has(entry.key)
  ||['skin-protection-foam','open-hand-cleanser','hand-cleanser-order','tool-hand-cleanser-dispenser',
   pack.drying.existingResourceKey,pack.drying.supplyResourceKey].includes(entry.key)||('assetRole'in entry&&entry.assetRole!=='MANUAL_MIXING')).map(entry=>{
  const ids=entry.operationIds.filter(id=>ops.has(id));if(!ids.length)throw Error('VGT_R8_REQUIRED_INDEPENDENT_OPERATION:'+entry.key);
  return{expectedResourceId:entry.key,category:entry.category,unitId:entry.unitId,operationId:r('operation:'+ids[0]),
   requiredOperationIds:ids.map(id=>r('operation:'+id)),sourceId:pack.contract,condition:'UNCHANGED_R7_BRANCH_WITH_SELECTED_NORMAL_DRYING_R8',
   quantityRule:entry.key===pack.drying.supplyResourceKey?'TWO_FRESH_TOWELS_PER_ADMITTED_PREPARATION_AND_WHOLE_PAIRED_PACK_BALANCE'
    :entry.key===pack.drying.existingResourceKey?'EFFECTIVE_CONSUMED_DETAIL_RETAINS_SAVED_MANUALS':'UNCHANGED_ACCEPTED_R7_SOURCE_ROW_OR_NAMED_UNKNOWN',
   formulaId:r('formula:'+entry.key),resolution:entry.includedComponent?{kind:'INCLUDED_COMPONENT_ROW',rowId:r(entry.key),parentRowId:whole}:{kind:'ROW',rowId:r(entry.key)}};
 });
 return{...previous,entries:[...entries,...pack.notApplicableCategories.map(value=>({expectedResourceId:value.category,operationId:'selected-source-scope',
  condition:'EXPLICIT_SELECTED_TECHNOLOGY_BOUNDARY',sourceId:pack.contract,resolution:{kind:'NOT_APPLICABLE',reasonRu:value.reason}}))],
  evidenceSha256:common.sources[0].sha256,evidenceReferences:[...previous.evidenceReferences,...common.sources.map(source=>source.url)],
  physicalNeedsClosed:[...previous.physicalNeedsClosed,...pack.physicalNeedsClosed],remainingApplicationSourceNeeds:pack.requiredNeeds,
  remainingSourceConditions:pack.remainingSourceConditions,processRequirements:pack.processRequirements,
  selectedScopeQuantitiesComplete:false,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false};
}
