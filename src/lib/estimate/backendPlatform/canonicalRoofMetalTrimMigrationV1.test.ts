import eightParents from '../../../../data/estimate-benchmarks/fixtures/roof-metal-screed8-parents-s27-67.json';
import sevenParents from '../../../../data/estimate-benchmarks/fixtures/roof-screed-valley7-parents-s27-67.json';
import sixParents from '../../../../data/estimate-benchmarks/fixtures/roof-valley-preparation6-parents-s27-67.json';
import fiveParents from '../../../../data/estimate-benchmarks/fixtures/roof-planned-preparation-parents-s27-67.json';
import {overlayS2767RoofMetalTrimCompanion} from '../../../../scripts/estimate/r4a13/s2767RoofMetalTrimCompanionOverlay';
import {ROOF_METAL_TRIM_PACK_V1 as pack,ROOF_METAL_TRIM_SEMANTIC_ROWS_V1 as ids,ROOF_METAL_TRIM_OPERATION_KEY_V1 as op} from './canonicalRoofMetalTrimCompanionV1';
import {admitRoofMetalTrimMigrationProofV1,buildRoofMetalTrimMigrationProofV1,migrateRoofMetalTrimSelectionV1,buildRoofStageRestorationV3,readRoofStageRestorationV3,roofStageRestoreTargetsV3,composeRoofMetalTrimMigrationModelV1} from './canonicalRoofMetalTrimMigrationV1';
import {admitRoofScreedMigrationProofV1,buildRoofStageRestorationV2,readRoofStageRestorationV2,composeRoofScreedMigrationModelV1} from './canonicalRoofScreedMigrationV1';
import {admitRoofValleyMigrationProofV1,buildRoofStageRestorationV1,composeRoofFiveToSevenMigrationV1} from './canonicalRoofValleyMigrationV1';
import {admitRoofPreparationMigrationProofV1,assertRoofRetainedSemanticSelectionV1} from './canonicalRoofPreparationMigrationV1';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
import {canonicalManualPriceMigrationBindings,canonicalManualExclusionMigrationBindings} from './canonicalManualPriceReleaseMigration';
import {canonicalEstimateResourceOperationSections} from './canonicalEstimateOperationComposition';
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const identity=(r:any)=>({id:r.definition.id,catalogId:r.definition.catalog_id,sha256:r.definition.definition_sha256});
const selection=(rows:string[]=[],ops:string[]=[])=>({contractVersion:'canonical-estimate-composition-selection/v1' as const,excludedRowIds:rows,excludedOperationKeys:ops});
function fixture(index=0){const from=structuredClone(eightParents.reps[index]) as any,to=overlayS2767RoofMetalTrimCompanion(from,'00000000-0000-4000-8000-000000000001').representative;
 const i={from,to,fromDefinition:identity(from),toDefinition:{id:'00000000-0000-4000-8000-000000000009',catalogId:from.definition.catalog_id,sha256:'9'.repeat(64)},proof:{} as unknown};i.proof=buildRoofMetalTrimMigrationProofV1(i);return i;}
const compile=(i:ReturnType<typeof fixture>,area:unknown='10',scope:unknown=pack.systemYesRu,selected:unknown=null,overrides:Record<string,Record<string,unknown>>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:i.toDefinition.catalogId,compilerVersion:'TEST',parameterDefinitions:i.to.parameters as any,formulaDefinitions:i.to.formulas as any,resourceDefinitions:i.to.resources as any,
 submittedParameters:{q:'40',roof_torch_system:'Наружная кровля: ЭПП-4 снизу, ЭКП-4.5 сверху, два наплавляемых слоя',roof_torch_conditions:pack.conditionsYesRu,roof_torch_area_scope:pack.areaYesRu,roof_valley_scope:'По проекту здесь нужны два дополнительных наплавляемых слоя ЭПП-4; работа предстоит и оплачивается только в этой смете',roof_valley_length_m:'20',roof_screed_area_m2:'20',[pack.systemParameterId]:scope,[pack.measurementParameterId]:area},confirmedParameters:{},rowOverrides:overrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:153,hashJson:hash,compositionSelectionV1:parseCanonicalCompositionSelectionV1(selected)});
