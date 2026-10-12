import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {ROOF_HANGING_GUTTERS_PACK_V1 as pack,ROOF_WATER_SEMANTIC_ROWS_V1 as waterRows,ROOF_GUTTER_SCOPE_ROW_V1 as gutterRow,ROOF_GUTTER_OPERATION_KEY_V1 as gutterOp,ROOF_OTHER_DRAINAGE_PARAMETER_V1 as otherId,roofGutterOwnerV1,roofGutterObligationV1,roofGutterExistingRowV1} from './canonicalRoofHangingGuttersCompanionV1';
import {roofPreparationMigrationSemanticHashV1,type RoofPreparationMigrationModelV1 as Model,type RoofPreparationDefinitionIdentityV1 as Identity} from './canonicalRoofPreparationMigrationV1';
import {readRoofStageRestorationV4,type RoofStageRestorationV4,type RoofLegacyAssemblySelectionOriginV1,ROOF_LOWER_LAYERS_QUESTION_PARAMETER_IDS_V1} from './canonicalRoofLowerLayersMigrationV1';
import {ROOF_ASSEMBLY_SEMANTIC_ROW_V1 as assemblyRow,ROOF_LOWER_LAYER_PAIRS_V1 as lowerPairs,ROOF_VAPOR_OPERATION_KEY_V1 as vaporOp,ROOF_CLAY_OPERATION_KEY_V1 as clayOp,ROOF_LOWER_LAYERS_PACK_V1 as lowerPack} from './canonicalRoofLowerLayersCompanionV1';
import {roofStageRestoreTargetsV3} from './canonicalRoofMetalTrimMigrationV1';
import {parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
type Json=Record<string,unknown>;
const record=(v:unknown):Json=>v!=null&&typeof v==='object'&&!Array.isArray(v)?v as Json:{};
const same=(a:unknown,b:unknown)=>canonicalEstimateStableJson(a)===canonicalEstimateStableJson(b);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const pick=(v:Json,keys:string[])=>Object.fromEntries(keys.map(k=>[k,v[k]??null]));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu,sha=/^[0-9a-f]{64}$/u;
export type RoofHangingGuttersMigrationProofV1={contractVersion:'canonical-roof-hanging-gutters-migration-proof/v1';fromDefinitionId:string;toDefinitionId:string;catalogId:string;fromDefinitionSha256:string;toDefinitionSha256:string;fromSemanticSha256:string;toSemanticSha256:string;sourceSha256:string;preservedRowIds:string[]};
type Input={fromDefinition:Identity;toDefinition:Identity;from:Model;to:Model};
export function readRoofHangingGuttersMigrationProofV1(value:unknown):RoofHangingGuttersMigrationProofV1|null {
 const p=record(value);return p.contractVersion==='canonical-roof-hanging-gutters-migration-proof/v1'&&pack.targets.some(t=>t.catalogId===p.catalogId&&t.predecessorDefinitionId===p.fromDefinitionId)
  &&uuid.test(String(p.fromDefinitionId))&&uuid.test(String(p.toDefinitionId))&&p.fromDefinitionId!==p.toDefinitionId&&['fromDefinitionSha256','toDefinitionSha256','fromSemanticSha256','toSemanticSha256'].every(k=>sha.test(String(p[k])))&&p.sourceSha256===pack.sources[0]!.sha256
  &&Array.isArray(p.preservedRowIds)&&p.preservedRowIds.length===169&&p.preservedRowIds.every(id=>typeof id==='string')&&new Set(p.preservedRowIds).size===169?p as RoofHangingGuttersMigrationProofV1:null;
}
export function buildRoofHangingGuttersMigrationProofV1(i:Input):RoofHangingGuttersMigrationProofV1{return {contractVersion:'canonical-roof-hanging-gutters-migration-proof/v1',fromDefinitionId:i.fromDefinition.id,toDefinitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,fromDefinitionSha256:i.fromDefinition.sha256,toDefinitionSha256:i.toDefinition.sha256,fromSemanticSha256:roofPreparationMigrationSemanticHashV1(i.from),toSemanticSha256:roofPreparationMigrationSemanticHashV1(i.to),sourceSha256:pack.sources[0]!.sha256,preservedRowIds:i.from.resources.map(r=>String(r.row_id)).sort()};}
const rowKeys=['title_ru','formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','inclusion_ast','resource_graph','source_metadata'];
const paramKeys=['title_ru','value_type','unit_id','required','default_value','constraints_json'];
function authority(p:Json){const{contract:_c,formula_consumers:_f,resource_branch_consumers:_r,...rest}=record(p.truth_metadata);return rest;}
export function admitRoofHangingGuttersMigrationProofV1(i:Input&{proof:unknown}){
 const p=readRoofHangingGuttersMigrationProofV1(i.proof),from=i.from,to=i.to;
 if(!p||p.catalogId!==i.fromDefinition.catalogId||p.catalogId!==i.toDefinition.catalogId||p.fromDefinitionId!==i.fromDefinition.id||p.toDefinitionId!==i.toDefinition.id||p.fromDefinitionSha256!==i.fromDefinition.sha256||p.toDefinitionSha256!==i.toDefinition.sha256||p.fromSemanticSha256!==roofPreparationMigrationSemanticHashV1(from)||p.toSemanticSha256!==roofPreparationMigrationSemanticHashV1(to)
  ||!same(p.preservedRowIds,from.resources.map(r=>String(r.row_id)).sort())||from.resources.length!==169||to.resources.length!==178||from.parameters.length!==75||to.parameters.length!==78||to.formulas.length!==from.formulas.length+8||new Set(to.resources.map(r=>r.row_id)).size!==178||new Set(to.parameters.map(r=>r.parameter_id)).size!==78)return null;
 const owner=roofGutterOwnerV1(p.catalogId),original=from.resources.find(r=>r.row_id===waterRows[0]);if(!original)return null;
 const rows=[...owner.resources,roofGutterObligationV1(original,p.catalogId)],oldRows=new Map(from.resources.map(r=>[String(r.row_id),r])),newRows=new Map(to.resources.map(r=>[String(r.row_id),r]));
 const fkeys=['ast','input_parameter_ids','output_unit_id'],newFormulas=new Map(to.formulas.map(r=>[String(r.formula_id),r]));
 if(from.formulas.some(f=>!same(pick(f,fkeys),pick(newFormulas.get(String(f.formula_id))??{},fkeys))))return null;
 for(const[id,r]of oldRows)if(!newRows.has(id)||!same(pick(roofGutterExistingRowV1(r),rowKeys),pick(newRows.get(id)!,rowKeys)))return null;
 const oldParams=new Map(from.parameters.map(p=>[String(p.parameter_id),p]));
 for(const next of to.parameters){const expected=oldParams.get(String(next.parameter_id))??owner.parameters.find(p=>p.parameter_id===next.parameter_id);if(!expected||!same(pick(expected,paramKeys),pick(next,paramKeys))||!same(authority(expected),authority(next)))return null;}
 const ownerIds=new Set(from.resources.map(r=>r.cost_owner_id));
 for(const expected of rows){const actual=newRows.get(expected.row_id);if(!actual||!same(pick(expected,rowKeys),pick(actual,rowKeys))||actual.cost_owner_id==null||ownerIds.has(actual.cost_owner_id))return null;ownerIds.add(actual.cost_owner_id);}
 for(const f of owner.formulas)if(!same(pick(f,fkeys),pick(newFormulas.get(f.formula_id)??{},fkeys)))return null;
 if(to.resources.some(r=>!oldRows.has(String(r.row_id))&&!rows.some(n=>n.row_id===r.row_id)))return null;
 return {proof:p,normalizedTo:{...to,parameters:from.parameters,resources:to.resources.map(r=>oldRows.get(String(r.row_id))??r)},semanticWaterRowIds:[...waterRows],gutterOperationKey:gutterOp};
}
export function migrateRoofHangingGuttersSelectionV1(input:{selection:unknown;admitted:NonNullable<ReturnType<typeof admitRoofHangingGuttersMigrationProofV1>>}){
 const s=parseCanonicalCompositionSelectionV1(input.selection);if(!s)return s;const count=input.admitted.semanticWaterRowIds.filter(id=>s.excludedRowIds.includes(id)).length;
 if(count>0&&count<waterRows.length)throw Object.assign(new Error('Ранее исключены отдельно материал или монтаж водостока. Восстановите эти прежние исключения, затем выберите нужный этап желобов. Исходная смета сохранена; приложение не меняет частичное намерение автоматически.'),{code:'COMPOSITION_MIGRATION_AMBIGUOUS',httpStatus:409});
 return count===0?s:parseCanonicalCompositionSelectionV1({...s,excludedOperationKeys:[...new Set([...s.excludedOperationKeys,gutterOp])]});
}
export type RoofLegacyWaterSelectionOriginV1={originRevisionId:string;originChecksumSha256:string;originDefinitionId:string;originDefinitionSha256:string;originalRowIds:string[];transferredOperationKeys:string[];active:boolean};
export type RoofStageRestorationV5={contractVersion:'canonical-roof-stage-restoration/v5';catalogId:string;definitionId:string;definitionSha256:string;originalV4:RoofStageRestorationV4;originalV4Sha256:string;guttersEndorsement:RoofHangingGuttersMigrationProofV1;pairs:{rowId:string;operationKey:string}[];effectiveAssemblyOrigin:RoofLegacyAssemblySelectionOriginV1|null;effectiveWaterOrigin:RoofLegacyWaterSelectionOriginV1|null;receiptSha256:string};
function originDefinitions(v4:RoofStageRestorationV4){const v3=v4.originalStages,v2=v3.originalStages,v1=v2.originalStages,p=v1.originalPreparationProof;return [{id:p.fromDefinitionId,sha256:p.fromDefinitionSha256},{id:p.toDefinitionId,sha256:p.toDefinitionSha256},{id:v1.valleyEndorsement.toDefinitionId,sha256:v1.valleyEndorsement.toDefinitionSha256},{id:v2.screedEndorsement.toDefinitionId,sha256:v2.screedEndorsement.toDefinitionSha256},{id:v3.metalTrimEndorsement.toDefinitionId,sha256:v3.metalTrimEndorsement.toDefinitionSha256},{id:v4.definitionId,sha256:v4.definitionSha256}];}
function waterOriginValid(o:unknown,v4:RoofStageRestorationV4){const r=record(o);return uuid.test(String(r.originRevisionId))&&sha.test(String(r.originChecksumSha256))&&originDefinitions(v4).some(d=>d.id===r.originDefinitionId&&d.sha256===r.originDefinitionSha256)&&same(r.originalRowIds,waterRows)&&same(r.transferredOperationKeys,[gutterOp])&&typeof r.active==='boolean';}
function assemblyOriginValid(o:unknown,v4:RoofStageRestorationV4){const original=v4.legacyAssemblySelectionOrigin;if(original===null)return o===null;const r=record(o),{active:_a,...identity}=r,{active:_b,...originalIdentity}=original;return same(identity,originalIdentity)&&typeof r.active==='boolean'&&(original.active||r.active===false);}
export function buildRoofStageRestorationV5(input:{gutters:NonNullable<ReturnType<typeof admitRoofHangingGuttersMigrationProofV1>>;previous:RoofStageRestorationV4;assemblyOrigin?:RoofLegacyAssemblySelectionOriginV1|null;waterOrigin?:RoofLegacyWaterSelectionOriginV1|null}):RoofStageRestorationV5 {
 const original=readRoofStageRestorationV4(input.previous),s=input.gutters.proof,assembly=input.assemblyOrigin===undefined?original?.legacyAssemblySelectionOrigin??null:input.assemblyOrigin,water=input.waterOrigin??null;
 if(!original||original.catalogId!==s.catalogId||original.definitionId!==s.fromDefinitionId||original.definitionSha256!==s.fromDefinitionSha256||!assemblyOriginValid(assembly,original)||water!=null&&!waterOriginValid(water,original))throw Error('ROOF_GUTTERS_RESTORATION_CHAIN_INVALID');
 const body={contractVersion:'canonical-roof-stage-restoration/v5' as const,catalogId:s.catalogId,definitionId:s.toDefinitionId,definitionSha256:s.toDefinitionSha256,originalV4:original,originalV4Sha256:hash(original),guttersEndorsement:s,pairs:[...original.pairs,{rowId:gutterRow,operationKey:gutterOp}],effectiveAssemblyOrigin:assembly,effectiveWaterOrigin:water};return {...body,receiptSha256:hash(body)};
}
export function readRoofStageRestorationV5(value:unknown):RoofStageRestorationV5|null {
 const r=record(value),o=readRoofStageRestorationV4(r.originalV4),s=readRoofHangingGuttersMigrationProofV1(r.guttersEndorsement),{receiptSha256:_h,...body}=r;
 return r.contractVersion==='canonical-roof-stage-restoration/v5'&&o&&s&&r.catalogId===s.catalogId&&o.catalogId===s.catalogId&&o.definitionId===s.fromDefinitionId&&o.definitionSha256===s.fromDefinitionSha256&&r.definitionId===s.toDefinitionId&&r.definitionSha256===s.toDefinitionSha256&&r.originalV4Sha256===hash(o)&&same(r.pairs,[...o.pairs,{rowId:gutterRow,operationKey:gutterOp}])&&assemblyOriginValid(r.effectiveAssemblyOrigin,o)&&(r.effectiveWaterOrigin===null||waterOriginValid(r.effectiveWaterOrigin,o))&&r.receiptSha256===hash(body)?r as RoofStageRestorationV5:null;
}
type TargetInput={receipt:unknown;definitionId:unknown;catalogId:unknown;rowIds:readonly string[];operationKeys:readonly string[]};
const newPairs=[...lowerPairs,{rowId:gutterRow,operationKey:gutterOp}];
export function roofStageExcludeTargetsV5(input:TargetInput){const r=readRoofStageRestorationV5(input.receipt),ops=new Set(input.operationKeys);if(r&&r.definitionId===input.definitionId&&r.catalogId===input.catalogId)for(const p of newPairs)if(input.rowIds.includes(p.rowId))ops.add(p.operationKey);return {rowIds:[...input.rowIds],operationKeys:[...ops]};}
/** Apply historical directional intents once to raw user targets. Nested V4
 * is immutable evidence, never the current state of a consumed intent. */
export function roofStageRestoreTargetsV5(input:TargetInput){
 const r=readRoofStageRestorationV5(input.receipt);if(!r||r.definitionId!==input.definitionId||r.catalogId!==input.catalogId)return {rowIds:[...input.rowIds],operationKeys:[...input.operationKeys]};
 const rows=new Set(input.rowIds),ops=new Set(input.operationKeys),requestedLower=lowerPairs.some(p=>input.rowIds.includes(p.rowId)||input.operationKeys.includes(p.operationKey)),requestedGutter=input.rowIds.includes(gutterRow)||input.operationKeys.includes(gutterOp);
 if(r.effectiveAssemblyOrigin?.active){if(input.rowIds.includes(assemblyRow))for(const op of r.effectiveAssemblyOrigin.transferredOperationKeys)ops.add(op);if(requestedLower)rows.add(assemblyRow);}
 if(r.effectiveWaterOrigin?.active){if(input.rowIds.some(id=>waterRows.includes(id)))ops.add(gutterOp);if(requestedGutter||input.rowIds.some(id=>waterRows.includes(id)))for(const row of waterRows)rows.add(row);}
 for(const p of newPairs)if(rows.has(p.rowId)||ops.has(p.operationKey)){rows.add(p.rowId);ops.add(p.operationKey);}
 const v3=r.originalV4.originalStages;return roofStageRestoreTargetsV3({receipt:v3,definitionId:v3.definitionId,catalogId:r.catalogId,rowIds:[...rows],operationKeys:[...ops]});
}
export function createRoofLegacyWaterSelectionOriginV1(input:{receipt:RoofStageRestorationV5;sourceRevisionId:string;sourceChecksumSha256:string;sourceDefinition:Identity;parentSelection:unknown;effectiveSelection:unknown}):RoofLegacyWaterSelectionOriginV1|null {
 const receipt=readRoofStageRestorationV5(input.receipt),parent=parseCanonicalCompositionSelectionV1(input.parentSelection),selection=parseCanonicalCompositionSelectionV1(input.effectiveSelection);if(!receipt||!waterRows.every(id=>parent?.excludedRowIds.includes(id)))return null;
 const origin={originRevisionId:input.sourceRevisionId,originChecksumSha256:input.sourceChecksumSha256,originDefinitionId:input.sourceDefinition.id,originDefinitionSha256:input.sourceDefinition.sha256,originalRowIds:[...waterRows],transferredOperationKeys:[gutterOp],active:waterRows.every(id=>selection?.excludedRowIds.includes(id))&&!!selection?.excludedOperationKeys.includes(gutterOp)};
 if(input.sourceDefinition.catalogId!==receipt.catalogId||!waterOriginValid(origin,receipt.originalV4))throw Error('ROOF_WATER_ORIGIN_SOURCE_INVALID');return origin;
}
export function consumeRoofStageOriginsV5(input:{receipt:unknown;parentSelection:unknown;effectiveSelection:unknown}){
 const r=readRoofStageRestorationV5(input.receipt);if(!r)throw Error('ROOF_GUTTERS_ORIGIN_RECEIPT_INVALID');const before=parseCanonicalCompositionSelectionV1(input.parentSelection),after=parseCanonicalCompositionSelectionV1(input.effectiveSelection);
 const consume=<T extends {active:boolean;transferredOperationKeys:string[]}>(origin:T|null,rowIds:string[]):T|null=>{if(!origin?.active)return origin;if(!before)throw Error('ROOF_GUTTERS_ORIGIN_SELECTION_INVALID');const removed=rowIds.some(id=>before.excludedRowIds.includes(id)&&!after?.excludedRowIds.includes(id))||origin.transferredOperationKeys.some(op=>before.excludedOperationKeys.includes(op)&&!after?.excludedOperationKeys.includes(op));return removed?{...origin,active:false}:origin;};
 return {assemblyOrigin:consume(r.effectiveAssemblyOrigin,[assemblyRow]),waterOrigin:consume(r.effectiveWaterOrigin,waterRows)};
}
export const ROOF_GUTTERS_QUESTION_PARAMETER_IDS_V1=[...ROOF_LOWER_LAYERS_QUESTION_PARAMETER_IDS_V1,pack.systemParameterId,pack.measurementParameterId,otherId];
export function roofGuttersInactiveParameterIdsV1(input:{receipt:unknown;definitionId:unknown;catalogId:unknown;selection:unknown}):string[]{const r=readRoofStageRestorationV5(input.receipt),s=parseCanonicalCompositionSelectionV1(input.selection);if(!r||r.definitionId!==input.definitionId||r.catalogId!==input.catalogId||!s)return [];return [...(s.excludedOperationKeys.includes(vaporOp)?[lowerPack.vapor.systemParameterId,lowerPack.vapor.measurementParameterId]:[]),...(s.excludedOperationKeys.includes(clayOp)?[lowerPack.clay.systemParameterId,lowerPack.clay.areaParameterIdForGeometry,lowerPack.clay.thicknessParameterId]:[]),...(s.excludedRowIds.includes(assemblyRow)?['roof_other_layers_scope']:[]),...(s.excludedOperationKeys.includes(gutterOp)?[pack.systemParameterId,pack.measurementParameterId]:[]),...(waterRows.every(id=>s.excludedRowIds.includes(id))?[otherId]:[])];}
export function composeRoofGuttersMigrationModelV1(gutters:NonNullable<ReturnType<typeof admitRoofHangingGuttersMigrationProofV1>>,previous:Model):Model {const rows=new Map(previous.resources.map(r=>[String(r.row_id),r]));return {...gutters.normalizedTo,parameters:previous.parameters,resources:gutters.normalizedTo.resources.map(r=>rows.get(String(r.row_id))??r)};}
