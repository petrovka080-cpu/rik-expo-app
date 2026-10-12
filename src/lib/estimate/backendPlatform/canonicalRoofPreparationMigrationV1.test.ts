import parents from '../../../../data/estimate-benchmarks/fixtures/roof-planned-preparation-parents-s27-67.json';
import field from '../../../../data/estimate-benchmarks/source-packs/flat-roof-scope-s27-65.json';
import primer from '../../../../data/estimate-benchmarks/source-packs/roof-prime-ready-emulsion-five-s27-63.json';
import {overlayPlannedRoofPreparation} from '../../../../scripts/estimate/r4a13/s2767PlannedRoofPreparationOverlay';
import {admitRoofPreparationMigrationProofV1,buildRoofPreparationMigrationProofV1,migrateRoofPreparationSelectionV1,roofPreparationRestoreTargetsV1} from './canonicalRoofPreparationMigrationV1';
import {assertCanonicalCompositionSelectionReleaseMigrationV1,parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {ROOF_PLANNED_PRIMER_CONDITIONS_V1} from './canonicalRoofPlannedPreparationV1';
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const fixture=(index=0)=>{
 const from=structuredClone(parents.reps[index]) as any;
 const to=overlayPlannedRoofPreparation(from,field as any,primer as any,'00000000-0000-4000-8000-000000000001').representative;
 const input={from,to,fromDefinition:{id:from.definition.id,catalogId:from.definition.catalog_id,sha256:from.definition.definition_sha256},toDefinition:{id:'00000000-0000-4000-8000-000000000002',catalogId:from.definition.catalog_id,sha256:'a'.repeat(64)},proof:{} as unknown};
 input.proof=buildRoofPreparationMigrationProofV1(input);return input;
};
const compile=(r:any,condition:string,selection:unknown=null)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:r.definition.catalog_id,compilerVersion:'TEST',parameterDefinitions:r.parameters,formulaDefinitions:r.formulas,resourceDefinitions:r.resources,submittedParameters:{q:'40',[field.systemParameterId]:field.systemYesRu,[field.conditionsParameterId]:condition,[field.areaParameterId]:field.areaYesRu},confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:131,hashJson:hash,compositionSelectionV1:parseCanonicalCompositionSelectionV1(selection)});
const scopeStatus=(row:any)=>row?.calculation_trace?.resourceGraph?.scopeRequirementDecisionV1?.status;
describe('source-bound planned preparation and narrow immutable migration',()=>{
 test.each([0,1])('admits only the exact additive transition for target %s and retains old completed quantities',async index=>{
  const i=fixture(index),admitted=admitRoofPreparationMigrationProofV1(i);expect(admitted).not.toBeNull();
  expect(i.to.parameters.every(p=>p.truth_metadata.contract==='rik-expo-app.s27-67.integrated-planned-roof-priming.v1')).toBe(true);
  expect(i.to.baseline.normative_source_ids.q).toContain('rik-expo-app.s27-67.integrated-planned-roof-priming.v1:roof');
  expect((await compile(i.to,field.conditionsYesRu)).rows).toEqual((await compile(i.from,field.conditionsYesRu)).rows);
  const planned=await compile(i.to,ROOF_PLANNED_PRIMER_CONDITIONS_V1);
  expect(planned.rows).toHaveLength(12);expect(planned.rows.filter(r=>r.included_in_estimate)).toHaveLength(11);
  for(const [role,q]of [['workers','1.12'],['flatbed_truck','0.016'],['ready_bitumen_emulsion','18']])expect(planned.rows.find(r=>r.row_id===primer.prefix+':'+role)?.quantity).toBe(q);
  expect(scopeStatus(planned.preliminaryNeeds.find(r=>r.row_id===field.prefix+':source-gap:primer'))).toBe('INCLUDED');
 });
 test('preserves row and operation exclusions without weakening the default migration guard',async()=>{
  const i=fixture(),admitted=admitRoofPreparationMigrationProofV1(i)!;
  const selection={contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[admitted.semanticPrimerRowId,field.prefix+':upper_isoplast_ekp_4_5'],excludedOperationKeys:[]};
  expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection,from:i.from,to:i.to})).toThrow(expect.objectContaining({code:'COMPOSITION_SELECTION_MIGRATION_REVIEW_REQUIRED'}));
  expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection,from:i.from,to:admitted.normalizedTo})).not.toThrow();
  const migrated=migrateRoofPreparationSelectionV1({selection,admitted});expect(migrated?.excludedRowIds).toEqual([...selection.excludedRowIds].sort());
  const result=await compile(i.to,ROOF_PLANNED_PRIMER_CONDITIONS_V1,migrated);
  expect(result.rows.filter(r=>r.row_id.startsWith(primer.prefix+':')).every(r=>r.quantity==='0'&&!r.included_in_estimate)).toBe(true);
  expect(result.rows.find(r=>r.row_id===field.prefix+':workers')?.quantity).toBe('5.744');
  expect(scopeStatus([...result.rows,...result.preliminaryNeeds].find(r=>r.row_id===admitted.semanticPrimerRowId))).toBe('USER_EXCLUDED');
  expect(migrateRoofPreparationSelectionV1({selection:{...selection,excludedRowIds:[]},admitted})?.excludedOperationKeys).toEqual([]);
 });
 test.each(['unit','rate','costOwner','procurement','formula','oldApplicability','extraChoice','guideAuthority','source','newAllocation','proofIdentity','otherCatalog'])('rejects %s even with a newly recalculated semantic digest',kind=>{
  const i=fixture(),r=i.to.resources.find(r=>r.row_id===primer.prefix+':workers')!,old=i.to.resources.find(r=>r.row_id===field.prefix+':workers')!;
  if(kind==='unit')r.unit_id='kg';if(kind==='rate')r.source_metadata.normativeRatePer100M2='3';
  if(kind==='costOwner')r.cost_owner_id=old.cost_owner_id;if(kind==='procurement')r.procurement_eligible=true;
  if(kind==='formula')i.to.formulas.find(f=>f.formula_id===old.formula_id)!.ast={kind:'literal',value:'99'};
  if(kind==='oldApplicability')old.inclusion_ast={kind:'boolean',value:true};
  if(kind==='extraChoice')i.to.parameters.find(p=>p.parameter_id===field.conditionsParameterId)!.constraints_json.values.push('another');
  if(kind==='guideAuthority')i.to.parameters[0]!.truth_metadata.visibility_role='HIDDEN';
  if(kind==='source')r.source_metadata.normativeTrace=[];if(kind==='newAllocation')r.resource_graph.operationQuantityContributionsV1={aggregation:'SUM'};
  if(kind==='otherCatalog')i.toDefinition.catalogId='unrelated';
  i.proof=buildRoofPreparationMigrationProofV1(i);
  if(kind==='proofIdentity')(i.proof as any).fromDefinitionId='bad';
  expect(admitRoofPreparationMigrationProofV1(i)).toBeNull();
 });
 test('unknown and legacy choices never acquire the new primer resources',async()=>{
  const i=fixture();expect((await compile(i.to,'Условия ещё не проверены')).rows.some(r=>r.row_id.startsWith(primer.prefix+':'))).toBe(false);
  expect(i.to.parameters).toHaveLength(i.from.parameters.length);
 });
 test.each(['semantic','operation'])('atomically restores an actually migrated exclusion from the %s action and retains an unrelated exclusion',async action=>{
  const i=fixture(),admitted=admitRoofPreparationMigrationProofV1(i)!,other=field.prefix+':upper_isoplast_ekp_4_5';
  const migrated=migrateRoofPreparationSelectionV1({selection:{contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[admitted.semanticPrimerRowId,other],excludedOperationKeys:[]},admitted})!;
  const targets=roofPreparationRestoreTargetsV1({proof:admitted.proof,definitionId:i.toDefinition.id,catalogId:i.toDefinition.catalogId,
   rowIds:action==='semantic'?[admitted.semanticPrimerRowId]:[],operationKeys:action==='operation'?[admitted.primerOperationKey]:[]});
  const restored={...migrated,excludedRowIds:migrated.excludedRowIds.filter(id=>!targets.rowIds.includes(id)),excludedOperationKeys:migrated.excludedOperationKeys.filter(id=>!targets.operationKeys.includes(id))};
  expect(restored.excludedRowIds).toEqual([other]);expect(restored.excludedOperationKeys).toEqual([]);
  const result=await compile(i.to,ROOF_PLANNED_PRIMER_CONDITIONS_V1,restored);
  expect(result.rows.filter(r=>r.row_id.startsWith(primer.prefix+':')).every(r=>Number(r.quantity)>0&&r.included_in_estimate)).toBe(true);
  expect(scopeStatus(result.preliminaryNeeds.find(r=>r.row_id===admitted.semanticPrimerRowId))).toBe('INCLUDED');
  expect(result.rows.find(r=>r.row_id===other)?.quantity).toBe('0');
 });
});
