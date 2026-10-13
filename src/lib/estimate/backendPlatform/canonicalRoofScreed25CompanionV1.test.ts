import snapshot from '../../../../data/estimate-benchmarks/fixtures/roof-screed25-gutters11-parents-s27-67.json';
import { overlayS2767RoofScreed25Companion } from '../../../../scripts/estimate/r4a13/s2767RoofScreed25CompanionOverlay';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from './canonicalEstimateCompileCore';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { ROOF_SCREED25_PACK_V1 as pack, ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 } from './canonicalRoofScreed25CompanionV1';
import { canonicalManualMachineHourPriceCoverageV1 } from './canonicalMachineHourPriceCoverageV1';
import type { PurchaseGroupRepresentative } from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import field from '../../../../data/estimate-benchmarks/source-packs/flat-roof-torch-two-s27-63.json';
import { ROOF_LOWER_CHAIN_SCOPE_ROW_V1, ROOF_LOWER_LAYERS_PACK_V1 as lower } from './canonicalRoofLowerLayersCompanionV1';
import { ROOF_SCREED25_OPERATION_KEY_V1 } from './canonicalRoofScreed25CompanionV1';
import { ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1,ROOF_SCREED25_DIRECT_BASE_UNKNOWN_V1 } from './canonicalRoofScreed25CompanionV1';
import type { CanonicalScopeRequirementDecisionV1 } from './canonicalScopeRequirementV1';
const hash = (value: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
function scopeDecision(trace:unknown):CanonicalScopeRequirementDecisionV1|undefined {
  return (trace as {resourceGraph?:{scopeRequirementDecisionV1?:CanonicalScopeRequirementDecisionV1}}|undefined)?.resourceGraph?.scopeRequirementDecisionV1;
}
function fixture(index: number) {
  const parent = snapshot.representatives[index] as unknown as PurchaseGroupRepresentative;
  const overlay = overlayS2767RoofScreed25Companion(parent, 'candidate-source-locator');
  const model = overlay.representative;
  const parameters = { q: '40', [field.systemParameterId]: field.systemYesRu,
    [field.areaParameterId]: field.areaYesRu, roof_torch_conditions: ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1,
    [pack.measurementParameterId]: '20', [pack.conditionsParameterId]: pack.conditionsYesRu,
    [pack.areaParameterId]: pack.areaYesRu };
  const input: CanonicalEstimateCompileCoreInput = { operation: 'recalculate', compilerVersion: 'TEST_SCREEED25_OVERLAY',
    catalogId: String(parent.definition.catalog_id), parameterDefinitions: model.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
    formulaDefinitions: model.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'], resourceDefinitions: model.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'], submittedParameters: parameters,
    confirmedParameters: {}, currencyCode: 'KGS', priceItems: [], maximumResourceRows: 400, hashJson: hash };
  return { parent, overlay, model, parameters, input };
}
test.each([0,1])('exact cohort%s keeps history, all old formula ASTs and a single25mm stage', async index => {
  const before = hash(snapshot.representatives[index]), f = fixture(index);
  expect(f.model.resources).toHaveLength(188);expect(f.model.parameters).toHaveLength(82);
  expect(f.overlay.addedRowIds).toHaveLength(10);expect(f.overlay.addedParameterIds).toHaveLength(4);
  expect(hash(snapshot.representatives[index])).toBe(before);
  for (const old of f.parent.formulas) expect(f.model.formulas.find(formula => formula.formula_id === old.formula_id)?.ast).toEqual(old.ast);
  for (const old of f.parent.resources) expect(f.model.resources.find(row => row.row_id === old.row_id))
    .toMatchObject({ id: old.id, formula_id: old.formula_id, cost_owner_id: old.cost_owner_id, unit_id: old.unit_id });
  const result = await compileCanonicalEstimateCore(f.input);
  const expected = { workers:'7.444',included_machine_operators:'0.448',tower_crane_8t:'0.156',forklift_5t:'0.292',
    mortar_pump:'0.472',water:'0.77',roofing_felt:'0.88',ready_cement_mortar_m100:'0.51' };
  for (const [role,quantity] of Object.entries(expected)) expect(result.rows.find(r=>r.row_id===`${pack.prefix}:${role}`)?.quantity).toBe(quantity);
  expect(result.rows.filter(r=>r.row_id.startsWith(pack.prefix+':')&&r.included_in_estimate)).toHaveLength(7);
  expect(result.rows.some(r=>r.row_id.startsWith('roof:cement-screed15:')&&r.included_in_estimate)).toBe(false);
  const oldScope = [...result.rows,...result.preliminaryNeeds].find(r => r.row_id === 'roof:torch-two:krer12-002-09:remaining:labor_18');
  expect(scopeDecision(oldScope?.calculation_trace)).toMatchObject({status:'NOT_APPLICABLE',missingObjectFactParameterIds:[]});
  const changedRoof = await compileCanonicalEstimateCore({...f.input,submittedParameters:{...f.parameters,q:'500'}});
  expect(changedRoof.rows.filter(r=>r.row_id.startsWith(pack.prefix+':')).map(r=>[r.row_id,r.quantity]))
    .toEqual(result.rows.filter(r=>r.row_id.startsWith(pack.prefix+':')).map(r=>[r.row_id,r.quantity]));
});
test.each([pack.conditionsParameterId,pack.areaParameterId])('unknown factual%s cannot create paid25mm quantities', async id => {
  const f=fixture(0),parameters:Record<string,unknown>={...f.parameters};delete parameters[id];
  const result=await compileCanonicalEstimateCore({...f.input,submittedParameters:parameters});
  expect(result.rows.some(r=>r.row_id.startsWith(pack.prefix+':')&&r.included_in_estimate)).toBe(false);
  const chain=[...result.rows,...result.preliminaryNeeds].find(r=>r.row_id===ROOF_LOWER_CHAIN_SCOPE_ROW_V1);
  expect(scopeDecision(chain?.calculation_trace)).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:[id]});
});
test('active25mm area must be positive; an exclusion never asserts that its direct base is suitable',async()=>{
  const f=fixture(0);
  await expect(compileCanonicalEstimateCore({...f.input,submittedParameters:{...f.parameters,[pack.measurementParameterId]:'0'}})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  const parameters:Record<string,unknown>={...f.parameters,[lower.vapor.systemParameterId]:lower.vapor.systemYesRu,[lower.vapor.measurementParameterId]:'10'};
  delete parameters[pack.conditionsParameterId];delete parameters[pack.areaParameterId];delete parameters[pack.measurementParameterId];
  const result=await compileCanonicalEstimateCore({...f.input,submittedParameters:parameters,compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[],excludedOperationKeys:[ROOF_SCREED25_OPERATION_KEY_V1]}});
  expect(result.rows.some(r=>r.row_id.startsWith(pack.prefix+':')&&r.included_in_estimate)).toBe(false);
  const chain=[...result.rows,...result.preliminaryNeeds].find(r=>r.row_id===ROOF_LOWER_CHAIN_SCOPE_ROW_V1);
  expect(scopeDecision(chain?.calculation_trace)).toMatchObject({status:'COMPLETED',missingObjectFactParameterIds:[]});
  expect(result.rows.some(r=>r.row_id.startsWith(lower.vapor.prefix+':')&&r.included_in_estimate)).toBe(true);
});
test.each([[pack.conditionsParameterId,ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1],[pack.areaParameterId,ROOF_SCREED25_DIRECT_BASE_UNKNOWN_V1]])('the selectable unknown%s points to the actual required field',async(id,value)=>{
  const f=fixture(0);expect(f.model.parameters.find(p=>p.parameter_id===id)?.constraints_json.values).toContain(value);
  const result=await compileCanonicalEstimateCore({...f.input,submittedParameters:{...f.parameters,[id]:value}});
  const chain=[...result.rows,...result.preliminaryNeeds].find(r=>r.row_id===ROOF_LOWER_CHAIN_SCOPE_ROW_V1);
  expect(scopeDecision(chain?.calculation_trace)).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:[id]});
  expect(result.rows.some(r=>r.row_id.startsWith(pack.prefix+':')&&r.included_in_estimate)).toBe(false);
});
test('25mm machines require actual price composition; quantities and unpaidINFO stay fixed',async()=>{
  const f=fixture(0),rowId=`${pack.prefix}:tower_crane_8t`,provenance={kind:'manual' as const,reason:'consumer_estimate_row_batch_edit'};
  const scalar=await compileCanonicalEstimateCore({...f.input,rowOverrides:{[rowId]:{unitPrice:'1000',provenance}}});
  expect(scalar.rows.find(r=>r.row_id===rowId)).toMatchObject({quantity:'0.156',amount:'156',calculation_trace:{machineHourPriceCoverageV1:{status:'UNCONFIRMED'}}});
  const coverage=canonicalManualMachineHourPriceCoverageV1({rowId,unitPrice:'1000',currencyCode:'KGS'});
  const confirmed=await compileCanonicalEstimateCore({...f.input,rowOverrides:{[rowId]:{unitPrice:'1000',machineHourPriceCoverageV1:coverage,provenance}}});
  expect(confirmed.rows.find(r=>r.row_id===rowId)).toMatchObject({quantity:'0.156',calculation_trace:{machineHourPriceCoverageV1:{status:'CONFIRMED_MANUAL'}}});
  expect(confirmed.rows.find(r=>r.row_id===`${pack.prefix}:included_machine_operators`)?.included_in_estimate).toBe(false);
});
