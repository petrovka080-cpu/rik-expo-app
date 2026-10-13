import { canonicalEstimateStableJson as stable } from './canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { roofPreparationMigrationSemanticHashV1 as semanticHash, type RoofPreparationMigrationModelV1 as Model,
  type RoofPreparationDefinitionIdentityV1 as Identity } from './canonicalRoofPreparationMigrationV1';
import { roofScreed25SuccessorModelV1 } from './canonicalRoofScreed25SuccessorV1';
import { ROOF_SCREED25_PACK_V1 as pack, ROOF_SCREED25_OPERATION_KEY_V1 } from './canonicalRoofScreed25CompanionV1';
import { ROOF_SCREED_OPERATION_KEY_V1 } from './canonicalRoofScreedCompanionV1';
export { ROOF_SCREED25_OPERATION_KEY_V1 } from './canonicalRoofScreed25CompanionV1';
import { ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1 } from './canonicalRoofScreedDirectBaseV1';
import { readRoofStageRestorationV5, buildRoofStageRestorationV5, roofStageExcludeTargetsV5, roofStageRestoreTargetsV5,
  consumeRoofStageOriginsV5, roofGuttersInactiveParameterIdsV1, type RoofStageRestorationV5,
  type RoofLegacyWaterSelectionOriginV1 } from './canonicalRoofHangingGuttersMigrationV1';
import type { RoofLegacyAssemblySelectionOriginV1 } from './canonicalRoofLowerLayersMigrationV1';
import { parseCanonicalCompositionSelectionV1 } from './canonicalEstimateCompositionSelectionV1';

type Json = Record<string, any>;
const record = (v: unknown): Json => v != null && typeof v === 'object' && !Array.isArray(v) ? v as Json : {};
const hash = (v: unknown) => canonicalEstimateSha256HexText(stable(v));
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const sha = /^[a-f0-9]{64}$/u, uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
export const ROOF_SCREED25_SCOPE_ROW_V1 = pack.prefix + ':project-scope';
export const ROOF_SCREED15_BASE_SCOPE_ROW_V1 = 'roof:cement-screed15:krer12-017-01:direct-base-check';
export const ROOF_SCREED25_QUESTION_PARAMETER_IDS_V1 = [pack.measurementParameterId,pack.areaParameterId,pack.conditionsParameterId,ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1];
export type RoofScreed25MigrationProofV1 = {contractVersion: 'canonical-roof-screed25-migration-proof/v1'; catalogId: string;
  fromDefinitionId: string; toDefinitionId: string; fromDefinitionSha256: string; toDefinitionSha256: string;
  fromSemanticSha256: string; toSemanticSha256: string; sourceSha256: string; directBaseSourceSha256: string; preservedRowIds: string[]};
