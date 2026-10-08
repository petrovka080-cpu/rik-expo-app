import { createHash } from 'node:crypto';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { canonicalEstimateStableJson } from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import { withG6NextServiceComponents, G6_NEXT_MANUAL_LOADING as manualLoading,
  G6_NEXT_MACHINE_LOADING as machineLoading, G6_NEXT_LIQUID_ENERGY_SCOPE as liquidEnergy,
  G6_NEXT_LOADER_LIQUID_ENERGY_SCOPE as loaderEnergy } from '../../src/lib/estimate/v4/g6PvcCompletionServiceComponentsS2741';
import { G6_COMMERCIAL_LABOR_MODE_PARAMETER_S2741 as laborModeId,
  G6_COMPOSITE_LABOR_MODE_S2741 as compositeLabor } from '../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import { G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 as series } from '../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import { withG6PvcProjectCompletionS2741, G6_COMPLETION_REQUIRED_S2741 as required,
  G6_COMPLETION_NOT_REQUIRED_S2741 as notRequired,
  G6_WASTE_SERVICE_PRICE_SCOPE_S2741 as wastePriceScope } from '../../src/lib/estimate/v4/g6PvcProjectCompletionS2741';
import { compileAutomaticConstructionOwnerR1 } from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { PVC_TRANSITION_GUIDE2024_CONTROL_INPUT as transitionFixture } from '../../scripts/estimate/r4a13/pvcBitumenTransitionGuide2024ControlInput';

