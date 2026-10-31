import { buildMonolithicRepairHandSourceCandidateR3 as build, repairParameterR3 as p,
  repairRowR3 as r } from './monolithicStrengthRepairR3';
import { compileAutomaticConstructionOwnerR1 } from './automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { effectiveResourceQuantityParameterId } from './effectivePurchaseBalanceR1';

const facts = (): Record<string, unknown> => ({
  [p('patch_count')]: 6, [p('geometry_ref')]: 'TEST_ONLY measured repair cohort; not nominal test holes',
  [p('method_ref')]: 'TEST_ONLY exact GB hand-patch programme, not KG admission',
  [p('length_m')]: 0.1, [p('width_m')]: 0.1, [p('depth_m')]: 0.075,
  [p('substrate')]: 'SOUND_ROUGH_NO_EXPOSED_REBAR_NO_SEPARATE_PRIMER',
  [p('ambient_c')]: 20, [p('substrate_c')]: 20,
});
const station = (): Record<string, unknown> => ({
  [p('station_count')]: 2, [p('station_ref')]: 'TEST_ONLY actual two complete initial stations',
  [p('container_ref')]: 'TEST_ONLY qualified actual safe batch volume', [p('voltage_v')]: 230,
  [p('gear')]: 1, [p('paddle_mm')]: 140, [p('paddle_key_mm')]: '24',
});
const programme = (): Record<string, unknown> => ({
  [p('mixing_programme_ref')]: 'TEST_ONLY whole 25 kg charges; actual selected dose, not a default',
  [p('whole_charge_count')]: 1, [p('water_l_per_charge')]: '3.6',
});
const supply = (): Record<string, unknown> => ({
  [p('dry_supply_ref')]: 'TEST_ONLY exact usable whole 25 kg bags, not an assumed zero inventory',
  [p('dry_stock_bags')]: 1, [p('dry_reserve_bags')]: 1,
});
const consumerGeometry = new Set(['patch_count', 'length_m', 'width_m', 'depth_m'].map(p));
const compile = (facts: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({
  definition: build(), compilerVersion: 'repair-r3-test-only', catalogId: 'TEST_ONLY_UNPUBLISHED_GB_REPAIR_SOURCE',
  primaryMeasureParameterId: p('patch_count'),
  submittedParameters: Object.fromEntries(Object.entries(facts).filter(([id]) => consumerGeometry.has(id) || id.startsWith(p('application_')))),
  confirmedParameters: Object.fromEntries(Object.entries(facts).filter(([id]) => !consumerGeometry.has(id) && !id.startsWith(p('application_')))),
});
const amend = (facts: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'],
  compositionSelectionV1?: CanonicalEstimateCompileCoreInput['compositionSelectionV1']) => {
  const definition = build();
  return compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: 'repair-r3-test-only',
    catalogId: 'TEST_ONLY_UNPUBLISHED_GB_REPAIR_SOURCE', primaryMeasureParameterId: p('patch_count'),
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas],
    resourceDefinitions: [...definition.resources],
    submittedParameters: Object.fromEntries(Object.entries(facts).filter(([id]) => consumerGeometry.has(id))),
    confirmedParameters: Object.fromEntries(Object.entries(facts).filter(([id]) => !consumerGeometry.has(id))),
    rowOverrides, compositionSelectionV1, currencyCode: 'KGS', priceItems: [], maximumResourceRows: definition.resources.length,
    hashJson: async value => estimateDeterministicHash(value) });
};

