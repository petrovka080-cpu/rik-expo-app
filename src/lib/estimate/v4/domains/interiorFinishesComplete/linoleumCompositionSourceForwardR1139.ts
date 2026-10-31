import source from '../../../../../../data/estimate-benchmarks/source-packs/linoleum-independent-operation-composition-r1139.json';
import type {AutomaticOwnerDefinition} from '../../automaticConstructionDefinitionR1';
type Json=Record<string,any>;
export const linoleumCompositionSourceR1139=source;
const byRow=new Map(source.historicalResources.map(r=>[r.rowId,r]));
const sourceByRow=new Map(source.sourceResources.map(r=>[r.rowId,r]));
const refs=(keys:readonly string[],historical:boolean)=>{
 const roster=historical?source.historicalOperations:source.sourceOperations;
 const list=keys.map(key=>{const op=roster.find(o=>o.operationId.endsWith('operation:'+key));if(!op)throw Error('LINOLEUM_R1139_SOURCE_OPERATION:'+key);return op;});
 const first=list[0];if(!first)throw Error('LINOLEUM_R1139_EMPTY_OPERATION');
 return{...first,additionalOperations:list.slice(1).map(({contractVersion:_c,groupId:_g,groupTitleRu:_t,...op})=>op)};
};
export function withLinoleumCompositionForwardR1139(base:AutomaticOwnerDefinition,hash:(v:unknown)=>string):AutomaticOwnerDefinition{
 const resources=base.resources.map(row=>{
  const legacy=byRow.get(row.row_id),current=sourceByRow.get(row.row_id);
  if(!legacy){
   if(!current)return row;
   // Exact R2 is ROLLER. Every actual consumer is declared directly; a
   // PROCESS_NOTE control is not a physical whenResourcePresent gate.
   const {row_sha256:_old,...content}=row;
   const next={...content,resource_graph:{...row.resource_graph,operationCompositionV1:refs(current.operationKeys,false)}};
   return{...next,row_sha256:hash(next)};
  }
  if(legacy.rowId===source.financialDisposition.taxRowId){
   // A financial bucket gets no fictitious construction PROCESS or physical
   // resourceKind. COST_SUMMARY is historical only; the shared strict guards
   // remain responsible for proving this branch unavailable before admission.
   // No source-authored method-aware admission marker is invented here.
   const graph={...row.resource_graph,operationCompositionV1:refs(legacy.operationKeys,true),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:legacy.publicNameRu,
     brandAndModelRu:null,specificationRu:null,detailsRu:legacy.detailsRu},
    sourceFinancialDispositionR1139:source.financialDisposition};
   const {row_sha256:_old,...content}=row;const next={...content,resource_graph:graph};return{...next,row_sha256:hash(next)};
  }
  const graph={...row.resource_graph,operationCompositionV1:refs(legacy.operationKeys,true),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:legacy.publicNameRu,
    brandAndModelRu:null,specificationRu:null,detailsRu:legacy.detailsRu,resourceKind:legacy.resourceKind},
   historicalSourceDispositionR1139:{contract:source.contract,sourceAuthority:legacy.sourceAuthorityDisposition,quantityStatus:legacy.quantityStatus,
    rawSourceMetadataUnchanged:true,scope:'LEGACY_RETAINED_ONLY_NOT_R2_OEM',openNeeds:legacy.openNeeds}};
  const {row_sha256:_old,...content}=row;const next={...content,resource_graph:graph};return{...next,row_sha256:hash(next)};
 });
 if(resources.filter(r=>byRow.has(r.row_id)).length!==59)throw Error('LINOLEUM_R1139_EXACT_59_REQUIRED');
 return{...base,resources};
}
export function linoleumIndependentCompositionR1139(sourceId:string=source.sourceId){
 const entries=[...source.historicalResources.map(r=>({expectedResourceId:r.rowId,sourceId,operationId:refs(r.operationKeys,true).operationId,
   condition:'Exact preserved historical declaration only; not admitted as the natural sheet/611/888 method',specification:r.classificationBasis,
   publicNameRu:r.publicNameRu,...(r.rowId===source.financialDisposition.taxRowId?{}:{resourceKind:r.resourceKind}),category:r.category,unitId:r.unitId,formulaId:r.formulaId,
   quantityRule:r.quantityStatus,requiredOperationIds:r.operationKeys.map(key=>refs([key],true).operationId),resolution:{kind:'ROW',rowId:r.rowId}})),
  ...source.sourceResources.map(r=>({expectedResourceId:r.functionKey,sourceId,operationId:refs([r.primaryOperation],false).operationId,
   condition:typeof r.condition==='string'?r.condition:JSON.stringify(r.condition),specification:r.sourceLocator,publicNameRu:r.publicNameRu,resourceKind:r.resourceKind,
   unitId:r.unitId,formulaId:r.formulaId,quantityRule:r.quantityRule,requiredOperationIds:r.operationKeys.map(key=>refs([key],false).operationId),resolution:{kind:'ROW',rowId:r.rowId}}))];
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
  evidenceSha256:source.primaryPins[0]!.sha256,operationResourceBindingRequired:true,operationRoster:[...source.historicalOperations,...source.sourceOperations],entries,
  operationRequirements:[...source.historicalOperationRequirements,...source.sourceOperationRequirements].map(r=>({...r,sourceId})),
  fullTechnicalAcceptance:false,historicalMissingClassNeeds:source.historicalMissingClasses,native59AuthorityTransferred:false};
}


/** Source declaration only. The common definition-composition-scope proof owns
 * admission and validates these actual AST hashes and locked enum domains. */
export function linoleumDefinitionCompositionScopeR1141(model:AutomaticOwnerDefinition,hashStable:(value:unknown)=>string){
 const declared=source.definitionScopeSourceDeclaration;
 const inactiveRows=declared.inactiveRowIds.map(rowId=>{
  const row=model.resources.find(row=>row.row_id===rowId);
  if(!row)throw Error('LINOLEUM_R1141_INACTIVE_ROW_MISSING:'+rowId);
  return{rowId,inclusionSha256:hashStable(row.inclusion_ast)};
 });
 return{contractVersion:'canonical-definition-composition-scope/v1',lockedParameterValues:declared.lockedParameterValues,
  inactiveRows,inactiveOperationIds:declared.inactiveOperationIds,sourceEvidence:declared.sourceEvidence};
}