const prepare = (profile: typeof series[number]) => {
  const operation = profile.definition.resources[0]!.resource_graph.operationCompositionV1 as { groupId: string; groupTitleRu: string };
  return withG6PvcProjectCompletionS2741(profile.definition, { catalogId: profile.catalogId,
    measureId: profile.measureId, unitId: profile.unitId, ...operation });
};
const compile = (profile: typeof series[number], submittedParameters: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({
  catalogId: profile.catalogId, compilerVersion: 'G6-completion-prepared-fixture', primaryMeasureParameterId: profile.measureId,
  definition: prepare(profile), submittedParameters });
const absent = { g6_cleanup_applicability: notRequired, g6_waste_applicability: notRequired,
  g6_cleanup_boundary_reference: 'VALIDATION_FIXTURE: уборка за пределами выбранного участка, отдельный состав',
  g6_waste_boundary_reference: 'VALIDATION_FIXTURE: отходов выбранного участка нет по инвентаризации' };

test.each(series)('prepared G6 completion $catalogId does not default applicability, hours, mass or stock', async profile => {
  const submitted = profile.measureId === 'area_m2' ? { area_m2: 100 } : transitionFixture;
  const prepared = prepare(profile);
  expect(prepared.runtimeInput).toEqual(profile.definition.runtimeInput);
  expect(prepared.parameters.filter(p => p.parameter_id.startsWith('g6_')).filter(p => p.truth_metadata.guide)
    .every(p => /^[0-9a-f]{64}$/u.test(String((p.truth_metadata.guide as Record<string, unknown>).source_snapshot_hash)))).toBe(true);
  expect(prepared.resources.slice(0, profile.definition.resources.length)).toEqual(profile.definition.resources);
  const unresolved = await compile(profile, submitted);
  expect(unresolved.preliminaryNeeds.filter(n => n.row_id.startsWith('g6:completion:'))).toHaveLength(5);
  expect(unresolved.rows.some(r => r.row_id === 'g6:completion:waste-service')).toBe(false);
  const explicitAbsence = await compile(profile, { ...submitted, ...absent });
  expect(explicitAbsence.preliminaryNeeds.filter(n => n.row_id.startsWith('g6:completion:'))).toHaveLength(0);
  expect(explicitAbsence.rows.filter(r => r.row_id.startsWith('g6:completion:')).map(r => r.row_id))
    .toEqual(['g6:completion:cleanup-boundary', 'g6:completion:waste-boundary']);
});

test('actual cleanup and waste service retain independent units, pack balance and the original installation norm', async () => {
  const profile = series[0]!;
  const facts = { area_m2: 100, g6_cleanup_applicability: required, g6_waste_applicability: required,
    g6_cleanup_boundary_reference: 'VALIDATION_FIXTURE: отдельная финальная уборка, исходная очистка сварных зон не повторяется',
    g6_cleanup_worker_h: 3, g6_cleanup_bag_count: 5, g6_cleanup_bag_specification: 'VALIDATION_FIXTURE: мешки 120 л, по ведомости',
    g6_cleanup_bag_stock: 1, g6_cleanup_bag_reserve: 2, g6_cleanup_bag_quantum: 4,
    g6_waste_mass_kg: 12, g6_waste_boundary_reference: 'VALIDATION_FIXTURE: 12 кг фактических отходов; пригодный рулонный остаток сохранён',
    g6_waste_service_scope: wastePriceScope,
    g6_waste_service_specification: 'VALIDATION_FIXTURE: подготовленная партия, погрузка, грузовой автомобиль с водителем и топливом, маршрут и приём; без уборки и мешков',
    g6_waste_receiver_reference: 'VALIDATION_FIXTURE: подтверждённый принимающий пункт по фактическому потоку' };
  const result = await compile(profile, facts);
  expect(result.rows.find(r => r.row_id === 'g6:completion:cleanup-workers')).toMatchObject({ quantity: '3', unit_id: 'man_hour', unit_price: null });
  expect(result.rows.find(r => r.row_id === 'g6:completion:bags')).toMatchObject({ quantity: '8', unit_id: 'piece',
    calculation_trace: { purchaseBalance: { consumed: '5', remaining: '4' } } });
  expect(result.rows.find(r => r.row_id === 'g6:completion:waste-service')).toMatchObject({ quantity: '12', unit_id: 'kg', unit_price: null });
  expect(result.rows.find(r => r.row_id === profile.workerRowId)?.quantity).toBe('5.33');
  expect(result.rows.find(r => r.row_id === 'pvc-roof:material:field')?.calculation_trace)
    .toMatchObject({ purchaseBalance: { remaining: '42.5' } });
  expect(result.preliminaryNeeds.some(n => n.row_id.startsWith('g6:completion:'))).toBe(false);
  expect(result.totals.amount).toBe('0');
  expect(result.totals.unpricedRowCount).toBeGreaterThan(0);
});

test('a selected service without actual waste mass remains an unresolved need, never derived from the roll remainder', async () => {
  const result = await compile(series[0]!, { area_m2: 100, ...absent, g6_waste_applicability: required,
    g6_waste_service_scope: wastePriceScope,
    g6_waste_service_specification: 'VALIDATION_FIXTURE: погрузка, транспорт и приём подготовленной партии, без уборки и мешков',
    g6_waste_receiver_reference: 'VALIDATION_FIXTURE: пункт приёма подтверждён' });
  expect(result.preliminaryNeeds.find(n => n.row_id === 'g6:completion:waste-service')).toMatchObject({
    selected: true, quantity: null, missing_parameter_ids: ['g6_waste_mass_kg'] });
});

test('an incompatible service quote cannot silently charge cleanup and bags again', async () => {
  await expect(compile(series[0]!, { area_m2: 100, ...absent, g6_waste_applicability: required,
    g6_waste_service_scope: 'Уборка, мешки и транспорт уже включены в один комплекс' })).rejects.toHaveProperty('code');
});


// Entered project facts and arithmetic controls, never defaults or catalogue norms.
const serviceFacts: Record<string, unknown> = {
  g6_cleanup_applicability: required, g6_waste_applicability: required,
  g6_cleanup_boundary_reference: 'VALIDATION_FIXTURE: отдельная финальная уборка, без повтора очистки сварных зон',
  g6_cleanup_worker_h: '3', g6_cleanup_bag_count: 5,
  g6_cleanup_bag_specification: 'VALIDATION_FIXTURE: согласованные мешки 120 л',
  g6_cleanup_bag_stock: 1, g6_cleanup_bag_reserve: 2, g6_cleanup_bag_quantum: 4,
  g6_waste_mass_kg: '12', g6_waste_boundary_reference: 'VALIDATION_FIXTURE: измеренная партия, пригодный остаток рулона сохранён',
  g6_waste_service_scope: wastePriceScope,
  g6_waste_service_specification: 'VALIDATION_FIXTURE: полная услуга подготовленной партии, без уборки и мешков',
  g6_waste_receiver_reference: 'VALIDATION_FIXTURE: подтверждённый пункт приёма выбранного потока',
  g6_waste_vehicle_energy_scope: liquidEnergy,
  g6_waste_vehicle_specification: 'VALIDATION_FIXTURE: согласованный грузовой автомобиль', g6_waste_vehicle_hours: '2.5',
  g6_waste_crew_scope: 'VALIDATION_FIXTURE: погрузка и водитель учтены один раз, без уборки', g6_waste_crew_hours: '3.25',
  g6_waste_loading_method: machineLoading, g6_waste_loader_specification: 'VALIDATION_FIXTURE: согласованный погрузчик',
  g6_waste_loader_hours: '0.75', g6_waste_loader_energy_scope: loaderEnergy,
  g6_waste_loader_fuel_specification: 'VALIDATION_FIXTURE: отдельное жидкое топливо погрузчика', g6_waste_loader_fuel_l: '2',
  g6_waste_fuel_specification: 'VALIDATION_FIXTURE: согласованное жидкое топливо транспорта', g6_waste_fuel_l: '7.5',
};
const serviceRates: NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']> = {
  'g6:completion:cleanup-workers': { unitPrice: '100', provenance: { kind: 'manual' } },
  'g6:completion:bags': { unitPrice: '10', provenance: { kind: 'manual' } },
  'g6:completion:waste-service': { unitPrice: '20', provenance: { kind: 'manual' } },
};
function compileService(profile: typeof series[number], facts: Record<string, unknown>,
  rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = serviceRates) {
  const operation = profile.definition.resources[0]!.resource_graph.operationCompositionV1 as { groupId: string; groupTitleRu: string };
  const definition = withG6NextServiceComponents(profile.definition, { catalogId: profile.catalogId,
    measureId: profile.measureId, unitId: profile.unitId, ...operation });
  const primary = profile.measureId === 'area_m2' ? { area_m2: 100 } : transitionFixture;
  return compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: 'G6-service-components-validation',
    catalogId: profile.catalogId, primaryMeasureParameterId: profile.measureId, parameterDefinitions: [...definition.parameters],
    formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters: { ...primary, ...facts }, confirmedParameters: { ...definition.runtimeInput },
    currencyCode: 'KGS', priceItems: [], rowOverrides, maximumResourceRows: definition.resources.length,
    hashJson: value => createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex') });
}

