import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {sourcePinnedRoofNormOwnerR1} from '../v4/sourcePinnedRoofNormOwnerR1';
import {ROOF_VALLEY_PACK_V1 as pack,ROOF_VALLEY_SEMANTIC_ROW_V1,ROOF_VALLEY_OPERATION_KEY_V1,roofValleyConditionsV1,roofValleyScopeV1} from './canonicalRoofValleyCompanionV1';
import {roofPreparationMigrationSemanticHashV1,type RoofPreparationMigrationModelV1 as Model,type RoofPreparationDefinitionIdentityV1 as Identity,type RoofPreparationMigrationProofV1,readRoofPreparationMigrationProofV1} from './canonicalRoofPreparationMigrationV1';
import {parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
type Json=Record<string,unknown>;
const record=(v:unknown):Json=>v!=null&&typeof v==='object'&&!Array.isArray(v)?v as Json:{};
const same=(a:unknown,b:unknown)=>canonicalEstimateStableJson(a)===canonicalEstimateStableJson(b);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const pick=(v:Json,keys:string[])=>Object.fromEntries(keys.map(k=>[k,v[k]??null]));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu,sha=/^[0-9a-f]{64}$/u;
export type RoofValleyMigrationProofV1={contractVersion:'canonical-roof-valley-migration-proof/v1';fromDefinitionId:string;toDefinitionId:string;catalogId:string;fromDefinitionSha256:string;toDefinitionSha256:string;fromSemanticSha256:string;toSemanticSha256:string;sourceSha256:string;preservedRowIds:string[]};
type Input={fromDefinition:Identity;toDefinition:Identity;from:Model;to:Model};
export function readRoofValleyMigrationProofV1(value:unknown):RoofValleyMigrationProofV1|null{
 const p=record(value);
 return p.contractVersion==='canonical-roof-valley-migration-proof/v1'&&pack.targets.some(t=>t.catalogId===p.catalogId&&t.predecessorDefinitionId===p.fromDefinitionId)
  &&uuid.test(String(p.fromDefinitionId))&&uuid.test(String(p.toDefinitionId))&&p.fromDefinitionId!==p.toDefinitionId
  &&['fromDefinitionSha256','toDefinitionSha256','fromSemanticSha256','toSemanticSha256'].every(k=>sha.test(String(p[k])))
  &&p.sourceSha256===pack.sources[0]!.sha256&&Array.isArray(p.preservedRowIds)&&p.preservedRowIds.length===131
  &&p.preservedRowIds.every(id=>typeof id==='string')&&new Set(p.preservedRowIds).size===131?p as RoofValleyMigrationProofV1:null;
}
export function buildRoofValleyMigrationProofV1(i:Input):RoofValleyMigrationProofV1{return{
 contractVersion:'canonical-roof-valley-migration-proof/v1',fromDefinitionId:i.fromDefinition.id,toDefinitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,
 fromDefinitionSha256:i.fromDefinition.sha256,toDefinitionSha256:i.toDefinition.sha256,
 fromSemanticSha256:roofPreparationMigrationSemanticHashV1(i.from),toSemanticSha256:roofPreparationMigrationSemanticHashV1(i.to),sourceSha256:pack.sources[0]!.sha256,preservedRowIds:i.from.resources.map(r=>String(r.row_id)).sort()};}
const rowKeys=['formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','inclusion_ast','source_metadata'];
const parameterKeys=['value_type','unit_id','required','default_value','constraints_json'];
function authority(p:Json){const {contract:_c,formula_consumers:_f,resource_branch_consumers:_r,...rest}=record(p.truth_metadata);return rest;}
/** Finite 6→7 exception. A failed admission leaves the common strict guards in force. */
export function admitRoofValleyMigrationProofV1(i:Input&{proof:unknown}):{proof:RoofValleyMigrationProofV1;normalizedTo:Model;semanticValleyRowId:string;valleyOperationKey:string}|null{
 const p=readRoofValleyMigrationProofV1(i.proof),from=i.from,to=i.to;
 if(!p||p.catalogId!==i.fromDefinition.catalogId||p.catalogId!==i.toDefinition.catalogId||p.fromDefinitionId!==i.fromDefinition.id||p.toDefinitionId!==i.toDefinition.id
  ||p.fromDefinitionSha256!==i.fromDefinition.sha256||p.toDefinitionSha256!==i.toDefinition.sha256
  ||p.fromSemanticSha256!==roofPreparationMigrationSemanticHashV1(from)||p.toSemanticSha256!==roofPreparationMigrationSemanticHashV1(to)
  ||!same(p.preservedRowIds,from.resources.map(r=>String(r.row_id)).sort())||from.resources.length!==131||to.resources.length!==138
  ||from.parameters.length!==64||to.parameters.length!==66||to.formulas.length!==from.formulas.length+7
  ||new Set(to.resources.map(r=>r.row_id)).size!==138||new Set(to.parameters.map(r=>r.parameter_id)).size!==66)return null;
 const oldRows=new Map(from.resources.map(r=>[String(r.row_id),r])),newRows=new Map(to.resources.map(r=>[String(r.row_id),r]));
 const oldFormulas=new Map(from.formulas.map(r=>[String(r.formula_id),r])),newFormulas=new Map(to.formulas.map(r=>[String(r.formula_id),r]));
 if([...oldFormulas].some(([id,f])=>!same(pick(f,['ast','input_parameter_ids','output_unit_id']),pick(newFormulas.get(id)??{},['ast','input_parameter_ids','output_unit_id']))))return null;
 const expectedOwner=sourcePinnedRoofNormOwnerR1(pack),conditions=roofValleyConditionsV1(),newIds=expectedOwner.resources.map(r=>r.row_id);
 for(const [id,old]of oldRows){const next=newRows.get(id);if(!next||!same(pick(old,rowKeys),pick(next,rowKeys)))return null;
  const expected=id===ROOF_VALLEY_SEMANTIC_ROW_V1?{...record(old.resource_graph),scopeRequirementV1:roofValleyScopeV1(record(record(old.resource_graph).scopeRequirementV1),newIds)}:old.resource_graph;
  if(!same(expected,next.resource_graph))return null;
 }
 const oldParams=new Map(from.parameters.map(p=>[String(p.parameter_id),p]));
 for(const next of to.parameters){const id=String(next.parameter_id),old=oldParams.get(id);
  if(old){if(!same(pick(old,parameterKeys),pick(next,parameterKeys))||!same(authority(old),authority(next)))return null;}
  else {if(![pack.systemParameterId,pack.measurementParameterId].includes(id))return null;
   const expected=expectedOwner.parameters.find(p=>p.parameter_id===id)!;
   const constraints={...expected.constraints_json,...(id===pack.measurementParameterId?{exclusiveMin:0,requiredWhen:conditions.admitted}:{})};
   if(!same(pick({...expected,constraints_json:constraints},parameterKeys),pick(next,parameterKeys))||!same(authority({...expected,truth_metadata:{...expected.truth_metadata,semantic_parameter_key:p.catalogId+':'+id}}),authority(next)))return null;}
 }
 const owners=new Set(from.resources.map(r=>r.cost_owner_id));
 for(const expected of expectedOwner.resources){const r=newRows.get(expected.row_id),f=newFormulas.get(expected.formula_id),ef=expectedOwner.formulas.find(f=>f.formula_id===expected.formula_id)!;
  if(!r||!same(pick({...expected,row_type:expected.category,semantic_owner:p.catalogId+':'+expected.row_id,cost_owner_id:p.catalogId+':'+expected.cost_owner_id,inclusion_ast:conditions.admitted,
     source_metadata:{...expected.source_metadata,printedReferenceOnly:pack.printedReferenceOnly}},rowKeys),pick(r,rowKeys))
   ||!same(expected.resource_graph,r.resource_graph)||!same(pick(ef,['ast','input_parameter_ids','output_unit_id']),pick(f??{},['ast','input_parameter_ids','output_unit_id']))
   ||r.cost_owner_id==null||owners.has(r.cost_owner_id))return null;owners.add(r.cost_owner_id);
 }
 if(to.resources.some(r=>!oldRows.has(String(r.row_id))&&!newIds.includes(String(r.row_id))))return null;
 return {proof:p,normalizedTo:{...to,parameters:from.parameters,resources:to.resources.map(r=>oldRows.get(String(r.row_id))??r)},semanticValleyRowId:ROOF_VALLEY_SEMANTIC_ROW_V1,valleyOperationKey:ROOF_VALLEY_OPERATION_KEY_V1};
}
export function migrateRoofValleySelectionV1(input:{selection:unknown;admitted:NonNullable<ReturnType<typeof admitRoofValleyMigrationProofV1>>}){
 const s=parseCanonicalCompositionSelectionV1(input.selection);if(!s||!s.excludedRowIds.includes(input.admitted.semanticValleyRowId))return s;
 return parseCanonicalCompositionSelectionV1({...s,excludedOperationKeys:[...new Set([...s.excludedOperationKeys,input.admitted.valleyOperationKey])]});
}
export type RoofStageRestorationV1={contractVersion:'canonical-roof-stage-restoration/v1';catalogId:string;definitionId:string;definitionSha256:string;
 originalPreparationProof:RoofPreparationMigrationProofV1;originalPreparationProofSha256:string;valleyEndorsement:RoofValleyMigrationProofV1;pairs:{rowId:string;operationKey:string}[];receiptSha256:string};
const primerRow='roof:torch-two:krer12-002-09:source-gap:primer',primerPrefix='roof:prime-ready-emulsion:krer12-016-02';
const stagePairs=[{rowId:primerRow,operationKey:JSON.stringify([primerPrefix,primerPrefix+':installation'])},{rowId:ROOF_VALLEY_SEMANTIC_ROW_V1,operationKey:ROOF_VALLEY_OPERATION_KEY_V1}];
export function buildRoofStageRestorationV1(input:{valley:NonNullable<ReturnType<typeof admitRoofValleyMigrationProofV1>>;preparation:NonNullable<ReturnType<typeof import('./canonicalRoofPreparationMigrationV1').admitRoofPreparationMigrationProofV1>>}):RoofStageRestorationV1{
 const original=input.preparation.proof,endorsement=input.valley.proof;
 if(original.catalogId!==endorsement.catalogId||original.toDefinitionId!==endorsement.fromDefinitionId||original.toDefinitionSha256!==endorsement.fromDefinitionSha256)throw Error('ROOF_STAGE_RESTORATION_CHAIN_INVALID');
 const body={contractVersion:'canonical-roof-stage-restoration/v1' as const,catalogId:endorsement.catalogId,definitionId:endorsement.toDefinitionId,definitionSha256:endorsement.toDefinitionSha256,
  originalPreparationProof:original,originalPreparationProofSha256:hash(original),valleyEndorsement:endorsement,pairs:stagePairs};
 return {...body,receiptSha256:hash(body)};
}
/** The same two proven transitions may be crossed in one user save. This does
 * not authorize any earlier or later definition, or alter either original proof. */
export function composeRoofFiveToSevenMigrationV1(input:Parameters<typeof buildRoofStageRestorationV1>[0]):Model{
 buildRoofStageRestorationV1(input);
 const intermediate=new Map(input.preparation.normalizedTo.resources.map(row=>[String(row.row_id),row]));
 return {...input.valley.normalizedTo,parameters:input.preparation.normalizedTo.parameters,
  resources:input.valley.normalizedTo.resources.map(row=>intermediate.get(String(row.row_id))??row)};
}
export function readRoofStageRestorationV1(value:unknown):RoofStageRestorationV1|null{
 const r=record(value),p=readRoofPreparationMigrationProofV1(r.originalPreparationProof),v=readRoofValleyMigrationProofV1(r.valleyEndorsement),{receiptSha256:_h,...body}=r;
 return r.contractVersion==='canonical-roof-stage-restoration/v1'&&p&&v&&p.catalogId===v.catalogId&&r.catalogId===v.catalogId
  &&p.toDefinitionId===v.fromDefinitionId&&p.toDefinitionSha256===v.fromDefinitionSha256&&r.definitionId===v.toDefinitionId&&r.definitionSha256===v.toDefinitionSha256
  &&same(r.pairs,stagePairs)&&r.originalPreparationProofSha256===hash(p)&&r.receiptSha256===hash(body)?r as RoofStageRestorationV1:null;
}
export function roofStageRestoreTargetsV1(input:{receipt:unknown;definitionId:unknown;catalogId:unknown;rowIds:readonly string[];operationKeys:readonly string[]}){
 const r=readRoofStageRestorationV1(input.receipt),rows=new Set(input.rowIds),ops=new Set(input.operationKeys);
 if(r&&r.definitionId===input.definitionId&&r.catalogId===input.catalogId)for(const pair of r.pairs)if(rows.has(pair.rowId)||ops.has(pair.operationKey)){rows.add(pair.rowId);ops.add(pair.operationKey);}
 return {rowIds:[...rows],operationKeys:[...ops]};
}
