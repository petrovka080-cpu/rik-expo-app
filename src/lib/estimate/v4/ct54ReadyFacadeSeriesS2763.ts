import pack from '../../../../data/estimate-benchmarks/source-packs/ct54-ready-facade-six-s27-63.json';
import {ct54SimpleReadyFacadeDefinitionS2754,ct54SimpleReadyFacadePackS2754 as source,ct54SimpleReadyFacadePrefixS2754 as prefix} from './ct54SimpleReadyFacadeS2754';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec} from './automaticConstructionOwnerR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const ct54ReadyFacadePackS2763=pack,ct54ReadyFacadePrefixS2763=prefix;
export const ct54ReadyFacadeChoiceIdS2763='facade_technology_choice',ct54ReadyFacadeScopeIdS2763='ready_simple_facade_fact';
export const ct54ReadyFacadeExactS2763={kind:'equals' as const,parameterId:ct54ReadyFacadeChoiceIdS2763,value:pack.exactChoiceRu};
export const ct54ReadyFacadeLegacyS2763={kind:'equals' as const,parameterId:ct54ReadyFacadeChoiceIdS2763,value:pack.legacyChoiceRu};
const removedFacts=new Set(['cement_base_readiness','simple_ready_scaffold_facade','construction_conditions']);
const documents=new Set(['colour_batch_reference','weather_protection_reference','scaffold_access_reference','facade_measurement_reference']);
const id=(value:string)=>value==='paint_area_m2'?'q':removedFacts.has(value)?ct54ReadyFacadeScopeIdS2763:value;
/** Structural IDs only. Expressions are recompiled below, never string-edit ASTs. */
function mapped<T>(value:T):T {
 if(typeof value==='string')return id(value).replace(/\bpaint_area_m2\b/gu,'q') as T;
 if(Array.isArray(value))return value.map(mapped) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,mapped(v)])) as T;
 return value;
}
const physicalFacts=[ct54ReadyFacadeScopeIdS2763,'facade_conditions','light_colour_scope','application_tool'];
const config={contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
 sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
 applicabilityRu:pack.scopeRu,profile:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusionsRu} as const;

