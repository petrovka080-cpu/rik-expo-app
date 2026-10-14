import binding from '../../../../data/estimate-benchmarks/source-packs/ct126-six-wall-bindings-s27-69.json';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash as hash,stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';

export const ct126SixDryWallBindingS2769=binding;
export const ct126SixDryWallChoiceS2769='wall_leveling_technology_choice';
export const ct126SixDryWallExactS2769={kind:'equals' as const,parameterId:ct126SixDryWallChoiceS2769,value:binding.exactChoiceRu};
const exact=ct126SixDryWallExactS2769;
// The publisher verifies these complete bytes. Avoid inferring a large literal JSON type.
const frozenProfile=require('../../../../data/estimate-benchmarks/fixtures/ct126-ready-wall-v2-s27-69.json') as {representative:PurchaseGroupRepresentative};
const profile=frozenProfile.representative;
const replacements=Object.fromEntries(profile.parameters.map(p=>[p.parameter_id,p.parameter_id==='putty_area_m2'?'q':'ct126_wall_'+p.parameter_id]));
const tokens=new RegExp('\\b('+Object.keys(replacements).sort((a,b)=>b.length-a.length).join('|')+')\\b','gu');
function mapped<T>(value:T):T {
 if(typeof value==='string')return value.replace(tokens,id=>replacements[id]!) as T;
 if(Array.isArray(value))return value.map(mapped) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,part])=>[key,mapped(part)])) as T;
 return value;
}
function declaration(row:Record<string,unknown>):Record<string,unknown> {
 return Object.fromEntries(Object.entries(row).filter(([key])=>!['id','definition_version_id','created_at','updated_at'].includes(key)));
}

/** Keep every historical owner and its data. The positive technology choice
 * selects the complete admitted CT126 composition; eleven source gaps remain. */
