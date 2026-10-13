import binding from '../../../../data/estimate-benchmarks/source-packs/cn87-four-subfloor-bindings-s27-69.json';
import {cn87SeparationDefinitionS2754,cn87SeparationSourcePackS2754 as source,cn87SeparationPrefixS2754 as prefix} from './cn87SeparationScreedS2754';
import {cn69SubfloorBindingS2769 as inherited,cn69SubfloorPrefixS2769 as oldPrefix} from './cn69SubfloorSeriesS2769';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash,stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';

export const cn87SubfloorBindingS2769=binding;
export const cn87SubfloorChoiceIdS2769='subfloor_technology_choice';
export const cn87SubfloorExactS2769={kind:'equals' as const,parameterId:cn87SubfloorChoiceIdS2769,value:binding.exactChoiceRu};
const exact=cn87SubfloorExactS2769;
const replacements=Object.fromEntries(cn87SeparationDefinitionS2754.parameters.map(p=>[p.parameter_id,p.parameter_id==='screed_area_m2'?'q':'cn87_subfloor_'+p.parameter_id]));
const tokenPattern=new RegExp('\\b('+Object.keys(replacements).sort((a,b)=>b.length-a.length).join('|')+')\\b','gu');
function mapped<T>(value:T):T {
 if(typeof value==='string')return value.replace(tokenPattern,id=>replacements[id]!) as T;
 if(Array.isArray(value))return value.map(mapped) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,mapped(v)])) as T;
 return value;
}
/** Reuse the admitted 50 mm owner with namespaced inputs. The historical rows,
 * old branches, price owners and old formula graphs are not replaced. */
