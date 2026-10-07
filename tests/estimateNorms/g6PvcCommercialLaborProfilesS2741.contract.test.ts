import { G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 as series, G6_COMMERCIAL_LABOR_MODE_PARAMETER_S2741 as modeId,
  G6_COMPOSITE_LABOR_MODE_S2741 as rateMode } from '../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import { G6_COMMERCIAL_MASTER_SHA256_S2741 as masterHash } from '../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import { compileAutomaticConstructionOwnerR1 } from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { PVC_TRANSITION_GUIDE2024_CONTROL_INPUT as transitionFixture } from '../../scripts/estimate/r4a13/pvcBitumenTransitionGuide2024ControlInput';
import { canonicalEstimateWorkProcess } from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

const withoutPresentation = (rows: readonly Record<string, unknown>[]) => rows.map(row => {
  const { row_sha256: _rowHash, need_sha256: _needHash, ...rest } = row;
  const trace = rest.calculation_trace as Record<string, unknown> | undefined;
  const graph = (trace?.resourceGraph ?? rest.resource_graph) as Record<string, unknown>;
  const { publicResourcePresentationV1: _display, ...sourceGraph } = graph;
  return trace ? { ...rest, calculation_trace: { ...trace, resourceGraph: sourceGraph } } : { ...rest, resource_graph: sourceGraph };
});

test.each(series.map(profile => [profile.catalogId, profile] as const))('G6 series %s preserves original quantities/physical supply and gives the full labour norm one explicit rate owner', async (_id, profile) => {
  const submitted = profile.measureId === 'area_m2' ? { area_m2: 100 } : { ...transitionFixture };
  const compile = (definition: typeof profile.definition, input: Record<string, unknown> = submitted) => compileAutomaticConstructionOwnerR1({
    catalogId: profile.catalogId, compilerVersion: 'S2741-G6-commercial-fixture', primaryMeasureParameterId: profile.measureId,
    definition, submittedParameters: input });
  const original = await compile(profile.originalDefinition);
  const resourceMode = await compile(profile.definition);
  expect(withoutPresentation(resourceMode.rows)).toEqual(withoutPresentation(original.rows));
  expect(withoutPresentation(resourceMode.preliminaryNeeds)).toEqual(withoutPresentation(original.preliminaryNeeds));
  const rate = await compile(profile.definition, { ...submitted, [modeId]: rateMode });
  const originalWorker = original.rows.find(r => r.row_id === profile.workerRowId)!;
  const coveredWorker = rate.rows.find(r => r.row_id === profile.workerRowId)!;
  expect(coveredWorker).toMatchObject({ quantity: originalWorker.quantity, included_in_estimate: false, included_in_procurement: false,
    calculation_trace: { resourceGraph: { includedInResourceOwnerRowId: profile.rateRowId } } });
  expect(rate.rows.find(r => r.row_id === profile.rateRowId)).toMatchObject({ quantity: String(submitted[profile.measureId as keyof typeof submitted]),
    unit_id: profile.unitId, unit_price: null, amount: null, included_in_estimate: true });
  const supplies = (result: typeof rate) => withoutPresentation(result.rows.filter(r => r.included_in_procurement));
  expect(supplies(rate)).toEqual(supplies(original));
  const process = (result: typeof rate) => canonicalEstimateWorkProcess([...result.rows, ...result.preliminaryNeeds].map(r => ({
    rowId: r.row_id, operation: (r.calculation_trace as { resourceGraph?: Record<string, unknown> }).resourceGraph?.operationCompositionV1 })));
  expect(process(rate)).toEqual(process(original));
  expect(withoutPresentation(profile.originalDefinition.resources)).toEqual(withoutPresentation(profile.definition.resources.slice(0, -1)));
  expect(rate.totals.unpricedRowCount).toBe(original.totals.unpricedRowCount);
  const quote = profile.definition.resources.find(r => r.row_id === profile.rateRowId)!;
  expect(quote.source_metadata?.includedContractorResourceRowIds).toEqual(profile.originalDefinition.resources
    .filter(r => r.resource_graph.includedInResourceOwnerRowId === profile.workerRowId).map(r => r.row_id));
  expect(quote.source_metadata?.separatelyPayableMachinesCovered).toBe(false);
  expect(quote.title_ru).toContain('включённая оснастка');
  expect(profile.definition.parameters.find(p => p.parameter_id === modeId)?.constraints_json?.values)
    .not.toContain('По норме трудозатрат');
  expect(profile.definition.parameters.find(p => p.parameter_id === modeId)?.truth_metadata.guide).toMatchObject({
    guide_kind: 'ENUM_DECISION_RULE', source_role: 'OWNER_AUTHORISED_COMMERCIAL_SCOPE_NOT_ENGINEERING_NORM', source_snapshot_hash: masterHash });
  expect(profile.definition.runtimeSourceIds[modeId]).toEqual([]);
});
