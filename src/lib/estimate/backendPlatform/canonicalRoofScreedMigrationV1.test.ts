import {readFrozenDefinitionSnapshotV1} from './canonicalFrozenDefinitionSnapshotV1';
const parents=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-screed-valley7-parents-s27-67.json'),'reps');
const sixParents=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-valley-preparation6-parents-s27-67.json'),'reps');
const fiveParents=readFrozenDefinitionSnapshotV1(require('../../../../data/estimate-benchmarks/fixtures/roof-planned-preparation-parents-s27-67.json'),'reps');
import {overlayS2767RoofScreedCompanion} from '../../../../scripts/estimate/r4a13/s2767RoofScreedCompanionOverlay';
import {ROOF_SCREED_PACK_V1 as pack,ROOF_SCREED_SEMANTIC_ROW_V1} from './canonicalRoofScreedCompanionV1';
import {ROOF_FORECAST_SCREED_PRIMER_CONDITIONS_V1 as forecast} from './canonicalRoofForecastConditionV1';
import {ROOF_PLANNED_PRIMER_CONDITIONS_V1,assertRoofPlannedPreparationOwnerContextV1} from './canonicalRoofPlannedPreparationV1';
import {admitRoofScreedMigrationProofV1,buildRoofScreedMigrationProofV1,migrateRoofScreedSelectionV1,buildRoofStageRestorationV2,readRoofStageRestorationV2,roofStageRestoreTargetsV2,composeRoofScreedMigrationModelV1} from './canonicalRoofScreedMigrationV1';
import {admitRoofValleyMigrationProofV1,buildRoofStageRestorationV1,readRoofStageRestorationV1,composeRoofFiveToSevenMigrationV1,migrateRoofValleySelectionV1} from './canonicalRoofValleyMigrationV1';
import {admitRoofPreparationMigrationProofV1,migrateRoofPreparationSelectionV1,assertRoofRetainedSemanticSelectionV1} from './canonicalRoofPreparationMigrationV1';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {parseCanonicalCompositionSelectionV1,assertCanonicalCompositionSelectionReleaseMigrationV1} from './canonicalEstimateCompositionSelectionV1';
import {canonicalManualPriceMigrationBindings} from './canonicalManualPriceReleaseMigration';
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const identity=(r:any)=>({id:r.definition.id,catalogId:r.definition.catalog_id,sha256:r.definition.definition_sha256});
function fixture(index=0){const from=structuredClone(parents.reps[index]) as any,to=overlayS2767RoofScreedCompanion(from,'00000000-0000-4000-8000-000000000001').representative;
 const i={from,to,fromDefinition:identity(from),toDefinition:{id:'00000000-0000-4000-8000-000000000008',catalogId:from.definition.catalog_id,sha256:'8'.repeat(64)},proof:{} as unknown};i.proof=buildRoofScreedMigrationProofV1(i);return i;}
const compile=(i:ReturnType<typeof fixture>,area:unknown='20',condition:unknown=forecast,selection:unknown=null,rowOverrides:Record<string,Record<string,unknown>>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:i.toDefinition.catalogId,compilerVersion:'TEST',parameterDefinitions:i.to.parameters as any,formulaDefinitions:i.to.formulas as any,resourceDefinitions:i.to.resources as any,
 submittedParameters:{q:'40',roof_torch_system:pack.systemYesRu,roof_torch_conditions:condition,roof_torch_area_scope:pack.areaYesRu,roof_valley_scope:'По проекту здесь нужны два дополнительных наплавляемых слоя ЭПП-4; работа предстоит и оплачивается только в этой смете',roof_valley_length_m:'20',[pack.measurementParameterId]:area},confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:146,hashJson:hash,compositionSelectionV1:parseCanonicalCompositionSelectionV1(selection)});
