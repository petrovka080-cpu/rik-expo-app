import parents from '../../../../data/estimate-benchmarks/fixtures/roof-valley-preparation6-parents-s27-67.json';
import originalParents from '../../../../data/estimate-benchmarks/fixtures/roof-planned-preparation-parents-s27-67.json';
import {overlayS2767RoofValleyCompanion} from '../../../../scripts/estimate/r4a13/s2767RoofValleyCompanionOverlay';
import {ROOF_VALLEY_PACK_V1 as pack,ROOF_VALLEY_SEMANTIC_ROW_V1} from './canonicalRoofValleyCompanionV1';
import {admitRoofValleyMigrationProofV1,buildRoofValleyMigrationProofV1,migrateRoofValleySelectionV1,buildRoofStageRestorationV1,readRoofStageRestorationV1,roofStageRestoreTargetsV1,composeRoofFiveToSevenMigrationV1} from './canonicalRoofValleyMigrationV1';
import {admitRoofPreparationMigrationProofV1,migrateRoofPreparationSelectionV1,assertRoofRetainedSemanticSelectionV1} from './canonicalRoofPreparationMigrationV1';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {ROOF_PLANNED_PRIMER_CONDITIONS_V1} from './canonicalRoofPlannedPreparationV1';
import {assertCanonicalCompositionSelectionReleaseMigrationV1,parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
import {canonicalManualPriceMigrationBindings} from './canonicalManualPriceReleaseMigration';
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const fixture=(index=0)=>{
 const from=structuredClone(parents.reps[index]) as any,to=overlayS2767RoofValleyCompanion(from,'00000000-0000-4000-8000-000000000001').representative;
 const i={from,to,fromDefinition:{id:from.definition.id,catalogId:from.definition.catalog_id,sha256:from.definition.definition_sha256},toDefinition:{id:'00000000-0000-4000-8000-000000000007',catalogId:from.definition.catalog_id,sha256:'7'.repeat(64)},proof:{} as unknown};
 i.proof=buildRoofValleyMigrationProofV1(i);return i;
};
const compile=(i:ReturnType<typeof fixture>,scope:unknown,length:unknown='20',selection:unknown=null,rowOverrides:Record<string,Record<string,unknown>>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:i.fromDefinition.catalogId,compilerVersion:'TEST',parameterDefinitions:i.to.parameters as any,formulaDefinitions:i.to.formulas as any,resourceDefinitions:i.to.resources as any,
 submittedParameters:{q:'40',roof_torch_system:'Наружная кровля: ЭПП-4 снизу, ЭКП-4.5 сверху, два наплавляемых слоя',roof_torch_conditions:ROOF_PLANNED_PRIMER_CONDITIONS_V1,roof_torch_area_scope:pack.areaYesRu,[pack.systemParameterId]:scope,[pack.measurementParameterId]:length},confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:138,hashJson:hash,compositionSelectionV1:parseCanonicalCompositionSelectionV1(selection)});
