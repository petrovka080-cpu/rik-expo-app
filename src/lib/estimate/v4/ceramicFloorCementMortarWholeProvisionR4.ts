import pack from '../../../../data/estimate-benchmarks/source-packs/ceramic-floor-cement-mortar-whole-provision-r4.json';
import {ceramicFloorM150WholeProvisionDefinitionR3,ceramicFloorM150WholeProvisionCompletenessR3} from './ceramicFloorCementMortarWholeProvisionR3';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {normalHandPreparationCleanserExpressionsR1,normalHandPreparationProvisionPackR1} from './normalHandPreparationProvisionProfileR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
export const ceramicFloorM150WholeProvisionPackR4=pack;
const c=pack.cleanser,A=pack.parent.primaryParameterId,L=pack.parent.skirtingLengthParameterId;
function changed<T extends {row_sha256:string}>(row:T,update:Record<string,unknown>):T{const{row_sha256:_old,...body}=row,content={...body,...update};return{...content,row_sha256:hash(content)} as T;}
/** A source-owned dose/functional dispenser overlay over the complete admitted
 * floor/skirting definition. It creates no new attendance, hygiene-water,
 * joint geometry, extra labour norm, stock credit or paid provision owner. */
export function applyCeramicFloorM150HandPreparationR4(base:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 const old=base.resources.find(r=>r.row_id===c.rowId),owner=base.resources.find(r=>r.row_id===c.existingCostOwnerRowId);
 if(!old||old.unit_id!=='l'||base.resources.length!==84||!owner||normalHandPreparationProvisionPackR1.cartridgeCode!=='CLR1L'||normalHandPreparationProvisionPackR1.costPolicy!=='INCLUDED_IN_EXISTING_WHOLE_WORK_OWNER_NO_DUPLICATE_PROCUREMENT')throw Error('M150_R4_EXACT_WHOLE_PARENT_AND_COMMON_PROFILE_REQUIRED');
 const effective=effectiveResourceQuantityParameterId(c.rowId),normal=normalHandPreparationCleanserExpressionsR1(c.plannedPreparationsExpression,effective),balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:c.order.rowId,orderUnitId:'l',consumed:normal.consumedL,stock:'0',reserve:normal.reserveL,quantum:normal.orderQuantumL});
 const rows:AutomaticRowSpec[]=[
  {rowId:c.rowId,formulaId:c.formulaId,title:c.consumedTitleRu,section:pack.titleRu,category:'material',unitId:'l',expression:normal.nominalUseL,costTreatment:'INFORMATIONAL_SCOPE',procurement:false,effectiveQuantityOutput:{parameterId:effective,unitId:'l'},purchaseBalanceOwnerRowId:c.order.rowId},
  {rowId:c.order.rowId,formulaId:c.order.formulaId,title:c.order.titleRu,section:pack.titleRu,category:'material',unitId:'l',expression:normal.orderL,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,...balance.owner},
  {rowId:c.dispenser.rowId,formulaId:c.dispenser.formulaId,title:c.dispenser.titleRu,section:pack.titleRu,category:'tool',unitId:'pcs',expression:normal.dispenserCount,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false},
 ];
 const extra=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.namespace,sourceId:pack.publicationSourceId,normId:normalHandPreparationProvisionPackR1.contract,
  sourceMetadata:{source_title:'SCJP CLEAR FOAM PURE normal hand preparation',source_document_version:'UK product information04/25',definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},applicabilityRu:normalHandPreparationProvisionPackR1.applicationRu,
  ordinary:[{id:A,title:'Чистая площадь керамического пола',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0.000000001},{id:L,title:'Измеренная длина прямого керамического плинтуса',kind:'ordinary',valueType:'decimal',unitId:'linear_m',min:0}],profile:[],conditional:[],rows,excludedUnownedAssumptions:pack.actualRemaining.map(n=>n.reasonRu)});
 const oldComposition=old.resource_graph.operationCompositionV1;
 const resources=[...base.resources.filter(r=>r.row_id!==c.rowId).map(r=>{
  if(r.row_id!==c.existingCostOwnerRowId)return r;
  const composition=r.resource_graph.operationCompositionV1 as Record<string,unknown>,already=new Set(canonicalEstimateOperationReferences(composition).map(o=>o.operationId)),extraOperations=canonicalEstimateOperationReferences(oldComposition).filter(o=>!already.has(o.operationId));
  return changed(r,{resource_graph:{...r.resource_graph,operationCompositionV1:{...composition,additionalOperations:[...(Array.isArray(composition.additionalOperations)?composition.additionalOperations:[]),...extraOperations]}},source_metadata:{...r.source_metadata,handPreparationProvisionR4:{commonProfile:normalHandPreparationProvisionPackR1.contract,includedRowIds:[c.order.rowId,c.dispenser.rowId],noAdditionalPaidOwner:true,quantityAndPriceUnchanged:true}}});
 }),...extra.resources.map(r=>changed(r,{cost_owner_id:c.existingCostOwnerRowId,resource_graph:{...r.resource_graph,scopeContextParameterIds:[A,L],operationCompositionV1:oldComposition,parentCostOwnerId:c.existingCostOwnerRowId,includedInResourceOwnerRowId:c.existingCostOwnerRowId,
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:r.row_id===c.dispenser.rowId?'SCJP TPW1LDS':'SCJP CLEAR FOAM PURE',specificationRu:r.row_id===c.order.rowId?'CLR1L, 1 л':null,detailsRu:[],...(r.row_id===c.rowId?{rowKind:'CALCULATION_DETAIL'}:{})}},
  source_metadata:{...r.source_metadata,sourceRole:r.row_id===c.dispenser.rowId?'CALCULATED_FUNCTIONAL_SINGLE_POST_PROVISION':'MANUFACTURER_NORMAL_HAND_PREPARATION_DOSE_AND_CARTRIDGE_SUPPLY',sharedProfile:normalHandPreparationProvisionPackR1,originalR3RowId:c.rowId,normalPreparationOnly:true,industrialDecontaminationAccepted:false,waterQuantityClosed:false,dryingQuantityClosed:false,noNewWorkLabourOwner:true,noSeparateProcurement:true,actualWarehouseClaimed:false,full_technical_acceptance:false}}))].map((r,ordinal)=>r.ordinal===ordinal?r:changed(r,{ordinal}));
 const runtimeInput={...base.runtimeInput},runtimeSourceIds=Object.fromEntries(Object.keys(runtimeInput).map(key=>[key,[pack.publicationSourceId]]));
 const parameters=[...base.parameters.filter(p=>p.parameter_id!==c.parameterId),...extra.parameters.filter(p=>!base.parameters.some(b=>b.parameter_id===p.parameter_id))].map((p,ordinal)=>({...p,ordinal,truth_metadata:{...p.truth_metadata,...(Object.hasOwn(runtimeInput,p.parameter_id)?{compositeSourceAttributionR4:{sourceId:pack.publicationSourceId,parentSourceIds:base.runtimeSourceIds[p.parameter_id]??[],parentFactory:pack.parent.factory,primarySourceGuideAndNormativeTraceRetained:true}}:{})}}));
 return{...base,parameters,formulas:[...base.formulas.filter(f=>f.formula_id!==c.formulaId),...extra.formulas],resources,runtimeInput,runtimeSourceIds};
}
export function ceramicFloorM150WholeProvisionDefinitionR4(){return applyCeramicFloorM150HandPreparationR4(ceramicFloorM150WholeProvisionDefinitionR3());}
export function compileCeramicFloorM150WholeProvisionR4(submittedParameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:A,definition:ceramicFloorM150WholeProvisionDefinitionR4(),submittedParameters});}
export function ceramicFloorM150WholeProvisionCompletenessR4(){
 const base=ceramicFloorM150WholeProvisionCompletenessR3(),independent=[pack.independentExpected.consumed,...pack.independentExpected.newRows];
 return{...base,generatedFromCurrentRows:false,operationResourceBindingRequired:true,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,
  entries:[...base.entries.filter(e=>String(e.resolution.rowId)!==c.rowId).map(e=>String(e.resolution.rowId)===c.existingCostOwnerRowId?{...e,requiredOperationIds:[...new Set([...e.requiredOperationIds,...c.requiredOperationIds])]}:e),...independent.map(e=>({expectedResourceId:'m150-r4:'+e.rowId,operationId:c.requiredOperationIds[0]!,category:e.category,unitId:e.unitId,sourceId:pack.publicationSourceId,specification:'SCJP CLEAR FOAM PURE CLR1L and TPW1LDS normal pre-protection preparation',condition:'ONE_SEQUENTIAL_POST_PER_EXISTING_MARLY_PLAN',quantityRule:e.quantityRule,formulaId:e.formulaId,requiredOperationIds:c.requiredOperationIds,resolution:e.rowId===c.rowId?{kind:'ROW',rowId:e.rowId}:{kind:'INCLUDED_COMPONENT_ROW',rowId:e.rowId,parentRowId:c.existingCostOwnerRowId}}))],
  additionalSources:[...base.additionalSources,...pack.primaryEvidence],openAuthorObligations:pack.actualRemaining.map(n=>n.reasonRu),externalBlockers:base.externalBlockers.filter(b=>b.rowId!==c.rowId)};
}
