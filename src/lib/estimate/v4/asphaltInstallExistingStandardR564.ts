import pack from '../../../../data/estimate-benchmarks/source-packs/asphalt-install-existing-standard-r564.json';
import originalPack from '../../../../data/estimate-benchmarks/source-packs/asphalt-install-large-area-krer27-profile-r1.json';
import {namespaceAutomaticOwnerDefinitionR1} from './optionalAutomaticOwnerCompositionR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

import type {CanonicalEstimateParameterDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
type Json=Record<string,any>;
type AuthoringParameter = CanonicalEstimateParameterDefinition & Json & {ordinal:number;title_ru:string;constraints_json:Json;truth_metadata:Json};
export type AsphaltInstallCaptureR564=Readonly<{definition:Json;baseline:Json;parameters:readonly Json[];formulas:readonly Json[];
 resources:readonly Json[];bindings:readonly Json[];normativeSources:readonly Json[];normativeLocators:readonly Json[]}>;
export const asphaltInstallExistingStandardPackR564=pack;
export const asphaltInstallParameterIdR564=(id:string)=>pack.prefix+id;
export const asphaltInstallRowIdR564=(id:string)=>pack.prefix+id;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const equal=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
export function asphaltInstallCaptureSha256R564(c:AsphaltInstallCaptureR564):string{
 // Match the existing retained-parent identity ordering (UTF-16 lexical comparison).
 const ordered=(rows:readonly Json[])=>rows.map(clone).sort((a,b)=>{const x=JSON.stringify(stable(a)),y=JSON.stringify(stable(b));return x<y?-1:x>y?1:0;});
 return canonicalEstimateSha256HexText(JSON.stringify(stable({definition:c.definition,baseline:c.baseline,parameters:ordered(c.parameters),formulas:ordered(c.formulas),
  resources:ordered(c.resources),bindings:ordered(c.bindings),normativeSources:ordered(c.normativeSources),normativeLocators:ordered(c.normativeLocators)})));
}
const operationSpecs=[
 ['base','Подготовка принятого основания'],['stops','Установка боковых упоров'],['bitumen','Нанесение дорожного битума'],
 ['feed','Доставка и подача горячей смеси'],['paving','Механизированная укладка покрытия'],['rolling','Уплотнение покрытия'],
 ['finishing','Отделка кромок и сопряжений'],['cleanup','Очистка и передача покрытия'],['organization','Обеспечение механизированных работ'],['quality','Контроль качества'],
] as const;
function operationKey(row:string):typeof operationSpecs[number][0]{
 if(/quality:|document:/.test(row))return'quality';if(/mobilization:|organization:/.test(row))return'organization';
 if(/base-acceptance|watering|tractor-brush/.test(row))return'base';if(/side-stop|hardwood/.test(row))return'stops';
 if(/bitumen|tar-sprayer/.test(row))return'bitumen';if(/edge-joint/.test(row))return'finishing';if(/final-clean/.test(row))return'cleanup';
 if(/roller|rolling/.test(row))return'rolling';if(/receiving|delivery:|onboard|crane/.test(row))return'feed';return'paving';
}
/** Pure data adaptation of a byte-pinned, already persisted recipe. All numerical
 * expressions still enter the same FormulaGraph and canonical compiler. */
export function appendAsphaltInstallExistingStandardR564(input:Readonly<{capturedParent:AsphaltInstallCaptureR564;recipeParent:AsphaltInstallCaptureR564}>){
 const parent=clone(input.capturedParent),recipe=clone(input.recipeParent);
 if(asphaltInstallCaptureSha256R564(parent)!==pack.parent.sha256||asphaltInstallCaptureSha256R564(recipe)!==pack.historicalRecipe.sha256
  ||parent.definition.catalog_id!==pack.catalogId||parent.definition.id!==pack.parent.definitionId
  ||recipe.definition.id!==pack.historicalRecipe.definitionId)throw Error('R564_EXACT_CURRENT_PARENT_AND_PINNED_RECIPE_REQUIRED');
 if(!equal([parent.parameters.length,parent.formulas.length,parent.resources.length],pack.parent.shape)
  ||!equal([recipe.parameters.length,recipe.formulas.length,recipe.resources.length],pack.historicalRecipe.shape))throw Error('R564_CAPTURE_SHAPE');
 const ordinary=[pack.areaId,pack.siteId,pack.haulId];
 const selected={kind:'equals',parameterId:pack.selectorId,value:pack.selectedValueRu};
 const legacy={kind:'equals',parameterId:pack.selectorId,value:pack.legacyValueRu};
 const active={kind:'and',operands:[selected,{kind:'greater_than',parameterId:pack.areaId,value:0}]};
 const measuredPositive={kind:'greater_than',parameterId:pack.areaId,value:0};
 const owner={parameters:recipe.parameters,formulas:recipe.formulas,resources:recipe.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['area_m2']} as unknown as AutomaticOwnerDefinition;
 const namespaced=namespaceAutomaticOwnerDefinitionR1({definition:owner,prefix:pack.prefix,titlePrefixRu:''});
 const parametersByOriginal=new Map(recipe.parameters.map(p=>[p.parameter_id,p]));
 const parameterIds=new Map(recipe.parameters.map(p=>[p.parameter_id,asphaltInstallParameterIdR564(p.parameter_id)]));
 const rowIds=new Map(recipe.resources.map(r=>[r.row_id,asphaltInstallRowIdR564(r.row_id)]));
 const formulaIds=new Map(recipe.formulas.map(f=>[f.formula_id,pack.prefix+f.formula_id]));
 const rowLists=new Set(['resource_branch_consumers','coveringRowIds','originalRowIds','includedContractorResourceRowIds','coveredRowIds']);
 const parameterLists=new Set(['parameterIds','scopeContextParameterIds','inputParameterIds','input_parameter_ids']);
 const rowReferences=new Set(['parentCostOwnerId','includedInResourceOwnerRowId','purchaseBalanceOwnerRowId','sourceRowId','ownerRowId','rowId','row_id','effectiveQuantitySourceRowId']);
 const parameterReferences=new Set(['primaryMeasureParameterId','objectFactParameterId','quantityParameterId','parameterId','parameter_id']);
 const bind=(value:unknown,key=''):any=>{
  if(typeof value==='string'){
   if(rowLists.has(key)||rowReferences.has(key))return rowIds.get(value)??value;
   if(parameterLists.has(key)||parameterReferences.has(key))return parameterIds.get(value)??value;
   if(key==='formula_consumers'||key==='formulaId'||key==='formula_id')return formulaIds.get(value)??value;
   if(key==='catalogId'&&value===recipe.definition.catalog_id)return pack.catalogId;
   return value;
  }
  if(Array.isArray(value))return value.map(item=>bind(item,key));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,bind(v,k)]));return value;
 };
 const sourceGuide={...clone(recipe.parameters[0]!.truth_metadata.guide),source_document:pack.source.key,source_snapshot_hash:pack.source.sha256,source_locator:pack.source.locatorRu,
  guide_version:pack.contract,guide_short_ru:pack.profile.detailsRu};
 const sourceFor=(id:string)=>recipe.baseline.input_classification[id]==='NORMATIVE'?'NORMATIVE':'ASSUMPTION';
 const constants=pack.profile.values as Record<string,{value:unknown;classification:string;sourceId:string}>;
 const recipeParameters=namespaced.parameters.map(raw=>{
  const p=bind(raw),original=p.truth_metadata.originalComponentParameterId as string,old=parametersByOriginal.get(original)!;
  const {definition_version_id:_definition,approved_template_baseline_id:_baseline,...body}=p;
  const isFact=original==='area_m2'||original==='haul_distance_km',constant=constants[original];
  const effective=old.truth_metadata?.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY';
  const truth={...p.truth_metadata,semantic_parameter_key:pack.contract+':'+p.parameter_id,source_confirmation_required:false,
   sourceRecipeParameterId:original,sourceRecipeCaptureSha256:pack.historicalRecipe.sha256,sourceProfileVersion:pack.profile.version,
   hidden_default_forbidden:true,runtime_profile_value:false,formula_consumers:(old.truth_metadata?.formula_consumers??[]).map((id:string)=>formulaIds.get(id)??id),
   resource_branch_consumers:(old.truth_metadata?.resource_branch_consumers??[]).map((id:string)=>rowIds.get(id)??id)};
  if(effective)return {...body,required:false,default_value:null,truth_metadata:truth};
  if(isFact)return {...body,required:false,default_value:null,
   constraints_json:{...p.constraints_json,...(original==='area_m2'?{min:0}:{}),requiredWhen:original==='area_m2'?selected:active},
   truth_metadata:{...truth,visible_when:original==='area_m2'?{kind:'literal',value:true}:measuredPositive,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',provenance:{consumer_input_role_v1:'OBJECT_FACT'},
    preliminary_compilation_allowed:original!=='area_m2',guide:{...sourceGuide,guide_kind:'MEASUREMENT_RULE',guide_validation_policy:'MANDATORY_BLOCK',source_role:'USER_SUPPLIED_OBJECT_FACT',
     guide_short_ru:original==='area_m2'?'Укажите измеренную площадь покрытия, м².':'Укажите дальность доставки от выбранного завода, км.'}}};
  if(!constant)throw Error('R564_UNCLASSIFIED_RECIPE_PARAMETER:'+original);
  const classification=sourceFor(original);
  return {...body,required:false,default_value:null,constraints_json:{...p.constraints_json,requiredWhen:active},
   truth_metadata:{...truth,visibility_role:'USER_DERIVED_READONLY',value_source_role:classification==='NORMATIVE'?'MANDATORY_NORM_VALUE':'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',
    provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',profileClassification:classification,profileId:pack.profile.id,
     profileVersion:pack.profile.version,profileValue:constant.value,sourcePurpose:classification==='NORMATIVE'?'OFFICIAL_KRER_RATE':'DECLARED_SELECTED_PRELIMINARY_PROFILE_NOT_PROJECT_FACT'},
    preliminary_compilation_allowed:true,runtime_profile_classification:classification,catalogue_owned_lookup_v1:true,
    derived_exact_lookup_v1:{version:'canonical-derived-exact-lookup:v1',inputParameterIds:[pack.selectorId],rows:[{inputValues:[pack.selectedValueRu],outputValue:constant.value}],interpolation:'FORBIDDEN'},
    guide:{...sourceGuide,guide_kind:classification==='NORMATIVE'?'MANDATORY_NORM_VALUE':'PRACTICE_REFERENCE',source_role:classification,
     guide_short_ru:classification==='NORMATIVE'?pack.source.locatorRu:pack.profile.detailsRu}}};
 });
 const baseFact=(id:string,title:string,values:string[],condition:Json)=>({parameter_id:id,ordinal:0,value_type:'enum',unit_id:null,title_ru:title,required:false,default_value:null,
  constraints_json:{values,requiredWhen:condition},truth_metadata:{contract:pack.contract,semantic_parameter_key:pack.contract+':'+id,visibility_role:'USER_INPUT',
   value_source_role:'PROJECT_SPECIFIC_INPUT',provenance:{consumer_input_role_v1:'OBJECT_FACT'},preliminary_compilation_allowed:true,
   source_confirmation_required:false,hidden_default_forbidden:true,guide:{...sourceGuide,guide_kind:'MEASUREMENT_RULE',guide_validation_policy:'MANDATORY_BLOCK',source_role:'USER_SUPPLIED_OBJECT_FACT'}}});
 const selector={...baseFact(pack.selectorId,'Выбранный состав покрытия',[pack.legacyValueRu,pack.selectedValueRu],{kind:'literal',value:false}),
  truth_metadata:{contract:pack.contract,semantic_parameter_key:pack.contract+':'+pack.selectorId,visibility_role:'INTERNAL_ONLY',value_source_role:'BACKEND_DERIVED',
   runtime_profile_classification:'RUNTIME_STRUCTURAL_DEFAULT',runtime_profile_value:true,source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',publicSelectedWorkTitleRu:pack.titleRu,physicalMethodFixedByPublicWork:true,
    historicalOracleValueIsNotAPublicOption:true},guide:{...sourceGuide,guide_kind:'PROJECT_DEFINED',guide_validation_policy:'MANDATORY_BLOCK',source_role:'BACKEND_DERIVED'}}};
 const site:Json=baseFact(pack.siteId,'Подтверждены ли основание и выбранная смесь?',[pack.siteReadyRu,pack.siteUnknownRu],active);
 site.truth_metadata={...site.truth_metadata,visible_when:measuredPositive,formula_consumers:[],resource_branch_consumers:[pack.prefix+'open:project']};
 const newParameters:Json[]=[selector,site,...recipeParameters];
 const newFormulas=namespaced.formulas.map(f=>({...f}));
 const components=new Map(originalPack.independentRequiredComponents.map(c=>[c.resolution.rowId,c]));
 const newResources=namespaced.resources.map((raw,index)=>{
  const sourceRow=recipe.resources[index],row=bind(raw),original=sourceRow.row_id,op=operationKey(original),title=operationSpecs.find(x=>x[0]===op)![1];
  const component=components.get(original),inputIds=recipe.formulas.find(f=>f.formula_id===sourceRow.formula_id)?.input_parameter_ids??[];
  const provisional=inputIds.some((id:string)=>id!=='area_m2'&&id!=='haul_distance_km'&&recipe.baseline.input_classification[id]!=='NORMATIVE')
   ||/quality:|mobilization:|organization:/.test(original);
  const {row_sha256:_hash,created_at:_created,definition_version_id:_definition,...body}=row;
  const changed={...body,inclusion_ast:{kind:'and',operands:[active,row.inclusion_ast]},resource_graph:{...row.resource_graph,
    primaryMeasureParameterId:pack.areaId,preliminaryProfileId:pack.profile.id,visibleAssumptionPolicy:pack.profile.detailsRu,
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.titleRu,
     operationId:pack.prefix+'operation:'+op,operationTitleRu:title,processOrdinal:operationSpecs.findIndex(x=>x[0]===op)+1,processRole:'PROCESS',
     completionCriterionRu:provisional?'Предварительная потребность; фактическое обеспечение и выполнение подтверждаются отдельно.':'Количество рассчитано по выбранному слою и официальной норме.',
     ...(original==='asphalt:labor:road-workers'?{additionalOperations:operationSpecs.slice(0,8).map(([key,label],i)=>({operationId:pack.prefix+'operation:'+key,
      operationTitleRu:label,processOrdinal:i+1,processRole:'PROCESS',completionCriterionRu:'Этап входит в нормативный состав этой бригады; повторная оплата труда не назначается.'}))}:{})},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,brandAndModelRu:null,
     detailsRu:[provisional?pack.profile.detailsRu:pack.source.locatorRu,...pack.exclusionsRu],...(sourceRow.resource_graph.costTreatment!=='OWN_COST'?{rowKind:'CALCULATION_DETAIL'}:{})}},
   source_metadata:{...row.source_metadata,sourceRecipeRowId:original,sourceRecipeCaptureSha256:pack.historicalRecipe.sha256,
    selectedProfileVersion:pack.profile.version,selectedProfileClassification:provisional?'ASSUMPTION':'NORMATIVE',
    automaticGenericPriceInheritanceAllowed:false,sourceRecipeComponentId:component?.semanticKey??null,full_technical_acceptance:false}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 // These actual gaps are application-owned scope needs, not extra resource questions.
 for(const gap of pack.gaps){
  const parameterId=pack.prefix+'scope_'+gap.id,rowId=pack.prefix+'open:'+gap.id,formulaId=rowId+':quantity';
  newParameters.push({parameter_id:parameterId,ordinal:0,value_type:'decimal',unit_id:null,title_ru:gap.titleRu,required:false,default_value:null,constraints_json:{min:0},
   truth_metadata:{contract:pack.contract,semantic_parameter_key:pack.contract+':'+parameterId,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',
    preliminary_compilation_allowed:true,source_confirmation_required:false,
    provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},guide:{...sourceGuide,guide_short_ru:gap.reasonRu}}} as any);
  const parsed=compileFormulaGraph(parameterId);newFormulas.push({formula_id:formulaId,output_unit_id:'',expression_source:parameterId,ast:parsed.ast,input_parameter_ids:parsed.inputParameterIds,ast_sha256:estimateDeterministicHash(parsed.ast)});
  const {row_sha256:_hash,...base}=clone(newResources[0]);const changed={...base,id:rowId,row_id:rowId,formula_id:formulaId,unit_id:'',category:'service',title_ru:gap.titleRu,
   cost_owner_id:null,procurement_eligible:false,inclusion_ast:active,resource_graph:{costTreatment:'INFORMATIONAL_SCOPE',payable:false,noDoubleCount:true,
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:gap.titleRu,nameRu:gap.titleRu,detailsRu:[gap.reasonRu],rowKind:'PROCESS_NOTE'}},
   source_metadata:{sourceRole:'UNRESOLVED_PROJECT_AND_SITE_REQUIREMENT',automaticGenericPriceInheritanceAllowed:false,full_technical_acceptance:false}};
  newResources.push({...changed,row_sha256:estimateDeterministicHash(changed)} as any);
 }
 const parameters:AuthoringParameter[]=[...parent.parameters.map(p=>({...p,required:false,constraints_json:{...p.constraints_json,requiredWhen:legacy},truth_metadata:{...p.truth_metadata,visible_when:{kind:'literal',value:false}}})),...newParameters].map((p,ordinal)=>({...p as AuthoringParameter,ordinal}));
 const resources=[...parent.resources.map(r=>{const {row_sha256:_hash,...body}=r;const changed={...body,inclusion_ast:{kind:'and',operands:[legacy,r.inclusion_ast]}};return {...changed,row_sha256:estimateDeterministicHash(changed)};}),...newResources].map((r,ordinal)=>({...r,ordinal}));
 const formulas=[...parent.formulas,...newFormulas];
 if(new Set(parameters.map(p=>p.parameter_id)).size!==parameters.length||new Set(formulas.map(f=>f.formula_id)).size!==formulas.length||new Set(resources.map(r=>r.row_id)).size!==resources.length)throw Error('R564_NAMESPACE_COLLISION');
 return {parameters,formulas,resources,newlySourceBoundRowIds:recipe.bindings.map(b=>rowIds.get(recipe.resources.find(r=>r.id===b.resource_spec_id)!.row_id)!),
  newParameterIds:newParameters.map(p=>p.parameter_id),newRowIds:newResources.map(r=>r.row_id),ordinaryObjectFactIds:ordinary,
  capturedParentSha256:pack.parent.sha256,sourceRecipeCaptureSha256:pack.historicalRecipe.sha256,fullTechnicalAcceptance:false,
  runtimeProfileInput:{[pack.selectorId]:pack.selectedValueRu},runtimeProfileClassification:{[pack.selectorId]:'RUNTIME_STRUCTURAL_DEFAULT' as const},
  runtimeProfileSourceIds:{[pack.selectorId]:[pack.source.key]}};
}
