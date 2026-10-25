import pack from '../../../../data/estimate-benchmarks/source-packs/ct126-four-prepared-wall-branches-r2.json';
import {ct126PreparedDefinitionS2754,ct126PreparedCompletenessMapS2754} from './ct126PreparedSeriesS2754';
import {ct126PostPrimerCandidateCompletenessMapS2754} from './ct126PostPrimerCandidatesS2754';
import {ct126SixDryWallChoiceS2769 as choiceId} from './ct126SixDryWallReuseS2769';
import {resolveCanonicalEstimateExplicitRowCategory} from '../backendPlatform/canonicalEstimateRowCategory';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateStableJson as stable} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText as sha} from '../backendPlatform/canonicalEstimateSha256';
import {estimateDeterministicHash as hash,stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Representative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
type Json=Record<string,any>;
const captured=require('../../../../data/estimate-benchmarks/fixtures/ct126-current-four-v4-parents-r2.json') as {reps:Representative[]};
export const ct126PreparedWallBranchesPackR2=pack;
export const ct126PreparedWallBranchChoicesR2=pack.profiles.map(p=>p.choiceValue);
const oldExact={kind:'equals',parameterId:choiceId,value:pack.exactChoiceRu};
const exact=(value:string)=>({kind:'equals',parameterId:choiceId,value});
const allExact={kind:'or',operands:[oldExact,...pack.profiles.map(p=>exact(p.choiceValue))]};
const same=(a:unknown,b:unknown)=>stable(a)===stable(b);
const declaration=(row:Json):Json=>Object.fromEntries(Object.entries(row).filter(([key])=>!['id','definition_version_id','created_at','updated_at'].includes(key)));
const hashed=(row:Json):Json=>{const{row_sha256:_sha,...body}=row;return{...body,row_sha256:hash(body)};};
/** Complete executable metadata; SQL identities, audit times and derivative hashes are excluded. */
export function ct126PreparedWallSemanticShaR2(model:{resources:readonly Json[];formulas:readonly Json[];parameters:readonly Json[]}):string{
 const project=(rows:readonly Json[],keys:readonly string[],id:string)=>rows.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]]))).sort((a,b)=>String(a[id]).localeCompare(String(b[id]),'en'));
 return sha(stable({resources:project(model.resources,['row_id','ordinal','section','title_ru','formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','inclusion_ast','resource_graph','source_metadata'],'row_id'),
  formulas:project(model.formulas,['formula_id','expression_source','ast','input_parameter_ids','output_unit_id'],'formula_id'),
  parameters:project(model.parameters,['parameter_id','ordinal','title_ru','value_type','unit_id','required','default_value','constraints_json','truth_metadata'],'parameter_id')}));
}
export function ct126PreparedWallParameterMapR2(index:number):Record<string,string>{
 const profile=pack.profiles.find(p=>p.preparedIndex===index);if(!profile)throw Error('CT126_R2_EXACT_PREPARED_WALL_PROFILE_REQUIRED');
 return Object.fromEntries(ct126PreparedDefinitionS2754(index).parameters.map(p=>[p.parameter_id,p.parameter_id==='putty_area_m2'?'q':profile.parameterPrefix+p.parameter_id]));
}
function mapped<T>(value:T,replacements:Record<string,string>):T{
 const tokens=new RegExp('\\b('+Object.keys(replacements).sort((a,b)=>b.length-a.length).join('|')+')\\b','gu');
 const walk=(part:any):any=>typeof part==='string'?part.replace(tokens,id=>replacements[id]!):Array.isArray(part)?part.map(walk):part&&typeof part==='object'?Object.fromEntries(Object.entries(part).map(([key,p])=>[key,walk(p)])):part;
 return walk(value);
}
function extendedLegacyGate(ast:unknown):{ast:unknown;replacements:number}{
 let replacements=0;
 const walk=(part:any):any=>{
  if(same(part,{kind:'not',operand:oldExact})){replacements++;return{kind:'not',operand:allExact};}
  return Array.isArray(part)?part.map(walk):part&&typeof part==='object'?Object.fromEntries(Object.entries(part).map(([key,p])=>[key,walk(p)])):part;
 };
 return{ast:walk(ast),get replacements(){return replacements;}};
}
/** A successor of the CURRENT four v4 consumers. Calls two existing whole-profile
 * factories; no rate, recipe, labour split, replacement substrate or tool kit is introduced. */