test.each(series)('service composition $catalogId derives its missing description without asking for a labour norm', async profile => {
  const { g6_waste_crew_scope: _description, ...facts } = serviceFacts;
  for (const loading of [manualLoading, machineLoading]) {
    const result = await compileService(profile, { ...facts, g6_waste_loading_method: loading }, {});
    expect(result.preliminaryNeeds.some(need => need.missing_parameter_ids.includes('g6_waste_crew_scope'))).toBe(false);
    expect(result.rows.find(row => row.row_id === 'g6:completion:waste-crew')).toMatchObject({
      quantity: '3.25', unit_price: null, included_in_estimate: false,
    });
    expect(result.rows.find(row => row.row_id === 'g6:completion:waste-service')).toMatchObject({ quantity: '12', unit_price: null });
  }
  const { g6_waste_crew_hours: _hours, g6_waste_loading_method: _loading, ...unknownFacts } = facts;
  const unknown = await compileService(profile, unknownFacts, {});
  expect(unknown.preliminaryNeeds.find(need => need.row_id === 'g6:completion:waste-crew')?.missing_parameter_ids)
    .toEqual(expect.arrayContaining(['g6_waste_crew_scope', 'g6_waste_crew_hours']));
});

test.each(series)('whole waste quote $catalogId covers actual components once and preserves independent cleanup', async profile => {
  const result = await compileService(profile, serviceFacts);
  // 3 h ×100 +8 ordered bags ×10 +12 kg ×20 =620; no component charge is added.
  expect(result.totals.amount).toBe('620');
  expect(result.rows.find(r => r.row_id === profile.workerRowId)?.quantity).toBe(profile.measureId === 'area_m2' ? '5.33' : '1.2');
  expect(result.rows.find(r => r.row_id === 'g6:completion:bags')).toMatchObject({ quantity: '8',
    calculation_trace: { purchaseBalance: { consumed: '5', remaining: '4' } } });
  for (const [rowId, quantity, unit] of [
    ['waste-vehicle', '2.5', 'machine_hour'], ['waste-crew', '3.25', 'man_hour'],
    ['waste-loader', '0.75', 'machine_hour'], ['waste-fuel', '7.5', 'l'],
    ['waste-loader-fuel', '2', 'l'], ['waste-reception', '12', 'kg'],
  ] as const) {
    expect(result.rows.find(r => r.row_id === 'g6:completion:' + rowId)).toMatchObject({ quantity, unit_id: unit,
      unit_price: null, included_in_estimate: false, included_in_procurement: false,
      calculation_trace: { resourceGraph: { commercialCostCoverageDecisionV1: { ownerRowId: 'g6:completion:waste-service' } } } });
  }
  for (const fuel of ['waste-fuel', 'waste-loader-fuel']) expect(result.rows.find(r => r.row_id === 'g6:completion:' + fuel)
    ?.calculation_trace).toMatchObject({ resourceGraph: { commercialCostCoverageDecisionV1: { supplyParty: 'RATE_PROVIDER' } } });
  if (profile.measureId === 'area_m2') expect(result.rows.find(r => r.row_id === 'pvc-roof:material:field')
    ?.calculation_trace).toMatchObject({ purchaseBalance: { remaining: '42.5' } });
});

