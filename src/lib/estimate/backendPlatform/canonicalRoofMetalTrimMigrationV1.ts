import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {ROOF_METAL_TRIM_PACK_V1 as pack,ROOF_METAL_TRIM_SEMANTIC_ROWS_V1,ROOF_METAL_TRIM_OPERATION_KEY_V1,roofMetalTrimExistingRowV1,roofMetalTrimCompanionOwnerV1} from './canonicalRoofMetalTrimCompanionV1';
import {roofPreparationMigrationSemanticHashV1,type RoofPreparationMigrationModelV1 as Model,type RoofPreparationDefinitionIdentityV1 as Identity} from './canonicalRoofPreparationMigrationV1';
import {readRoofStageRestorationV2,type RoofStageRestorationV2} from './canonicalRoofScreedMigrationV1';
import {parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
type Json=Record<string,unknown>;
const record=(v:unknown):Json=>v!=null&&typeof v==='object'&&!Array.isArray(v)?v as Json:{};
const same=(a:unknown,b:unknown)=>canonicalEstimateStableJson(a)===canonicalEstimateStableJson(b);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const pick=(v:Json,keys:string[])=>Object.fromEntries(keys.map(k=>[k,v[k]??null]));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu,sha=/^[0-9a-f]{64}$/u;
export type RoofMetalTrimMigrationProofV1={contractVersion:'canonical-roof-metal-trim-migration-proof/v1';fromDefinitionId:string;toDefinitionId:string;catalogId:string;fromDefinitionSha256:string;toDefinitionSha256:string;fromSemanticSha256:string;toSemanticSha256:string;sourceSha256:string;preservedRowIds:string[]};
type Input={fromDefinition:Identity;toDefinition:Identity;from:Model;to:Model};
export function readRoofMetalTrimMigrationProofV1(value:unknown):RoofMetalTrimMigrationProofV1|null {
 const p=record(value);return p.contractVersion==='canonical-roof-metal-trim-migration-proof/v1'&&pack.targets.some(t=>t.catalogId===p.catalogId&&t.predecessorDefinitionId===p.fromDefinitionId)
  &&uuid.test(String(p.fromDefinitionId))&&uuid.test(String(p.toDefinitionId))&&p.fromDefinitionId!==p.toDefinitionId
  &&['fromDefinitionSha256','toDefinitionSha256','fromSemanticSha256','toSemanticSha256'].every(k=>sha.test(String(p[k])))&&p.sourceSha256===pack.sources[0]!.sha256
  &&Array.isArray(p.preservedRowIds)&&p.preservedRowIds.length===146&&p.preservedRowIds.every(id=>typeof id==='string')&&new Set(p.preservedRowIds).size===146?p as RoofMetalTrimMigrationProofV1:null;
}
export function buildRoofMetalTrimMigrationProofV1(i:Input):RoofMetalTrimMigrationProofV1 {return {contractVersion:'canonical-roof-metal-trim-migration-proof/v1',fromDefinitionId:i.fromDefinition.id,toDefinitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,
 fromDefinitionSha256:i.fromDefinition.sha256,toDefinitionSha256:i.toDefinition.sha256,fromSemanticSha256:roofPreparationMigrationSemanticHashV1(i.from),toSemanticSha256:roofPreparationMigrationSemanticHashV1(i.to),sourceSha256:pack.sources[0]!.sha256,preservedRowIds:i.from.resources.map(r=>String(r.row_id)).sort()};}
const rowKeys=['formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','inclusion_ast','resource_graph','source_metadata'];
const parameterKeys=['value_type','unit_id','required','default_value','constraints_json'];
function authority(p:Json){const {contract:_c,formula_consumers:_f,resource_branch_consumers:_r,...rest}=record(p.truth_metadata);return rest;}
export function admitRoofMetalTrimMigrationProofV1(i:Input&{proof:unknown}):{proof:RoofMetalTrimMigrationProofV1;normalizedTo:Model;semanticMetalTrimRowIds:string[];metalTrimOperationKey:string}|null {
 const p=readRoofMetalTrimMigrationProofV1(i.proof),from=i.from,to=i.to;
 if(!p||p.catalogId!==i.fromDefinition.catalogId||p.catalogId!==i.toDefinition.catalogId||p.fromDefinitionId!==i.fromDefinition.id||p.toDefinitionId!==i.toDefinition.id
  ||p.fromDefinitionSha256!==i.fromDefinition.sha256||p.toDefinitionSha256!==i.toDefinition.sha256||p.fromSemanticSha256!==roofPreparationMigrationSemanticHashV1(from)||p.toSemanticSha256!==roofPreparationMigrationSemanticHashV1(to)
  ||!same(p.preservedRowIds,from.resources.map(r=>String(r.row_id)).sort())||from.resources.length!==146||to.resources.length!==153||from.parameters.length!==67||to.parameters.length!==69||to.formulas.length!==from.formulas.length+7
  ||new Set(to.resources.map(r=>r.row_id)).size!==153||new Set(to.parameters.map(r=>r.parameter_id)).size!==69)return null;
 const owner=roofMetalTrimCompanionOwnerV1(p.catalogId),paidIds=owner.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id);
 const oldRows=new Map(from.resources.map(r=>[String(r.row_id),r])),newRows=new Map(to.resources.map(r=>[String(r.row_id),r]));
 const oldFormulas=new Map(from.formulas.map(r=>[String(r.formula_id),r])),newFormulas=new Map(to.formulas.map(r=>[String(r.formula_id),r])),fkeys=['ast','input_parameter_ids','output_unit_id'];
 if([...oldFormulas].some(([id,f])=>!same(pick(f,fkeys),pick(newFormulas.get(id)??{},fkeys))))return null;
 for(const [id,r]of oldRows)if(!newRows.has(id)||!same(pick(roofMetalTrimExistingRowV1(r,paidIds),rowKeys),pick(newRows.get(id)!,rowKeys)))return null;
 const oldParams=new Map(from.parameters.map(r=>[String(r.parameter_id),r]));
 for(const next of to.parameters){const id=String(next.parameter_id),expected=oldParams.get(id)??owner.parameters.find(p=>p.parameter_id===id);
  if(!expected||!same(pick(expected,parameterKeys),pick(next,parameterKeys))||!same(authority(expected),authority(next)))return null;}
 const owners=new Set(from.resources.map(r=>r.cost_owner_id));
 for(const expected of owner.resources){const r=newRows.get(expected.row_id),ef=owner.formulas.find(f=>f.formula_id===expected.formula_id)!;
  if(!r||!same(pick(expected,rowKeys),pick(r,rowKeys))||!same(pick(ef,fkeys),pick(newFormulas.get(expected.formula_id)??{},fkeys))||r.cost_owner_id==null||owners.has(r.cost_owner_id))return null;owners.add(r.cost_owner_id);}
 if(to.resources.some(r=>!oldRows.has(String(r.row_id))&&!owner.resources.some(n=>n.row_id===r.row_id)))return null;
 return {proof:p,normalizedTo:{...to,parameters:from.parameters,resources:to.resources.map(r=>oldRows.get(String(r.row_id))??r)},semanticMetalTrimRowIds:[...ROOF_METAL_TRIM_SEMANTIC_ROWS_V1],metalTrimOperationKey:ROOF_METAL_TRIM_OPERATION_KEY_V1};
}
export function migrateRoofMetalTrimSelectionV1(input:{selection:unknown;admitted:NonNullable<ReturnType<typeof admitRoofMetalTrimMigrationProofV1>>}){
 const s=parseCanonicalCompositionSelectionV1(input.selection);if(!s)return s;
 const count=input.admitted.semanticMetalTrimRowIds.filter(id=>s.excludedRowIds.includes(id)).length;
 if(count>0&&count<input.admitted.semanticMetalTrimRowIds.length)throw Object.assign(new Error('Ранее исключена только часть доборов: материал или труд. Восстановите всю группу доборов, затем выбирайте весь рассчитываемый этап. Исходная смета сохранена; приложение не изменяет частичное исключение автоматически.'),{code:'COMPOSITION_MIGRATION_AMBIGUOUS',httpStatus:409});
 return count===0?s:parseCanonicalCompositionSelectionV1({...s,excludedOperationKeys:[...new Set([...s.excludedOperationKeys,input.admitted.metalTrimOperationKey])]});
}
/** Separate, finite receipt; version7/v1 and version8/v2 contracts stay unchanged. */
export type RoofStageRestorationV3={contractVersion:'canonical-roof-stage-restoration/v3';catalogId:string;definitionId:string;definitionSha256:string;originalStages:RoofStageRestorationV2;originalStagesSha256:string;metalTrimEndorsement:RoofMetalTrimMigrationProofV1;pairs:{rowId:string;operationKey:string}[];receiptSha256:string};
export function buildRoofStageRestorationV3(input:{metalTrim:NonNullable<ReturnType<typeof admitRoofMetalTrimMigrationProofV1>>;previous:RoofStageRestorationV2}):RoofStageRestorationV3 {
 const original=readRoofStageRestorationV2(input.previous),s=input.metalTrim.proof;
 if(!original||original.catalogId!==s.catalogId||original.definitionId!==s.fromDefinitionId||original.definitionSha256!==s.fromDefinitionSha256)throw Error('ROOF_METAL_TRIM_RESTORATION_CHAIN_INVALID');
 const body={contractVersion:'canonical-roof-stage-restoration/v3' as const,catalogId:s.catalogId,definitionId:s.toDefinitionId,definitionSha256:s.toDefinitionSha256,originalStages:original,originalStagesSha256:hash(original),metalTrimEndorsement:s,
  pairs:[...original.pairs,...ROOF_METAL_TRIM_SEMANTIC_ROWS_V1.map(rowId=>({rowId,operationKey:ROOF_METAL_TRIM_OPERATION_KEY_V1}))]};return {...body,receiptSha256:hash(body)};
}
export function readRoofStageRestorationV3(value:unknown):RoofStageRestorationV3|null {
 const r=record(value),o=readRoofStageRestorationV2(r.originalStages),s=readRoofMetalTrimMigrationProofV1(r.metalTrimEndorsement),{receiptSha256:_h,...body}=r;
 return r.contractVersion==='canonical-roof-stage-restoration/v3'&&o&&s&&r.catalogId===s.catalogId&&o.catalogId===s.catalogId&&o.definitionId===s.fromDefinitionId&&o.definitionSha256===s.fromDefinitionSha256
  &&r.definitionId===s.toDefinitionId&&r.definitionSha256===s.toDefinitionSha256&&r.originalStagesSha256===hash(o)&&same(r.pairs,[...o.pairs,...ROOF_METAL_TRIM_SEMANTIC_ROWS_V1.map(rowId=>({rowId,operationKey:ROOF_METAL_TRIM_OPERATION_KEY_V1}))])&&r.receiptSha256===hash(body)?r as RoofStageRestorationV3:null;
}
export function roofStageRestoreTargetsV3(input:{receipt:unknown;definitionId:unknown;catalogId:unknown;rowIds:readonly string[];operationKeys:readonly string[]}){
 const r=readRoofStageRestorationV3(input.receipt),rows=new Set(input.rowIds),ops=new Set(input.operationKeys);
 if(r&&r.definitionId===input.definitionId&&r.catalogId===input.catalogId){
  // A stage can have multiple old requirements. Close both directions, regardless of pair order.
  for(let pass=0;pass<r.pairs.length;pass++){const before=rows.size+ops.size;for(const pair of r.pairs)if(rows.has(pair.rowId)||ops.has(pair.operationKey)){rows.add(pair.rowId);ops.add(pair.operationKey);}if(rows.size+ops.size===before)break;}
 }
 return {rowIds:[...rows],operationKeys:[...ops]};
}
/** Only migration binding checks use the historical model, never physical calculation. */
export function composeRoofMetalTrimMigrationModelV1(metalTrim:NonNullable<ReturnType<typeof admitRoofMetalTrimMigrationProofV1>>,previous:Model):Model {
 const rows=new Map(previous.resources.map(r=>[String(r.row_id),r]));return {...metalTrim.normalizedTo,parameters:previous.parameters,resources:metalTrim.normalizedTo.resources.map(r=>rows.get(String(r.row_id))??r)};
}
