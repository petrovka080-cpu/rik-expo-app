import {readFrozenDefinitionSnapshotV1} from './canonicalFrozenDefinitionSnapshotV1';
const snapshot=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-screed25-gutters11-parents-s27-67.json'),'representatives');
import { buildRoofScreed25SuccessorV1 } from './canonicalRoofScreed25SuccessorV1';
import { buildRoofScreed25MigrationProofV1,admitRoofScreed25MigrationProofV1,buildRoofStageRestorationV6,readRoofStageRestorationV6,roofStageRestoreTargetsV6,roofStageExcludeTargetsV6,consumeRoofStageOriginsV6,ROOF_SCREED25_SCOPE_ROW_V1,ROOF_SCREED25_OPERATION_KEY_V1,roofScreed25InactiveParameterIdsV1 } from './canonicalRoofScreed25MigrationV1';
import { admitRoofHangingGuttersMigrationProofV1,buildRoofStageRestorationV5,readRoofStageRestorationV5,createRoofLegacyWaterSelectionOriginV1 } from './canonicalRoofHangingGuttersMigrationV1';
import { ROOF_WATER_SEMANTIC_ROWS_V1 as waterRows, ROOF_GUTTER_OPERATION_KEY_V1 as gutterOp } from './canonicalRoofHangingGuttersCompanionV1';
import { ROOF_SCREED_OPERATION_KEY_V1 as oldScreedOp } from './canonicalRoofScreedCompanionV1';
import { ROOF_SCREED25_PACK_V1 as pack } from './canonicalRoofScreed25CompanionV1';
import { canonicalManualPriceMigrationBindings,canonicalManualExclusionMigrationBindings,canonicalStoredManualPricesCanMigrate } from './canonicalManualPriceReleaseMigration';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
const ten=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-gutters-layers10-parents-s27-67.json'),'reps');
const nine=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-layers-metal9-parents-s27-67.json'),'reps');
const eight=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-metal-screed8-parents-s27-67.json'),'reps');
const seven=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-screed-valley7-parents-s27-67.json'),'reps');
const six=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-valley-preparation6-parents-s27-67.json'),'reps');
const five=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-planned-preparation-parents-s27-67.json'),'reps');
import {admitRoofLowerLayersMigrationProofV1,buildRoofStageRestorationV4,createRoofLegacyAssemblySelectionOriginV1,migrateRoofLowerLayersSelectionV1} from './canonicalRoofLowerLayersMigrationV1';
import {ROOF_ASSEMBLY_SEMANTIC_ROW_V1 as assembly,ROOF_VAPOR_OPERATION_KEY_V1 as vaporOp,ROOF_CLAY_OPERATION_KEY_V1 as clayOp,ROOF_VAPOR_SCOPE_ROW_V1 as vaporScope,ROOF_LOWER_LAYERS_PACK_V1 as layers} from './canonicalRoofLowerLayersCompanionV1';
import {admitRoofMetalTrimMigrationProofV1,buildRoofStageRestorationV3} from './canonicalRoofMetalTrimMigrationV1';
import {admitRoofScreedMigrationProofV1,buildRoofStageRestorationV2} from './canonicalRoofScreedMigrationV1';
import {admitRoofValleyMigrationProofV1} from './canonicalRoofValleyMigrationV1';
import {admitRoofPreparationMigrationProofV1,assertRoofRetainedSemanticSelectionV1} from './canonicalRoofPreparationMigrationV1';
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const identity=(r:any)=>({id:r.definition.id,catalogId:r.definition.catalog_id,sha256:r.definition.definition_sha256});
const selection=(rows:string[]=[],ops:string[]=[])=>({contractVersion:'canonical-estimate-composition-selection/v1' as const,excludedRowIds:rows,excludedOperationKeys:ops});
function previousV3(index=0){const from5=five.reps[index] as any,from6=six.reps[index] as any,from7=seven.reps[index] as any,from8=eight.reps[index] as any,from9=nine.reps[index] as any;
 const preparation=admitRoofPreparationMigrationProofV1({proof:from6.definition.source_metadata.roofPreparationMigrationV1,fromDefinition:identity(from5),toDefinition:identity(from6),from:from5,to:from6})!;
 const valley=admitRoofValleyMigrationProofV1({proof:from7.definition.source_metadata.roofValleyMigrationV1,fromDefinition:identity(from6),toDefinition:identity(from7),from:from6,to:from7})!;
 const screed=admitRoofScreedMigrationProofV1({proof:from8.definition.source_metadata.roofScreedMigrationV1,fromDefinition:identity(from7),toDefinition:identity(from8),from:from7,to:from8})!;
 const metalTrim=admitRoofMetalTrimMigrationProofV1({proof:from9.definition.source_metadata.roofMetalTrimMigrationV1,fromDefinition:identity(from8),toDefinition:identity(from9),from:from8,to:from9})!;
 expect(preparation&&valley&&screed&&metalTrim).toBeTruthy();const v2=buildRoofStageRestorationV2({screed,previous:{preparation,valley}});return {receipt:buildRoofStageRestorationV3({metalTrim,previous:v2}),metalTrim};}