test.each(series)('missing actual vehicle hours $catalogId preserves the need and known partial sum', async profile => {
  const facts = { ...serviceFacts }; delete facts.g6_waste_vehicle_hours;
  const result = await compileService(profile, facts);
  expect(result.totals.amount).toBe('380');
  expect(result.preliminaryNeeds.find(n => n.row_id === 'g6:completion:waste-service')).toMatchObject({ selected: true,
    missing_parameter_ids: expect.arrayContaining(['g6_waste_vehicle_hours']) });
  expect(result.preliminaryNeeds.find(n => n.row_id === 'g6:completion:waste-vehicle')).toMatchObject({ selected: true,
    quantity: null, calculation_trace: { resourceGraph: { publicResourcePresentationV1: {
      nameRu: 'Транспорт для вывоза подготовленной партии', specificationRu: serviceFacts.g6_waste_vehicle_specification } } } });
});

test('manual loading excludes the unused loader and its own fuel without demanding those facts', async () => {
  const facts: Record<string, unknown> = { ...serviceFacts, g6_waste_loading_method: manualLoading };
  for (const id of ['g6_waste_loader_hours', 'g6_waste_loader_specification', 'g6_waste_loader_energy_scope',
    'g6_waste_loader_fuel_specification', 'g6_waste_loader_fuel_l']) delete facts[id];
  const result = await compileService(series[0]!, facts);
  expect(result.totals.amount).toBe('620');
  for (const rowId of ['g6:completion:waste-loader', 'g6:completion:waste-loader-fuel']) {
    expect(result.rows.some(r => r.row_id === rowId)).toBe(false);
    expect(result.preliminaryNeeds.some(n => n.row_id === rowId)).toBe(false);
  }
});

test('unknown service price and explicit zero remain distinct while included components retain their quantities', async () => {
  const run = (unitPrice: string | null) => compileService(series[0]!, serviceFacts, { ...serviceRates,
    'g6:completion:waste-service': { unitPrice, provenance: { kind: 'manual' } } });
  const unknown = await run(null), zero = await run('0');
  expect(unknown.totals.amount).toBe('380'); expect(zero.totals.amount).toBe('380');
  expect(unknown.rows.find(r => r.row_id === 'g6:completion:waste-service')?.unit_price).toBeNull();
  expect(zero.rows.find(r => r.row_id === 'g6:completion:waste-service')?.unit_price).toBe('0');
  expect(unknown.totals.unpricedRowCount).toBe(zero.totals.unpricedRowCount + 1);
  expect(unknown.rows.find(r => r.row_id === 'g6:completion:waste-vehicle')?.quantity).toBe('2.5');
});

test('separate payment for provider fuel is rejected before the original project facts are changed', async () => {
  const before = canonicalEstimateStableJson(serviceFacts);
  await expect(compileService(series[0]!, serviceFacts, { ...serviceRates,
    'g6:completion:waste-fuel': { unitPrice: '50', includedInProcurement: true, provenance: { kind: 'manual' } } }))
    .rejects.toMatchObject({ code: 'COMMERCIAL_COST_COVERAGE_CONFLICT' });
  expect(canonicalEstimateStableJson(serviceFacts)).toBe(before);
});