type Input = {fromDefinition: Identity; toDefinition: Identity; from: Model; to: Model};
export function readRoofScreed25MigrationProofV1(value: unknown): RoofScreed25MigrationProofV1 | null {
  const p = record(value), target = pack.targets.find(t => t.catalogId === p.catalogId);
  return p.contractVersion === 'canonical-roof-screed25-migration-proof/v1' && target
    && p.fromDefinitionId === target.predecessorDefinitionId && p.fromDefinitionSha256 === target.predecessorDefinitionSha256
    && uuid.test(p.toDefinitionId) && p.toDefinitionId !== p.fromDefinitionId
    && ['fromSemanticSha256','toSemanticSha256','toDefinitionSha256'].every(k => sha.test(p[k]))
    && p.sourceSha256 === pack.sources[0]!.sha256 && p.directBaseSourceSha256 === pack.sources[1]!.sha256
    && Array.isArray(p.preservedRowIds) && p.preservedRowIds.length === 178 && p.preservedRowIds.every((id: unknown) => typeof id === 'string')
    && new Set(p.preservedRowIds).size === 178 ? p as RoofScreed25MigrationProofV1 : null;
}
export function buildRoofScreed25MigrationProofV1(i: Input): RoofScreed25MigrationProofV1 {
  return {contractVersion:'canonical-roof-screed25-migration-proof/v1', catalogId:i.toDefinition.catalogId,
    fromDefinitionId:i.fromDefinition.id, toDefinitionId:i.toDefinition.id, fromDefinitionSha256:i.fromDefinition.sha256,
    toDefinitionSha256:i.toDefinition.sha256, fromSemanticSha256:semanticHash(i.from), toSemanticSha256:semanticHash(i.to),
    sourceSha256:pack.sources[0]!.sha256, directBaseSourceSha256:pack.sources[1]!.sha256,
    preservedRowIds:i.from.resources.map(r => String(r.row_id)).sort()};
}
export function admitRoofScreed25MigrationProofV1(i: Input & {proof: unknown}) {
  const p = readRoofScreed25MigrationProofV1(i.proof);
  if (!p || p.catalogId !== i.fromDefinition.catalogId || p.catalogId !== i.toDefinition.catalogId
    || p.fromDefinitionId !== i.fromDefinition.id || p.toDefinitionId !== i.toDefinition.id
    || p.fromDefinitionSha256 !== i.fromDefinition.sha256 || p.toDefinitionSha256 !== i.toDefinition.sha256
    || p.fromSemanticSha256 !== semanticHash(i.from) || p.toSemanticSha256 !== semanticHash(i.to)
    || !same(p.preservedRowIds, i.from.resources.map(r => String(r.row_id)).sort())
    || i.to.resources.length !== 188 || i.to.parameters.length !== 82 || i.to.formulas.length !== i.from.formulas.length + 8
    || new Set(i.to.resources.map(r => r.row_id)).size !== 188 || new Set(i.to.parameters.map(r => r.parameter_id)).size !== 82) return null;
  const expected = roofScreed25SuccessorModelV1(i.from, p.catalogId);
  if (semanticHash(expected) !== p.toSemanticSha256) return null;
  const old = new Map(i.from.resources.map(r => [String(r.row_id), r]));
  // Normalization is evidence for unchanged historical rate/exclusion bindings.
  // Physical calculation ALWAYS uses the actual successor with the new base guard.
  return {proof:p, normalizedTo:{...i.to, parameters:i.from.parameters, resources:i.to.resources.map(r => old.get(String(r.row_id)) ?? r)}};
}
export function composeRoofScreed25MigrationModelV1(admitted: NonNullable<ReturnType<typeof admitRoofScreed25MigrationProofV1>>, previous: Model): Model {
  const rows = new Map(previous.resources.map(r => [String(r.row_id), r]));
  return {...admitted.normalizedTo, parameters:previous.parameters, resources:admitted.normalizedTo.resources.map(r => rows.get(String(r.row_id)) ?? r)};
}
export type RoofStageRestorationV6 = {contractVersion:'canonical-roof-stage-restoration/v6'; catalogId:string; definitionId:string;
  definitionSha256:string; originalV5:RoofStageRestorationV5; originalV5Sha256:string; screed25Endorsement:RoofScreed25MigrationProofV1;
  pairs:{rowId:string;operationKey:string}[]; effectiveAssemblyOrigin:RoofLegacyAssemblySelectionOriginV1|null;
  effectiveWaterOrigin:RoofLegacyWaterSelectionOriginV1|null; receiptSha256:string};
