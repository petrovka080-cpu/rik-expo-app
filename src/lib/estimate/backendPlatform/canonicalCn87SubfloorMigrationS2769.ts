import parents from '../../../../data/estimate-benchmarks/fixtures/cn87-four-subfloor-v4-parents-s27-69.json';
import {buildCn87SubfloorSuccessorS2769,cn87SubfloorBindingS2769 as binding} from '../v4/cn87SubfloorSeriesS2769';
import {type RoofPreparationMigrationModelV1 as Model,type RoofPreparationDefinitionIdentityV1 as Identity} from './canonicalRoofPreparationMigrationV1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
type Input={fromDefinition:Identity;toDefinition:Identity;from:Model;to:Model};
const sourcePackSha256=canonicalEstimateSha256HexText(canonicalEstimateStableJson(binding));
/** Full executable metadata, including derived lookups and future policies.
 * SQL identities, audit timestamps and stored derivative hashes are excluded. */
function semanticHash(model:Model):string{
 const project=(rows:readonly Record<string,unknown>[],keys:readonly string[],id:string)=>rows.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]])))
   .sort((a,b)=>String(a[id]).localeCompare(String(b[id]),'en'));
 return canonicalEstimateSha256HexText(canonicalEstimateStableJson({
  resources:project(model.resources,['row_id','ordinal','section','title_ru','formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','inclusion_ast','resource_graph','source_metadata'],'row_id'),
  formulas:project(model.formulas,['formula_id','expression_source','ast','input_parameter_ids','output_unit_id'],'formula_id'),
  parameters:project(model.parameters,['parameter_id','ordinal','title_ru','value_type','unit_id','required','default_value','constraints_json','truth_metadata'],'parameter_id'),
 }));
}
export function buildCn87SubfloorMigrationProofS2769(input:Input){return{
 contractVersion:'canonical-cn87-subfloor-four-migration/v1',catalogId:input.fromDefinition.catalogId,
 fromDefinitionId:input.fromDefinition.id,toDefinitionId:input.toDefinition.id,
 fromDefinitionSha256:input.fromDefinition.sha256,toDefinitionSha256:input.toDefinition.sha256,
 fromSemanticSha256:semanticHash(input.from),toSemanticSha256:semanticHash(input.to),sourcePackSha256};}
/** Only the exact four frozen predecessors and the complete admitted additive
 * model qualify. New parameter names do not invalidate unchanged old exclusions.
 * The target introduces no operation aliases or shared members in old groups. */
export function admitCn87SubfloorMigrationProofS2769(input:Input&{proof:unknown}){
 const p=input.proof as ReturnType<typeof buildCn87SubfloorMigrationProofS2769>|null,target=binding.targets.find(t=>t.catalogId===input.fromDefinition.catalogId);
 if(!p||!target||p.contractVersion!=='canonical-cn87-subfloor-four-migration/v1'||p.sourcePackSha256!==sourcePackSha256
  ||p.catalogId!==input.fromDefinition.catalogId||p.catalogId!==input.toDefinition.catalogId
  ||p.fromDefinitionId!==target.predecessorDefinitionId||p.fromDefinitionSha256!==target.parentSha256
  ||p.fromDefinitionId!==input.fromDefinition.id||p.fromDefinitionSha256!==input.fromDefinition.sha256
  ||p.toDefinitionId!==input.toDefinition.id||p.toDefinitionSha256!==input.toDefinition.sha256||p.fromDefinitionId===p.toDefinitionId
  ||!/^[a-f0-9-]{36}$/u.test(p.toDefinitionId)||!/^[a-f0-9]{64}$/u.test(p.toDefinitionSha256)
  ||p.fromSemanticSha256!==semanticHash(input.from)||p.toSemanticSha256!==semanticHash(input.to))return null;
 try{
  const frozen=parents.reps.find(r=>r.definition.id===target.predecessorDefinitionId) as unknown as PurchaseGroupRepresentative|undefined;
  if(!frozen||semanticHash(frozen)!==semanticHash(input.from))return null;
  const expected=buildCn87SubfloorSuccessorS2769(frozen);
  if(semanticHash(expected)!==semanticHash(input.to))return null;
  return{proof:p,normalizedTo:input.from};
 }catch{return null;}
}
