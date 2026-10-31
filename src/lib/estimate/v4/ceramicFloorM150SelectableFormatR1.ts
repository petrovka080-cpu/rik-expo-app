import pack from '../../../../data/estimate-benchmarks/source-packs/ceramic-floor-m150-selectable-format-r1.json';
import {ceramicFloorM150WholeProvisionDefinitionR4,ceramicFloorM150WholeProvisionCompletenessR4} from './ceramicFloorCementMortarWholeProvisionR4';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
export const ceramicFloorM150SelectableFormatPackR1=pack;
type Json=Record<string,unknown>;
/** Keep every historical combined-profile branch active for either exact
 * supported tile format. No rate, crew, operation or quantity is changed. */
function equivalentFormatCondition(value:unknown):unknown{
 if(Array.isArray(value))return value.map(equivalentFormatCondition);
 if(!value||typeof value!=='object')return value;
 const v=value as Json;
 if(v.kind==='equals'&&v.parameterId===pack.selectorId&&v.value===pack.legacyCombinedValue)return{kind:'or',operands:pack.choices.map(c=>({kind:'equals',parameterId:pack.selectorId,value:c.value}))};
 return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,equivalentFormatCondition(x)]));
}
/** Ordinary same-catalog parameter/schema consumer for the two previously
 * source-only format helpers. The combined legacy default remains accepted. */
export function ceramicFloorM150SelectableFormatDefinitionR1():AutomaticOwnerDefinition{
 const base=ceramicFloorM150WholeProvisionDefinitionR4(),selector=base.parameters.find(p=>p.parameter_id===pack.selectorId);
 if(!selector||base.runtimeInput[pack.selectorId]!==pack.legacyCombinedValue||base.resources.length!==86)throw Error('M150_FORMAT_CHOICE_EXACT_R4_PREIMAGE_REQUIRED');
 const parameters=[...base.parameters.map(p=>{
  if(p.parameter_id!==pack.selectorId)return{...p,constraints_json:equivalentFormatCondition(p.constraints_json) as Json};
  const {runtime_profile_value:_runtime,runtime_profile_classification:_classification,...truth}=p.truth_metadata;
  return{...p,title_ru:'Формат керамической плитки пола',required:false,constraints_json:{...p.constraints_json,values:pack.choices.map(c=>c.value)},truth_metadata:{...truth,visibility_role:'USER_INPUT',value_source_role:'USER_INPUT',input_origin_class:'KNOWN_PRIMARY_WORK_SCOPE',source_confirmation_required:false,preliminary_compilation_allowed:true,
   provenance:{...(truth.provenance as Json??{}),consumer_input_role_v1:'OBJECT_FACT'},guide:{...(truth.guide as Json),guide_kind:'MEASUREMENT_RULE',guide_short_ru:'Выберите размер используемой плитки100×100или150×150мм. Прежний совмещённый профиль сохраняет исходную область100/150мм; нормы и бригада не меняются.',source_role:'USER_SUPPLIED_PRIMARY_FACT',source_document:pack.publicationSourceId,source_locator:pack.source.locatorRu,source_snapshot_hash:pack.source.sha256,guide_validation_policy:'MANDATORY_BLOCK'}}};
 }),{parameter_id:pack.specificationParameterId,ordinal:base.parameters.length,value_type:'enum',unit_id:null,title_ru:'Размер плитки по выбранному формату',required:false,default_value:null,constraints_json:{values:pack.choices.map(c=>c.specificationRu)},truth_metadata:{contract:pack.contract,semantic_parameter_key:pack.namespace+':format-specification',visibility_role:'USER_DERIVED_READONLY',value_source_role:'BACKEND_DERIVED',source_confirmation_required:false,catalogue_owned_lookup_v1:true,
  derived_exact_lookup_v1:{version:'canonical-derived-exact-lookup:v1',inputParameterIds:[pack.selectorId],rows:pack.choices.map(c=>({inputValues:[c.value],outputValue:c.specificationRu})),interpolation:'FORBIDDEN'},guide:{...(selector.truth_metadata.guide as Json),guide_version:pack.contract,guide_kind:'DERIVED_VALUE_RULE',guide_short_ru:'Размер подставляет приложение из выбранного подтверждённого формата.',source_role:'BACKEND_DERIVED',source_document:pack.publicationSourceId,source_locator:pack.source.locatorRu,source_snapshot_hash:pack.source.sha256,guide_validation_policy:'MANDATORY_BLOCK'}}}].map((p,ordinal)=>({...p,ordinal,truth_metadata:{...p.truth_metadata,...(Object.hasOwn(base.runtimeInput,p.parameter_id)?{compositeSourceAttributionFormatR1:{sourceId:pack.publicationSourceId,parentSourceIds:base.runtimeSourceIds[p.parameter_id]??[],parentFactory:pack.parentFactory,originalNormativeTraceRetained:true}}:{})}}));
 const resources=base.resources.map(row=>{const{row_sha256:_old,...body}=row,tile=pack.tileSpecificationRowIds.includes(row.row_id),graph={...row.resource_graph,...(tile?{titleSpecificationParameterIds:[pack.specificationParameterId],titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — ',inputParameterIds:[...new Set([...(Array.isArray(row.resource_graph.inputParameterIds)?row.resource_graph.inputParameterIds:[]),pack.specificationParameterId])]}:{})};
  const content={...body,inclusion_ast:equivalentFormatCondition(row.inclusion_ast) as Json,resource_graph:graph,source_metadata:{...row.source_metadata,formatChoiceBindingR1:{contract:pack.contract,selectorId:pack.selectorId,sameCatalogIdentity:true,numericalNormAndOwnerUnchanged:true},full_technical_acceptance:false}};
  return{...content,row_sha256:hash(content)};
 });
 return{...base,parameters,resources,runtimeSourceIds:Object.fromEntries(Object.keys(base.runtimeInput).map(id=>[id,[pack.publicationSourceId]]))};
}
export function ceramicFloorM150SelectableFormatCompletenessR1(){return{...ceramicFloorM150WholeProvisionCompletenessR4(),formatChoiceConsumerBinding:{selectorId:pack.selectorId,sameCatalogId:pack.catalogId,sourceBoundChoices:pack.choices,legacyDefaultPreserved:true},fullTechnicalAcceptance:false};}
export function compileCeramicFloorM150SelectableFormatR1(submittedParameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:pack.primaryParameterId,definition:ceramicFloorM150SelectableFormatDefinitionR1(),submittedParameters});}