describe('measured repair source candidate on the existing compiler', () => {
  it.each([
    { count: 6, length: 0.1, width: 0.1, depth: 0.075, volume: '0.0045', dry: '8.1' },
    { count: 2, length: 0.2, width: 0.15, depth: 0.02, volume: '0.0012', dry: '2.16' },
    { count: 1, length: 1, width: 1, depth: 0.005, volume: '0.005', dry: '9' },
    { count: 1, length: 1, width: 1, depth: 0.08, volume: '0.08', dry: '144' },
  ])('uses independent measured rectangular patch $volume and theoretical dry $dry', async c => {
    const result = await compile({ ...facts(), [p('patch_count')]: c.count,
      [p('length_m')]: c.length, [p('width_m')]: c.width, [p('depth_m')]: c.depth });
    expect(result.rows.find(row => row.row_id === r('measured-volume'))?.quantity).toBe(c.volume);
    const dry = result.rows.find(row => row.row_id === r('theoretical-dry'));
    expect(dry?.quantity).toBe(c.dry);
    expect(dry?.included_in_estimate).toBe(false);
    expect(dry?.included_in_procurement).toBe(false);
    for (const key of ['mixing-water', 'wetting-water', 'extra-dry-material', 'repair-labour', 'curing-cover', 'waste-transport']) {
      expect(result.preliminaryNeeds.some(need => need.row_id === r(key))).toBe(true);
    }
  });
  it('has no inferred patch, station, batch, waste or ordinary resource defaults', () => {
    const owner = build();
    expect(owner.runtimeInput).toEqual({});
    expect(owner.parameters.every(parameter => parameter.default_value === null)).toBe(true);
    expect(owner.parameters.some(parameter => /test_count|hole_count|batch_count/u.test(parameter.parameter_id))).toBe(false);
  });
  it('counts an actual initial tool per deployed station, independent of patch quantity', async () => {
    const a = await compile({ ...facts(), ...station() });
    const b = await compile({ ...facts(), ...station(), [p('patch_count')]: 60 });
    for (const key of ['mixer', 'paddle', 'shaft-key', 'paddle-key', 'mixing-container', 'hawk', 'trowel', 'float', 'sponge']) {
      expect(a.rows.find(row => row.row_id === r(key))?.quantity).toBe('2');
      expect(b.rows.find(row => row.row_id === r(key))?.quantity).toBe('2');
      expect(a.rows.find(row => row.row_id === r(key))?.included_in_estimate).toBe(false);
      expect(a.rows.find(row => row.row_id === r(key))?.included_in_procurement).toBe(false);
    }
  });
  it.each(['station_ref', 'container_ref', 'voltage_v', 'gear', 'paddle_mm', 'paddle_key_mm'])(
    'does not calculate stock with missing consumed station fact %s', async key => {
      const input = { ...facts(), ...station() }; delete input[p(key)];
      const result = await compile(input);
      for (const item of ['mixer', 'paddle', 'shaft-key', 'paddle-key', 'mixing-container', 'hawk', 'trowel', 'float', 'sponge']) {
        expect(result.rows.find(row => row.row_id === r(item))?.quantity ?? null).toBeNull();
        expect(result.preliminaryNeeds.some(need => need.row_id === r(item))).toBe(true);
      }
      // The existing deferred-fact contract retains row needs, while the
      // independent geometry quantity remains calculable on the same revision.
      expect(result.rows.find(row => row.row_id === r('theoretical-dry'))?.quantity).toBe('8.1');
    });
  it.each(['geometry_ref', 'method_ref', 'length_m', 'width_m', 'depth_m', 'substrate', 'ambient_c', 'substrate_c'])(
    'does not calculate repair with missing consumed geometry/method fact %s', async key => {
      const input = facts(); delete input[p(key)];
      const result = await compile(input);
      for (const item of ['measured-volume', 'theoretical-dry']) {
        expect(result.rows.find(row => row.row_id === r(item))?.quantity ?? null).toBeNull();
        expect(result.preliminaryNeeds.some(need => need.row_id === r(item))).toBe(true);
      }
    });
  it.each([
    ['depth_m', 0.0049], ['depth_m', 0.0801], ['ambient_c', 4.9], ['substrate_c', 30.1],
    ['patch_count', -1], ['patch_count', 1.5], ['gear', 2], ['voltage_v', 110], ['paddle_mm', 160],
    ['substrate', 'EXPOSED_REBAR'],
  ] as const)('rejects incompatible selected-method fact %s=%s', async (key, value) => {
    await expect(compile({ ...facts(), ...station(), [p(key)]: value })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
  });
  it('does not accept a user quantity in place of a missing whole repair norm', async () => {
    const id = p('application_repair_labour');
    await expect(compile({ ...facts(), [id]: 1 })).rejects.toMatchObject({
      code: 'PARAMETER_VALIDATION_FAILED', message: 'unresolved application norm cannot be supplied ' + id,
    });
  });
  it('keeps internal norms protected and international provenance separate from local compliance', () => {
    const owner = build();
    for (const parameter of owner.parameters.filter(item => item.parameter_id.startsWith(p('application_')))) {
      expect(parameter.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
      expect(parameter.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
    }
    for (const resource of owner.resources) {
      expect(resource.source_metadata).toMatchObject({ sourceTerritory: 'GB', internationalProfile: true,
        localComplianceAsserted: false, localComplianceBlocksTechnicalProfile: false,
        full_technical_acceptance: false });
    }
  });
  it('exposes only actual patch geometry, never a method or equipment questionnaire', () => {
    const owner = build();
    expect(owner.parameters.filter(item => item.truth_metadata.visibility_role !== 'INTERNAL_ONLY')
      .map(item => item.parameter_id).sort()).toEqual(['patch_count', 'length_m', 'width_m', 'depth_m'].map(p).sort());
    expect(owner.parameters.find(item => item.parameter_id === p('station_count'))?.truth_metadata.provenance)
      .toMatchObject({ consumer_input_role_v1: 'APPLICATION_TECHNICAL' });
  });
  it('zero scope does not reuse stale repair geometry or deployed inventory', async () => {
    const result = await compile({ ...facts(), ...station(), [p('patch_count')]: 0 });
    expect(result.rows.filter(row => row.included_in_estimate || row.included_in_procurement)).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows).toHaveLength(0);
  });
  it('calculates the chosen water dose and source interval per actual charge, independently of station count', async () => {
    const one = await compile({ ...facts(), ...station(), ...programme() });
    const two = await compile({ ...facts(), ...station(), ...programme(), [p('whole_charge_count')]: 2 });
    const q = (result: Awaited<ReturnType<typeof compile>>, key: string) =>
      result.rows.find(row => row.row_id === r(key))?.quantity;
    expect(q(one, 'mixing-water')).toBe('0.0036');
    expect(q(one, 'mixing-water-minimum')).toBe('0.0035');
    expect(q(one, 'mixing-water-maximum')).toBe('0.0037');
    expect(q(one, 'mixing-charge-dry')).toBe('25');
    expect(q(two, 'mixing-water')).toBe('0.0072');
    expect(q(two, 'mixing-water-minimum')).toBe('0.007');
    expect(q(two, 'mixing-water-maximum')).toBe('0.0074');
    expect(q(two, 'mixer')).toBe('2');
    expect(one.preliminaryNeeds.some(need => need.row_id === r('mixing-water'))).toBe(false);
    for (const key of ['extra-dry-material', 'wetting-water', 'repair-labour', 'curing-cover', 'waste-transport']) {
      expect(one.preliminaryNeeds.some(need => need.row_id === r(key))).toBe(true);
    }
    expect(one.rows.some(row => row.included_in_estimate || row.included_in_procurement)).toBe(false);
  });
  it('shows the source interval while the actual dose is unknown, without choosing its midpoint', async () => {
    const input = { ...facts(), ...station(), ...programme() }; delete input[p('water_l_per_charge')];
    const result = await compile(input);
    expect(result.rows.find(row => row.row_id === r('mixing-water-minimum'))?.quantity).toBe('0.0035');
    expect(result.rows.find(row => row.row_id === r('mixing-water-maximum'))?.quantity).toBe('0.0037');
    expect(result.rows.find(row => row.row_id === r('mixing-water'))?.quantity ?? null).toBeNull();
    expect(result.preliminaryNeeds.some(need => need.row_id === r('mixing-water'))).toBe(true);
  });
  it.each(['mixing_programme_ref', 'whole_charge_count'])('keeps missing programme fact %s as a need', async key => {
    const input = { ...facts(), ...station(), ...programme() }; delete input[p(key)];
    const result = await compile(input);
    expect(result.rows.find(row => row.row_id === r('mixing-water'))?.quantity ?? null).toBeNull();
    expect(result.preliminaryNeeds.some(need => need.row_id === r('mixing-water'))).toBe(true);
    expect(result.rows.find(row => row.row_id === r('theoretical-dry'))?.quantity).toBe('8.1');
  });
  it.each([['water_l_per_charge', 3.4999], ['water_l_per_charge', 3.7001],
    ['whole_charge_count', 0], ['whole_charge_count', 1.5]] as const)(
    'rejects incompatible charge programme %s=%s', async (key, value) => {
      await expect(compile({ ...facts(), ...station(), ...programme(), [p(key)]: value }))
        .rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
    });
  it('rejects a charge programme that cannot cover even theoretical dry consumption', async () => {
    await expect(compile({ ...facts(), ...station(), ...programme(), [p('patch_count')]: 60 }))
      .rejects.toMatchObject({ code: 'FORMULA_OUTPUT_BOUNDS_FAILED' });
  });
  it('keeps one material order, whole bag quantum and separate dry stock/reserve after mixing', async () => {
    const result = await compile({ ...facts(), ...station(), ...programme(), ...supply(), [p('whole_charge_count')]: 2 });
    const quantity = (key: string) => result.rows.find(row => row.row_id === r(key))?.quantity;
    expect(quantity('dry-material-order')).toBe('50');
    expect(quantity('dry-order-bags')).toBe('2');
    expect(quantity('dry-remaining')).toBe('25');
    expect(quantity('dry-free')).toBe('0');
    expect(quantity('dry-consumption-shortage')).toBe('0');
    expect(quantity('dry-reserve-deficit')).toBe('0');
    expect(quantity('mixing-charge-dry')).toBe('50');
    expect(quantity('theoretical-dry')).toBe('8.1');
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([r('dry-material-order')]);
    expect(build().resources.filter(row => row.procurement_eligible).map(row => row.row_id)).toEqual([r('dry-material-order')]);
    expect(result.preliminaryNeeds.some(need => need.row_id === r('extra-dry-material'))).toBe(true);
  });
  it.each(['dry_supply_ref', 'dry_stock_bags', 'dry_reserve_bags'])('does not replace missing supply fact %s with zero', async key => {
    const input = { ...facts(), ...station(), ...programme(), ...supply() }; delete input[p(key)];
    const result = await compile(input);
    expect(result.rows.find(row => row.row_id === r('dry-material-order'))?.quantity ?? null).toBeNull();
    expect(result.preliminaryNeeds.some(need => need.row_id === r('dry-material-order'))).toBe(true);
    expect(result.rows.find(row => row.row_id === r('mixing-water'))?.quantity).toBe('0.0036');
  });
  it('keeps manually ordered whole bags in the shared balance without changing planned charges or water', async () => {
    const result = await amend({ ...facts(), ...station(), ...programme(), ...supply(), [p('whole_charge_count')]: 2 },
      { [r('dry-material-order')]: { quantity: '75', unitPrice: '77', titleRu: 'Мой ремонтный состав',
        provenance: { kind: 'manual', reason: 'TEST_ONLY saved supply amendment, not actual procurement' } } });
    expect(result.rows.find(row => row.row_id === r('dry-material-order'))).toMatchObject({
      quantity: '75', unit_price: '77', title_ru: 'Мой ремонтный состав' });
    expect(result.rows.find(row => row.row_id === r('dry-order-bags'))?.quantity).toBe('3');
    expect(result.rows.find(row => row.row_id === r('dry-remaining'))?.quantity).toBe('50');
    expect(result.rows.find(row => row.row_id === r('dry-free'))?.quantity).toBe('25');
    expect(result.rows.find(row => row.row_id === r('mixing-water'))?.quantity).toBe('0.0072');
  });
  it('retains a non-whole manual order and blocks procurement instead of rounding it to bags', async () => {
    const result = await amend({ ...facts(), ...station(), ...programme(), ...supply() },
      { [r('dry-material-order')]: { quantity: '37', unitPrice: '77',
        provenance: { kind: 'manual', reason: 'TEST_ONLY incompatible whole-bag order' } } });
    const row = result.rows.find(item => item.row_id === r('dry-material-order'));
    expect(row).toMatchObject({ quantity: '37', unit_price: '77',
      included_in_estimate: false, included_in_procurement: false });
    expect(result.purchaseSupplyIndexV1?.owners).toEqual([expect.objectContaining({
      ownerRowId: r('dry-material-order'), reasonCode: 'ORDER_QUANTUM_VIOLATION', procurementReady: false })]);
    expect(result.rows.some(item => item.row_id === r('dry-material-order') && item.included_in_procurement)).toBe(false);
  });
  it('rejects non-whole inventory and keeps all supply/programme facts out of the public geometry questionnaire', async () => {
    await expect(compile({ ...facts(), ...station(), ...programme(), ...supply(), [p('dry_stock_bags')]: 0.5 }))
      .rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
    const owner = build();
    expect(owner.parameters.filter(item => item.truth_metadata.visibility_role !== 'INTERNAL_ONLY')
      .map(item => item.parameter_id).sort()).toEqual([...consumerGeometry].sort());
    expect(owner.parameters.every(item => item.default_value === null)).toBe(true);
  });
});

describe('documented complete initial station inventory on the existing core', () => {
  const kit = ['mixer', 'paddle', 'shaft-key', 'paddle-key', 'mixing-container', 'hawk', 'trowel', 'float', 'sponge'];
  const input = () => ({ ...facts(), ...station(), ...programme(), ...supply() });
  function status(result: Awaited<ReturnType<typeof compile>>) {
    const row = [...result.rows, ...result.preliminaryNeeds].find(item => item.row_id === r('initial-station-kit-check'));
    const trace = row?.calculation_trace;
    if (!trace || typeof trace !== 'object' || Array.isArray(trace) || !('resourceGraph' in trace)) return null;
    const graph = trace.resourceGraph;
    if (!graph || typeof graph !== 'object' || Array.isArray(graph) || !('scopeRequirementDecisionV1' in graph)) return null;
    const scope = graph.scopeRequirementDecisionV1;
    return scope && typeof scope === 'object' && !Array.isArray(scope) && 'status' in scope ? scope.status : null;
  }
  it('checks all nine actual parts without accepting the remaining whole repair method', async () => {
    const result = await compile(input());
    expect(result.rows.find(row => row.row_id === r('initial-station-kit-check'))?.quantity).toBe('0');
    expect(status(result)).toBe('COMPLETED');
    for (const key of kit) {
      expect(result.rows.find(row => row.row_id === r(key))?.quantity).toBe('2');
      const effective = build().parameters.find(parameter => parameter.parameter_id === effectiveResourceQuantityParameterId(r(key)));
      expect(effective?.truth_metadata).toMatchObject({ visibility_role: 'INTERNAL_ONLY',
        value_source_role: 'COMPILER_DERIVED_RESOURCE_QUANTITY',
        effective_resource_quantity_v1: { sourceRowId: r(key), unitId: 'piece' } });
    }
    for (const key of ['ppe', 'power', 'access', 'repair-labour', 'curing-cover', 'cleaning-water']) {
      expect(result.preliminaryNeeds.some(need => need.row_id === r(key))).toBe(true);
    }
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([r('dry-material-order')]);
  });
  it.each(kit)('does not accept initial inventory with excluded %s', async key => {
    const result = await amend(input(), {}, { contractVersion: 'canonical-estimate-composition-selection/v1',
      excludedOperationKeys: [], excludedRowIds: [r(key)] });
    expect(result.rows.find(row => row.row_id === r(key))?.quantity).toBe('0');
    const check=result.preliminaryNeeds.find(row => row.row_id === r('initial-station-kit-check'));
    expect(check).toMatchObject({quantity:'2',unit_id:'piece',need_state:'CONDITION_REQUIRED',
      selected:false,procurement_eligible:false,unit_price:null});
    expect(result.rows.some(row => row.row_id === r('initial-station-kit-check'))).toBe(false);
    expect(status(result)).toBe('SCOPE_UNVERIFIED');
    for(const retained of kit.filter(item=>item!==key))
      expect(result.rows.find(row=>row.row_id===r(retained))?.quantity).toBe('2');
    expect(result.rows.filter(row=>row.included_in_estimate).map(row=>row.row_id)).toEqual([r('dry-material-order')]);
  });
  it.each(['0.5', '3'])('retains manual tool count %s and requires a matching actual inventory', async quantity => {
    const result = await amend(input(), { [r('paddle')]: { quantity, unitPrice: '17', titleRu: 'Моя мешалка',
      provenance: { kind: 'manual', reason: 'TEST_ONLY initial stock amendment' } } });
    expect(result.rows.find(row => row.row_id === r('paddle'))).toMatchObject({ quantity, unit_price: '17', title_ru: 'Моя мешалка' });
    expect(status(result)).not.toBe('COMPLETED');
    expect(result.rows.find(row => row.row_id === r('mixer'))?.quantity).toBe('2');
  });
  it('does not turn a manual zero check into complete inventory after removing a part', async () => {
    const result = await amend(input(), {
      [r('paddle')]: { quantity: '1', provenance: { kind: 'manual', reason: 'TEST_ONLY missing part' } },
      [r('initial-station-kit-check')]: { quantity: '0', provenance: { kind: 'manual', reason: 'TEST_ONLY attempted check override' } },
    });
    expect(status(result)).not.toBe('COMPLETED');
  });
  it.each(['station_count', 'station_ref', 'container_ref'])('keeps missing actual inventory fact %s unresolved', async key => {
    const values: Record<string, unknown> = input(); delete values[p(key)];
    const result = await compile(values);
    expect(status(result)).not.toBe('COMPLETED');
    expect(result.preliminaryNeeds.some(need => need.row_id === r('initial-station-kit-check'))).toBe(true);
  });
  it.each(['77777', null, undefined])('recomputes stale derived tool count %s from actual resources in either input channel', async value => {
    const effective = effectiveResourceQuantityParameterId(r('paddle'));
    const definition = build();
    for (const channel of ['submittedParameters', 'confirmedParameters'] as const) {
      const values = input();
      const submittedParameters = Object.fromEntries(Object.entries(values).filter(([id]) => consumerGeometry.has(id)));
      const confirmedParameters = Object.fromEntries(Object.entries(values).filter(([id]) => !consumerGeometry.has(id)));
      // Existing core contract strips saved/submitted derived outputs before
      // validation and recomputes them. They differ from source facts, whose
      // raw technical echoes remain rejected by the existing tests above.
      const run = (compositionSelectionV1?: CanonicalEstimateCompileCoreInput['compositionSelectionV1']) =>
        compileCanonicalEstimateCore({ operation: 'recalculate',
          compilerVersion: 'repair-r3-test-only', catalogId: 'TEST_ONLY_UNPUBLISHED_GB_REPAIR_SOURCE',
          primaryMeasureParameterId: p('patch_count'), parameterDefinitions: [...definition.parameters],
          formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
          submittedParameters, confirmedParameters,
          [channel]: { ...(channel === 'submittedParameters' ? submittedParameters : confirmedParameters), [effective]: value },
          compositionSelectionV1, rowOverrides: {}, currencyCode: 'KGS', priceItems: [],
          maximumResourceRows: definition.resources.length, hashJson: async item => estimateDeterministicHash(item) });
      const complete = await run();
      expect(complete.derivedParameters?.[effective]).toBe('2');
      expect(status(complete)).toBe('COMPLETED');
      const excluded = await run({ contractVersion: 'canonical-estimate-composition-selection/v1',
        excludedOperationKeys: [], excludedRowIds: [r('paddle')] });
      expect(excluded.derivedParameters?.[effective]).toBe('0');
      expect(status(excluded)).not.toBe('COMPLETED');
    }
  });
  it('does not expose stale inventory when actual repair scope is zero', async () => {
    const result = await compile({ ...input(), [p('patch_count')]: 0 });
    expect(result.rows.some(row => row.row_id === r('initial-station-kit-check'))).toBe(false);
    expect(status(result)).not.toBe('COMPLETED');
  });
});
