import { buildMonolithicStrengthDirectWholeCycleR2 as build, strengthDirectParameterR2 as p,
  strengthDirectRowR2 as r } from './monolithicStrengthDirectWholeCycleR2';
import { buildMonolithicStrengthMeasuredRepairR4 } from './monolithicStrengthMeasuredRepairR4';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { effectiveResourceQuantityParameterId } from './effectivePurchaseBalanceR1';

// Literal independently reviewed functional chain: H body, H filter, one safe
// bag, assembled35mm hose/adapter and complete25mm hood. Unused supplied floor
// accessories and PE alternative are not an active drilling consumption.
const kit = ['dust-extractor', 'dust-h-filter', 'dust-safety-bag', 'dust-antistatic-hose', 'dust-hood'];
const facts = (): Record<string, unknown> => ({
  [p('member_count')]: 1, [p('member_kind')]: 'FLAT', [p('area_m2')]: 100,
  [p('member_ref')]: 'TEST_ONLY inspected member and method programme',
  [p('thickness_mm')]: 200, [p('aggregate_mm')]: 20, [p('spacing_mm')]: 240,
  [p('edge_mm')]: 150, [p('rebar_clear_mm')]: 70, [p('drill_post_count')]: 3,
  [p('drill_deployment_ref')]: 'TEST_ONLY three actually deployed single-drive posts',
  [p('drill_face')]: 'VERTICAL_WALL', [p('drill_condition')]: 'DRY', [p('drill_access')]: 'STABLE_GROUND',
  [p('drill_voltage_v')]: 230, [p('drill_holder')]: 'SDS_PLUS', [p('drill_diameter_mm')]: 25,
  [p('drill_depth_mm')]: 75, [p('drill_dust_class')]: 'H', [p('drill_flow_m3h')]: 57.9,
  [p('drill_dust_system_ref')]: 'TEST_ONLY complete inspected H assembly and measured35mm flow',
  [p('drill_dust_bag_system')]: 'SAFE_FILTER_BAG',
});
const channels = (input: Record<string, unknown>) => ({
  submittedParameters: Object.fromEntries(Object.entries(input).filter(([id]) => id !== p('drill_dust_bag_system'))),
  confirmedParameters: Object.fromEntries(Object.entries(input).filter(([id]) => id === p('drill_dust_bag_system'))),
});
const compile = (input = facts(), rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {},
  compositionSelectionV1?: CanonicalEstimateCompileCoreInput['compositionSelectionV1']) => {
  const definition = build();
  return compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: 'dust-initial-r45-test-only',
    catalogId: 'TEST_ONLY_UNPUBLISHED_DIRECT_METHOD', primaryMeasureParameterId: p('member_count'),
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas],
    resourceDefinitions: [...definition.resources], ...channels(input), rowOverrides, compositionSelectionV1,
    currencyCode: 'KGS', priceItems: [], maximumResourceRows: definition.resources.length,
    hashJson: async value => estimateDeterministicHash(value) });
};
function status(result: Awaited<ReturnType<typeof compile>>) {
  const row = [...result.rows, ...result.preliminaryNeeds].find(item => item.row_id === r('dust-initial-kit-check'));
  const trace = row?.calculation_trace;
  if (!trace || typeof trace !== 'object' || Array.isArray(trace) || !('resourceGraph' in trace)) return null;
  const graph = trace.resourceGraph;
  if (!graph || typeof graph !== 'object' || Array.isArray(graph) || !('scopeRequirementDecisionV1' in graph)) return null;
  const scope = graph.scopeRequirementDecisionV1;
  return scope && typeof scope === 'object' && !Array.isArray(scope) && 'status' in scope ? scope.status : null;
}

it('retains all five initial assemblies for three accepted posts without accepting the whole method or a purchase', async () => {
  const result = await compile();
  expect(status(result)).toBe('COMPLETED');
  expect(result.rows.find(row => row.row_id === r('dust-initial-kit-check'))?.quantity).toBe('0');
  for (const key of kit) expect(result.rows.find(row => row.row_id === r(key)))
    .toMatchObject({ quantity: '3', unit_id: 'piece', included_in_estimate: false, included_in_procurement: false });
  for (const key of ['dust-control', 'power-supply', 'ppe', 'prepare-labour', 'waste-transport', 'whole-service'])
    expect(result.preliminaryNeeds.some(need => need.row_id === r(key))).toBe(true);
  expect(result.rows.some(row => row.included_in_estimate || row.included_in_procurement)).toBe(false);
  expect(build().resources.some(row => /dust.*(?:pe-bag|floor|nozzle|elbow|tube)/u.test(row.row_id))).toBe(false);
});

it('does not multiply initial bags by test sites or the retail pack of five', async () => {
  const a = await compile(), b = await compile({ ...facts(), [p('area_m2')]: 1000 });
  expect(a.rows.find(row => row.row_id === r('sites-flat'))?.quantity).toBe('20');
  expect(b.rows.find(row => row.row_id === r('sites-flat'))?.quantity).toBe('50');
  for (const key of kit) expect(b.rows.find(row => row.row_id === r(key))?.quantity).toBe('3');
});

