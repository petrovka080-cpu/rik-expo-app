import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import type {RoofPreparationMigrationModelV1 as Model,RoofPreparationDefinitionIdentityV1 as Identity} from './canonicalRoofPreparationMigrationV1';
type Json=Record<string,unknown>;
type Input={fromDefinition:Identity;toDefinition:Identity;from:Model;to:Model};
/** Complete executable metadata. SQL identities, audit timestamps and stored
 * derivative hashes do not change the admitted calculation semantics. */
export function canonicalConditionalSuccessorSemanticSha256V1(model:Model):string{
 const project=(rows:readonly Json[],keys:readonly string[],id:string)=>rows.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]])))
  .sort((a,b)=>String(a[id]).localeCompare(String(b[id]),'en'));
 return canonicalEstimateSha256HexText(canonicalEstimateStableJson({
  resources:project(model.resources,['row_id','ordinal','section','title_ru','formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','inclusion_ast','resource_graph','source_metadata'],'row_id'),
  formulas:project(model.formulas,['formula_id','expression_source','ast','input_parameter_ids','output_unit_id'],'formula_id'),
  parameters:project(model.parameters,['parameter_id','ordinal','title_ru','value_type','unit_id','required','default_value','constraints_json','truth_metadata'],'parameter_id'),
 }));
}
/** One admission mechanism for finite frozen predecessors. Variant wrappers
 * supply their accepted model; neither matching row names nor a rehashed
 * arbitrary successor can authorize migration of manual data. */
export function createExactConditionalSuccessorMigrationV1<T extends Model&{definition:Json}>(config:{
 contractVersion:string;binding:{targets:{catalogId:string;predecessorDefinitionId:string;parentSha256:string}[]};
 frozenParents:readonly T[];buildExpected:(parent:T)=>Model;
}){
 const sourcePackSha256=canonicalEstimateSha256HexText(canonicalEstimateStableJson(config.binding)),semanticHash=canonicalConditionalSuccessorSemanticSha256V1;
 const buildProof=(input:Input)=>({contractVersion:config.contractVersion,catalogId:input.fromDefinition.catalogId,
  fromDefinitionId:input.fromDefinition.id,toDefinitionId:input.toDefinition.id,
  fromDefinitionSha256:input.fromDefinition.sha256,toDefinitionSha256:input.toDefinition.sha256,
  fromSemanticSha256:semanticHash(input.from),toSemanticSha256:semanticHash(input.to),sourcePackSha256});
 const admit=(input:Input&{proof:unknown})=>{
  const p=input.proof as ReturnType<typeof buildProof>|null,target=config.binding.targets.find(t=>t.catalogId===input.fromDefinition.catalogId);
  if(!p||!target||p.contractVersion!==config.contractVersion||p.sourcePackSha256!==sourcePackSha256
   ||p.catalogId!==input.fromDefinition.catalogId||p.catalogId!==input.toDefinition.catalogId
   ||p.fromDefinitionId!==target.predecessorDefinitionId||p.fromDefinitionSha256!==target.parentSha256
   ||p.fromDefinitionId!==input.fromDefinition.id||p.fromDefinitionSha256!==input.fromDefinition.sha256
   ||p.toDefinitionId!==input.toDefinition.id||p.toDefinitionSha256!==input.toDefinition.sha256||p.fromDefinitionId===p.toDefinitionId
   ||!/^[a-f0-9-]{36}$/u.test(p.toDefinitionId)||!/^[a-f0-9]{64}$/u.test(p.toDefinitionSha256)
   ||p.fromSemanticSha256!==semanticHash(input.from)||p.toSemanticSha256!==semanticHash(input.to))return null;
  try{
   const frozen=config.frozenParents.find(r=>r.definition.id===target.predecessorDefinitionId);
   if(!frozen||semanticHash(frozen)!==semanticHash(input.from)||semanticHash(config.buildExpected(frozen))!==semanticHash(input.to))return null;
   return{proof:p,normalizedTo:input.from};
  }catch{return null;}
 };
 return{buildProof,admit};
}
