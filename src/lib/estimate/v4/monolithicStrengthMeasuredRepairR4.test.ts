import { buildMonolithicStrengthMeasuredRepairR4 as build } from './monolithicStrengthMeasuredRepairR4';
import { buildMonolithicStrengthDirectWholeCycleR2, strengthDirectParameterR2 as sp,
  strengthDirectRowR2 as sr } from './monolithicStrengthDirectWholeCycleR2';
import { buildMonolithicRepairHandSourceCandidateR3, repairParameterR3 as rp,
  repairRowR3 as rr } from './monolithicStrengthRepairR3';
import { compileAutomaticConstructionOwnerR1 } from './automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { canonicalEstimateOperationReference, canonicalEstimateOperationReferences,
  canonicalEstimateResourceOperationSections } from '../backendPlatform/canonicalEstimateOperationComposition';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

const facts = (): Record<string, unknown> => ({
  [sp('member_count')]: 1, [sp('member_kind')]: 'FLAT', [sp('area_m2')]: 100,
  [sp('member_ref')]: 'TEST_ONLY one actual member; not a project approval',
  [sp('thickness_mm')]: 200, [sp('aggregate_mm')]: 20, [sp('spacing_mm')]: 240,
  [sp('edge_mm')]: 150, [sp('rebar_clear_mm')]: 70, [sp('device_count')]: 1,
  [sp('deployment_ref')]: 'TEST_ONLY actual device provision', [sp('provider_ref')]: 'TEST_ONLY verification',
  [rp('patch_count')]: 6, [rp('length_m')]: 0.1, [rp('width_m')]: 0.1, [rp('depth_m')]: 0.075,
  [rp('geometry_ref')]: 'TEST_ONLY actual rectangular prepared damage; not nominal test holes',
  [rp('method_ref')]: 'TEST_ONLY exact GB hand repair programme',
  [rp('substrate')]: 'SOUND_ROUGH_NO_EXPOSED_REBAR_NO_SEPARATE_PRIMER',
  [rp('ambient_c')]: 20, [rp('substrate_c')]: 20, [rp('station_count')]: 2,
  [rp('station_ref')]: 'TEST_ONLY two documented complete initial repair stations',
  [rp('container_ref')]: 'TEST_ONLY qualified whole-charge working volume',
  [rp('voltage_v')]: 230, [rp('gear')]: 1, [rp('paddle_mm')]: 140, [rp('paddle_key_mm')]: '24',
  [rp('mixing_programme_ref')]: 'TEST_ONLY one actual whole charge and chosen water dose',
  [rp('whole_charge_count')]: 1, [rp('water_l_per_charge')]: '3.6',
  [rp('dry_supply_ref')]: 'TEST_ONLY exact usable whole bags', [rp('dry_stock_bags')]: 1, [rp('dry_reserve_bags')]: 1,
});
const definition = build();
const publicIds = new Set(definition.ordinaryParameterIds);
const channels = (input: Record<string, unknown>) => ({
  submittedParameters: Object.fromEntries(Object.entries(input).filter(([id]) => publicIds.has(id))),
  confirmedParameters: Object.fromEntries(Object.entries(input).filter(([id]) => !publicIds.has(id))),
});
const compile = (input: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({
  definition, compilerVersion: 'strength-measured-repair-r4-test-only',
  catalogId: 'TEST_ONLY_SELECTED_DIRECT_METHOD_WITH_GB_REPAIR', primaryMeasureParameterId: sp('member_count'),
  ...channels(input),
});
const amend = (input: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'],
  compositionSelectionV1?: CanonicalEstimateCompileCoreInput['compositionSelectionV1']) =>
  compileCanonicalEstimateCore({ operation: 'recalculate',
    compilerVersion: 'strength-measured-repair-r4-test-only', catalogId: 'TEST_ONLY_SELECTED_DIRECT_METHOD_WITH_GB_REPAIR',
    primaryMeasureParameterId: sp('member_count'), parameterDefinitions: [...definition.parameters],
    formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    ...channels(input), rowOverrides, compositionSelectionV1, currencyCode: 'KGS', priceItems: [],
    maximumResourceRows: definition.resources.length, hashJson: async value => estimateDeterministicHash(value) });

it('reuses both complete source declarations and a single material owner without programme defaults', () => {
  const parent = buildMonolithicStrengthDirectWholeCycleR2(), repair = buildMonolithicRepairHandSourceCandidateR3();
  expect(definition.formulas).toEqual([...parent.formulas, ...repair.formulas]);
  expect(definition.parameters.map(p => [p.parameter_id, p.unit_id, p.default_value, p.constraints_json]))
    .toEqual([...parent.parameters, ...repair.parameters].map(p => [p.parameter_id, p.unit_id, p.default_value, p.constraints_json]));
  expect(definition.resources.map(r => [r.row_id, r.unit_id, r.formula_id, r.source_metadata,
    r.cost_owner_id, r.procurement_eligible, r.resource_graph?.costTreatment]))
    .toEqual([...parent.resources, ...repair.resources].map(r => [r.row_id, r.unit_id, r.formula_id,
      r.source_metadata, r.cost_owner_id, r.procurement_eligible, r.resource_graph?.costTreatment]));
  expect(definition.resources.filter(r => r.resource_graph?.costTreatment === 'OWN_COST').map(r => r.row_id))
    .toEqual([rr('dry-material-order')]);
  expect(definition.runtimeInput).toEqual({});
  expect(definition.parameters.filter(p => p.truth_metadata.visibility_role !== 'INTERNAL_ONLY').map(p => p.parameter_id).sort())
    .toEqual([...publicIds].sort());
  expect(publicIds.size).toBe(8);
});

it('uses the declared restore operation, exact live marker IDs and an ordered interval for repair stages', () => {
  const parent = definition.resources.find(r => r.row_id === sr('repair-mortar'));
  const restore = canonicalEstimateOperationReference(parent?.resource_graph?.operationCompositionV1);
  expect(restore?.processOrdinal).toBe(90);
  const repairRows = definition.resources.filter(r => r.row_id.startsWith('monolithic-strength-repair:r3:'));
  for (const row of repairRows) {
    const refs = canonicalEstimateOperationReferences(row.resource_graph?.operationCompositionV1);
    expect(refs).toHaveLength(2);
    expect(refs[0].groupId).toBe(restore?.groupId);
    expect(refs[0].processOrdinal).toBeGreaterThan(90);
    expect(refs[0].processOrdinal).toBeLessThan(100);
    expect(refs[1].operationId).toBe(restore?.operationId);
    expect(refs[1].whenResourcePresent).toEqual(['repair-mortar', 'repair-preparation', 'repair-water', 'repair-labour'].map(sr));
  }
});

it('keeps measured repair geometry and deployed posts independent of source site-count changes', async () => {
  const a = await compile(facts()), b = await compile({ ...facts(), [sp('area_m2')]: 1000 });
  expect(a.rows.find(r => r.row_id === sr('sites-flat'))?.quantity).toBe('20');
  expect(b.rows.find(r => r.row_id === sr('sites-flat'))?.quantity).toBe('50');
  for (const result of [a, b]) {
    expect(result.rows.find(r => r.row_id === rr('theoretical-dry'))?.quantity).toBe('8.1');
    expect(result.rows.find(r => r.row_id === rr('mixer'))?.quantity).toBe('2');
    expect(result.rows.find(r => r.row_id === rr('mixing-water'))?.quantity).toBe('0.0036');
    expect(result.rows.find(r => r.row_id === rr('dry-material-order'))?.quantity).toBe('25');
    for (const key of ['repair-mortar', 'repair-preparation', 'repair-water', 'repair-labour']) {
      expect(result.preliminaryNeeds.some(need => need.row_id === sr(key))).toBe(true);
    }
    expect(result.preliminaryNeeds.some(need => need.row_id === rr('curing-cover'))).toBe(true);
  }
});

it('does not infer actual damage from known test sites when a repair dimension is missing', async () => {
  const input = facts(); delete input[rp('depth_m')];
  const result = await compile(input);
  expect(result.rows.find(r => r.row_id === sr('sites-flat'))?.quantity).toBe('20');
  for (const key of ['measured-volume', 'theoretical-dry', 'mixing-water', 'dry-material-order']) {
    expect(result.rows.find(r => r.row_id === rr(key))?.quantity ?? null).toBeNull();
    expect(result.preliminaryNeeds.some(need => need.row_id === rr(key))).toBe(true);
  }
});

it.each([230, null, undefined])('rejects a raw technical echo %s after source composition', async value => {
  await expect(compileAutomaticConstructionOwnerR1({ definition,
    compilerVersion: 'strength-measured-repair-r4-test-only', catalogId: 'TEST_ONLY_AUTHORITY',
    primaryMeasureParameterId: sp('member_count'), ...channels(facts()),
    submittedParameters: { ...channels(facts()).submittedParameters, [rp('voltage_v')]: value },
  })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
});

it('shows one manually amended material row through the ordinary shared restore section', async () => {
  const result = await amend(facts(), { [rr('dry-material-order')]: { quantity: '50', unitPrice: '77',
    titleRu: 'Мой ремонтный состав', provenance: { kind: 'manual', reason: 'TEST_ONLY compound revision amendment' } } });
  const owner = result.rows.find(r => r.row_id === rr('dry-material-order'));
  expect(owner).toMatchObject({ quantity: '50', unit_price: '77', title_ru: 'Мой ремонтный состав' });
  expect(result.rows.find(r => r.row_id === rr('dry-remaining'))?.quantity).toBe('50');
  const resources = [...result.rows, ...result.preliminaryNeeds].map(row => {
    const trace = row.calculation_trace;
    if (!trace || typeof trace !== 'object' || Array.isArray(trace) || !('resourceGraph' in trace)) {
      throw new Error('TEST_COMPOUND_REPAIR_RESOURCE_TRACE_REQUIRED');
    }
    const graph = trace.resourceGraph;
    if (typeof row.title_ru !== 'string' || !graph || typeof graph !== 'object' || Array.isArray(graph)) {
      throw new Error('TEST_COMPOUND_REPAIR_RESOURCE_RECORD_REQUIRED');
    }
    return { rowId: row.row_id, titleRu: row.title_ru,
      operation: graph && typeof graph === 'object' && !Array.isArray(graph) && 'operationCompositionV1' in graph
        ? graph.operationCompositionV1 : null };
  });
  const sections = canonicalEstimateResourceOperationSections(resources);
  expect(sections.filter(s => s.resourceIds.includes(rr('dry-material-order')))).toHaveLength(1);
  const restore = sections.find(s => s.operation?.operationId.endsWith(':operation:restore'));
  expect(restore?.sharedResources.filter(r => r.rowId === rr('dry-material-order'))).toEqual([
    expect.objectContaining({ rowId: rr('dry-material-order'), titleRu: 'Мой ремонтный состав' }),
  ]);
  expect(result.rows.filter(r => r.included_in_estimate).map(r => r.row_id)).toEqual([rr('dry-material-order')]);
});

it('zero actual repair scope excludes stale repair inventory while keeping unfinished strength restoration visible', async () => {
  const result = await compile({ ...facts(), [rp('patch_count')]: 0 });
  expect([...result.rows, ...result.preliminaryNeeds].some(r => r.row_id.startsWith('monolithic-strength-repair:r3:'))).toBe(false);
  expect(result.preliminaryNeeds.some(r => r.row_id === sr('repair-mortar'))).toBe(true);
});

function materialScope(result: Awaited<ReturnType<typeof compile>>): Readonly<{ status: unknown }> | null {
  const row = [...result.rows, ...result.preliminaryNeeds].find(item => item.row_id === rr('dry-reserve-deficit'));
  const trace = row?.calculation_trace;
  if (!trace || typeof trace !== 'object' || Array.isArray(trace) || !('resourceGraph' in trace)) return null;
  const graph = trace.resourceGraph;
  if (!graph || typeof graph !== 'object' || Array.isArray(graph) || !('scopeRequirementDecisionV1' in graph)) return null;
  const scope = graph.scopeRequirementDecisionV1;
  return scope && typeof scope === 'object' && !Array.isArray(scope) && 'status' in scope ? scope : null;
}

it('links the proven material balance as partial coverage without closing the whole repair system', async () => {
  const result = await compile(facts());
  expect(materialScope(result)).toMatchObject({ kind: 'PARTLY_INCLUDED', status: 'PARTLY_INCLUDED',
    originalRowIds: [sr('repair-mortar')], numericNormAccepted: false, separatePaymentAccepted: false });
  for (const key of ['repair-mortar', 'repair-preparation', 'repair-water', 'repair-labour']) {
    expect(result.preliminaryNeeds.some(need => need.row_id === sr(key))).toBe(true);
  }
  expect(result.preliminaryNeeds.some(need => need.row_id === rr('extra-dry-material'))).toBe(true);
  expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([rr('dry-material-order')]);
});

it('does not credit a known but insufficient manual supply as partial material coverage', async () => {
  const result = await amend({ ...facts(), [rp('dry_stock_bags')]: 0 }, {
    [rr('dry-material-order')]: { quantity: '0', provenance: { kind: 'manual', reason: 'TEST_ONLY shortage' } },
  });
  expect(result.rows.find(row => row.row_id === rr('dry-consumption-shortage'))?.quantity).toBe('25');
  expect(materialScope(result)?.status).not.toBe('PARTLY_INCLUDED');
  expect(result.preliminaryNeeds.some(need => need.row_id === sr('repair-mortar'))).toBe(true);
});

it('does not credit missing measured damage or excluded material as repair coverage', async () => {
  const missing = facts(); delete missing[rp('depth_m')];
  const missingResult = await compile(missing);
  expect(materialScope(missingResult)?.status).not.toBe('PARTLY_INCLUDED');
  const excluded = await amend(facts(), {}, { contractVersion: 'canonical-estimate-composition-selection/v1',
    excludedOperationKeys: [], excludedRowIds: [rr('dry-material-order')] });
  expect(materialScope(excluded)?.status).not.toBe('PARTLY_INCLUDED');
  expect(excluded.preliminaryNeeds.some(need => need.row_id === sr('repair-mortar'))).toBe(true);
});