const status=(result:any)=>[...result.rows,...result.preliminaryNeeds].find(r=>r.row_id===ROOF_VALLEY_SEMANTIC_ROW_V1)?.calculation_trace?.resourceGraph?.scopeRequirementDecisionV1?.status;
test.each([0,1])('the bounded additive migration %s keeps every old price binding and calculates L independently',async index=>{
 const i=fixture(index),a=admitRoofValleyMigrationProofV1(i);expect(a).not.toBeNull();
 const oldBindings=canonicalManualPriceMigrationBindings(i.from),nextBindings=canonicalManualPriceMigrationBindings(a!.normalizedTo);
 for(const id of Object.keys(oldBindings))expect(nextBindings[id]).toBe(oldBindings[id]);
 const result=await compile(i,pack.systemYesRu);expect(result.rows).toHaveLength(19);expect(result.rows.filter(r=>r.included_in_estimate)).toHaveLength(18);
  for(const [role,q]of [['workers','3.58'],['tower_crane_8t','0.048'],['truck_crane_10t','0.02'],['gas_flame_burner','1.32'],['flatbed_truck_to_5t','0.03'],['propane_butane','2.36'],['lower_isoplast_epp_4','69']])expect(result.rows.find(r=>r.row_id===pack.prefix+':'+role)?.quantity).toBe(q);
 expect(result.rows.find(r=>r.row_id==='roof:torch-two:krer12-002-09:workers')?.quantity).toBe('5.744');
 expect(result.rows.find(r=>r.row_id==='roof:prime-ready-emulsion:krer12-016-02:ready_bitumen_emulsion')?.quantity).toBe('18');expect(status(result)).toBe('INCLUDED');
 expect(canonicalManualPriceMigrationBindings(i.to)[pack.prefix+':lower_isoplast_epp_4']).not.toBe(oldBindings['roof:torch-two:krer12-002-09:lower_isoplast_epp_4']);
});
test.each([[pack.notApplicableChoiceRu,'NOT_APPLICABLE'],[pack.completedChoiceRu,'COMPLETED'],[pack.unknownChoiceRu,'OBJECT_FACT_REQUIRED'],[pack.legacyChoiceRu,'SCOPE_UNVERIFIED']])('separates %s without changing retained length',async(scope,expected)=>{
 const i=fixture(),result=await compile(i,scope);expect(result.rows.some(r=>r.row_id.startsWith(pack.prefix+':'))).toBe(false);expect(status(result)).toBe(expected);
});
test('a planned node without measured length stays preliminary and never borrows q',async()=>{
 const result=await compile(fixture(),pack.systemYesRu,null);expect(result.rows.some(r=>r.row_id.startsWith(pack.prefix+':'))).toBe(false);expect(status(result)).toBe('OBJECT_FACT_REQUIRED');
});
test.each(['oldFormula','oldGraph','oldParameter','lengthUnit','lengthDefault','lengthConstraint','lengthAuthority','newRate','newOwner','newSource','newAllocation','scopeAlternative','otherCatalog'])('rejects %s even with a recomputed digest',kind=>{
 const i=fixture(),row=i.to.resources.find(r=>r.row_id===pack.prefix+':workers')!,length=i.to.parameters.find(p=>p.parameter_id===pack.measurementParameterId)!;
 if(kind==='oldFormula')i.to.formulas[0].ast={kind:'literal',value:'99'};
 if(kind==='oldGraph')i.to.resources.find(r=>r.row_id==='roof:prime-ready-emulsion:krer12-016-02:workers')!.resource_graph.derivedQuantityEditPolicyV1.parameterIds=['roof_valley_length_m'];
 if(kind==='oldParameter')i.to.parameters.find(p=>p.parameter_id==='q')!.constraints_json.min=99;
 if(kind==='lengthUnit')length.unit_id='m2';if(kind==='lengthDefault')length.default_value=20;if(kind==='lengthConstraint')delete length.constraints_json.exclusiveMin;
 if(kind==='lengthAuthority')length.truth_metadata.value_source_role='APPLICATION_NORM';
 if(kind==='newRate')row.source_metadata.normativeRatePer100Measure='35.8';if(kind==='newOwner')row.cost_owner_id=i.from.resources[0].cost_owner_id;
 if(kind==='newSource')row.source_metadata.normativeTrace=[];if(kind==='newAllocation')row.resource_graph.operationQuantityContributionsV1={aggregation:'SUM'};
 if(kind==='scopeAlternative')i.to.resources.find(r=>r.row_id===ROOF_VALLEY_SEMANTIC_ROW_V1)!.resource_graph.scopeRequirementV1.notApplicableWhen={kind:'boolean',value:true};
 if(kind==='otherCatalog')i.toDefinition.catalogId='another';i.proof=buildRoofValleyMigrationProofV1(i);expect(admitRoofValleyMigrationProofV1(i)).toBeNull();
});
test('transfers the old semantic exclusion and restores both generations atomically after a receipt round trip',async()=>{
 const i=fixture(),valley=admitRoofValleyMigrationProofV1(i)!,original=structuredClone(originalParents.reps[0]) as any;
 const preparation=admitRoofPreparationMigrationProofV1({proof:i.from.definition.source_metadata.roofPreparationMigrationV1,from:original,to:i.from,fromDefinition:{id:original.definition.id,catalogId:original.definition.catalog_id,sha256:original.definition.definition_sha256},toDefinition:i.fromDefinition})!;
 expect(preparation).not.toBeNull();const receipt=JSON.parse(JSON.stringify(buildRoofStageRestorationV1({valley,preparation})));expect(readRoofStageRestorationV1(receipt)).toEqual(receipt);
 const composed=composeRoofFiveToSevenMigrationV1({valley,preparation});
 const originalPrices=canonicalManualPriceMigrationBindings(original),composedPrices=canonicalManualPriceMigrationBindings(composed);
 for(const id of Object.keys(originalPrices))expect(composedPrices[id]).toBe(originalPrices[id]);
 const primer=receipt.pairs[0],other='roof:torch-two:krer12-002-09:upper_isoplast_ekp_4_5';
 const initial={contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[ROOF_VALLEY_SEMANTIC_ROW_V1,primer.rowId,other],excludedOperationKeys:[primer.operationKey]};
 expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection:initial,from:i.from,to:i.to})).toThrow();
 expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection:initial,from:i.from,to:valley.normalizedTo})).not.toThrow();
 // Definition5 could exclude the semantic row, but had no paid primer operation yet.
 expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection:{...initial,excludedOperationKeys:[]},from:original,to:composed})).not.toThrow();
 expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection:initial,from:original,to:composed})).toThrow();
 const direct=migrateRoofValleySelectionV1({selection:migrateRoofPreparationSelectionV1({selection:{...initial,excludedOperationKeys:[]},admitted:preparation}),admitted:valley})!;
 expect(direct.excludedOperationKeys).toEqual([primer.operationKey,receipt.pairs[1].operationKey].sort());
 const sourceCheck=original.resources.find((r:any)=>r.resource_graph.scopeRequirementV1?.kind==='OBJECT_SCOPE')!.row_id;
 const historical={...initial,excludedRowIds:[...initial.excludedRowIds,sourceCheck],excludedOperationKeys:[]};
 const repaired={...historical,excludedRowIds:historical.excludedRowIds.filter(id=>id!==sourceCheck)};
 expect(()=>assertRoofRetainedSemanticSelectionV1({parentSelection:historical,requestedSelection:repaired,semanticRowIds:[primer.rowId,ROOF_VALLEY_SEMANTIC_ROW_V1]})).not.toThrow();
 expect(()=>assertRoofRetainedSemanticSelectionV1({parentSelection:{...historical,excludedRowIds:[sourceCheck]},requestedSelection:repaired,semanticRowIds:[primer.rowId,ROOF_VALLEY_SEMANTIC_ROW_V1]})).toThrow();
 await expect(compile(i,pack.systemYesRu,'20',historical)).rejects.toMatchObject({code:'COMPOSITION_SELECTION_INVALID'});
 const repairedTransfer=migrateRoofValleySelectionV1({selection:migrateRoofPreparationSelectionV1({selection:repaired,admitted:preparation}),admitted:valley});
 const repairedResult=await compile(i,pack.systemYesRu,'20',repairedTransfer,{'roof:torch-two:krer12-002-09:workers':{unitPrice:'75',provenance:{kind:'manual',reason:'Retained control price'}}});
 expect(repairedResult.rows.filter(r=>r.row_id.startsWith(pack.prefix+':')||r.row_id.startsWith('roof:prime-ready-emulsion:')).every(r=>r.quantity==='0')).toBe(true);
 expect(repairedResult.rows.find(r=>r.row_id==='roof:torch-two:krer12-002-09:workers')?.unit_price).toBe('75');
 const selection=migrateRoofValleySelectionV1({selection:initial,admitted:valley})!;
 const excluded=await compile(i,pack.systemYesRu,'20',selection);expect(excluded.rows.filter(r=>r.row_id.startsWith(pack.prefix+':')).every(r=>r.quantity==='0')).toBe(true);
 for(const pair of receipt.pairs)for(const action of ['row','operation']){
  const targets=roofStageRestoreTargetsV1({receipt,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,rowIds:action==='row'?[pair.rowId]:[],operationKeys:action==='operation'?[pair.operationKey]:[]});
  expect(targets.rowIds).toContain(pair.rowId);expect(targets.operationKeys).toContain(pair.operationKey);
  expect(targets.rowIds).not.toContain(other);
 }
 const tampered=structuredClone(receipt);tampered.originalPreparationProof.toDefinitionId=i.toDefinition.id;expect(readRoofStageRestorationV1(tampered)).toBeNull();
 const future=roofStageRestoreTargetsV1({receipt,definitionId:'00000000-0000-4000-8000-000000000008',catalogId:i.toDefinition.catalogId,rowIds:[primer.rowId],operationKeys:[]});expect(future.operationKeys).toEqual([]);
});