export function buildCt126PreparedWallBranchesR2(parent:Representative,manufacturerLocatorId?:string):Representative{
 const target=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id),frozen=captured.reps.find(r=>r.definition.catalog_id===parent.definition.catalog_id);
 if(!target||!frozen||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_sha256!==target.parentSha256
  ||parent.definition.definition_version!==4||parent.parameters.length!==33||parent.formulas.length!==89||parent.resources.length!==89
  ||ct126PreparedWallSemanticShaR2(parent)!==ct126PreparedWallSemanticShaR2(frozen))throw Error('CT126_R2_EXACT_CURRENT_FOUR_V4_PREIMAGE_REQUIRED');
 const result=structuredClone(parent),choice=result.parameters.find(p=>p.parameter_id===choiceId);
 if(!choice||choice.default_value!==null||!same(choice.constraints_json.values,[pack.exactChoiceRu]))throw Error('CT126_R2_SAVED_TECHNOLOGY_CHOICE_REQUIRED');
 choice.constraints_json={...choice.constraints_json,values:[...choice.constraints_json.values,...ct126PreparedWallBranchChoicesR2]};
 // Only the legacy exclusion gains the two new mutually exclusive alternatives.
 // Every old CT126 formula, row ID, owner and positive branch stays unchanged.
 let legacyCount=0;
 result.resources=result.resources.map(row=>{
  const gate=extendedLegacyGate(row.inclusion_ast);if(!gate.replacements)return row;
  if(gate.replacements!==1)throw Error('CT126_R2_UNEXPECTED_LEGACY_GATE_SHAPE');legacyCount++;
  return hashed({...row,inclusion_ast:gate.ast});
 });
 if(legacyCount!==59)throw Error('CT126_R2_EXACT_59_LEGACY_NEGATIVE_GATES_REQUIRED');
 const addedOpen:string[]=[];
 for(const profile of pack.profiles){
  const source=ct126PreparedDefinitionS2754(profile.preparedIndex),mapping=ct126PreparedWallParameterMapR2(profile.preparedIndex),shared=mapped(structuredClone(source),mapping),selected=exact(profile.choiceValue);
  if(source.parameters.length!==33||source.resources.length!==30||source.formulas.length!==30)throw Error('CT126_R2_WHOLE_PREPARED_PROFILE_SHAPE_REQUIRED');
  for(let i=0;i<shared.parameters.length;i++){
   const p=declaration(shared.parameters[i]!),sourceParameter=source.parameters[i]!;if(p.parameter_id==='q')continue;
   if(result.parameters.some(old=>old.parameter_id===p.parameter_id))throw Error('CT126_R2_PARAMETER_COLLISION');
   const internal=p.truth_metadata.visibility_role==='INTERNAL_ONLY',advanced=/_(stock|reserve)_|_supplier_|_quantum_/u.test(p.parameter_id),constraints={...p.constraints_json},prior=constraints.requiredWhen;
   if((p.required&&!internal&&!advanced)||prior)constraints.requiredWhen=prior?{kind:'and',operands:[selected,prior]}:selected;
   const visible=p.truth_metadata.visible_when?{kind:'and',operands:[selected,p.truth_metadata.visible_when]}:selected;
   const label=profile.parameterPresentation.find(p=>p.parameterId===sourceParameter.parameter_id&&p.sourceTitleRu===sourceParameter.title_ru);
   const title=label?.nameRu??sourceParameter.title_ru,guide=label?.guideRu;
   result.parameters.push({...p,ordinal:result.parameters.length,title_ru:title,required:false,default_value:null,constraints_json:constraints,
    truth_metadata:{...p.truth_metadata,contract:pack.contract,source_confirmation_required:false,source_parameter_title_ru:sourceParameter.title_ru,
     ...(guide?{guide:{...p.truth_metadata.guide,guide_short_ru:guide}}:{}),
     ...(!internal?{visible_when:visible,provenance:{...p.truth_metadata.provenance,consumer_input_role_v1:advanced?'ADVANCED_OPTION':'OBJECT_FACT'}}:{})}});
   result.baseline.normative_source_ids[p.parameter_id]=p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[target.sourceId];
  }
  for(const formula of shared.formulas){
   if(result.formulas.some(old=>old.formula_id===formula.formula_id))throw Error('CT126_R2_FORMULA_COLLISION');
   const content=declaration(formula);result.formulas.push({...content,ast_sha256:sha(stringifyCanonicalEstimateJson(content.ast))});
  }
  for(const resource of shared.resources){
   if(result.resources.some(old=>old.row_id===resource.row_id))throw Error('CT126_R2_RESOURCE_COLLISION');
   const row=declaration(resource),category=resolveCanonicalEstimateExplicitRowCategory(String(row.category));
   if(!category||!['material','work','equipment','service'].includes(category))throw Error('CT126_R2_EXACT_PREPARED_RESOURCE_CATEGORY_REQUIRED');
   // Explicit publication schema type; the source builder leaves this SQL field absent.
   // The existing category resolver identifies labour as work. Old89 rows are untouched.
   const content={...row,row_type:category==='work'?'labor':category,ordinal:result.resources.length,semantic_owner:String(parent.definition.catalog_id)+':'+row.row_id,
    inclusion_ast:{kind:'and',operands:[selected,row.inclusion_ast]},source_metadata:{...row.source_metadata,cohortContract:pack.contract,sourcePreparedCatalogId:profile.sourceCatalogId,sourcePreparedProfile:profile.key,full_technical_acceptance:false},resource_graph:{...row.resource_graph,fullTechnicalAcceptance:false}};
   result.resources.push(hashed(content));
   if(String(row.source_metadata?.sourceRole).startsWith('UNRESOLVED_'))addedOpen.push(row.row_id);
  }
  const locator=manufacturerLocatorId??parent.bindings.find(b=>b.row_id==='putty:ct126-dry-wall:net-mixture')?.locator_id;
  if(!locator)throw Error('CT126_R2_CURRENT_OR_PREPARED_MANUFACTURER_LOCATOR_REQUIRED');
  for(const suffix of ['net-mixture','5kg-mix-water-consumed','20kg-mix-water-consumed'])result.bindings.push({row_id:profile.sourcePrefix+':'+suffix,locator_id:locator,
   applicability:{contract:pack.contract,exactBranch:selected,scopeRu:profile.scopeRu,sourcePreparedCatalogId:profile.sourceCatalogId,priorPrimer:profile.priorPrimer,baseAcceptanceReferenceRequired:true,oneSelectedBagOnly:true,layerMm:[2,10],fullTechnicalAcceptance:false}});
 }
 if(addedOpen.length!==22||result.parameters.length!==97||result.resources.length!==149||result.formulas.length!==149)throw Error('CT126_R2_COMPLETE_TWO_PROFILE_DELTA_REQUIRED');
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
  result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
 }
 // Existing baseline source arrays remain owned by the retained parent.
 result.baseline.parameter_schema_sha256=sha(stringifyCanonicalEstimateJson(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata}))));
 const open=[...parent.passport.decision.ct126UnresolvedResourceRowIds,...addedOpen];
 if(open.length!==33||new Set(open).size!==33)throw Error('CT126_R2_THREE_PROFILES_KEEP_33_POTENTIAL_SOURCE_GAPS');
 result.passport.included_scope_ru=[...parent.passport.included_scope_ru,...pack.profiles.map(p=>p.scopeRu)];
 result.passport.decision={...parent.passport.decision,ct126PreparedWallBranchesContractR2:pack.contract,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,
  unresolvedResourceRowIds:open,ct126UnresolvedResourceRowIds:open,selectedCt126SourceGaps:11,potentialCt126SourceGapRows:33,completeTechnicalEstimateAccepted:false,
  sourceProfilesPerCatalog:3,additionalCalculableBranches:2,newNeedsClosed:0,newFullTechnologies:0,independentCompletenessMap:ct126PreparedWallCompletenessMapR2()};
 result.passport.capability_matrix=result.passport.capability_matrix.map((c:Json)=>c.capability==='FULL_APPLICABLE_SCOPE'?{...c,status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:open}:c);
 return result;
}
/** Three source-authored whole expectations, independent of generated row lists. */
export function ct126PreparedWallCompletenessMapR2(){
 const profiles=[{key:'wall-cement-lime',sourcePrefix:'putty:ct126-dry-wall',choiceValue:pack.exactChoiceRu,map:ct126PostPrimerCandidateCompletenessMapS2754()},
  ...pack.profiles.map(p=>({key:p.key,sourcePrefix:p.sourcePrefix,choiceValue:p.choiceValue,map:ct126PreparedCompletenessMapS2754(p.preparedIndex)}))];
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,operationResourceBindingRequired:true,
  evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],profiles,
  entries:profiles.flatMap(profile=>profile.map.entries.map(entry=>({...entry,expectedResourceId:profile.key+':'+entry.expectedResourceId,operationId:profile.sourcePrefix+':'+entry.operationId,requiredOperationIds:[profile.sourcePrefix+':'+entry.operationId],exactTechnologyChoice:exact(profile.choiceValue)}))),
  activeRequiredSourceNeedsPerProfile:11,potentialSourceNeeds:33,fullTechnicalAcceptance:false};
}