const status=(r:any,id:string)=>[...r.rows,...r.preliminaryNeeds].find(row=>row.row_id===id)?.calculation_trace?.resourceGraph?.scopeRequirementDecisionV1?.status;
test.each([0,1])('same BOQ forecast %s: A20 independent of q40/L20, seven payable source rows and INFO operator',async index=>{
 const i=fixture(index),a=admitRoofScreedMigrationProofV1(i)!;expect(a).not.toBeNull();const r=await compile(i);expect(r.rows).toHaveLength(27);expect(r.rows.filter(r=>r.included_in_estimate)).toHaveLength(25);
 for(const [role,q]of [['workers','5.444'],['included_machine_operators','0.388'],['tower_crane_8t','0.136'],['forklift_5t','0.252'],['mortar_pump','0.472'],['water','0.77'],['roofing_felt','0.88'],['ready_cement_mortar_m100','0.306']])expect(r.rows.find(r=>r.row_id===pack.prefix+':'+role)?.quantity).toBe(q);
 expect(r.rows.find(r=>r.row_id===pack.prefix+':included_machine_operators')?.included_in_estimate).toBe(false);
 expect(r.rows.find(r=>r.row_id==='roof:torch-two:krer12-002-09:workers')?.quantity).toBe('5.744');expect(r.rows.find(r=>r.row_id==='roof:prime-ready-emulsion:krer12-016-02:ready_bitumen_emulsion')?.quantity).toBe('18');
 expect(status(r,ROOF_SCREED_SEMANTIC_ROW_V1)).toBe('INCLUDED');
 for(const tail of ['preparation_15','labor_48','labor_49'])expect(status(r,'roof:torch-two:krer12-002-09:remaining:'+tail)).toBe('PROCESS_REQUIRED');
 const old=canonicalManualPriceMigrationBindings(i.from),next=canonicalManualPriceMigrationBindings(a.normalizedTo);for(const id of Object.keys(old))expect(next[id]).toBe(old[id]);
 expect(i.to.parameters.find(p=>p.parameter_id===pack.measurementParameterId)?.default_value).toBeNull();
});
test('missing A remains an object fact, never copies q; inactive A is retained but no screed calculated',async()=>{
 const i=fixture(),missing=await compile(i,null);expect(missing.rows.some(r=>r.row_id.startsWith(pack.prefix+':'))).toBe(false);expect(status(missing,ROOF_SCREED_SEMANTIC_ROW_V1)).toBe('OBJECT_FACT_REQUIRED');
 expect(missing.rows.find(r=>r.row_id==='roof:torch-two:krer12-002-09:workers')?.quantity).toBe('5.744');
 const inactive=await compile(i,'20',ROOF_PLANNED_PRIMER_CONDITIONS_V1);expect(inactive.rows.some(r=>r.row_id.startsWith(pack.prefix+':'))).toBe(false);expect(status(inactive,ROOF_SCREED_SEMANTIC_ROW_V1)).toBe('COMPLETED');
 const greater=await compile(i,'60');expect(greater.rows.find(r=>r.row_id===pack.prefix+':workers')?.quantity).toBe('16.332');
 await expect(compile(i,'0')).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test.each([ROOF_PLANNED_PRIMER_CONDITIONS_V1,'Основание принято и огрунтовано; высота до 15 м; обычные условия нового строительства'])('retains already accepted base without asking a screed area: %s',async condition=>{
 const r=await compile(fixture(),null,condition);expect(status(r,ROOF_SCREED_SEMANTIC_ROW_V1)).toBe('COMPLETED');expect(r.rows.some(r=>r.row_id.startsWith(pack.prefix+':'))).toBe(false);
});
test.each(['oldRate','oldReadyAcceptance','water','operator','areaUnit','areaDefault','areaFallback','sameOwner','processOrdinal','alternativeSource'])('rejects changed %s even with recomputed proof',kind=>{
 const i=fixture(),r=i.to.resources.find(r=>r.row_id===pack.prefix+':water')!,p=i.to.parameters.find(p=>p.parameter_id===pack.measurementParameterId)!;
 if(kind==='oldRate')i.to.formulas[0].ast={kind:'literal',value:'99'};
 if(kind==='oldReadyAcceptance')(i.to.resources.find(r=>r.row_id==='roof:torch-two:krer12-002-09:remaining:preparation_15')!.resource_graph.scopeRequirementV1 as any).satisfiedWhen={kind:'boolean',value:true};
 if(kind==='water')r.source_metadata.normativeRatePer100M2='1.53';if(kind==='operator')i.to.resources.find(r=>r.row_id.endsWith(':included_machine_operators'))!.resource_graph.costTreatment='OWN_COST';
 if(kind==='areaUnit')p.unit_id='linear_m';if(kind==='areaDefault')p.default_value='40';if(kind==='areaFallback')i.to.formulas.find(f=>f.formula_id===r.formula_id)!.input_parameter_ids=['q'];
 if(kind==='sameOwner')r.cost_owner_id=i.from.resources[0].cost_owner_id;if(kind==='processOrdinal')(r.resource_graph.operationCompositionV1 as any).processOrdinal=50;if(kind==='alternativeSource')r.source_metadata.normativeTrace=[];
 i.proof=buildRoofScreedMigrationProofV1(i);expect(admitRoofScreedMigrationProofV1(i)).toBeNull();
});
test('fixed third receipt preserves original v1 hashes, direct5/6/7 checks and all paired exclusions/restorations',async()=>{
 const i=fixture(),screed=admitRoofScreedMigrationProofV1(i)!,six=structuredClone(sixParents.reps[0]) as any,five=structuredClone(fiveParents.reps[0]) as any;
 const valley=admitRoofValleyMigrationProofV1({proof:i.from.definition.source_metadata.roofValleyMigrationV1,from:six,to:i.from,fromDefinition:identity(six),toDefinition:i.fromDefinition})!;
 const preparation=admitRoofPreparationMigrationProofV1({proof:six.definition.source_metadata.roofPreparationMigrationV1,from:five,to:six,fromDefinition:identity(five),toDefinition:identity(six)})!;
 expect(valley).not.toBeNull();expect(preparation).not.toBeNull();const previous={valley,preparation},original=buildRoofStageRestorationV1(previous),receipt:ReturnType<typeof buildRoofStageRestorationV2>=JSON.parse(JSON.stringify(buildRoofStageRestorationV2({screed,previous})));
 expect(readRoofStageRestorationV1(original)).toEqual(original);expect(receipt.originalStages).toEqual(original);expect(readRoofStageRestorationV2(receipt)).toEqual(receipt);
 for(const old of [i.from,six,five]){const prev=old===five?composeRoofFiveToSevenMigrationV1(previous):old===six?valley.normalizedTo:screed.normalizedTo;
  const normalized=old===i.from?screed.normalizedTo:composeRoofScreedMigrationModelV1(screed,prev),before=canonicalManualPriceMigrationBindings(old),after=canonicalManualPriceMigrationBindings(normalized);
  for(const id of Object.keys(before))expect(after[id]).toBe(before[id]);expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:receipt.pairs.map(p=>p.rowId)},from:old,to:normalized})).not.toThrow();}
 const start={contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:receipt.pairs.map(p=>p.rowId),excludedOperationKeys:[]};
 const migrated=migrateRoofScreedSelectionV1({selection:migrateRoofValleySelectionV1({selection:migrateRoofPreparationSelectionV1({selection:start,admitted:preparation}),admitted:valley}),admitted:screed})!;
 expect(migrated.excludedOperationKeys).toHaveLength(3);const excluded=await compile(i,'20',forecast,migrated,{[pack.prefix+':water']:{unitPrice:'12',provenance:{kind:'manual',reason:'Control price'}}});
 expect(excluded.rows.filter(r=>r.row_id.startsWith(pack.prefix+':')).every(r=>r.quantity==='0')).toBe(true);expect(excluded.rows.find(r=>r.row_id===pack.prefix+':water')?.unit_price).toBe('12');
 for(const pair of receipt.pairs)for(const use of ['row','operation']){const t=roofStageRestoreTargetsV2({receipt,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,rowIds:use==='row'?[pair.rowId]:[],operationKeys:use==='operation'?[pair.operationKey]:[]});expect(t.rowIds).toEqual([pair.rowId]);expect(t.operationKeys).toEqual([pair.operationKey]);}
 expect(()=>assertRoofRetainedSemanticSelectionV1({parentSelection:{...start,excludedRowIds:[...start.excludedRowIds,'old-source-check']},requestedSelection:start,semanticRowIds:receipt.pairs.map(p=>p.rowId)})).not.toThrow();
 const tampered=structuredClone(receipt);tampered.pairs.pop();expect(readRoofStageRestorationV2(tampered)).toBeNull();
 expect(roofStageRestoreTargetsV2({receipt,definitionId:i.fromDefinition.id,catalogId:i.fromDefinition.catalogId,rowIds:[ROOF_SCREED_SEMANTIC_ROW_V1],operationKeys:[]}).operationKeys).toEqual([]);
 const onlyScreed={...start,excludedRowIds:[ROOF_SCREED_SEMANTIC_ROW_V1]};const s=migrateRoofScreedSelectionV1({selection:onlyScreed,admitted:screed});const result=await compile(i,'20',forecast,s);
 expect(result.rows.find(r=>r.row_id==='roof:torch-two:krer12-002-09:workers')?.quantity).toBe('5.744');expect(result.rows.find(r=>r.row_id==='roof:prime-ready-emulsion:krer12-016-02:ready_bitumen_emulsion')?.quantity).toBe('18');
 expect(status(result,'roof:torch-two:krer12-002-09:remaining:preparation_15')).toBe('PROCESS_REQUIRED');
});
test.each(['inheritedExternalOwner','suppliedExternalOwner'])('forecast applies primer owner fence to %s',key=>{
 expect(()=>assertRoofPlannedPreparationOwnerContextV1({parameters:{roof_torch_conditions:forecast},inheritedExternalOwner:null,[key]:{owner:'external'}})).toThrow();
});
