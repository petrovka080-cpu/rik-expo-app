import policy from '../../../../data/estimate-benchmarks/source-packs/roof-standalone-work-scope-s27-69.json';
import screed15 from '../../../../data/estimate-benchmarks/source-packs/roof-cement-screed15-five-s27-63.json';
import binding from '../../../../data/estimate-benchmarks/source-packs/roof-screed25-five-bindings-s27-69.json';
import {canonicalEstimateStableJson as stable} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {roofPreparationMigrationSemanticHashV1 as semanticHash,type RoofPreparationMigrationModelV1 as Model,type RoofPreparationDefinitionIdentityV1 as Identity} from './canonicalRoofPreparationMigrationV1';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualExclusionMigrationBindings as exclusions} from './canonicalManualPriceReleaseMigration';

type Json=Record<string,any>;
export const ROOF_STANDALONE_WORK_SCOPE_V1=policy;
export const ROOF_STANDALONE_WORK_SCOPE_SHA_V1=canonicalEstimateSha256HexText(stable(policy));
/** Scope data only. All accepted formula/resource owners and historical
 * records survive; no quantity, price, norm or factual execution is supplied. */
export function buildRoofStandaloneWorkScopeSuccessorV1<T extends {definition:Json;parameters:Json[];resources:Json[];formulas:Json[];passport:Json}>(parent:T):T {
 if(!binding.targets.some(t=>t.catalogId===parent.definition.catalog_id)
   || parent.definition.definition_version!==5 || parent.resources.length!==137
   || parent.parameters.length!==67 || parent.formulas.length!==135) throw Error('STANDALONE_SCOPE_EXACT_FIVE_PARENT_REQUIRED');
 const result=structuredClone(parent),outside=new Set(policy.outsideRequestedWorkSuffixes.map(id=>`${screed15.prefix}:remaining:${id}`));
 if(result.resources.filter(row=>outside.has(row.row_id)).length!==16)throw Error('STANDALONE_SCOPE_16_ROWS_REQUIRED');
 const selected={kind:'or',operands:[screed15.systemYesRu,binding.systemYesRu].map(value=>({kind:'equals',parameterId:screed15.systemParameterId,value}))};
 result.resources=result.resources.map(row=>outside.has(row.row_id)?{...row,
   inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'not',operand:selected}]},
   source_metadata:{...row.source_metadata,standaloneWorkScopeV1:{contract:policy.contract,policySha256:ROOF_STANDALONE_WORK_SCOPE_SHA_V1,
     reasonRu:policy.scopeReasonRu,outsideRequestedWork:true,objectAbsenceAsserted:false}}}:row);
 for(const row of result.resources){const {row_sha256:_hash,...body}=row;row.row_sha256=canonicalEstimateSha256HexText(stable(body));}
 result.definition.source_metadata={...result.definition.source_metadata,roofStandaloneWorkScopeV1:ROOF_STANDALONE_WORK_SCOPE_SHA_V1};
 result.definition.passport={...result.definition.passport,standaloneWorkScopeV1:{contract:policy.contract,
   outsideRequestedWorkRowIds:[...outside],objectAbsenceAsserted:false,completeTechnicalEstimateAccepted:false}};
 result.passport.decision={...result.passport.decision,completeTechnicalEstimateAccepted:false,wholeRoofGroupComplete:false};
 return result;
}

type MigrationInput={fromDefinition:Identity;toDefinition:Identity;from:Model;to:Model};
export function buildRoofStandaloneWorkScopeMigrationProofV1(input:MigrationInput){
 return {contractVersion:'canonical-roof-standalone-work-scope-migration/v1',catalogId:input.toDefinition.catalogId,
   fromDefinitionId:input.fromDefinition.id,toDefinitionId:input.toDefinition.id,fromDefinitionSha256:input.fromDefinition.sha256,
   toDefinitionSha256:input.toDefinition.sha256,fromSemanticSha256:semanticHash(input.from),toSemanticSha256:semanticHash(input.to),policySha256:ROOF_STANDALONE_WORK_SCOPE_SHA_V1};
}
/** The only exception to strict manual-data migration is this exact forward
 * scope boundary. Physical owners, formula inputs and parameter meanings stay
 * equal. Historical exclusions survive even while their rows are dormant. */
export function admitRoofStandaloneWorkScopeMigrationProofV1(input:MigrationInput&{proof:unknown}){
 const p=input.proof as ReturnType<typeof buildRoofStandaloneWorkScopeMigrationProofV1>|null;
 const target=policy.targets.find(t=>t.catalogId===input.fromDefinition.catalogId);
 if(!p||!target||p.contractVersion!=='canonical-roof-standalone-work-scope-migration/v1'
   ||p.catalogId!==input.fromDefinition.catalogId||p.catalogId!==input.toDefinition.catalogId
   ||p.fromDefinitionId!==target.predecessorDefinitionId||p.fromDefinitionSha256!==target.predecessorDefinitionSha256
   ||p.fromDefinitionId!==input.fromDefinition.id||p.toDefinitionId!==input.toDefinition.id||p.fromDefinitionId===p.toDefinitionId
   ||p.toDefinitionSha256!==input.toDefinition.sha256||p.policySha256!==ROOF_STANDALONE_WORK_SCOPE_SHA_V1
   ||!/^[0-9a-f-]{36}$/iu.test(p.toDefinitionId)||!/^[a-f0-9]{64}$/u.test(p.toDefinitionSha256)
   ||p.fromSemanticSha256!==semanticHash(input.from)||p.toSemanticSha256!==semanticHash(input.to))return null;
 try{
  const expected=buildRoofStandaloneWorkScopeSuccessorV1({resources:[...input.from.resources],parameters:[...input.from.parameters],formulas:[...input.from.formulas],definition:{catalog_id:p.catalogId,definition_version:5,passport:{}},passport:{decision:{}}});
  if(semanticHash(expected)!==semanticHash(input.to))return null;
  const old=new Map(input.from.resources.map(r=>[String(r.row_id),r]));
  const normalizedTo={...input.to,resources:input.to.resources.map(r=>old.get(String(r.row_id))??r)};
  for(const build of [prices,exclusions]){const before=build(input.from),after=build(normalizedTo);
   if(Object.keys(before).length!==137||Object.entries(before).some(([id,value])=>after[id]!==value))return null;}
  return {proof:p,normalizedTo};
 }catch{return null;}
}