export function ct54ReadyFacadeDefinitionS2763():AutomaticOwnerDefinition {
 const shared:AutomaticOwnerDefinition=structuredClone(ct54SimpleReadyFacadeDefinitionS2754);
 const pendingSpecs:AutomaticParameterSpec[]=pack.inheritedNeeds.map(g=>({id:'ct54_inherited_open_'+g.suffix,title:g.titleRu,valueType:'decimal',unitId:g.unitId,kind:'conditional',min:0}));
 const extra=buildAutomaticConstructionOwnerR1({...config,ordinary:[],conditional:[
  {id:ct54ReadyFacadeChoiceIdS2763,title:'Способ окраски фасада',valueType:'enum',unitId:null,kind:'conditional',values:[pack.legacyChoiceRu,pack.exactChoiceRu]},
  {id:ct54ReadyFacadeScopeIdS2763,title:'Готовность участка и подтверждение обмера',valueType:'enum',unitId:null,kind:'conditional',values:[pack.readyScopeRu],requiredWhen:ct54ReadyFacadeExactS2763},...pendingSpecs],
  rows:pack.inheritedNeeds.map(g=>({rowId:prefix+':inherited-'+g.suffix,formulaId:prefix+':formula:inherited-'+g.suffix,title:g.titleRu+' — состав и количество требуют источника',section:'inherited-completion',category:g.suffix.split('_')[0],unitId:g.unitId,expression:'ct54_inherited_open_'+g.suffix,inputParameterIds:[ct54ReadyFacadeScopeIdS2763]}))});
 const parameters=[...shared.parameters.filter(p=>!removedFacts.has(p.parameter_id)).map(p=>{
  const next=mapped(p),advanced=documents.has(p.parameter_id)||p.parameter_id==='selected_paint_can_l'||p.parameter_id.includes('_stock_')||p.parameter_id.includes('_reserve_')||p.parameter_id.includes('_supplier_');
  const internal=next.truth_metadata.visibility_role==='INTERNAL_ONLY';
  const titles:Record<string,string>={q:'Площадь работ, м² (CT54 — за вычетом проёмов)',facade_norm_area_m2:'Площадь того же фасада вместе с проёмами, м²',facade_conditions:'Погода, выдержка слоёв и защита свежей краски',light_colour_scope:'Белая или светлая CT54 одной партии',application_tool:'Чем наносят краску',mechanism_fulfillment:'Чьи лебёдка и автомобиль',selected_paint_can_l:'Размер канистры CT54, л'};
  const document=documents.has(next.parameter_id),constraints={...next.constraints_json};
  if(document)delete constraints.requiredWhen;
  const truth={...next.truth_metadata,contract:pack.contract,source_confirmation_required:false,
   ...(internal?{}:{value_source_role:next.parameter_id==='q'?'USER_MEASURED':'PROJECT_SPECIFIC_INPUT',visible_when:next.parameter_id==='q'?{kind:'literal',value:true}:constraints.requiredWhen?{kind:'and',operands:[ct54ReadyFacadeExactS2763,constraints.requiredWhen]}:ct54ReadyFacadeExactS2763,
    provenance:{consumer_input_role_v1:advanced?'ADVANCED_OPTION':'OBJECT_FACT'}})};
  return {...next,title_ru:titles[next.parameter_id]??next.title_ru,ordinal:0,required:document?false:next.required,default_value:null,constraints_json:constraints,truth_metadata:truth};
 }),...extra.parameters.map(p=>({...p,truth_metadata:p.parameter_id.startsWith('ct54_inherited_open_')?unresolvedApplicationNormTruthR1(p.truth_metadata,pack.inheritedNeeds.find(g=>'ct54_inherited_open_'+g.suffix===p.parameter_id)!.reasonRu):{...p.truth_metadata,source_confirmation_required:false,value_source_role:'PROJECT_SPECIFIC_INPUT',visible_when:p.parameter_id===ct54ReadyFacadeChoiceIdS2763?{kind:'literal',value:true}:ct54ReadyFacadeExactS2763,provenance:{consumer_input_role_v1:'OBJECT_FACT'}}}))].map((p,ordinal)=>({...p,ordinal}));
 const formulas=[...shared.formulas.map(f=>{
  if(typeof f.expression_source!=='string')throw Error('CT54_REFERENCE_EXPRESSION_REQUIRED');
  const expression=f.expression_source.replace(/\bpaint_area_m2\b/gu,'q'),compiled=compileFormulaGraph(expression);
  return {...f,expression_source:expression,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:estimateDeterministicHash(compiled.ast)};
 }),...extra.formulas.map(f=>({...f,ast_sha256:estimateDeterministicHash(f.ast)}))];
 const resources=[...shared.resources.map(r=>{
  const next=mapped(r),inputs=[...new Set((next.resource_graph.inputParameterIds as string[]??[]).filter(p=>!documents.has(p)))];
  const {row_sha256:_sha,...body}=next;
  const content={...body,inclusion_ast:{kind:'and',operands:[ct54ReadyFacadeExactS2763,next.inclusion_ast]},resource_graph:{...next.resource_graph,inputParameterIds:inputs,scopeContextParameterIds:['q','facade_norm_area_m2',...documents],
   fullTechnicalAcceptance:false},source_metadata:{...next.source_metadata,cohortContract:pack.contract,predecessorReferenceCatalogId:pack.referenceCatalogId}};
  return {...content,row_sha256:estimateDeterministicHash(content)};
 }),...extra.resources.map(r=>{
  const gap=pack.inheritedNeeds.find(g=>r.row_id===prefix+':inherited-'+g.suffix)!;
  const {row_sha256:_sha,...body}=r,content={...body,inclusion_ast:ct54ReadyFacadeExactS2763,
   resource_graph:{...r.resource_graph,inputParameterIds:physicalFacts,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':inherited-completion',operationTitleRu:'Оставшиеся подготовительные, инструментальные и коммерческие потребности',processOrdinal:45,completionCriterionRu:'Подтверждены необходимость, состав и количество; шаблонная единица не считается нормой.'}},
   source_metadata:{...r.source_metadata,sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],sourceNormQuantityAccepted:false,full_technical_acceptance:false,inheritedNeedSuffix:gap.suffix,legacyExpressionNotTransferred:gap.legacyExpression,unresolvedReasonRu:gap.reasonRu}};
  return {...content,row_sha256:estimateDeterministicHash(content)};
 })].map((r,ordinal)=>({...r,ordinal}));
 return {parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']};
}
export function compileCt54ReadyFacadeS2763(submittedParameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.targets[0].catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'q',definition:ct54ReadyFacadeDefinitionS2763(),submittedParameters});}
export const ct54ReadyFacadeControlFactsS2763={facade_technology_choice:pack.exactChoiceRu,ready_simple_facade_fact:pack.readyScopeRu,q:'35.5',facade_norm_area_m2:'40',facade_conditions:source.conditionsValue,light_colour_scope:source.colourValue,application_tool:'Валик',mechanism_fulfillment:'Собственные машины исполнителя'};