function validOrigin(actual: unknown, original: unknown) {
  if (original === null) return actual === null;
  const {active:a,...identity} = record(actual), {active:b,...source} = record(original);
  return same(identity,source) && typeof a === 'boolean' && (b === true || a === false);
}
export function buildRoofStageRestorationV6(input:{screed25:NonNullable<ReturnType<typeof admitRoofScreed25MigrationProofV1>>;
  previous:RoofStageRestorationV5; assemblyOrigin?:RoofLegacyAssemblySelectionOriginV1|null; waterOrigin?:RoofLegacyWaterSelectionOriginV1|null}):RoofStageRestorationV6 {
  const original = readRoofStageRestorationV5(input.previous), proof = input.screed25.proof;
  const assembly = input.assemblyOrigin === undefined ? original?.effectiveAssemblyOrigin ?? null : input.assemblyOrigin;
  const water = input.waterOrigin === undefined ? original?.effectiveWaterOrigin ?? null : input.waterOrigin;
  if (!original || original.catalogId !== proof.catalogId || original.definitionId !== proof.fromDefinitionId
    || original.definitionSha256 !== proof.fromDefinitionSha256 || !validOrigin(assembly,original.effectiveAssemblyOrigin)
    || !validOrigin(water,original.effectiveWaterOrigin)) throw Error('ROOF_SCREED25_RESTORATION_CHAIN_INVALID');
  const body = {contractVersion:'canonical-roof-stage-restoration/v6' as const,catalogId:proof.catalogId,definitionId:proof.toDefinitionId,
    definitionSha256:proof.toDefinitionSha256,originalV5:original,originalV5Sha256:hash(original),screed25Endorsement:proof,
    pairs:[...original.pairs,{rowId:ROOF_SCREED25_SCOPE_ROW_V1,operationKey:ROOF_SCREED25_OPERATION_KEY_V1}],
    effectiveAssemblyOrigin:assembly,effectiveWaterOrigin:water};
  return {...body,receiptSha256:hash(body)};
}
export function readRoofStageRestorationV6(value:unknown):RoofStageRestorationV6|null {
  const r=record(value), original=readRoofStageRestorationV5(r.originalV5),p=readRoofScreed25MigrationProofV1(r.screed25Endorsement),{receiptSha256:_h,...body}=r;
  return r.contractVersion==='canonical-roof-stage-restoration/v6'&&original&&p&&r.catalogId===p.catalogId&&original.catalogId===p.catalogId
    &&original.definitionId===p.fromDefinitionId&&original.definitionSha256===p.fromDefinitionSha256
    &&r.definitionId===p.toDefinitionId&&r.definitionSha256===p.toDefinitionSha256&&r.originalV5Sha256===hash(original)
    &&same(r.pairs,[...original.pairs,{rowId:ROOF_SCREED25_SCOPE_ROW_V1,operationKey:ROOF_SCREED25_OPERATION_KEY_V1}])
    &&validOrigin(r.effectiveAssemblyOrigin,original.effectiveAssemblyOrigin)&&validOrigin(r.effectiveWaterOrigin,original.effectiveWaterOrigin)
    &&r.receiptSha256===hash(body)?r as RoofStageRestorationV6:null;
}
function currentV5(r:RoofStageRestorationV6):RoofStageRestorationV5 {
  return buildRoofStageRestorationV5({gutters:{proof:r.originalV5.guttersEndorsement} as NonNullable<ReturnType<typeof import('./canonicalRoofHangingGuttersMigrationV1').admitRoofHangingGuttersMigrationProofV1>>,
    previous:r.originalV5.originalV4,assemblyOrigin:r.effectiveAssemblyOrigin,waterOrigin:r.effectiveWaterOrigin});
}
type Targets={receipt:unknown;definitionId:unknown;catalogId:unknown;rowIds:readonly string[];operationKeys:readonly string[]};
function targets(input:Targets, restore:boolean) {
  const r=readRoofStageRestorationV6(input.receipt);
  if(!r||r.definitionId!==input.definitionId||r.catalogId!==input.catalogId)return {rowIds:[...input.rowIds],operationKeys:[...input.operationKeys]};
  const rowIds=new Set(input.rowIds),ops=new Set(input.operationKeys);
  if(rowIds.has(ROOF_SCREED25_SCOPE_ROW_V1)||ops.has(ROOF_SCREED25_OPERATION_KEY_V1)){
    if(restore)rowIds.add(ROOF_SCREED25_SCOPE_ROW_V1);ops.add(ROOF_SCREED25_OPERATION_KEY_V1);
  }
  const receipt=currentV5(r);
  return (restore?roofStageRestoreTargetsV5:roofStageExcludeTargetsV5)({...input,receipt,definitionId:receipt.definitionId,rowIds:[...rowIds],operationKeys:[...ops]});
}
export const roofStageExcludeTargetsV6=(input:Targets)=>targets(input,false);
export const roofStageRestoreTargetsV6=(input:Targets)=>targets(input,true);
export function consumeRoofStageOriginsV6(input:{receipt:unknown;parentSelection:unknown;effectiveSelection:unknown}) {
  const r=readRoofStageRestorationV6(input.receipt);if(!r)throw Error('ROOF_SCREED25_ORIGIN_RECEIPT_INVALID');
  return consumeRoofStageOriginsV5({...input,receipt:currentV5(r)});
}
export function roofScreed25InactiveParameterIdsV1(input:{receipt:unknown;definitionId:unknown;catalogId:unknown;selection:unknown}) {
  const r=readRoofStageRestorationV6(input.receipt),s=parseCanonicalCompositionSelectionV1(input.selection);
  if(!r||r.definitionId!==input.definitionId||r.catalogId!==input.catalogId)return [];
  const receipt=currentV5(r);
  return [...roofGuttersInactiveParameterIdsV1({...input,receipt,definitionId:receipt.definitionId}),
    ...(s?.excludedOperationKeys.includes(ROOF_SCREED25_OPERATION_KEY_V1)?[pack.measurementParameterId,pack.areaParameterId,pack.conditionsParameterId]:[]),
    ...(s?.excludedOperationKeys.includes(ROOF_SCREED_OPERATION_KEY_V1)?[ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1]:[])];
}
