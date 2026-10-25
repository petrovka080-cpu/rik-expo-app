import route from '../../../../data/estimate-benchmarks/source-packs/masonry-glass-block-normal-route-r103.json';
import independentMap from '../../../../data/estimate-benchmarks/source-packs/masonry-glass-block-independent-full-map-r103.json';
import {masonryGlassBlockPackR97 as source,masonryGlassBlockDefinitionR97 as original} from './masonryGlassBlockKrer08R97';
import type {AutomaticOwnerDefinition,AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

type Json=Record<string,unknown>;
type Parameter=AutomaticOwnerDefinition['parameters'][number];
type Resource=AutomaticOwnerDefinition['resources'][number];
export type MasonryGlassBlockCardKeyR103='partition'|'opening-fill';
export type MasonryGlassBlockNormalModelR103=AutomaticOwnerDefinition&Readonly<{
 card:typeof route.cards[number];profileKeys:readonly string[];sourceNeedParameterIds:readonly string[];
 nativeSourceRowIds:readonly string[];includedOperationRowIds:readonly string[];
 identityAdmitted:false;publicationAllowed:false;fullTechnicalAcceptance:false;
}>;
export const masonryGlassBlockNormalRouteR103=route;
export const masonryGlassBlockNormalSourceR103=source;
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function check(v:unknown,code:string):asserts v{if(!v)throw Error('MASONRY_GLASS_NORMAL_R103_'+code);}
function object(v:unknown):Json{check(record(v),'RECORD');return v;}
export function masonryGlassBlockCardR103(key:MasonryGlassBlockCardKeyR103){const card=route.cards.find(c=>c.key===key);check(card,'PHYSICAL_CARD');return card;}
export function masonryGlassBlockPhysicalInputR103(key:MasonryGlassBlockCardKeyR103,area:string,height:string){
 return{[masonryGlassBlockCardR103(key).primaryMeasureParameterId]:area,[source.heightId]:height};
}
function condition(p:typeof source.profiles[number]):AutomaticInclusionCondition{
 return{kind:'and',operands:[{kind:'greater_than',parameterId:p.primaryId,value:0},
  {kind:'greater_than',parameterId:source.heightId,value:0},p.storeyHeightBand==='LTE4'
   ?{kind:'less_than_or_equal',parameterId:source.heightId,value:4}:{kind:'greater_than',parameterId:source.heightId,value:4}]};
}
function emittedTruth(p:Parameter,sourceKey:string):Parameter{
 const truth=p.truth_metadata,guide=record(truth.guide)?truth.guide:{};
 return{...p,truth_metadata:{...truth,guide:{...guide,source_document:sourceKey},
  provenance:{...(record(truth.provenance)?truth.provenance:{}),componentSourceIdR97:source.sourceId,emittedSourceIdR103:sourceKey,
   originalNormRatesAndUnitsUnchanged:true}}};
}
/** Normal identity envelope around two exact whole source columns. No new
 * quantity engine or public ordinary normative/programme question is added. */
export function masonryGlassBlockNormalDefinitionR103(key:MasonryGlassBlockCardKeyR103):MasonryGlassBlockNormalModelR103{
 const card=masonryGlassBlockCardR103(key),profiles=source.profiles.filter(p=>p.physicalResult===key);check(profiles.length===2,'WHOLE_TWO_HEIGHT_COLUMNS');
 const models=profiles.map(p=>original(p.key)),first=models[0];check(first,'SOURCE_DEFINITION');
 const area=card.primaryMeasureParameterId,height=source.heightId;
 const parameters:Parameter[]=first.parameters.filter(p=>[area,height].includes(p.parameter_id)).map(p=>{
  const{max:_maximum,exclusiveMin:_exclusive,...constraints}=p.constraints_json??{};
  return emittedTruth({...p,constraints_json:p.parameter_id===height?constraints:p.constraints_json},card.sourceKey);
 });
 const formulas:AutomaticOwnerDefinition['formulas'][number][]=[],resources:Resource[]=[],needs:string[]=[],nativeRows:string[]=[],operationRows:string[]=[];
 for(let i=0;i<profiles.length;i++){
  const p=profiles[i]!,d=models[i]!;check(d.catalogId===null&&!d.identityAdmitted&&!d.publicationAllowed,'SOURCE_NOT_PROMOTED');
  check(p.primaryId===area,'OWN_RESULT_AREA_ID');
  parameters.push(...d.parameters.filter(p=>![area,height].includes(p.parameter_id)).map(p=>emittedTruth(p,card.sourceKey)));
  formulas.push(...d.formulas);needs.push(...d.sourceNeedParameterIds);
  for(const r of d.resources){
   if(p.rows.some(s=>r.row_id===p.prefix+':'+s.key))nativeRows.push(r.row_id);
   if(r.row_id.startsWith(p.prefix+':operation:'))operationRows.push(r.row_id);
   const{row_sha256:_old,...body}=r,metadata=r.source_metadata??{},trace=metadata.normativeTrace;check(Array.isArray(trace),'SOURCE_TRACE');
   const next={...body,ordinal:resources.length,inclusion_ast:condition(p),resource_graph:{...r.resource_graph,scopeContextParameterIds:[area,height]},
    source_metadata:{...metadata,componentNormativeTraceR97:trace,normativeTrace:trace.map((t:unknown)=>({...object(t),sourceId:card.sourceKey})),
     exact_column:p.normId,source_artifact_sha256:source.source.sha256,sourceNormIdUnchanged:p.normId,
     sourceDefinitionR97Unchanged:true,candidateIdentityOnly:true}};
   resources.push({...next,row_sha256:estimateDeterministicHash(next)});
  }
 }
 check(new Set(parameters.map(p=>p.parameter_id)).size===parameters.length,'UNIQUE_PARAMETER_IDS');
 check(new Set(resources.map(r=>r.row_id)).size===resources.length,'UNIQUE_ROW_IDS');
 check(parameters.every(p=>p.default_value===null),'NO_DEFAULTS');
 const consumers=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
 const finalParameters=parameters.map((p,ordinal)=>({...p,ordinal,truth_metadata:{...p.truth_metadata,
  formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}));
 return{parameters:finalParameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
  ordinaryParameterIds:[area,height],card,profileKeys:profiles.map(p=>p.key),sourceNeedParameterIds:needs,
  nativeSourceRowIds:nativeRows,includedOperationRowIds:operationRows,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false};
}
export function masonryGlassBlockNormalCompletenessMapR103(key:MasonryGlassBlockCardKeyR103){
 const card=masonryGlassBlockCardR103(key),map=independentMap.cards.find(c=>c.card===key);check(map,'INDEPENDENT_MAP');
 check(independentMap.immutableComponentPackSha256===route.immutableR97ComponentPack.sha256,'INDEPENDENT_COMPONENT_SHA');
 check(JSON.stringify(map.completenessMap.wholeSourceProfiles)===JSON.stringify(card.normIds),'WHOLE_COLUMN_SCOPE');return map.completenessMap;
}
