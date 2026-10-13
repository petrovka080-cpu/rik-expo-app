import pack from '../../../../data/estimate-benchmarks/source-packs/roof-screed15-companion-s27-67.json';
import parent from '../../../../data/estimate-benchmarks/fixtures/roof-screed25-gutters11-parents-s27-67.json';
import { sourcePinnedRoofNormOwnerR1, type SourcePinnedRoofNormPackR1 } from '../v4/sourcePinnedRoofNormOwnerR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from './canonicalEstimateCompileCore';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { roofScreed15DirectBaseParameterV1, roofScreed15DirectBaseRowV1,
  ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1, ROOF_SCREED15_SUPPORTED_BASE_V1,
  ROOF_SCREED15_LOOSE_FILL_BASE_V1, ROOF_SCREED15_UNKNOWN_BASE_V1 } from './canonicalRoofScreedDirectBaseV1';
import { ROOF_LOWER_CHAIN_SCOPE_ROW_V1, ROOF_LOWER_LAYERS_PACK_V1 } from './canonicalRoofLowerLayersCompanionV1';
import { ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1 } from './canonicalRoofForecastConditionV1';
import { resolveCanonicalScopeRequirementV1 } from './canonicalScopeRequirementV1';

const catalogId = 'canonical-work:base:roofing_interior_flat_roof_install_technical_room';
const hash = (v: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
function fixture(base?: string): CanonicalEstimateCompileCoreInput {
  const owner = sourcePinnedRoofNormOwnerR1(pack as SourcePinnedRoofNormPackR1);
  const exemplar = owner.parameters.find(p => p.parameter_id === pack.measurementParameterId)!;
  const fact = roofScreed15DirectBaseParameterV1(exemplar, owner.resources[0]!.inclusion_ast, catalogId);
  return { operation: 'recalculate' as const, catalogId, compilerVersion: 'TEST_DIRECT_BASE',
    parameterDefinitions: [...owner.parameters, fact] as CanonicalEstimateCompileCoreInput['parameterDefinitions'], formulaDefinitions: [...owner.formulas],
    resourceDefinitions: owner.resources.map(roofScreed15DirectBaseRowV1) as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
    submittedParameters: { [pack.measurementParameterId]: '20', [pack.systemParameterId]: pack.systemYesRu,
      [pack.conditionsParameterId]: pack.conditionsYesRu, [pack.areaParameterId]: pack.areaYesRu,
      ...(base == null ? {} : { [ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1]: base }) },
    confirmedParameters: {}, currencyCode: 'KGS', priceItems: [], maximumResourceRows: 50, hashJson: hash };
}
test('15mm on its own supported substrate preserves all source quantities and never rewrites the old owner', async () => {
  const original = sourcePinnedRoofNormOwnerR1(pack as SourcePinnedRoofNormPackR1), before = hash(original);
  const result = await compileCanonicalEstimateCore(fixture(ROOF_SCREED15_SUPPORTED_BASE_V1));
  expect(result.rows.find(r => r.row_id.endsWith(':ready_cement_mortar_m100'))?.quantity).toBe('0.306');
  expect(result.rows.find(r => r.row_id.endsWith(':workers'))?.quantity).toBe('5.444');
  expect(result.rows.filter(r => r.included_in_estimate)).toHaveLength(7);
  for (const row of original.resources) {
    const updated = roofScreed15DirectBaseRowV1(row);
    expect(updated).toMatchObject({ formula_id: row.formula_id, unit_id: row.unit_id,
      cost_owner_id: row.cost_owner_id, source_metadata: row.source_metadata });
  }
  expect(hash(original)).toBe(before);
});
test.each([ROOF_SCREED15_LOOSE_FILL_BASE_V1, ROOF_SCREED15_UNKNOWN_BASE_V1])('a generic project confirmation never admits15mm on unsupported/unknown direct base: %s', async base => {
  const result = await compileCanonicalEstimateCore(fixture(base));
  expect(result.rows.some(r => r.included_in_estimate)).toBe(false);
  const missing = await compileCanonicalEstimateCore(fixture());
  expect(missing.rows.some(r => r.included_in_estimate)).toBe(false);
  expect(missing.preliminaryNeeds).toHaveLength(8);
  for (const need of missing.preliminaryNeeds) {
    expect(need.missing_parameter_ids).toContain(ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1);
  }
});
test('the old lower-layer project enum cannot independently mark the chain compatible', () => {
  const snapshot = parent.representatives[0]!;
  const old = snapshot.resources.find(r => r.row_id === ROOF_LOWER_CHAIN_SCOPE_ROW_V1)!;
  const updated = roofScreed15DirectBaseRowV1(old);
  const parameters = { roof_torch_conditions: ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1,
    [pack.systemParameterId]: pack.systemYesRu, [pack.areaParameterId]: pack.areaYesRu,
    [ROOF_LOWER_LAYERS_PACK_V1.clay.systemParameterId]: ROOF_LOWER_LAYERS_PACK_V1.clay.systemYesRu,
    [ROOF_LOWER_LAYERS_PACK_V1.vapor.systemParameterId]: ROOF_LOWER_LAYERS_PACK_V1.vapor.systemYesRu };
  const input = { rowId: old.row_id, parameters,
    resourceIds: new Set(snapshot.resources.map(r => r.row_id)),
    parameterIds: new Set([...snapshot.parameters.map(p => p.parameter_id), ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1]),
    knownQuantityRowIds: new Set(snapshot.resources.map(r => r.row_id)) };
  expect(resolveCanonicalScopeRequirementV1({ ...input, graph: old.resource_graph })?.status).toBe('COMPLETED');
  expect(resolveCanonicalScopeRequirementV1({ ...input, graph: updated.resource_graph })?.status).not.toBe('COMPLETED');
  expect(resolveCanonicalScopeRequirementV1({ ...input, graph: updated.resource_graph,
    parameters: { ...parameters, [ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1]: ROOF_SCREED15_SUPPORTED_BASE_V1 } })?.status).toBe('COMPLETED');
});