const status=(r:any,id:string)=>[...r.rows,...r.preliminaryNeeds].find(row=>row.row_id===id)?.calculation_trace?.resourceGraph?.scopeRequirementDecisionV1?.status;
function previous(index=0){const from5=fiveParents.reps[index] as any,from6=sixParents.reps[index] as any,from7=sevenParents.reps[index] as any,from8=eightParents.reps[index] as any;
 const preparation=admitRoofPreparationMigrationProofV1({proof:from6.definition.source_metadata.roofPreparationMigrationV1,fromDefinition:identity(from5),toDefinition:identity(from6),from:from5,to:from6})!;
 const valley=admitRoofValleyMigrationProofV1({proof:from7.definition.source_metadata.roofValleyMigrationV1,fromDefinition:identity(from6),toDefinition:identity(from7),from:from6,to:from7})!;
 const screed=admitRoofScreedMigrationProofV1({proof:from8.definition.source_metadata.roofScreedMigrationV1,fromDefinition:identity(from7),toDefinition:identity(from8),from:from7,to:from8})!;
 expect(preparation&&valley&&screed).toBeTruthy();return {preparation,valley,screed,receipt:buildRoofStageRestorationV2({screed,previous:{preparation,valley}})};}
test.each([0,1])('two compatible types %s: complete010-01 resources use measured S10 independently of q40, A20 and L20',async index=>{
 const i=fixture(index),admitted=admitRoofMetalTrimMigrationProofV1(i)!;expect(admitted).not.toBeNull();const r=await compile(i);expect(r.rows).toHaveLength(34);expect(r.rows.filter(row=>row.included_in_estimate)).toHaveLength(31);
 for(const [role,q]of [['workers','11.275'],['included_machine_operators','0.02'],['tower_crane_8t','0.02'],['flatbed_truck_to_5t','0.007'],['roofing_nails_3x40','0.0004'],['galvanized_rope_wire_3mm','0.0012'],['galvanized_sheet_0_7mm','0.057']])expect(r.rows.find(row=>row.row_id===pack.prefix+':'+role)?.quantity).toBe(q);
 expect(r.rows.find(row=>row.row_id===pack.prefix+':included_machine_operators')?.included_in_estimate).toBe(false);
 for(const id of ids)expect(status(r,id)).toBe('INCLUDED');
 expect(r.rows.find(row=>row.row_id==='roof:torch-two:krer12-002-09:workers')?.quantity).toBe('5.744');expect(r.rows.find(row=>row.row_id==='roof:cement-screed15:krer12-017-01:workers')?.quantity).toBe('5.444');
 for(const bind of [canonicalManualPriceMigrationBindings,canonicalManualExclusionMigrationBindings]){const old=bind(i.from),next=bind(admitted.normalizedTo);for(const id of Object.keys(old))expect(next[id]).toBe(old[id]);}
 const sections=canonicalEstimateResourceOperationSections(r.rows.map(row=>({rowId:row.row_id,titleRu:row.row_id,operation:(row.calculation_trace as Record<string,any>).resourceGraph.operationCompositionV1})));expect(sections.filter(s=>s.operation?.groupId===pack.prefix)).toHaveLength(1);
 expect(i.to.parameters.filter(p=>[pack.systemParameterId,pack.measurementParameterId].includes(p.parameter_id)).every(p=>p.default_value===null)).toBe(true);
});
test('asks only a true missing S, never copies q or narrows S<=q; zero S is invalid',async()=>{
 const i=fixture(),missing=await compile(i,null);expect(missing.rows.some(r=>r.row_id.startsWith(pack.prefix+':'))).toBe(false);for(const id of ids)expect(status(missing,id)).toBe('OBJECT_FACT_REQUIRED');
 expect(missing.rows.find(r=>r.row_id==='roof:torch-two:krer12-002-09:workers')?.quantity).toBe('5.744');
 expect((await compile(i,'60')).rows.find(r=>r.row_id===pack.prefix+':workers')?.quantity).toBe('67.65');await expect(compile(i,'0')).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test.each([[pack.notApplicableChoiceRu,'NOT_APPLICABLE'],[pack.completedChoiceRu,'COMPLETED'],[pack.unknownChoiceRu,'OBJECT_FACT_REQUIRED'],[pack.legacyChoiceRu,'SCOPE_UNVERIFIED']])('separates inactive scope %s without charging planned metal or erasing known S',async(scope,expected)=>{
 const r=await compile(fixture(),'10',scope);expect(r.rows.some(row=>row.row_id.startsWith(pack.prefix+':'))).toBe(false);for(const id of ids)expect(status(r,id)).toBe(expected);
});
test('exclusion physically zeroes all seven resources and restores manual price without affecting other stages',async()=>{
 const i=fixture(),overrides={[pack.prefix+':galvanized_sheet_0_7mm']:{unitPrice:'12000',provenance:{kind:'manual',reason:'Control price'}}},removed=await compile(i,'10',pack.systemYesRu,selection([], [op]),overrides);
 for(const row of removed.rows.filter(r=>r.row_id.startsWith(pack.prefix+':'))){expect(row.quantity).toBe('0');expect(row.included_in_estimate).toBe(false);}
 expect(removed.rows.find(r=>r.row_id===pack.prefix+':galvanized_sheet_0_7mm')?.unit_price).toBe('12000');expect(removed.rows.find(r=>r.row_id==='roof:torch-two:krer12-002-09:workers')?.quantity).toBe('5.744');
 const restored=await compile(i,'10',pack.systemYesRu,selection(),overrides);expect(restored.rows.find(r=>r.row_id===pack.prefix+':galvanized_sheet_0_7mm')).toMatchObject({quantity:'0.057',unit_price:'12000'});
});
test('version8→9 keeps none/all intent; an inherited material/labor subset fails closed but explicit full restore passes',()=>{
 const a=admitRoofMetalTrimMigrationProofV1(fixture())!;
 expect(migrateRoofMetalTrimSelectionV1({selection:selection(),admitted:a})?.excludedOperationKeys).toEqual([]);
 expect(migrateRoofMetalTrimSelectionV1({selection:selection(ids),admitted:a})?.excludedOperationKeys).toEqual([op]);
 for(const subset of [[ids[0]!],[ids[2]!],[ids[0]!,ids[1]!]])expect(()=>migrateRoofMetalTrimSelectionV1({selection:selection(subset),admitted:a})).toThrow('только часть доборов');
 expect(()=>assertRoofRetainedSemanticSelectionV1({parentSelection:selection([ids[0]!]),requestedSelection:selection(),semanticRowIds:ids})).not.toThrow();expect(migrateRoofMetalTrimSelectionV1({selection:selection(),admitted:a})).not.toBeNull();
});
test('V3 preserves both original receipts; any of three requirements or the operation restores the entire exact group',()=>{
 const i=fixture(),a=admitRoofMetalTrimMigrationProofV1(i)!,old=previous(),v3=buildRoofStageRestorationV3({metalTrim:a,previous:old.receipt});
 expect(readRoofStageRestorationV3(v3)).toEqual(v3);expect(readRoofStageRestorationV2(v3.originalStages)).toEqual(old.receipt);expect(v3.pairs).toHaveLength(6);
 for(const rowId of ids){const targets=roofStageRestoreTargetsV3({receipt:v3,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,rowIds:[rowId],operationKeys:[]});expect(new Set(targets.rowIds)).toEqual(new Set(ids));expect(targets.operationKeys).toEqual([op]);}
 const targets=roofStageRestoreTargetsV3({receipt:v3,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,rowIds:[],operationKeys:[op]});expect(new Set(targets.rowIds)).toEqual(new Set(ids));
 for(const pair of old.receipt.pairs){const t=roofStageRestoreTargetsV3({receipt:v3,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,rowIds:[pair.rowId],operationKeys:[]});expect(t.rowIds).toEqual([pair.rowId]);expect(t.operationKeys).toEqual([pair.operationKey]);}
 const tampered=structuredClone(v3);tampered.pairs.pop();expect(readRoofStageRestorationV3(tampered)).toBeNull();expect(roofStageRestoreTargetsV3({receipt:v3,definitionId:i.fromDefinition.id,catalogId:i.toDefinition.catalogId,rowIds:[ids[2]!],operationKeys:[]}).operationKeys).toEqual([]);
});
test.each([0,1])('direct finite5/6/7→9 binding models %s preserve historical manual prices/exclusions and source ASTs',index=>{
 const i=fixture(index),a=admitRoofMetalTrimMigrationProofV1(i)!,old=previous(index);
 const models=[composeRoofScreedMigrationModelV1(old.screed,old.valley.normalizedTo),composeRoofScreedMigrationModelV1(old.screed,composeRoofFiveToSevenMigrationV1(old))];
 for(const model of [old.screed.normalizedTo,...models]){const composed=composeRoofMetalTrimMigrationModelV1(a,model);for(const fn of [canonicalManualPriceMigrationBindings,canonicalManualExclusionMigrationBindings]){const from=fn(model),next=fn(composed);for(const id of Object.keys(from))expect(next[id]).toBe(from[id]);}}
});
test.each(['ast','owner','rate','scope','parameter'])('rejects forged8→9 migration even with recomputed proof: %s',kind=>{
 const i=fixture();if(kind==='ast')i.to.formulas[0]!.ast={kind:'constant',value:'999'};if(kind==='owner')i.to.resources[0]!.cost_owner_id='forged';if(kind==='rate')i.to.formulas.find(f=>f.formula_id===pack.prefix+':formula:workers')!.ast={kind:'constant',value:'1'};
 if(kind==='scope')i.to.resources.find(r=>r.row_id===ids[0])!.resource_graph.scopeRequirementV1.satisfiedWhen={kind:'constant',value:true};if(kind==='parameter')i.to.parameters[0]!.constraints_json={};i.proof=buildRoofMetalTrimMigrationProofV1(i);expect(admitRoofMetalTrimMigrationProofV1(i)).toBeNull();
});
