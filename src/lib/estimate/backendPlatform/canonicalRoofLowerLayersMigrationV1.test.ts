import nine from '../../../../data/estimate-benchmarks/fixtures/roof-layers-metal9-parents-s27-67.json';
import eight from '../../../../data/estimate-benchmarks/fixtures/roof-metal-screed8-parents-s27-67.json';
import seven from '../../../../data/estimate-benchmarks/fixtures/roof-screed-valley7-parents-s27-67.json';
import six from '../../../../data/estimate-benchmarks/fixtures/roof-valley-preparation6-parents-s27-67.json';
import five from '../../../../data/estimate-benchmarks/fixtures/roof-planned-preparation-parents-s27-67.json';
import {overlayS2767RoofLowerLayersCompanion} from '../../../../scripts/estimate/r4a13/s2767RoofLowerLayersCompanionOverlay';
import {ROOF_LOWER_LAYERS_PACK_V1 as pack,ROOF_ASSEMBLY_SEMANTIC_ROW_V1 as assembly,ROOF_VAPOR_OPERATION_KEY_V1 as vaporOp,ROOF_CLAY_OPERATION_KEY_V1 as clayOp,ROOF_VAPOR_SCOPE_ROW_V1 as vaporScope,ROOF_CLAY_SCOPE_ROW_V1 as clayScope,ROOF_LOWER_CHAIN_SCOPE_ROW_V1 as chainScope,ROOF_OTHER_LAYERS_PARAMETER_V1 as otherId,ROOF_OTHER_LAYERS_NONE_V1 as otherNone,roofClayGeometryAstV1} from './canonicalRoofLowerLayersCompanionV1';
import {admitRoofLowerLayersMigrationProofV1,buildRoofLowerLayersMigrationProofV1,migrateRoofLowerLayersSelectionV1,buildRoofStageRestorationV4,readRoofStageRestorationV4,roofStageRestoreTargetsV4,roofStageExcludeTargetsV4,createRoofLegacyAssemblySelectionOriginV1,consumeRoofLegacyAssemblySelectionOriginV1,composeRoofLowerLayersMigrationModelV1} from './canonicalRoofLowerLayersMigrationV1';
import {admitRoofMetalTrimMigrationProofV1,buildRoofStageRestorationV3} from './canonicalRoofMetalTrimMigrationV1';
import {admitRoofScreedMigrationProofV1,buildRoofStageRestorationV2} from './canonicalRoofScreedMigrationV1';
import {admitRoofValleyMigrationProofV1} from './canonicalRoofValleyMigrationV1';
import {admitRoofPreparationMigrationProofV1,assertRoofRetainedSemanticSelectionV1} from './canonicalRoofPreparationMigrationV1';
import {ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1 as root,ROOF_FORECAST_SCREED_PRIMER_CONDITIONS_V1 as oldRoot} from './canonicalRoofForecastConditionV1';
import {assertRoofPlannedPreparationOwnerContextV1} from './canonicalRoofPlannedPreparationV1';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
import {canonicalManualPriceMigrationBindings,canonicalManualExclusionMigrationBindings} from './canonicalManualPriceReleaseMigration';
import {canonicalPublisherQuantityScopeIsConsistent} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const identity=(r:any)=>({id:r.definition.id,catalogId:r.definition.catalog_id,sha256:r.definition.definition_sha256});
const selection=(rows:string[]=[],ops:string[]=[])=>({contractVersion:'canonical-estimate-composition-selection/v1' as const,excludedRowIds:rows,excludedOperationKeys:ops});
function fixture(index=0){const from=structuredClone(nine.reps[index]) as any,to=overlayS2767RoofLowerLayersCompanion(from,'00000000-0000-4000-8000-000000000001').representative;
 const i={from,to,fromDefinition:identity(from),toDefinition:{id:'00000000-0000-4000-8000-000000000010',catalogId:from.definition.catalog_id,sha256:'a'.repeat(64)},proof:{} as unknown};i.proof=buildRoofLowerLayersMigrationProofV1(i);return i;}