export function overlayCt126PreparedWallBranchesR2(parent:Representative,locatorId?:string){
 const representative=buildCt126PreparedWallBranchesR2(parent,locatorId),added=representative.resources.filter(r=>!parent.resources.some(old=>old.row_id===r.row_id));
 return{representative,legacyRowIds:parent.resources.map(r=>r.row_id),addedRowIds:added.map(r=>r.row_id),
  addedParameterIds:representative.parameters.filter(p=>!parent.parameters.some(old=>old.parameter_id===p.parameter_id)).map(p=>p.parameter_id),changedFormulaIds:[],
  physicalNormOwnerRowIds:pack.profiles.flatMap(p=>['net-mixture','5kg-mix-water-consumed','20kg-mix-water-consumed'].map(s=>p.sourcePrefix+':'+s)),
  newPayableOwnerRowIds:pack.profiles.flatMap(p=>['5kg-order','20kg-order','5kg-mix-water-order','20kg-mix-water-order'].map(s=>p.sourcePrefix+':'+s)),
  ownerDisposition:parent.resources.map(r=>({rowId:r.row_id,costOwnerId:r.cost_owner_id,disposition:'CURRENT_V4_OWNER_PRESERVED_WITH_EXCLUSIVE_TECHNOLOGY_GATE'}))};
}
