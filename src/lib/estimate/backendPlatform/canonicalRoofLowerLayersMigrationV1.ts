import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {ROOF_LOWER_LAYERS_PACK_V1 as pack,ROOF_ASSEMBLY_SEMANTIC_ROW_V1,ROOF_LOWER_LAYER_PAIRS_V1,ROOF_VAPOR_OPERATION_KEY_V1,ROOF_CLAY_OPERATION_KEY_V1,roofLowerLayersOwnersV1,roofLowerLayersObligationsV1,lowerLayersExistingRowV1,lowerLayersConditionParameterV1} from './canonicalRoofLowerLayersCompanionV1';
import {roofPreparationMigrationSemanticHashV1,type RoofPreparationMigrationModelV1 as Model,type RoofPreparationDefinitionIdentityV1 as Identity} from './canonicalRoofPreparationMigrationV1';
import {readRoofStageRestorationV3,roofStageRestoreTargetsV3,type RoofStageRestorationV3} from './canonicalRoofMetalTrimMigrationV1';
import {parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
type Json=Record<string,unknown>;
const record=(v:unknown):Json=>v!=null&&typeof v==='object'&&!Array.isArray(v)?v as Json:{};
const same=(a:unknown,b:unknown)=>canonicalEstimateStableJson(a)===canonicalEstimateStableJson(b);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const pick=(v:Json,keys:string[])=>Object.fromEntries(keys.map(k=>[k,v[k]??null]));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu,sha=/^[0-9a-f]{64}$/u;
export type RoofLowerLayersMigrationProofV1={contractVersion:'canonical-roof-lower-layers-migration-proof/v1';fromDefinitionId:string;toDefinitionId:string;catalogId:string;fromDefinitionSha256:string;toDefinitionSha256:string;fromSemanticSha256:string;toSemanticSha256:string;sourceSha256:string;preservedRowIds:string[]};
type Input={fromDefinition:Identity;toDefinition:Identity;from:Model;to:Model};
export function readRoofLowerLayersMigrationProofV1(value:unknown):RoofLowerLayersMigrationProofV1|null {
 const p=record(value);return p.contractVersion==='canonical-roof-lower-layers-migration-proof/v1'&&pack.targets.some(t=>t.catalogId===p.catalogId&&t.predecessorDefinitionId===p.fromDefinitionId)
  &&uuid.test(String(p.fromDefinitionId))&&uuid.test(String(p.toDefinitionId))&&p.fromDefinitionId!==p.toDefinitionId
  &&['fromDefinitionSha256','toDefinitionSha256','fromSemanticSha256','toSemanticSha256'].every(k=>sha.test(String(p[k])))&&p.sourceSha256===pack.sources[0]!.sha256
  &&Array.isArray(p.preservedRowIds)&&p.preservedRowIds.length===153&&p.preservedRowIds.every(id=>typeof id==='string')&&new Set(p.preservedRowIds).size===153?p as RoofLowerLayersMigrationProofV1:null;
}
export function buildRoofLowerLayersMigrationProofV1(i:Input):RoofLowerLayersMigrationProofV1 {return {contractVersion:'canonical-roof-lower-layers-migration-proof/v1',fromDefinitionId:i.fromDefinition.id,toDefinitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,
 fromDefinitionSha256:i.fromDefinition.sha256,toDefinitionSha256:i.toDefinition.sha256,fromSemanticSha256:roofPreparationMigrationSemanticHashV1(i.from),toSemanticSha256:roofPreparationMigrationSemanticHashV1(i.to),sourceSha256:pack.sources[0]!.sha256,preservedRowIds:i.from.resources.map(r=>String(r.row_id)).sort()};}
const rowKeys=['formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','inclusion_ast','resource_graph','source_metadata'];
const parameterKeys=['value_type','unit_id','required','default_value','constraints_json'];
function authority(p:Json){const {contract:_c,formula_consumers:_f,resource_branch_consumers:_r,...rest}=record(p.truth_metadata);return rest;}
export function admitRoofLowerLayersMigrationProofV1(i:Input&{proof:unknown}):{proof:RoofLowerLayersMigrationProofV1;normalizedTo:Model;semanticAssemblyRowId:string;lowerLayerOperationKeys:string[]}|null {
 const p=readRoofLowerLayersMigrationProofV1(i.proof),from=i.from,to=i.to;
 if(!p||p.catalogId!==i.fromDefinition.catalogId||p.catalogId!==i.toDefinition.catalogId||p.fromDefinitionId!==i.fromDefinition.id||p.toDefinitionId!==i.toDefinition.id
  ||p.fromDefinitionSha256!==i.fromDefinition.sha256||p.toDefinitionSha256!==i.toDefinition.sha256||p.fromSemanticSha256!==roofPreparationMigrationSemanticHashV1(from)||p.toSemanticSha256!==roofPreparationMigrationSemanticHashV1(to)
  ||!same(p.preservedRowIds,from.resources.map(r=>String(r.row_id)).sort())||from.resources.length!==153||to.resources.length!==169||from.parameters.length!==69||to.parameters.length!==75||to.formulas.length!==from.formulas.length+13
  ||new Set(to.resources.map(r=>r.row_id)).size!==169||new Set(to.parameters.map(r=>r.parameter_id)).size!==75)return null;
 const owners=roofLowerLayersOwnersV1(p.catalogId),assembly=from.resources.find(r=>r.row_id===ROOF_ASSEMBLY_SEMANTIC_ROW_V1);if(!assembly)return null;
 const expectedRows=[...owners.vapor.resources,...owners.clay.resources,...roofLowerLayersObligationsV1(assembly,p.catalogId)],expectedFormulas=[...owners.vapor.formulas,...owners.clay.formulas];
 const oldRows=new Map(from.resources.map(r=>[String(r.row_id),r])),newRows=new Map(to.resources.map(r=>[String(r.row_id),r]));
 const oldFormulas=new Map(from.formulas.map(r=>[String(r.formula_id),r])),newFormulas=new Map(to.formulas.map(r=>[String(r.formula_id),r])),fkeys=['ast','input_parameter_ids','output_unit_id'];
 if([...oldFormulas].some(([id,f])=>!same(pick(f,fkeys),pick(newFormulas.get(id)??{},fkeys))))return null;
 for(const [id,r]of oldRows)if(!newRows.has(id)||!same(pick(lowerLayersExistingRowV1(r),rowKeys),pick(newRows.get(id)!,rowKeys)))return null;
 const oldParams=new Map(from.parameters.map(r=>[String(r.parameter_id),r])),newParameters=[...owners.vapor.parameters,...owners.clay.parameters,owners.other];
 for(const next of to.parameters){const id=String(next.parameter_id),old=oldParams.get(id),expected=old?lowerLayersConditionParameterV1(old):newParameters.find(p=>p.parameter_id===id);
  if(!expected||!same(pick(expected,parameterKeys),pick(next,parameterKeys))||!same(authority(expected),authority(next)))return null;}
 const ownerIds=new Set(from.resources.map(r=>r.cost_owner_id));
 for(const expected of expectedRows){const r=newRows.get(expected.row_id);
  if(!r||!same(pick(expected,rowKeys),pick(r,rowKeys))||r.cost_owner_id==null||ownerIds.has(r.cost_owner_id))return null;ownerIds.add(r.cost_owner_id);}
 for(const f of expectedFormulas)if(!same(pick(f,fkeys),pick(newFormulas.get(f.formula_id)??{},fkeys)))return null;
 if(to.resources.some(r=>!oldRows.has(String(r.row_id))&&!expectedRows.some(n=>n.row_id===r.row_id)))return null;
 return {proof:p,normalizedTo:{...to,parameters:from.parameters,resources:to.resources.map(r=>oldRows.get(String(r.row_id))??r)},semanticAssemblyRowId:ROOF_ASSEMBLY_SEMANTIC_ROW_V1,lowerLayerOperationKeys:[ROOF_VAPOR_OPERATION_KEY_V1,ROOF_CLAY_OPERATION_KEY_V1]};
}
/** This transfer runs only while crossing the admitted definition boundary. */
export function migrateRoofLowerLayersSelectionV1(input:{selection:unknown;admitted:NonNullable<ReturnType<typeof admitRoofLowerLayersMigrationProofV1>>}){
 const s=parseCanonicalCompositionSelectionV1(input.selection);if(!s||!s.excludedRowIds.includes(input.admitted.semanticAssemblyRowId))return s;
 return parseCanonicalCompositionSelectionV1({...s,excludedOperationKeys:[...new Set([...s.excludedOperationKeys,...input.admitted.lowerLayerOperationKeys])]});
}
export type RoofLegacyAssemblySelectionOriginV1={originRevisionId:string;originChecksumSha256:string;originDefinitionId:string;originDefinitionSha256:string;originalRowId:string;transferredOperationKeys:string[];active:boolean};
export type RoofStageRestorationV4={contractVersion:'canonical-roof-stage-restoration/v4';catalogId:string;definitionId:string;definitionSha256:string;originalStages:RoofStageRestorationV3;originalStagesSha256:string;lowerLayersEndorsement:RoofLowerLayersMigrationProofV1;pairs:{rowId:string;operationKey:string}[];legacyAssemblySelectionOrigin:RoofLegacyAssemblySelectionOriginV1|null;receiptSha256:string};
function originDefinitions(previous:RoofStageRestorationV3){const v2=previous.originalStages,v1=v2.originalStages,p=v1.originalPreparationProof;
 return [{id:p.fromDefinitionId,sha256:p.fromDefinitionSha256},{id:p.toDefinitionId,sha256:p.toDefinitionSha256},{id:v1.valleyEndorsement.toDefinitionId,sha256:v1.valleyEndorsement.toDefinitionSha256},{id:v2.screedEndorsement.toDefinitionId,sha256:v2.screedEndorsement.toDefinitionSha256},{id:previous.metalTrimEndorsement.toDefinitionId,sha256:previous.metalTrimEndorsement.toDefinitionSha256}];}
function readOrigin(value:unknown,previous:RoofStageRestorationV3):RoofLegacyAssemblySelectionOriginV1|null {
 const o=record(value);return uuid.test(String(o.originRevisionId))&&sha.test(String(o.originChecksumSha256))&&originDefinitions(previous).some(d=>d.id===o.originDefinitionId&&d.sha256===o.originDefinitionSha256)
  &&o.originalRowId===ROOF_ASSEMBLY_SEMANTIC_ROW_V1&&same(o.transferredOperationKeys,[ROOF_VAPOR_OPERATION_KEY_V1,ROOF_CLAY_OPERATION_KEY_V1])&&typeof o.active==='boolean'?o as RoofLegacyAssemblySelectionOriginV1:null;
}
export function buildRoofStageRestorationV4(input:{lowerLayers:NonNullable<ReturnType<typeof admitRoofLowerLayersMigrationProofV1>>;previous:RoofStageRestorationV3;origin?:RoofLegacyAssemblySelectionOriginV1|null}):RoofStageRestorationV4 {
 const original=readRoofStageRestorationV3(input.previous),s=input.lowerLayers.proof;
 if(!original||original.catalogId!==s.catalogId||original.definitionId!==s.fromDefinitionId||original.definitionSha256!==s.fromDefinitionSha256||input.origin!=null&&!readOrigin(input.origin,original))throw Error('ROOF_LOWER_LAYERS_RESTORATION_CHAIN_INVALID');
 const body={contractVersion:'canonical-roof-stage-restoration/v4' as const,catalogId:s.catalogId,definitionId:s.toDefinitionId,definitionSha256:s.toDefinitionSha256,originalStages:original,originalStagesSha256:hash(original),lowerLayersEndorsement:s,
  pairs:[...original.pairs,...ROOF_LOWER_LAYER_PAIRS_V1],legacyAssemblySelectionOrigin:input.origin??null};return {...body,receiptSha256:hash(body)};
}
export function readRoofStageRestorationV4(value:unknown):RoofStageRestorationV4|null {
 const r=record(value),o=readRoofStageRestorationV3(r.originalStages),s=readRoofLowerLayersMigrationProofV1(r.lowerLayersEndorsement),{receiptSha256:_h,...body}=r;
 return r.contractVersion==='canonical-roof-stage-restoration/v4'&&o&&s&&r.catalogId===s.catalogId&&o.catalogId===s.catalogId&&o.definitionId===s.fromDefinitionId&&o.definitionSha256===s.fromDefinitionSha256
  &&r.definitionId===s.toDefinitionId&&r.definitionSha256===s.toDefinitionSha256&&r.originalStagesSha256===hash(o)&&same(r.pairs,[...o.pairs,...ROOF_LOWER_LAYER_PAIRS_V1])
  &&(r.legacyAssemblySelectionOrigin===null||readOrigin(r.legacyAssemblySelectionOrigin,o))&&r.receiptSha256===hash(body)?r as RoofStageRestorationV4:null;
}
/** Directional legacy transfer is applied exactly once to original intent.
 * An added assembly ROW never becomes another request to restore both OPs. */
/** Excluding a new semantic stage also excludes its own physical operation.
 * Historical assembly intent and neighbouring stages are never expanded here. */
export function roofStageExcludeTargetsV4(input:{receipt:unknown;definitionId:unknown;catalogId:unknown;rowIds:readonly string[];operationKeys:readonly string[]}){
 const r=readRoofStageRestorationV4(input.receipt),ops=new Set(input.operationKeys);
 if(r&&r.definitionId===input.definitionId&&r.catalogId===input.catalogId)
  for(const pair of ROOF_LOWER_LAYER_PAIRS_V1)if(input.rowIds.includes(pair.rowId))ops.add(pair.operationKey);
 return {rowIds:[...input.rowIds],operationKeys:[...ops]};
}
export function roofStageRestoreTargetsV4(input:{receipt:unknown;definitionId:unknown;catalogId:unknown;rowIds:readonly string[];operationKeys:readonly string[]}){
 const r=readRoofStageRestorationV4(input.receipt);if(!r||r.definitionId!==input.definitionId||r.catalogId!==input.catalogId)return {rowIds:[...input.rowIds],operationKeys:[...input.operationKeys]};
 const rows=new Set(input.rowIds),ops=new Set(input.operationKeys);
 const requestedAssembly=rows.has(ROOF_ASSEMBLY_SEMANTIC_ROW_V1),requestedLayerOps=new Set<string>();
 for(const pair of ROOF_LOWER_LAYER_PAIRS_V1)if(rows.has(pair.rowId)||ops.has(pair.operationKey))requestedLayerOps.add(pair.operationKey);
 if(r.legacyAssemblySelectionOrigin?.active){
  if(requestedAssembly)for(const op of r.legacyAssemblySelectionOrigin.transferredOperationKeys)ops.add(op);
  if(requestedLayerOps.size>0)rows.add(ROOF_ASSEMBLY_SEMANTIC_ROW_V1);
 }
 for(const pair of ROOF_LOWER_LAYER_PAIRS_V1)if(rows.has(pair.rowId)||ops.has(pair.operationKey)){rows.add(pair.rowId);ops.add(pair.operationKey);}
 return roofStageRestoreTargetsV3({receipt:r.originalStages,definitionId:r.originalStages.definitionId,catalogId:r.catalogId,rowIds:[...rows],operationKeys:[...ops]});
}
/** Creates origin from the authorized immutable source parent and the
 * effective requested selection. A simultaneous full restore stays inactive. */
export function createRoofLegacyAssemblySelectionOriginV1(input:{receipt:RoofStageRestorationV4;sourceRevisionId:string;sourceChecksumSha256:string;sourceDefinition:Identity;parentSelection:unknown;effectiveSelection:unknown}):RoofLegacyAssemblySelectionOriginV1|null {
 const receipt=readRoofStageRestorationV4(input.receipt),parent=parseCanonicalCompositionSelectionV1(input.parentSelection),selection=parseCanonicalCompositionSelectionV1(input.effectiveSelection);
 if(!receipt||!parent?.excludedRowIds.includes(ROOF_ASSEMBLY_SEMANTIC_ROW_V1))return null;
 const origin={originRevisionId:input.sourceRevisionId,originChecksumSha256:input.sourceChecksumSha256,originDefinitionId:input.sourceDefinition.id,originDefinitionSha256:input.sourceDefinition.sha256,originalRowId:ROOF_ASSEMBLY_SEMANTIC_ROW_V1,transferredOperationKeys:[ROOF_VAPOR_OPERATION_KEY_V1,ROOF_CLAY_OPERATION_KEY_V1],
  active:!!selection?.excludedRowIds.includes(ROOF_ASSEMBLY_SEMANTIC_ROW_V1)&&[ROOF_VAPOR_OPERATION_KEY_V1,ROOF_CLAY_OPERATION_KEY_V1].every(op=>selection?.excludedOperationKeys.includes(op))};
 if(input.sourceDefinition.catalogId!==receipt.catalogId||!readOrigin(origin,receipt.originalStages))throw Error('ROOF_ASSEMBLY_ORIGIN_SOURCE_INVALID');return origin;
}
/** Server checks the final saved selection delta. It never expands removed
 * targets again, and never reactivates a consumed historical group intent. */
export function consumeRoofLegacyAssemblySelectionOriginV1(input:{receipt:unknown;parentSelection:unknown;effectiveSelection:unknown}):RoofLegacyAssemblySelectionOriginV1|null {
 const receipt=readRoofStageRestorationV4(input.receipt),origin=receipt?.legacyAssemblySelectionOrigin;if(!origin)return null;if(!origin.active)return origin;
 const before=parseCanonicalCompositionSelectionV1(input.parentSelection),after=parseCanonicalCompositionSelectionV1(input.effectiveSelection);if(!before)throw Error('ROOF_ASSEMBLY_ORIGIN_SELECTION_INVALID');
 const changed=before.excludedRowIds.includes(origin.originalRowId)&&!after?.excludedRowIds.includes(origin.originalRowId)
  ||origin.transferredOperationKeys.some(op=>before.excludedOperationKeys.includes(op)&&!after?.excludedOperationKeys.includes(op));
 return changed?{...origin,active:false}:origin;
}
/** Only migration binding checks use the historical model, never calculation. */
export function composeRoofLowerLayersMigrationModelV1(lower:NonNullable<ReturnType<typeof admitRoofLowerLayersMigrationProofV1>>,previous:Model):Model {
 const rows=new Map(previous.resources.map(r=>[String(r.row_id),r]));return {...lower.normalizedTo,parameters:previous.parameters,resources:lower.normalizedTo.resources.map(r=>rows.get(String(r.row_id))??r)};
}
