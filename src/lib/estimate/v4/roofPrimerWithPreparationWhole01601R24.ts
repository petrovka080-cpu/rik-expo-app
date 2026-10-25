import assert from 'node:assert/strict';
import pack from '../../../../data/estimate-benchmarks/source-packs/roof-primer-with-preparation-native01601-r24.json';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1,type SourcePinnedRoofNormRateR1} from './sourcePinnedRoofNormOwnerR1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {canonicalConditionParameterIds} from '../backendPlatform/canonicalEffectiveResourceQuantityV1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import type {CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';

type Json=Record<string,unknown>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
export const roofPrimerWithPreparation01601NativeR24=pack;

/** Existing01602 stays READY emulsion under its own source and rows. This
 * four-row local kernel neither admits a source nor adds a boiler/operator. */
export function buildRoofPrimerWithPreparationWhole01601R24(sourceKey:string):AutomaticOwnerDefinition{
 assert.equal(sourceKey,pack.sources[0]!.id,'PRIMER01601_SOURCE_AND_CURRENT_OWNER_REVIEW_HOLD');
 const input:SourcePinnedRoofNormPackR1={...pack,measurementUnitId:'m2',rates:pack.rates.map((rate):SourcePinnedRoofNormRateR1=>{
  assert.equal(rate.costTreatment,'OWN_COST');return{...rate,costTreatment:'OWN_COST'};
 })};
 const base=sourcePinnedRoofNormOwnerR1(input);
 const parameters:AutomaticOwnerDefinition['parameters']=base.parameters.map(p=>{
  if(p.parameter_id!==pack.conditionsParameterId&&p.parameter_id!==pack.areaParameterId)return p;
  return{...p,required:false,default_value:null,truth_metadata:{...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
   provenance:{...(object(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   guide:{...(object(p.truth_metadata.guide)?p.truth_metadata.guide:{}),source_role:'PROJECT_DOCUMENTATION',exact_locator:pack.sources[0]!.locators}}};
 });
 const resources:AutomaticOwnerDefinition['resources']=base.resources.map(row=>{
  const rate=pack.rates.find(r=>row.row_id===pack.prefix+':'+r.role);assert(rate);
  const stages=rate.requiredOperationKeys.map(key=>{const op=pack.printedOperationRoster.find(x=>x.key===key);assert(op);return{
   operationId:pack.prefix+':operation:'+key,operationTitleRu:op.titleRu,processOrdinal:op.printedOrdinal,
   completionCriterionRu:'Собственный состав огрунтовки с приготовлением выполнен;совместимость,фактический комплект иприёмка отдельно.'};});assert(stages.length>0);
  const operation:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.groupTitleRu,
   ...stages[0]!,...(stages.length>1?{additionalOperations:stages.slice(1)}:{})};
  const presentation=row.resource_graph.publicResourcePresentationV1;assert(object(presentation));const{row_sha256:_old,...body}=row;
  const result={...body,source_metadata:{...row.source_metadata,exactSourceNormId:pack.normId,sourcePreparedPrimerNotReadyEmulsion:true,
   sourceNativeBoilerOrOperatorAbsentNotZero:true,existing01602NotRecreated:true,full_technical_acceptance:false},
   resource_graph:{...row.resource_graph,operationCompositionV1:operation,publicResourcePresentationV1:{...presentation,sourceTitleRu:rate.sourceInternalTitleRu}}};
  return{...result,row_sha256:hash(result)};
 });
 assert.deepEqual([parameters.length,base.formulas.length,resources.length],[4,4,4]);
 assert(resources.every(r=>r.resource_graph.costTreatment==='OWN_COST'));
 const declared=new Set(parameters.map(p=>p.parameter_id));
 for(const r of resources){resolveInclusionGraph(r.inclusion_ast,{});for(const id of canonicalConditionParameterIds(r.inclusion_ast))assert(declared.has(id));}
 return{...base,parameters,resources};
}
