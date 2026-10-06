import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  compilePvcRoofCleanerVolume472219S2737 as compile,
  PVC_ROOF_VOLUME_CLEANER_DEFINITION_S2737 as definition,
  PVC_ROOF_VOLUME_CLEANER_ROW_ID_S2737 as cleanerRowId,
  PVC_ROOF_VOLUME_CLEANER_SOURCE_PACK_SHA256_S2737,
  PVC_ROOF_VOLUME_CLEANER_CONFIRMATION_S2737 as volumeConfirmationId,
} from '../../src/lib/estimate/v4/pvcRoofCleanerVolume472219S2737';
import { compilePvcRoofConcreteKrer12S2736 as compileMass, PVC_ROOF_CONCRETE_DEFINITION_S2736 as massDefinition } from '../../src/lib/estimate/v4/pvcRoofConcreteKrer12ConstructorS2736';
import { canonicalEstimateWorkProcess } from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

const balance = (result: Awaited<ReturnType<typeof compile>>) =>
  (result.rows.find(row => row.row_id === cleanerRowId)?.calculation_trace as { purchaseBalance?: Record<string, unknown> })?.purchaseBalance;

test('the separate volume source has pinned bytes and no inferred density or mass input aliases', () => {
  expect(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/pvc-roof-cleaner-472219-volume-s27-37.json')).digest('hex'))
    .toBe(PVC_ROOF_VOLUME_CLEANER_SOURCE_PACK_SHA256_S2737);
  const source = definition.resources.find(row => row.row_id === cleanerRowId)?.source_metadata;
  expect(source?.manufacturerSource).toMatchObject({ productEkn: '472219', rateLPerCleanedM2: 0.25, packL: 3,
    artifactSha256: '2c18f654cd628cc204bc657af83897e5e3d84146572c8664151e07e345ee8654', publicationDate: null });
  expect(source?.densityConversionPerformed).toBe(false);
  expect(definition.parameters.map(parameter => parameter.parameter_id))
    .not.toEqual(expect.arrayContaining(['cleaner_density_kg_l', 'roof_cleaner_stock', 'roof_cleaner_reserve']));
  expect(definition.runtimeInput).not.toHaveProperty('cleaned_surface_m2');
  for (const id of ['roof_cleaner_stock_l', 'roof_cleaner_reserve_l']) {
    expect(definition.parameters.find(parameter => parameter.parameter_id === id)?.unit_id).toBe('l');
  }
});

test('ordinary roof area leaves only the actual cleaned zone unknown and does not turn roof area into cleaner use', async () => {
  const result = await compile({ area_m2: 100 });
  expect(result.rows).toHaveLength(25);
  expect(result.preliminaryNeeds).toHaveLength(1);
  expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: cleanerRowId, unit_id: 'l', missing_parameter_ids: ['cleaned_surface_m2'] });
  expect(result.rows.some(row => row.row_id === cleanerRowId)).toBe(false);
  expect(result.rows.filter(row => row.included_in_procurement)).toHaveLength(6);
});

test('20 square metres of actual treatment requires 5 litres and two 3-litre cans without density', async () => {
  const result = await compile({ area_m2: 100, cleaned_surface_m2: 20 });
  expect(balance(result)).toMatchObject({ unitId: 'l', consumed: '5', stock: '0', reserve: '0', quantum: '3', effectiveOrder: '6', remaining: '1' });
  expect(result.rows.find(row => row.row_id === cleanerRowId)?.unit_id).toBe('l');
  expect(result.preliminaryNeeds).toHaveLength(0);
  expect(result.rows.filter(row => row.included_in_procurement)).toHaveLength(7);
});