function previousV4(index=0){const from=nine.reps[index] as any,to=ten.reps[index] as any,lower=admitRoofLowerLayersMigrationProofV1({proof:to.definition.source_metadata.roofLowerLayersMigrationV1,fromDefinition:identity(from),toDefinition:identity(to),from,to})!;expect(lower).not.toBeNull();return {lower,receipt:buildRoofStageRestorationV4({lowerLayers:lower,previous:previousV3(index).receipt})};}

function fixture(index=0){
 const from=structuredClone(snapshot.representatives[index]) as any,to=buildRoofScreed25SuccessorV1(from,'migration-test').representative;
 const i={from,to,fromDefinition:identity(from),toDefinition:{id:'00000000-0000-4000-8000-000000000012',catalogId:from.definition.catalog_id,sha256:'c'.repeat(64)},proof:{} as unknown};
 i.proof=buildRoofScreed25MigrationProofV1(i);const admitted=admitRoofScreed25MigrationProofV1(i)!;expect(admitted).not.toBeNull();
 const old=ten.reps[index] as any,gutters=admitRoofHangingGuttersMigrationProofV1({proof:from.definition.source_metadata.roofHangingGuttersMigrationV1,fromDefinition:identity(old),toDefinition:identity(from),from:old,to:from})!;
 expect(gutters).not.toBeNull();const v5=buildRoofStageRestorationV5({gutters,previous:previousV4(index).receipt});
 return {i,admitted,v5,receipt:buildRoofStageRestorationV6({screed25:admitted,previous:v5})};
}
test.each([0,1])('finite cohort%s preserves previousV5 and unchanged historical manual bindings',index=>{
 const f=fixture(index),before=hash(f.v5);expect(readRoofStageRestorationV6(f.receipt)).toEqual(f.receipt);
 expect(readRoofStageRestorationV5(f.receipt.originalV5)).toEqual(f.v5);expect(hash(f.v5)).toBe(before);expect(f.receipt.pairs).toHaveLength(10);
 expect(canonicalManualPriceMigrationBindings(f.admitted.normalizedTo)).toMatchObject(canonicalManualPriceMigrationBindings(f.i.from));
 expect(canonicalManualExclusionMigrationBindings(f.admitted.normalizedTo)).toMatchObject(canonicalManualExclusionMigrationBindings(f.i.from));
 const rowId='roof:cement-screed15:krer12-017-01:ready_cement_mortar_m100';
 expect(canonicalStoredManualPricesCanMigrate({rowOverrides:{[rowId]:{unitPrice:'1500',provenance:{kind:'manual'}}},customRows:[],fromBindings:canonicalManualPriceMigrationBindings(f.i.from),toBindings:canonicalManualPriceMigrationBindings(f.admitted.normalizedTo)})).toBe(true);
 const oldIntent=selection([], [oldScreedOp]);const next=roofStageRestoreTargetsV6({receipt:f.receipt,definitionId:f.receipt.definitionId,catalogId:f.receipt.catalogId,rowIds:[],operationKeys:oldIntent.excludedOperationKeys});
 expect(next.operationKeys).not.toContain(ROOF_SCREED25_OPERATION_KEY_V1);
});
test.each(['quantity','guard','owner','source','parameter','duplicate'])('proof cannot admit a rewritten%s even with fresh successor hashes',kind=>{
 const f=fixture(),i=structuredClone(f.i);
 if(kind==='quantity')i.to.formulas[0].ast={kind:'literal',value:'999'};
 if(kind==='guard')i.to.resources.find((r:any)=>r.row_id.endsWith(':direct-base-check'))!.resource_graph.scopeRequirementV1.exactScopeWhen={kind:'literal',value:true};
 if(kind==='owner')i.to.resources[0].cost_owner_id='another-owner';
 if(kind==='source')i.to.resources[0].source_metadata={source:'unverified'};
 if(kind==='parameter')i.to.parameters[0].unit_id='t';
 if(kind==='duplicate')i.to.resources[187].row_id=i.to.resources[0].row_id;
 i.proof=buildRoofScreed25MigrationProofV1(i);expect(admitRoofScreed25MigrationProofV1(i)).toBeNull();
});
test('25mm exclusion/restoration and inactive facts are independent of15mm',()=>{
 const {receipt:r}=fixture(),input={receipt:r,definitionId:r.definitionId,catalogId:r.catalogId,rowIds:[ROOF_SCREED25_SCOPE_ROW_V1],operationKeys:[]};
 const excluded=roofStageExcludeTargetsV6(input);expect(excluded.operationKeys).toEqual([ROOF_SCREED25_OPERATION_KEY_V1]);
 const restored=roofStageRestoreTargetsV6({...input,rowIds:[],operationKeys:excluded.operationKeys});expect(restored.rowIds).toContain(ROOF_SCREED25_SCOPE_ROW_V1);expect(restored.operationKeys).not.toContain(oldScreedOp);
 expect(roofScreed25InactiveParameterIdsV1({...input,selection:selection(excluded.rowIds,excluded.operationKeys)})).toEqual(expect.arrayContaining([pack.measurementParameterId,pack.conditionsParameterId,pack.areaParameterId]));
 const tampered=structuredClone(r);tampered.pairs.pop();expect(readRoofStageRestorationV6(tampered)).toBeNull();
 expect(roofStageExcludeTargetsV6({...input,definitionId:r.originalV5.definitionId}).operationKeys).toEqual([]);
});
test('both consumed origins remain consumed acrossV6 edits and are never inferred from immutable nestedV4',()=>{
 const f=fixture(),old=structuredClone(f.v5);
 // A V5 receipt without origins cannot acquire an invented origin atV6.
 expect(()=>buildRoofStageRestorationV6({screed25:f.admitted,previous:old,assemblyOrigin:{active:true} as any})).toThrow();
 const before=hash(f.receipt),origins=consumeRoofStageOriginsV6({receipt:f.receipt,parentSelection:selection(),effectiveSelection:selection()});
 expect(origins).toEqual({assemblyOrigin:null,waterOrigin:null});expect(hash(f.receipt)).toBe(before);
});
test('actual assembly and water origins become inactive once and cannot reactivate from nested historical evidence',()=>{
 const f=fixture(),previous=previousV4(),originalSelection=selection([assembly,...waterRows]),transferred=selection([assembly,...waterRows],[vaporOp,clayOp,gutterOp]);
 const originInput={sourceRevisionId:'00000000-0000-4000-8000-000000000055',sourceChecksumSha256:'d'.repeat(64),sourceDefinition:identity(five.reps[0]),parentSelection:originalSelection,effectiveSelection:transferred};
 const assemblyOrigin=createRoofLegacyAssemblySelectionOriginV1({...originInput,receipt:previous.receipt})!;
 const v4=buildRoofStageRestorationV4({lowerLayers:previous.lower,previous:previousV3().receipt,origin:assemblyOrigin});
 const gutters=admitRoofHangingGuttersMigrationProofV1({proof:f.i.from.definition.source_metadata.roofHangingGuttersMigrationV1,fromDefinition:identity(ten.reps[0]),toDefinition:identity(f.i.from),from:ten.reps[0],to:f.i.from})!;
 const initial=buildRoofStageRestorationV5({gutters,previous:v4}),waterOrigin=createRoofLegacyWaterSelectionOriginV1({...originInput,receipt:initial})!;
 const v5=buildRoofStageRestorationV5({gutters,previous:v4,waterOrigin}),active=buildRoofStageRestorationV6({screed25:f.admitted,previous:v5});
 expect(active.effectiveAssemblyOrigin?.active).toBe(true);expect(active.effectiveWaterOrigin?.active).toBe(true);
 const consumed=consumeRoofStageOriginsV6({receipt:active,parentSelection:transferred,effectiveSelection:selection()});
 const inactive=buildRoofStageRestorationV6({screed25:f.admitted,previous:v5,...consumed});
 expect(inactive.originalV5.originalV4.legacyAssemblySelectionOrigin?.active).toBe(true);
 expect(inactive.effectiveAssemblyOrigin?.active).toBe(false);expect(inactive.effectiveWaterOrigin?.active).toBe(false);
 const untouched=roofStageRestoreTargetsV6({receipt:inactive,definitionId:inactive.definitionId,catalogId:inactive.catalogId,rowIds:[assembly,...waterRows],operationKeys:[]});
 expect(untouched.operationKeys).not.toContain(vaporOp);expect(untouched.operationKeys).not.toContain(clayOp);expect(untouched.operationKeys).not.toContain(gutterOp);
 expect(consumeRoofStageOriginsV6({receipt:inactive,parentSelection:selection(),effectiveSelection:transferred})).toEqual(consumed);
 expect(()=>buildRoofStageRestorationV6({screed25:f.admitted,previous:buildRoofStageRestorationV5({gutters,previous:v4,assemblyOrigin:consumed.assemblyOrigin,waterOrigin:consumed.waterOrigin}),assemblyOrigin})).toThrow();
});