test.each(series)('type-specific main labour prices $catalogId retain separately paid completion and physical resources', async profile => {
  const byHours = await compileService(profile, serviceFacts, { ...serviceRates,
    [profile.workerRowId]: { unitPrice: '100', provenance: { kind: 'manual' } } });
  const wholeRate = await compileService(profile, { ...serviceFacts, [laborModeId]: compositeLabor }, { ...serviceRates,
    [profile.rateRowId]: { unitPrice: '10', provenance: { kind: 'manual' } } });
  // Existing labour:5.33 h for100 m² or entered1.2 h for10 m. Completion:620 independently.
  expect(byHours.totals.amount).toBe(profile.measureId === 'area_m2' ? '1153' : '740');
  expect(wholeRate.totals.amount).toBe(profile.measureId === 'area_m2' ? '1620' : '720');
  expect(wholeRate.rows.find(r => r.row_id === profile.workerRowId)).toMatchObject({
    quantity: profile.measureId === 'area_m2' ? '5.33' : '1.2', unit_price: null, included_in_estimate: false });
  expect(wholeRate.rows.find(r => r.row_id === profile.rateRowId)).toMatchObject({
    quantity: profile.measureId === 'area_m2' ? '100' : '10', unit_id: profile.unitId, unit_price: '10' });
  for (const id of ['g6:completion:cleanup-workers', 'g6:completion:bags', 'g6:completion:waste-service']) {
    const row = wholeRate.rows.find(r => r.row_id === id)!;
    expect(row.included_in_estimate).toBe(true);
    expect(row.amount).toBe(({ 'g6:completion:cleanup-workers': '300', 'g6:completion:bags': '80',
      'g6:completion:waste-service': '240' } as Record<string, string>)[id]);
  }
  const physical = (result: typeof byHours) => result.rows.filter(r => r.category === 'material' || r.category === 'equipment')
    .map(r => [r.row_id, r.quantity, r.unit_id, r.included_in_procurement]);
  expect(physical(wholeRate)).toEqual(physical(byHours));
});

test.each([
  [0, 'pvc-roof:material:cleaner', 'kg', '4.8', '3', '1.8'],
  [1, 'pvc-roof:material:cleaner-volume-472219', 'l', '3', '3', '0'],
] as const)('roof cleaner variant %s uses its own mass or volume basis and measured processing area', async (index, rowId, unit, ordered, consumed, remaining) => {
  //12 m² measured processing on a100 m² roof. Mass250 g/m²; density0.8 kg/l only converts3 l packaging.
  //Volume leaflet250 ml/m² remains litres, without density conversion.
  const profile = series[index]!;
  const facts = { ...serviceFacts, cleaned_surface_m2: 12,
    ...(index === 0 ? { cleaner_density_kg_l: '0.8' } : {}) };
  const result = await compileService(profile, facts);
  expect(result.rows.find(r => r.row_id === rowId)).toMatchObject({ quantity: ordered, unit_id: unit,
    calculation_trace: { purchaseBalance: { consumed, remaining } } });
  expect(result.rows.find(r => r.row_id === 'pvc-roof:material:field')?.quantity).toBe('157.5');
  expect(result.preliminaryNeeds.some(n => n.row_id === rowId)).toBe(false);
  if (index === 1) expect(profile.definition.parameters.some(p => p.parameter_id === 'cleaner_density_kg_l')).toBe(false);
});

test.each(series)('completion applicability $catalogId stays unresolved until an explicit programme or boundary is entered', async profile => {
  const unknown = await compileService(profile, {}, {});
  expect(unknown.preliminaryNeeds.filter(n => n.row_id.startsWith('g6:completion:'))).toHaveLength(11);
  expect(unknown.rows.some(r => r.row_id === 'g6:completion:waste-service')).toBe(false);
  const notNeeded = await compileService(profile, absent, {});
  expect(notNeeded.preliminaryNeeds.filter(n => n.row_id.startsWith('g6:completion:'))).toHaveLength(0);
  expect(notNeeded.rows.filter(r => r.row_id.startsWith('g6:completion:')).map(r => r.row_id))
    .toEqual(['g6:completion:cleanup-boundary', 'g6:completion:waste-boundary']);
});