it('attributes the new physical quantities to their manufacturer evidence rather than the structural test standard', () => {
  const owner = build();
  for (const key of kit) {
    const resource = owner.resources.find(row => row.row_id === r(key));
    expect(resource?.source_metadata?.normativeTrace).toEqual([expect.objectContaining({
      sourceId: 'monolithic-strength-direct-typeII2448-r2:dry-h-initial',
      sourceRole: 'MANUFACTURER_INITIAL_PHYSICAL_ASSEMBLY_NOT_STRUCTURAL_TEST_NORM',
    })]);
    expect(resource?.source_metadata?.source_artifact_sha256).toBe(key === 'dust-hood'
      ? '5213f7e1822ec1de231bb06df0ef6ebeb9d45d7903657c9074fce31e208e910e'
      : key === 'dust-extractor' ? '48f35172d4a43c5790d77b765bfc32e7fb41ffcf2c16c5dff58279ece823a1f5'
        : 'bc62eb389d1e64de135e25cf25f9f9d9789ba714a1a68a5b70a5a3d7e0f64125');
  }
});

it.each(kit)('rejects complete initial stock after excluding %s', async key => {
  const result = await compile(facts(), {}, { contractVersion: 'canonical-estimate-composition-selection/v1',
    excludedOperationKeys: [], excludedRowIds: [r(key)] });
  expect(result.rows.find(row => row.row_id === r(key))?.quantity).toBe('0');
  expect(status(result)).not.toBe('COMPLETED');
});

it.each(['drill_post_count', 'drill_dust_system_ref', 'drill_dust_bag_system'])(
  'does not replace missing actual programme fact %s with a ready stock', async key => {
    const input = facts(); delete input[p(key)]; const result = await compile(input);
    expect(status(result)).not.toBe('COMPLETED');
    for (const role of kit) expect(result.rows.find(row => row.row_id === r(role))?.quantity ?? null).toBeNull();
  });

it('preserves manual resource edits and refuses a manually zeroed check when a part is short', async () => {
  const result = await compile(facts(), {
    [r('dust-h-filter')]: { quantity: '2', unitPrice: '17', titleRu: 'Мой фильтр',
      provenance: { kind: 'manual', reason: 'TEST_ONLY retained physical count' } },
    [r('dust-initial-kit-check')]: { quantity: '0', provenance: { kind: 'manual', reason: 'TEST_ONLY attempted scope bypass' } },
  });
  expect(result.rows.find(row => row.row_id === r('dust-h-filter')))
    .toMatchObject({ quantity: '2', unit_price: '17', title_ru: 'Мой фильтр', included_in_estimate: false });
  expect(status(result)).not.toBe('COMPLETED');
});

it('keeps the alternative PE bag outside the exact selected safe-bag programme', async () => {
  await expect(compile({ ...facts(), [p('drill_dust_bag_system')]: 'PE_DISPOSAL_BAG' }))
    .rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
});

it('forbids a raw technical programme echo while leaving the confirmed branch internal', async () => {
  const definition = build(), parameter = definition.parameters.find(item => item.parameter_id === p('drill_dust_bag_system'));
  expect(parameter?.truth_metadata).toMatchObject({ visibility_role: 'INTERNAL_ONLY', value_source_role: 'PROJECT_DOCUMENTATION' });
  await expect(compileCanonicalEstimateCore({ operation: 'compile', compilerVersion: 'dust-initial-r45-test-only',
    catalogId: 'TEST_ONLY_UNPUBLISHED_DIRECT_METHOD', primaryMeasureParameterId: p('member_count'),
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters: facts(), confirmedParameters: {}, currencyCode: 'KGS', priceItems: [],
    maximumResourceRows: definition.resources.length, hashJson: async value => estimateDeterministicHash(value) }))
    .rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
});

it('recomputes an incoming derived filter count from actual retained rows', async () => {
  const effective = effectiveResourceQuantityParameterId(r('dust-h-filter'));
  const result = await compile({ ...facts(), [effective]: '77777' }, {}, {
    contractVersion: 'canonical-estimate-composition-selection/v1', excludedOperationKeys: [], excludedRowIds: [r('dust-h-filter')] });
  expect(result.rows.find(row => row.row_id === r('dust-h-filter'))?.quantity).toBe('0');
  expect(status(result)).not.toBe('COMPLETED');
});

it('flows through the existing strength-and-repair composition with the same owners and eight geometry inputs', async () => {
  const definition = buildMonolithicStrengthMeasuredRepairR4(), publicIds = new Set(definition.ordinaryParameterIds), input = facts();
  expect(publicIds.size).toBe(8); expect(publicIds.has(p('drill_dust_bag_system'))).toBe(false);
  const result = await compileCanonicalEstimateCore({ operation: 'compile', compilerVersion: 'dust-composed-r45-test-only',
    catalogId: 'TEST_ONLY_UNPUBLISHED_COMPOSED_METHOD', primaryMeasureParameterId: p('member_count'),
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters: Object.fromEntries(Object.entries(input).filter(([id]) => publicIds.has(id))),
    confirmedParameters: Object.fromEntries(Object.entries(input).filter(([id]) => !publicIds.has(id))), currencyCode: 'KGS', priceItems: [],
    maximumResourceRows: definition.resources.length, hashJson: async value => estimateDeterministicHash(value) });
  expect(status(result)).toBe('COMPLETED');
  for (const key of kit) expect(result.rows.find(row => row.row_id === r(key))?.quantity).toBe('3');
  expect(result.preliminaryNeeds.some(need => need.row_id === r('repair-mortar'))).toBe(true);
});
