import binding from '../../../../data/estimate-benchmarks/source-packs/cn69-four-subfloor-bindings-s27-69.json';
import {cn69DryFloorDefinitionS2754,cn69DryFloorPackS2754 as source,cn69DryFloorPrefixS2754 as prefix} from './cn69DryFloorS2754';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

export const cn69SubfloorBindingS2769=binding,cn69SubfloorPrefixS2769=prefix;
export const cn69SubfloorChoiceIdS2769='subfloor_technology_choice';
export const cn69SubfloorExactS2769={kind:'equals' as const,parameterId:cn69SubfloorChoiceIdS2769,value:binding.exactChoiceRu};
export const cn69SubfloorLegacyS2769={kind:'equals' as const,parameterId:cn69SubfloorChoiceIdS2769,value:binding.legacyChoiceRu};
const exact=cn69SubfloorExactS2769;
function mapped<T>(value:T):T {
 if(typeof value==='string')return value.replace(/\bfloor_area_m2\b/gu,'q') as T;
 if(Array.isArray(value))return value.map(mapped) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,mapped(v)])) as T;
 return value;
}
/** Rebind the admitted owner; consumption, rounding and price ownership stay in
 * cn69DryFloorS2754/effectivePurchaseBalanceR1. No series-specific arithmetic. */
export function cn69SubfloorDefinitionS2769():AutomaticOwnerDefinition {
 const shared=mapped(structuredClone(cn69DryFloorDefinitionS2754));
 const extra=buildAutomaticConstructionOwnerR1({contract:binding.contract,semanticOwner:prefix,sourceId:source.sourceId,normId:source.normId,
  sourceMetadata:{source_title:source.titleRu,source_document_version:source.sources.cn69.edition,definition_hash:source.sources.cn69.sha256,artifact_sha256:source.sources.cn69.sha256,exact_locator:source.sources.cn69.locatorRu},
  applicabilityRu:source.scopeRu,ordinary:[],profile:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:source.excludedRu,
  conditional:[{id:cn69SubfloorChoiceIdS2769,title:'Способ устройства основания под покрытие',valueType:'enum',unitId:null,kind:'conditional',values:[binding.legacyChoiceRu,binding.exactChoiceRu]},
   ...binding.inheritedNeeds.map(g=>({id:'cn69_inherited_open_'+g.suffix,title:g.titleRu,valueType:'decimal' as const,unitId:g.unitId,kind:'conditional' as const,min:0}))],
  rows:binding.inheritedNeeds.map(g=>({rowId:prefix+':inherited-'+g.suffix,formulaId:prefix+':formula:inherited-'+g.suffix,title:g.titleRu+' — состав и количество требуют источника',section:'inherited-completion',category:g.category,unitId:g.unitId,expression:'cn69_inherited_open_'+g.suffix}))});
 const parameters=[...shared.parameters.map(p=>{
  const internal=p.truth_metadata.visibility_role==='INTERNAL_ONLY',advanced=p.parameter_id.includes('_stock')||p.parameter_id.includes('_reserve')||p.parameter_id.includes('_supplier')||p.parameter_id==='water_quantum_l'||p.parameter_id==='ct17_container';
  const constraints={...p.constraints_json};
  if(p.parameter_id!=='q'&&!internal&&p.required)constraints.requiredWhen=exact;
  else if(constraints.requiredWhen)constraints.requiredWhen={kind:'and',operands:[exact,constraints.requiredWhen]};
  return {...p,required:p.parameter_id==='q',default_value:null,constraints_json:constraints,
   title_ru:p.parameter_id==='q'?'Площадь устройства основания под покрытие, м²':p.title_ru,
   truth_metadata:{...p.truth_metadata,contract:binding.contract,source_confirmation_required:false,
    ...(internal?{}:{value_source_role:p.parameter_id==='q'?'USER_MEASURED':'PROJECT_SPECIFIC_INPUT',visible_when:p.parameter_id==='q'?{kind:'literal',value:true}:exact,
     provenance:{consumer_input_role_v1:advanced?'ADVANCED_OPTION':'OBJECT_FACT'}})}};
 }),...extra.parameters.map(p=>({...p,truth_metadata:p.parameter_id.startsWith('cn69_inherited_open_')?unresolvedApplicationNormTruthR1(p.truth_metadata,binding.inheritedNeeds.find(g=>'cn69_inherited_open_'+g.suffix===p.parameter_id)!.reasonRu):
  {...p.truth_metadata,source_confirmation_required:false,value_source_role:'PROJECT_SPECIFIC_INPUT',visible_when:{kind:'literal',value:true},provenance:{consumer_input_role_v1:'OBJECT_FACT'}}}))].map((p,ordinal)=>({...p,ordinal}));
 const formulas=[...shared.formulas.map(f=>{if(typeof f.expression_source!=='string')throw Error('CN69_REFERENCE_EXPRESSION_REQUIRED');const g=compileFormulaGraph(f.expression_source);return{...f,ast:g.ast,input_parameter_ids:g.inputParameterIds,ast_sha256:hash(g.ast)};}),...extra.formulas.map(f=>({...f,ast_sha256:hash(f.ast)}))];
 const resources=[...shared.resources.map(r=>{const{row_sha256:_sha,...body}=r,content={...body,inclusion_ast:{kind:'and',operands:[exact,r.inclusion_ast]},
  source_metadata:{...r.source_metadata,cohortContract:binding.contract,predecessorReferenceCatalogId:source.catalogId,sourceNormQuantityAccepted:!source.sourceNeeds.some(g=>r.row_id===prefix+':'+g.id)},
  resource_graph:{...r.resource_graph,fullTechnicalAcceptance:false}};return{...content,row_sha256:hash(content)};}),
 ...extra.resources.map(r=>{const gap=binding.inheritedNeeds.find(g=>r.row_id===prefix+':inherited-'+g.suffix)!,{row_sha256:_sha,...body}=r;
  const content={...body,inclusion_ast:exact,resource_graph:{...r.resource_graph,inputParameterIds:['base_confirmed','moisture_ingress_prevented','conditions_confirmed','product_variant_confirmed'],
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:source.titleRu,operationId:prefix+':inherited-completion',operationTitleRu:'Оставшиеся подготовительные, инструментальные и коммерческие потребности',processOrdinal:45,completionCriterionRu:'Подтверждены необходимость, состав и количество; шаблонная единица не считается нормой.'}},
   source_metadata:{...r.source_metadata,sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],sourceNormQuantityAccepted:false,full_technical_acceptance:false,inheritedNeedSuffix:gap.suffix,unresolvedReasonRu:gap.reasonRu}};
  return{...content,row_sha256:hash(content)};})].map((r,ordinal)=>({...r,ordinal}));
 return{parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']};
}
export function compileCn69SubfloorS2769(submittedParameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:binding.targets[0].catalogId,compilerVersion:binding.contract,primaryMeasureParameterId:'q',definition:cn69SubfloorDefinitionS2769(),submittedParameters});}