const compile=(i:ReturnType<typeof fixture>,parameters:Record<string,unknown>={},selected:unknown=null,overrides:Record<string,Record<string,unknown>>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:i.toDefinition.catalogId,compilerVersion:'TEST',parameterDefinitions:i.to.parameters as any,formulaDefinitions:i.to.formulas as any,resourceDefinitions:i.to.resources as any,
 submittedParameters:{q:'40',roof_torch_system:'Наружная кровля: ЭПП-4 снизу, ЭКП-4.5 сверху, два наплавляемых слоя',roof_torch_conditions:root,roof_torch_area_scope:'Площадь покрытия по проектному обмеру, отдельные узлы не прибавлены',roof_screed_area_m2:'20',roof_valley_scope:'По проекту здесь нужны два дополнительных наплавляемых слоя ЭПП-4; работа предстоит и оплачивается только в этой смете',roof_valley_length_m:'20',roof_metal_trim_scope:'Все доборы этого участка — покрытия из оцинкованной стали 0,7 мм по пригодному основанию; работа предстоит и оплачивается только здесь',roof_metal_trim_area_m2:'10',[pack.vapor.systemParameterId]:pack.vapor.systemYesRu,[pack.vapor.measurementParameterId]:'10',[pack.clay.systemParameterId]:pack.clay.systemYesRu,[pack.clay.areaParameterIdForGeometry]:'10',[pack.clay.thicknessParameterId]:'100',[otherId]:otherNone,...parameters},confirmedParameters:{},rowOverrides:overrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:169,hashJson:hash,compositionSelectionV1:parseCanonicalCompositionSelectionV1(selected)});
const status=(r:any,id:string)=>[...r.rows,...r.preliminaryNeeds].find(row=>row.row_id===id)?.calculation_trace?.resourceGraph?.scopeRequirementDecisionV1?.status;
function previous(index=0){const from5=five.reps[index] as any,from6=six.reps[index] as any,from7=seven.reps[index] as any,from8=eight.reps[index] as any,from9=nine.reps[index] as any;
 const preparation=admitRoofPreparationMigrationProofV1({proof:from6.definition.source_metadata.roofPreparationMigrationV1,fromDefinition:identity(from5),toDefinition:identity(from6),from:from5,to:from6})!;
 const valley=admitRoofValleyMigrationProofV1({proof:from7.definition.source_metadata.roofValleyMigrationV1,fromDefinition:identity(from6),toDefinition:identity(from7),from:from6,to:from7})!;
 const screed=admitRoofScreedMigrationProofV1({proof:from8.definition.source_metadata.roofScreedMigrationV1,fromDefinition:identity(from7),toDefinition:identity(from8),from:from7,to:from8})!;
 const metalTrim=admitRoofMetalTrimMigrationProofV1({proof:from9.definition.source_metadata.roofMetalTrimMigrationV1,fromDefinition:identity(from8),toDefinition:identity(from9),from:from8,to:from9})!;
 expect(preparation&&valley&&screed&&metalTrim).toBeTruthy();const v2=buildRoofStageRestorationV2({screed,previous:{preparation,valley}});return {receipt:buildRoofStageRestorationV3({metalTrim,previous:v2}),metalTrim};}