export function buildCn87SubfloorSuccessorS2769(parent:PurchaseGroupRepresentative):PurchaseGroupRepresentative {
 const target=binding.targets.find(t=>t.catalogId===parent.definition.catalog_id);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_sha256!==target.parentSha256
   ||parent.definition.definition_version!==4||parent.resources.length!==97)throw Error('CN87_EXACT_FOUR_V4_PARENTS_REQUIRED');
 const result=structuredClone(parent),shared=mapped(structuredClone(cn87SeparationDefinitionS2754));
 const choice=result.parameters.find(p=>p.parameter_id===cn87SubfloorChoiceIdS2769)!;
 if(!choice||!Array.isArray(choice.constraints_json.values)||choice.constraints_json.values.includes(binding.exactChoiceRu))throw Error('CN87_SOURCE_CHOICE_DRIFT');
 choice.constraints_json={...choice.constraints_json,values:[...choice.constraints_json.values,binding.exactChoiceRu]};
 const extraParameters=shared.parameters.filter(p=>p.parameter_id!=='q').map(p=>{
  const internal=p.truth_metadata.visibility_role==='INTERNAL_ONLY',advanced=/_(stock|reserve)_|_supplier_|_quantum_/u.test(p.parameter_id);
  const constraints={...p.constraints_json};if(p.required&&!internal&&!advanced)constraints.requiredWhen=exact;
  else if(constraints.requiredWhen)constraints.requiredWhen={kind:'and',operands:[exact,constraints.requiredWhen]};
  return{...p,required:false,constraints_json:constraints,default_value:null,truth_metadata:{...p.truth_metadata,contract:binding.contract,
    source_confirmation_required:false,...(internal?{}:{visible_when:exact,provenance:{consumer_input_role_v1:advanced?'ADVANCED_OPTION':'OBJECT_FACT'}})}};
 });
 result.parameters.push(...extraParameters);
 const newFormulas=shared.formulas.map(f=>{
  if(typeof f.expression_source!=='string')throw Error('CN87_ADMITTED_EXPRESSION_REQUIRED');
  const graph=compileFormulaGraph(f.expression_source);return{...f,ast:graph.ast,input_parameter_ids:graph.inputParameterIds,ast_sha256:hash(graph.ast)};
 });
 const additions:PurchaseGroupRepresentative['resources']=shared.resources.map(r=>{const{row_sha256:_sha,...body}=r,content={...body,row_type:r.category,inclusion_ast:{kind:'and',operands:[exact,r.inclusion_ast]},
   source_metadata:{...r.source_metadata,cohortContract:binding.contract,predecessorReferenceCatalogId:source.catalogId,full_technical_acceptance:false},
   resource_graph:{...r.resource_graph,fullTechnicalAcceptance:false}};return{...content,row_sha256:hash(content)};});
 for(const need of inherited.inheritedNeeds){
  const oldId=oldPrefix+':inherited-'+need.suffix,old=parent.resources.find(r=>r.row_id===oldId),oldFormula=parent.formulas.find(f=>f.formula_id===old?.formula_id),oldParameter=parent.parameters.find(p=>p.parameter_id==='cn69_inherited_open_'+need.suffix);
  if(!old||!oldFormula||!oldParameter)throw Error('CN87_INHERITED_OBLIGATION_REQUIRED:'+need.suffix);
  const id='cn87_subfloor_inherited_open_'+need.suffix,rowId=prefix+':inherited-'+need.suffix,formulaId=prefix+':formula:inherited-'+need.suffix;
  const title=need.titleRu.replaceAll('CN69','CN87').replaceAll('выравнивающего слоя','стяжки CN87');
  const parameter={...structuredClone(oldParameter),parameter_id:id,title_ru:title,truth_metadata:{...oldParameter.truth_metadata,contract:binding.contract,
    guide:{...(oldParameter.truth_metadata.guide??{}),applicability:source.scopeRu,source_document:source.sourceId,source_locator:source.source.locatorRu,source_snapshot_hash:source.source.sha256},
    unresolved_norm_reason:'Сохранённое обязательство приложения: применимость, состав, количество и оплата не установлены паспортом CN87.'}};
  result.parameters.push(parameter);
  const graph=compileFormulaGraph(id);newFormulas.push({...structuredClone(oldFormula),formula_id:formulaId,expression_source:id,ast:graph.ast,input_parameter_ids:graph.inputParameterIds,ast_sha256:hash(graph.ast)});
  const{row_sha256:_sha,...body}=structuredClone(old),content={...body,row_id:rowId,formula_id:formulaId,title_ru:title,inclusion_ast:exact,cost_owner_id:rowId,
    semantic_owner:parent.definition.catalog_id+':'+rowId,resource_graph:{...old.resource_graph,inputParameterIds:shared.resources[0]!.resource_graph.inputParameterIds,
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:source.titleRu,operationId:prefix+':inherited-completion',operationTitleRu:'Оставшиеся потребности подготовки и завершения стяжки',processOrdinal:45},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:title,sourceTitleRu:title,detailsRu:['Обязательство прежней серии сохранено. Паспорт CN87 не устанавливает его количество или границу оплаты.']}},
    source_metadata:{...old.source_metadata,cohortContract:binding.contract,sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],full_technical_acceptance:false,
      official_url:source.source.officialUrl,artifact_sha256:source.source.sha256,excludedUnownedAssumptions:source.excludedRu,
      unresolvedReasonRu:'Сохранённое обязательство приложения: паспорт CN87 не устанавливает его количество и границу оплаты.'}};
  additions.push({...content,row_sha256:hash(content)});
 }
 if(additions.length!==29||new Set(additions.map(r=>r.row_id)).size!==29||additions.some(r=>parent.resources.some(p=>p.row_id===r.row_id)))throw Error('CN87_OWNER_ADDITION_DRIFT');
 result.formulas.push(...newFormulas);let ordinal=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
 result.resources.push(...additions.map(r=>({...r,ordinal:ordinal++,semantic_owner:String(parent.definition.catalog_id)+':'+r.row_id})));
 result.parameters=result.parameters.map((p,ordinal)=>({...p,ordinal}));
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:binding.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+id,
   formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
   result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
   result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.normative_source_ids[id]??=[];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
 }
 result.baseline.parameter_schema_sha256=canonicalEstimateSha256HexText(stringifyCanonicalEstimateJson(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata}))));
 result.passport.decision={...result.passport.decision,cn87SeriesContract:binding.contract,completeTechnicalEstimateAccepted:false,wholeFloorGroupComplete:false,
  additionalCn87PhysicalNormClosures:2,cn87OpenSourceNeeds:8,cn87InheritedNeeds:13};
 return result;
}
export function compileCn87SubfloorS2769(parent:PurchaseGroupRepresentative,submittedParameters:Record<string,unknown>){
 const definition=buildCn87SubfloorSuccessorS2769(parent);
 return compileAutomaticConstructionOwnerR1({catalogId:String(parent.definition.catalog_id),compilerVersion:binding.contract,primaryMeasureParameterId:'q',
   definition:{parameters:definition.parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:definition.formulas as unknown as AutomaticOwnerDefinition['formulas'],resources:definition.resources as unknown as AutomaticOwnerDefinition['resources'],
     runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']},submittedParameters});
}
