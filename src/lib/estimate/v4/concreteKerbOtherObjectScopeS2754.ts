import pack from '../../../../data/estimate-benchmarks/source-packs/concrete-kerb-other-object-scope-s27-54.json';
import {concreteKerbDefinitionS2754,concreteKerbCompletenessMapS2754,concreteKerbSourcePackS2754 as source} from './concreteKerbInstallationS2754';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const kerbOtherObjectScopePackS2754=pack;
export const kerbOtherObjectScopePrefixS2754='concrete-kerb:other-pavement';
const original=concreteKerbDefinitionS2754(pack.sourceIndex);
const parameters:AutomaticOwnerDefinition['parameters'][number][]=original.parameters.map(p=>({...p,
  ...(p.parameter_id==='mechanism_fulfillment'?{title_ru:pack.mechanismTitleRu}:{}),
  truth_metadata:{...p.truth_metadata,
    ...(pack.supplierFactIds.includes(p.parameter_id)?{value_source_role:'PROJECT_SPECIFIC_INPUT',provenance:{...p.truth_metadata.provenance as Record<string,unknown>,consumer_input_role_v1:'OBJECT_FACT'}}:{}),
    ...(p.parameter_id==='mechanism_fulfillment'?{provenance:{...p.truth_metadata.provenance as Record<string,unknown>,consumer_input_role_v1:'OBJECT_FACT'},guide:{...p.truth_metadata.guide as Record<string,unknown>,guide_short_ru:pack.mechanismGuideRu}}:{})}}));
const template=original.parameters.find(p=>p.parameter_id==='prepared_installation_line')!;
parameters.push({...template,parameter_id:pack.scopeParameterId,ordinal:parameters.length,title_ru:pack.scopeTitleRu,required:true,default_value:null,
  constraints_json:{values:[pack.scopeValue]},truth_metadata:{...template.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',
    semantic_parameter_key:kerbOtherObjectScopePrefixS2754+':'+pack.scopeParameterId,source_confirmation_required:false,
    provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...template.truth_metadata.guide as Record<string,unknown>,
      guide_short_ru:pack.scopeRu+' '+pack.trafficRule.restrictionRu,source_document:'КРЕР: общие указания и техническая часть КРЕР27',
      source_locator:pack.guidance.locatorRu+'; '+pack.trafficRule.locatorRu,source_snapshot_hash:pack.guidance.sha256}}});

export const kerbOtherObjectScopeDefinitionS2754:AutomaticOwnerDefinition={...original,parameters,
  resources:original.resources.map(r=>{const {row_sha256:_hash,...body}=r;
    const updated={...body,resource_graph:{...r.resource_graph,inputParameterIds:[...new Set([...(r.resource_graph.inputParameterIds as string[]),pack.scopeParameterId])]},
      source_metadata:{...r.source_metadata,constructionScope:pack.scopeValue,scopeEvidence:{kerbPdfSha256:source.source.sha256,guidancePdfSha256:pack.guidance.sha256,locatorRu:pack.trafficRule.locatorRu},full_technical_acceptance:false}};
    return {...updated,row_sha256:estimateDeterministicHash(updated)};})};

export function kerbOtherObjectScopeCompletenessMapS2754(){
  const old=concreteKerbCompletenessMapS2754(pack.sourceIndex);
  return {...old,evidenceReferences:[...old.evidenceReferences,pack.guidance.officialUrl,pack.guidance.locatorRu,pack.trafficRule.locatorRu],
    entries:old.entries.map(e=>({...e,condition:e.condition+'; '+pack.scopeValue}))};
}
export function compileKerbOtherObjectScopeS2754(input:Record<string,unknown>){
  return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'kerb_length_m',definition:kerbOtherObjectScopeDefinitionS2754,submittedParameters:input});
}
