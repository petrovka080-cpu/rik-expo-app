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
