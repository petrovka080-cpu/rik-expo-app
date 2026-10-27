import pack from '../../../../data/estimate-benchmarks/source-packs/ceramic-floor-cement-mortar-whole-provision-r3.json';
import {ceramicFloorM150ResourceGroupDefinitionR2,ceramicFloorM150ResourceGroupCompletenessR2,ceramicFloorM150ResourceGroupPackR2} from './ceramicFloorCementMortarResourceGroupR2';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {marlySkinNormalSupplyExpressionsR1,marlySkinRequiredHandHygieneR1} from './marlySkinNormalProvisionProfileR1';
export const ceramicFloorM150WholeProvisionPackR3=pack;
const A=pack.parent.primaryParameterId,L=pack.parent.skirtingLengthParameterId,s=pack.skin;
function assertInheritedProfile(){
 if(ceramicFloorM150ResourceGroupPackR2.tools.length+ceramicFloorM150ResourceGroupPackR2.ppe.length!==44||ceramicFloorM150ResourceGroupPackR2.quality.length!==6
  ||ceramicFloorM150ResourceGroupPackR2.crew.workers!==6||s.workingProtectionHours!==4||s.approxNormalHandApplicationsPerCan!==150)throw Error('M150_R3_EXACT_WHOLE_PROFILE_REQUIRED');
 for(const h of pack.handHygiene.resources){const common=marlySkinRequiredHandHygieneR1.find(c=>h.rowId.endsWith(':'+c.key));if(!common||common.unitId!==h.unitId||common.titleRu!==h.titleRu)throw Error('M150_R3_COMMON_HAND_HYGIENE_REQUIRED');}
}
function rehash<T extends {row_sha256:string}>(row:T,change:Record<string,unknown>):T{const{row_sha256:_old,...body}=row,content={...body,...change};return{...content,row_sha256:hash(content)} as T;}
/** Reuse the published whole floor/skirting/44-tool/6-control definition.
 * The skin component becomes a source-supported normal provision plan.
 * External joints/waste and required hand-hygiene quantities stay visible. */