test('fractional treatment, litre stock and preserved reserve are reconciled by the existing balance owner', async () => {
  const result = await compile({ area_m2: 100.1, cleaned_surface_m2: 20.2, roof_cleaner_stock_l: 2, roof_cleaner_reserve_l: 0.5 });
  expect(balance(result)).toMatchObject({ consumed: '5.05', stock: '2', reserve: '0.5', quantum: '3', effectiveOrder: '6', remaining: '2.95', freeBeyondReserve: '2.45' });
  const zero = await compile({ area_m2: 100, cleaned_surface_m2: 0 });
  expect(balance(zero)).toMatchObject({ consumed: '0', effectiveOrder: '0', remaining: '0' });
  expect(zero.preliminaryNeeds).toHaveLength(0);
});

test('the canonical ingress rejects stale kilogram stock, reserve, density and manual cleaner quantity', async () => {
  for (const input of [
    { roof_cleaner_stock: 2 }, { roof_cleaner_reserve: 1 }, { cleaner_density_kg_l: 1 },
    { delivered_membrane_and_cleaner_version_confirmed: 'YES' },
    { effective_resource_quantity_pvc_roof_material_cleaner: 3.6 },
  ]) await expect(compile({ area_m2: 100, cleaned_surface_m2: 20, ...input })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
});

test('delivered-product confirmation belongs to the volume leaflet and cannot reuse the mass confirmation', async () => {
  const confirmation = definition.parameters.find(parameter => parameter.parameter_id === volumeConfirmationId);
  expect(confirmation?.truth_metadata.guide).toMatchObject({
    source_document: 'https://pim.tn.ru/4/b/1/1/4b118683046ee4fccb8822c424eaa56d870fcd31_Listovka_Ochistitel_dlya_PVKH_membran_TEKHNONIKOL.pdf',
    source_snapshot_hash: '2c18f654cd628cc204bc657af83897e5e3d84146572c8664151e07e345ee8654',
  });
  const confirmed = { area_m2: 100, cleaned_surface_m2: 20, roof_applicability_mode: 'CONFIRMED_PROJECT_FACTS',
    concrete_and_ready_insulation_confirmed: 'YES', wind_and_fixing_specification_matches_budget_confirmed: 'YES',
    norm_material_replacement_applicability_confirmed: 'YES' };
  const missing = await compile(confirmed);
  expect(missing.preliminaryNeeds.flatMap(need => need.missing_parameter_ids)).toContain(volumeConfirmationId);
  const supplied = await compile({ ...confirmed, [volumeConfirmationId]: 'YES' });
  expect(supplied.preliminaryNeeds).toHaveLength(0);
});

test('inherited field arithmetic and single labor owner survive the variant; the mass definition remains intact', async () => {
  const snapshot = JSON.stringify(massDefinition);
  const parent = await compileMass({ area_m2: 100.1 });
  const child = await compile({ area_m2: 100.1 });
  const physical = (result: typeof child) => result.rows.map(row => ({ id: row.row_id, unit: row.unit_id,
    quantity: row.quantity, estimate: row.included_in_estimate, purchase: row.included_in_procurement }));
  expect(physical(child)).toEqual(physical(parent));
  expect(child.rows.filter(row => row.category === 'construction_work' && row.included_in_estimate)).toHaveLength(1);
  const process = canonicalEstimateWorkProcess([...child.rows, ...child.preliminaryNeeds].map(row => ({
    rowId: row.row_id, operation: (row.calculation_trace as { resourceGraph?: { operationCompositionV1?: unknown } })?.resourceGraph?.operationCompositionV1,
  })));
  expect(process[0]?.operations.map(step => step.operationId))
    .toEqual(['preparation', 'separation', 'laying', 'fastening', 'cleaning', 'welding', 'control']);
  expect(process[0]?.operations.find(step => step.operationId === 'cleaning')?.resourceIds).toContain(cleanerRowId);
  expect(JSON.stringify(massDefinition)).toBe(snapshot);
  expect(massDefinition.parameters.some(parameter => parameter.parameter_id === 'cleaner_density_kg_l')).toBe(true);
});