export function buildCt126SixDryWallSuccessorS2769(parent:PurchaseGroupRepresentative):PurchaseGroupRepresentative {
 const target=binding.targets.find(t=>t.catalogId===parent.definition.catalog_id);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_sha256!==target.parentSha256
  ||parent.definition.definition_version!==3||parent.resources.length!==59||parent.parameters.length!==1||parent.parameters[0].parameter_id!=='q')
  throw Error('CT126_EXACT_SIX_DRY_WALL_V3_PARENTS_REQUIRED');
 const result=structuredClone(parent),shared=mapped(structuredClone(profile));
 // The legacy default of 100 is not an observed area. Saved values remain in revisions.
 result.parameters.find(p=>p.parameter_id==='q')!.default_value=null;
 shared.parameters=shared.parameters.map(declaration);shared.formulas=shared.formulas.map(declaration);shared.resources=shared.resources.map(declaration);
 if(shared.parameters.length!==32||shared.resources.length!==30||shared.formulas.length!==30)throw Error('CT126_ADMITTED_PROFILE_SHAPE_REQUIRED');
 const scopeTruth=shared.parameters.find(p=>p.parameter_id==='ct126_wall_base_confirmed')!.truth_metadata;
 const choice={parameter_id:ct126SixDryWallChoiceS2769,ordinal:1,title_ru:'Материал и технология выравнивания стены',value_type:'enum',unit_id:null,
  required:true,default_value:null,constraints_json:{values:[binding.exactChoiceRu]},truth_metadata:{...scopeTruth,contract:binding.contract,value_source_role:'PROJECT_SPECIFIC_INPUT',
   semantic_parameter_key:String(parent.definition.catalog_id)+':'+ct126SixDryWallChoiceS2769,source_confirmation_required:false,
   provenance:{...scopeTruth.provenance,consumer_input_role_v1:'OBJECT_FACT'},guide:{...scopeTruth.guide,guide_version:binding.contract,
    guide_short_ru:'Подтвердите фактический материал и технологию. Нормы расхода приложение берёт из принятого паспорта.'}}};
 result.parameters.push(choice);
 for(const p of shared.parameters.filter(p=>p.parameter_id!=='q')) {
  const sourceGap=p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM';
  const internal=sourceGap||p.truth_metadata.visibility_role==='INTERNAL_ONLY';
  const advanced=/_(stock|reserve)_|_supplier_|_quantum_/u.test(p.parameter_id);
  const constraints={...p.constraints_json},prior=constraints.requiredWhen;
  if(p.required&&!internal&&!advanced)constraints.requiredWhen=prior?{kind:'and',operands:[exact,prior]}:exact;
  else if(prior)constraints.requiredWhen={kind:'and',operands:[exact,prior]};
  const visible=p.truth_metadata.visible_when?{kind:'and',operands:[exact,p.truth_metadata.visible_when]}:exact;
  const truth=sourceGap?unresolvedApplicationNormTruthR1(p.truth_metadata,'Принятый паспорт CT126 не устанавливает эту норму; источник должно закрыть приложение, ручное количество пользователя не подтверждает расчёт.'):p.truth_metadata;
  result.parameters.push({...p,required:false,default_value:null,constraints_json:constraints,truth_metadata:{...truth,contract:binding.contract,
   source_confirmation_required:false,...(internal?{}:{visible_when:visible,provenance:{consumer_input_role_v1:advanced?'ADVANCED_OPTION':'OBJECT_FACT'}})}});
 }
 for(const row of result.resources) {
  const{row_sha256:_sha,...body}=row;
  const content={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'not',operand:exact}]}};
  Object.assign(row,{...content,row_sha256:hash(content)});
 }
 let ordinal=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
 for(const row of shared.resources) {
  if(parent.resources.some(old=>old.row_id===row.row_id))throw Error('CT126_OWNER_COLLISION');
  const{row_sha256:_sha,...body}=row,content={...body,ordinal:ordinal++,semantic_owner:String(parent.definition.catalog_id)+':'+row.row_id,
   inclusion_ast:{kind:'and',operands:[exact,row.inclusion_ast]},source_metadata:{...row.source_metadata,cohortContract:binding.contract,
    acceptedReferenceDefinitionId:binding.acceptedReferenceDefinitionId,acceptedReferenceCatalogId:binding.acceptedReferenceCatalogId,
    full_technical_acceptance:false},resource_graph:{...row.resource_graph,fullTechnicalAcceptance:false}};
  result.resources.push({...content,row_sha256:hash(content)});
 }
 result.formulas.push(...shared.formulas.map(f=>({...f,ast_sha256:canonicalEstimateSha256HexText(stringifyCanonicalEstimateJson(f.ast))})));
 result.parameters=result.parameters.map((p,ordinal)=>({...p,ordinal}));
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters) {
  const id=p.parameter_id;
  p.truth_metadata={...p.truth_metadata,contract:binding.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+id,
   formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
  result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.normative_source_ids[id]??=[];
  result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
 }
 for(const id of ['q','ct126_wall_layer_thickness_mm','ct126_wall_selected_ct126_bag'])
  result.baseline.normative_source_ids[id]=[...new Set([...result.baseline.normative_source_ids[id],binding.contract+':manufacturer'])];
 result.baseline.parameter_schema_sha256=canonicalEstimateSha256HexText(stringifyCanonicalEstimateJson(result.parameters.map(p=>({
  parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata}))));
 result.passport.included_scope_ru=[...parent.passport.included_scope_ru,binding.scopeRu];
 result.passport.decision={...parent.passport.decision,ct126SixDryWallContract:binding.contract,completeTechnicalEstimateAccepted:false,
  historicalOwnersPreserved:59,selectedCt126SourceGaps:11,newPhysicalNormApplications:3,sourceScopeOnly:true};
 return result;
}
export function compileCt126SixDryWallS2769(parent:PurchaseGroupRepresentative,submittedParameters:Record<string,unknown>) {
 const r=buildCt126SixDryWallSuccessorS2769(parent);
 return compileAutomaticConstructionOwnerR1({catalogId:String(parent.definition.catalog_id),compilerVersion:binding.contract,primaryMeasureParameterId:'q',
  definition:{parameters:r.parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:r.formulas as unknown as AutomaticOwnerDefinition['formulas'],
   resources:r.resources as unknown as AutomaticOwnerDefinition['resources'],runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']},submittedParameters});
}