export function ceramicFloorM150WholeProvisionDefinitionR3():AutomaticOwnerDefinition{
 assertInheritedProfile();const base=ceramicFloorM150ResourceGroupDefinitionR2(),old=base.resources.find(r=>r.row_id===s.orderOwnerRowId);
 if(!old||old.unit_id!=='l'||base.resources.length!==80)throw Error('M150_R3_EXPECTED_R2_SKIN_PREIMAGE_REQUIRED');
 const effective=effectiveResourceQuantityParameterId(s.nominalUseRowId),normal=marlySkinNormalSupplyExpressionsR1(s.formulas.plannedApplications,effective),order=normal.orderL,reserve=normal.reserveL,balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:s.orderOwnerRowId,orderUnitId:'l',consumed:effective,stock:'0',reserve,quantum:'0.1'});
 const rows:AutomaticRowSpec[]=[
  {rowId:s.nominalUseRowId,formulaId:s.nominalUseFormulaId,section:pack.titleRu,title:'Плановый расход защитного средства для кожи',category:'material',unitId:'l',expression:normal.nominalUseL,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:effective,unitId:'l'},purchaseBalanceOwnerRowId:s.orderOwnerRowId},
  {rowId:s.orderOwnerRowId,formulaId:s.orderFormulaId,section:pack.titleRu,title:'Защитное средство для кожи, баллон 100 мл',category:'material',unitId:'l',expression:order,procurement:true,costTreatment:'OWN_COST',...balance.owner},
  ...pack.handHygiene.resources.map(h=>({rowId:h.rowId,formulaId:h.formulaId,section:pack.titleRu,title:h.titleRu,category:'material',unitId:h.unitId,expression:h.parameterId,procurement:false,costTreatment:'OWN_COST' as const})),
 ];
 const evidence=s.primaryEvidence.find(e=>e.path.endsWith('/MARLY_INDUSTRY_2024.pdf'))!;
 const extra=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.namespace,sourceId:pack.publicationSourceId,normId:pack.contract,
  sourceMetadata:{source_title:'Marly Skin: whole industrial skin-protection plan',source_document_version:'Manufacturer industry/skin-plan/consumption publications,2024path',definition_hash:evidence.sha256,artifact_sha256:evidence.sha256,exact_locator:evidence.locator},
  applicabilityRu:pack.scope.unchanged,ordinary:[{id:A,title:'Чистая площадь керамического пола',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000000001},{id:L,title:'Измеренная длина прямого керамического плинтуса',valueType:'decimal',unitId:'linear_m',kind:'ordinary',min:0}],profile:[],conditional:pack.handHygiene.resources.map(h=>({id:h.parameterId,title:h.titleRu,valueType:'decimal' as const,unitId:h.unitId,kind:'internal' as const,min:0})),rows,
  excludedUnownedAssumptions:pack.externalBlockers.map(b=>b.remaining??b.returnCondition)});
 const inheritedOperation=old.resource_graph.operationCompositionV1 as Record<string,unknown>,op=(key:string)=>{const o=ceramicFloorM150ResourceGroupPackR2.operations.find(o=>o.id===key)!;return{operationId:pack.namespace.replace(/:r3$/,':r2')+':operation:'+key,operationTitleRu:o.titleRu,processOrdinal:o.ordinal*10,processRole:'PROCESS' as const,completionCriterionRu:'Ресурс предусмотрен в целой подработе и организационном обеспечении.'};};
 const composed={...inheritedOperation,...op(s.operations[0]!),additionalOperations:s.operations.slice(1).map(op)};
 const replaced=new Set([s.orderOwnerRowId]),resources=[...base.resources.filter(r=>!replaced.has(r.row_id)).map(row=>{
  const extension=pack.ppeOperationExtensions.find(x=>x.rowId===row.row_id);if(!extension)return row;
  const oldComposition=row.resource_graph.operationCompositionV1 as {additionalOperations?:unknown[]};
  return rehash(row,{resource_graph:{...row.resource_graph,operationCompositionV1:{...oldComposition,additionalOperations:[...(oldComposition.additionalOperations??[]),...extension.additionalOperations.map(op)]}},source_metadata:{...row.source_metadata,stageBindingExtensionR3:extension,quantityAndCostOwnerUnchanged:true}});
 }),...extra.resources.map(row=>rehash(row,{resource_graph:{...row.resource_graph,scopeContextParameterIds:[A,L],operationCompositionV1:composed,
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,brandAndModelRu:pack.handHygiene.resources.some(h=>h.rowId===row.row_id)?null:'Marly Skin',specificationRu:row.row_id===s.orderOwnerRowId?'Баллон 100 мл':null,detailsRu:[]}},
  source_metadata:{...row.source_metadata,wholeSkinProvisionR3:s,sourceRole:pack.handHygiene.resources.some(h=>h.rowId===row.row_id)?'UNRESOLVED_APPLICATION_NORM':row.row_id===s.orderOwnerRowId?'DERIVED_FACTORY_PACKAGE_PROVISION_PLAN':'APPROXIMATE_MANUFACTURER_NORMAL_USAGE_CAPACITY',wholeKrerLabourUnchanged:true,noAdditionalLabourOwner:true,notStokodermDose:true,normalCapacityApproximate:true,priceUnknownDoesNotCreatePhysicalGap:true,actualStockClaimed:false,full_technical_acceptance:false}}))].map((r,ordinal)=>r.ordinal===ordinal?r:rehash(r,{ordinal}));
 const runtimeInput={...base.runtimeInput,...extra.runtimeInput},parentRuntimeSourceIds={...base.runtimeSourceIds,...extra.runtimeSourceIds};
 // The registered R3 locator is the composite owner of this successor. Keep
 // exact inherited primary guides/traces and its prior source map as lineage;
 // baseline runtime source attribution must match that registered locator.
 const runtimeSourceIds=Object.fromEntries(Object.keys(runtimeInput).map(key=>[key,[pack.publicationSourceId]]));
 return{...base,parameters:[...base.parameters.filter(p=>p.parameter_id!==s.removedUnknownParameterId),...extra.parameters.filter(p=>!base.parameters.some(b=>b.parameter_id===p.parameter_id))].map((p,ordinal)=>{const hygiene=pack.handHygiene.resources.find(h=>h.parameterId===p.parameter_id),truth=hygiene?unresolvedApplicationNormTruthR1({...p.truth_metadata,source_confirmation_required:false},hygiene.reasonRu):p.truth_metadata;return{...p,ordinal,truth_metadata:{...truth,...(Object.hasOwn(runtimeInput,p.parameter_id)?{compositeSourceAttributionR3:{sourceId:pack.publicationSourceId,parentSourceIds:parentRuntimeSourceIds[p.parameter_id]??[],parentFactory:pack.parent.factory,sourceNorms:pack.parent.sourceNorms,primarySourceGuideAndNormativeTraceRetained:true}}:{})}};}),
  formulas:[...base.formulas.filter(f=>f.formula_id!==s.orderFormulaId),...extra.formulas],resources,
  runtimeInput,runtimeClassification:{...base.runtimeClassification,...extra.runtimeClassification},runtimeSourceIds};
}
export function compileCeramicFloorM150WholeProvisionR3(submittedParameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:A,definition:ceramicFloorM150WholeProvisionDefinitionR3(),submittedParameters});}
export function ceramicFloorM150WholeProvisionCompletenessR3(){
 const base=ceramicFloorM150ResourceGroupCompletenessR2(),ops=s.operations.map(key=>pack.namespace.replace(/:r3$/,':r2')+':operation:'+key);
 return{...base,generatedFromCurrentRows:false,operationResourceBindingRequired:true,fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,
  entries:[...base.entries.filter(e=>String(e.resolution.rowId)!==s.orderOwnerRowId).map(e=>{const extension=pack.ppeOperationExtensions.find(x=>x.rowId===String(e.resolution.rowId));return extension?{...e,requiredOperationIds:[...e.requiredOperationIds,...extension.additionalOperations.map(key=>pack.namespace.replace(/:r3$/,':r2')+':operation:'+key)]}:e;}),...pack.independentExpectedComposition.newExpected.map(e=>({expectedResourceId:'m150-r3:'+e.rowId,operationId:ops[0]!,category:e.category,unitId:e.unitId,sourceId:pack.publicationSourceId,condition:pack.scope.unchanged,specification:s.product,quantityRule:e.quantityRule,formulaId:e.formulaId,requiredOperationIds:ops,resolution:{kind:'ROW',rowId:e.rowId}}))],
  additionalSources:[...base.additionalSources,...pack.primaryEvidence],openAuthorObligations:pack.actualRemaining.map(x=>x.reasonRu),externalBlockers:pack.externalBlockers};
}