test.each([0,1])('two types %s: separate lower layers, installed volume computed by app, all five previous stages unchanged',async index=>{
 const i=fixture(index),a=admitRoofLowerLayersMigrationProofV1(i)!;expect(a).not.toBeNull();expect(canonicalPublisherQuantityScopeIsConsistent(i.to)).toBe(true);const r=await compile(i);expect(r.rows).toHaveLength(47);expect(r.rows.filter(row=>row.included_in_estimate)).toHaveLength(42);
 for(const [role,q]of [['workers','0.784'],['included_machine_operators','0.013'],['tower_crane_8t','0.008'],['truck_crane_10t','0.005'],['bitumen_kettle_400l','0.041'],['flatbed_truck_to_5t','0.008'],['ready_hot_roof_mastic','0.005'],['roofing_felt_rkp350b','11']])expect(r.rows.find(row=>row.row_id===pack.vapor.prefix+':'+role)?.quantity).toBe(q);
 for(const [role,q]of [['workers','3.04'],['included_machine_operators','0.34'],['tower_crane_8t','0.12'],['forklift_5t','0.22'],['clay_gravel_10_20_m400','1.03']])expect(r.rows.find(row=>row.row_id===pack.clay.prefix+':'+role)?.quantity).toBe(q);
 expect(i.to.parameters.some(p=>p.parameter_id===pack.clay.measurementParameterId)).toBe(false);
 expect(status(r,vaporScope)).toBe('INCLUDED');expect(status(r,clayScope)).toBe('INCLUDED');expect(status(r,chainScope)).toBe('COMPLETED');expect(status(r,assembly)).toBe('NOT_APPLICABLE');
 for(const [id,q]of [['roof:torch-two:krer12-002-09:workers','5.744'],['roof:prime-ready-emulsion:krer12-016-02:ready_bitumen_emulsion','18'],['roof:valley-torch-two:krer12-005-03:lower_isoplast_epp_4','69'],['roof:cement-screed15:krer12-017-01:workers','5.444'],['roof:metal-trim:krer12-010-01:galvanized_sheet_0_7mm','0.057']])expect(r.rows.find(row=>row.row_id===id)?.quantity).toBe(q);
 for(const fn of [canonicalManualPriceMigrationBindings,canonicalManualExclusionMigrationBindings]){const old=fn(i.from),next=fn(a.normalizedTo);for(const id of Object.keys(old))expect(next[id]).toBe(old[id]);}
});
test('volume derives from mean area-weighted thickness without a q fallback or volume rounding',async()=>{
 const r=await compile(fixture(),{[pack.clay.areaParameterIdForGeometry]:'5.125',[pack.clay.thicknessParameterId]:'12.5'});expect(r.rows.find(row=>row.row_id===pack.clay.prefix+':workers')?.quantity).toBe('0.19475');expect(r.rows.find(row=>row.row_id===pack.clay.prefix+':clay_gravel_10_20_m400')?.quantity).toBe('0.065984375');
 const missing=await compile(fixture(),{[pack.clay.thicknessParameterId]:null});expect(missing.rows.some(row=>row.row_id.startsWith(pack.clay.prefix+':'))).toBe(false);expect(status(missing,clayScope)).toBe('OBJECT_FACT_REQUIRED');expect(missing.rows.find(row=>row.row_id===pack.vapor.prefix+':roofing_felt_rkp350b')?.quantity).toBe('11');
 await expect(compile(fixture(),{[pack.clay.thicknessParameterId]:'0'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 expect(()=>roofClayGeometryAstV1({kind:'parameter',id:'another'})).toThrow();expect(()=>roofClayGeometryAstV1({kind:'binary',operator:'+',left:{kind:'parameter',id:pack.clay.measurementParameterId},right:{kind:'parameter',id:pack.clay.measurementParameterId}})).toThrow();
});
test.each(['Основание принято и огрунтовано; высота до 15 м; обычные условия нового строительства','Принятое минеральное основание; совместимая готовая эмульсия на всю площадь; огрунтовка оплачивается только здесь; обычные условия до 15 м',oldRoot])('old upper-base state %s cannot authorize new lower layers',async value=>{
 const r=await compile(fixture(),{roof_torch_conditions:value});expect(r.rows.some(row=>row.row_id.startsWith(pack.vapor.prefix+':')||row.row_id.startsWith(pack.clay.prefix+':'))).toBe(false);expect(status(r,chainScope)).toBe('OBJECT_FACT_REQUIRED');
});
test('none/done are independent object facts; they do not demand the new project chain or erase known geometry',async()=>{
 const r=await compile(fixture(),{roof_torch_conditions:oldRoot,[pack.vapor.systemParameterId]:pack.vapor.notApplicableChoiceRu,[pack.clay.systemParameterId]:pack.clay.completedChoiceRu});expect(r.rows).toHaveLength(34);expect(status(r,vaporScope)).toBe('NOT_APPLICABLE');expect(status(r,clayScope)).toBe('COMPLETED');expect(status(r,chainScope)).toBe('NOT_APPLICABLE');
 const onlyVapor=await compile(fixture(),{[pack.clay.systemParameterId]:pack.clay.notApplicableChoiceRu});expect(onlyVapor.rows).toHaveLength(42);expect(onlyVapor.rows.filter(row=>row.included_in_estimate)).toHaveLength(38);
 const residual=await compile(fixture(),{[otherId]:'Другие дополнительные слои ещё не проверены'});expect(status(residual,assembly)).toBe('OBJECT_FACT_REQUIRED');expect(status(residual,vaporScope)).toBe('INCLUDED');expect(status(residual,clayScope)).toBe('INCLUDED');
});
test('whole exclusion before new chain confirmation removes its own facts without bypassing the main field source check',async()=>{
 const r=await compile(fixture(),{roof_torch_conditions:oldRoot,[pack.vapor.measurementParameterId]:null,[pack.clay.areaParameterIdForGeometry]:null,[pack.clay.thicknessParameterId]:null},selection([], [vaporOp,clayOp]));
 expect(r.rows.filter(row=>row.row_id.startsWith(pack.vapor.prefix+':')||row.row_id.startsWith(pack.clay.prefix+':')).every(row=>row.quantity==='0'&&!row.included_in_estimate)).toBe(true);expect(status(r,chainScope)).toBe('NOT_APPLICABLE');expect(status(r,vaporScope)).toBe('USER_EXCLUDED');expect(status(r,clayScope)).toBe('USER_EXCLUDED');
});
test('V4 old group origin allows directed restoration and consumes only a real selection change',()=>{
 const i=fixture(),admitted=admitRoofLowerLayersMigrationProofV1(i)!,old=previous(),base=buildRoofStageRestorationV4({lowerLayers:admitted,previous:old.receipt});
 const oldSelection=selection([assembly]),migrated=migrateRoofLowerLayersSelectionV1({selection:oldSelection,admitted})!;
 const origin=createRoofLegacyAssemblySelectionOriginV1({receipt:base,sourceRevisionId:'00000000-0000-4000-8000-000000000099',sourceChecksumSha256:'c'.repeat(64),sourceDefinition:i.fromDefinition,parentSelection:oldSelection,effectiveSelection:migrated})!;
 const receipt=buildRoofStageRestorationV4({lowerLayers:admitted,previous:old.receipt,origin});expect(readRoofStageRestorationV4(receipt)).toEqual(receipt);expect(origin.active).toBe(true);expect(receipt.pairs).toHaveLength(8);
 for(const intent of [{rowIds:[],operationKeys:[vaporOp]},{rowIds:[vaporScope],operationKeys:[]}]){
  const t=roofStageRestoreTargetsV4({receipt,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,...intent});expect(t.operationKeys).toContain(vaporOp);expect(t.operationKeys).not.toContain(clayOp);expect(t.rowIds).toContain(assembly);expect(t.rowIds).toContain(vaporScope);expect(t.rowIds).not.toContain(clayScope);
 }
 const full=roofStageRestoreTargetsV4({receipt,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,rowIds:[assembly],operationKeys:[]});expect(new Set(full.operationKeys)).toEqual(new Set([vaporOp,clayOp]));
 expect(consumeRoofLegacyAssemblySelectionOriginV1({receipt,parentSelection:migrated,effectiveSelection:migrated})).toEqual(origin);
 expect(consumeRoofLegacyAssemblySelectionOriginV1({receipt,parentSelection:migrated,effectiveSelection:null})?.active).toBe(false);
 expect(()=>consumeRoofLegacyAssemblySelectionOriginV1({receipt,parentSelection:null,effectiveSelection:null})).toThrow('ROOF_ASSEMBLY_ORIGIN_SELECTION_INVALID');
 const partialRestore=selection([], [clayOp]),consumed=consumeRoofLegacyAssemblySelectionOriginV1({receipt,parentSelection:migrated,effectiveSelection:partialRestore})!;expect(consumed.active).toBe(false);
 const later=buildRoofStageRestorationV4({lowerLayers:admitted,previous:old.receipt,origin:consumed});const residualRestore=roofStageRestoreTargetsV4({receipt:later,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,rowIds:[assembly],operationKeys:[]});expect(residualRestore.operationKeys).toEqual([]);
 expect(consumeRoofLegacyAssemblySelectionOriginV1({receipt:later,parentSelection:partialRestore,effectiveSelection:migrated})?.active).toBe(false);
 const restoreDuringMigration=createRoofLegacyAssemblySelectionOriginV1({receipt:base,sourceRevisionId:origin.originRevisionId,sourceChecksumSha256:origin.originChecksumSha256,sourceDefinition:i.fromDefinition,parentSelection:oldSelection,effectiveSelection:selection()});expect(restoreDuringMigration?.active).toBe(false);
 expect(()=>assertRoofRetainedSemanticSelectionV1({parentSelection:oldSelection,requestedSelection:selection(),semanticRowIds:[assembly]})).not.toThrow();
 const forged=structuredClone(receipt);forged.legacyAssemblySelectionOrigin!.originDefinitionId='00000000-0000-4000-8000-000000000001';const {receiptSha256:_h,...body}=forged;forged.receiptSha256=hash(body);expect(readRoofStageRestorationV4(forged)).toBeNull();
});
test('semantic-only exclusion before future root reaches only its own operation, including saved row exclusions',async()=>{
 const i=fixture(),lowerLayers=admitRoofLowerLayersMigrationProofV1(i)!,receipt=buildRoofStageRestorationV4({lowerLayers,previous:previous().receipt});
 const target=(rowIds:string[])=>roofStageExcludeTargetsV4({receipt,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,rowIds,operationKeys:[]});
 expect(target([vaporScope])).toEqual({rowIds:[vaporScope],operationKeys:[vaporOp]});
 expect(target([assembly])).toEqual({rowIds:[assembly],operationKeys:[]});
 const both=target([vaporScope,clayScope]),savedResource=pack.vapor.prefix+':roofing_felt_rkp350b';
 const r=await compile(i,{roof_torch_conditions:oldRoot,[pack.vapor.measurementParameterId]:null,[pack.clay.areaParameterIdForGeometry]:null,[pack.clay.thicknessParameterId]:null},selection([...both.rowIds,savedResource],both.operationKeys));
 expect(status(r,vaporScope)).toBe('USER_EXCLUDED');expect(status(r,clayScope)).toBe('USER_EXCLUDED');expect(status(r,chainScope)).toBe('NOT_APPLICABLE');
 expect(r.rows.some(row=>(row.row_id.startsWith(pack.vapor.prefix+':')||row.row_id.startsWith(pack.clay.prefix+':'))&&row.included_in_estimate)).toBe(false);
 const wrong=roofStageExcludeTargetsV4({receipt,definitionId:'another',catalogId:i.toDefinition.catalogId,rowIds:[vaporScope],operationKeys:[]});expect(wrong.operationKeys).toEqual([]);
});
test('restoring only vapor preserves an independently excluded clay stage and manual clay price',async()=>{
 const i=fixture(),overrides={[pack.clay.prefix+':clay_gravel_10_20_m400']:{unitPrice:'1500',provenance:{kind:'manual',reason:'Control'}}},r=await compile(i,{},selection([], [clayOp]),overrides);
 expect(r.rows.find(row=>row.row_id===pack.clay.prefix+':clay_gravel_10_20_m400')).toMatchObject({quantity:'0',unit_price:'1500',included_in_estimate:false});expect(r.rows.find(row=>row.row_id===pack.vapor.prefix+':roofing_felt_rkp350b')?.quantity).toBe('11');
});
test.each(['inheritedExternalOwner','suppliedExternalOwner'])('new future root cannot bypass primer owner fence: %s',key=>{
 expect(()=>assertRoofPlannedPreparationOwnerContextV1({parameters:{roof_torch_conditions:root},inheritedExternalOwner:null,[key]:{owner:'external'}})).toThrow();
});
test.each(['oldAst','newRate','rawVolume','oldReadyCompletion','originPair'])('rejects recomputed proofs of unauthorized semantic/numeric changes: %s',kind=>{
 const i=fixture();if(kind==='oldAst')i.to.formulas[0]!.ast={kind:'literal',value:'999'};if(kind==='newRate')i.to.formulas.find(f=>f.formula_id===pack.clay.prefix+':formula:workers')!.ast={kind:'literal',value:'3'};
 if(kind==='rawVolume')i.to.parameters[0]!.parameter_id=pack.clay.measurementParameterId;if(kind==='oldReadyCompletion')i.to.resources.find(r=>r.row_id==='roof:torch-two:krer12-002-09:remaining:labor_18')!.resource_graph.scopeRequirementV1.satisfiedWhen={kind:'equals',parameterId:'roof_torch_conditions',value:root};
 if(kind==='originPair')i.to.resources.find(r=>r.row_id===chainScope)!.resource_graph.scopeRequirementV1.objectFactMode='IGNORE_VALIDATION';i.proof=buildRoofLowerLayersMigrationProofV1(i);expect(admitRoofLowerLayersMigrationProofV1(i)).toBeNull();
});
