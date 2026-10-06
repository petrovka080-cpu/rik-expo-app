import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { compilePvcRoofConcreteKrer12S2736 as compile, PVC_ROOF_CONCRETE_DEFINITION_S2736 as definition, PVC_ROOF_CONCRETE_SOURCE_PACK_SHA256_S2736 } from '../../src/lib/estimate/v4/pvcRoofConcreteKrer12ConstructorS2736';
import { PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS, PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES } from '../../src/lib/estimate/v4/pvcRoofMembraneInstallationR1';
import { canonicalEstimateRevisionRowFromStorage } from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import { buildMasterParameterCalculationConsumers } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import { aiEstimateRuLabelForParameter } from '../../src/lib/estimate/aiEstimateRuParameterDictionary';
import { canonicalEstimateWorkProcess } from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
const q = (r: Awaited<ReturnType<typeof compile>>, id: string) => r.rows.find(x => x.row_id === id)?.quantity;
const purchaseBalance = (row: Awaited<ReturnType<typeof compile>>['rows'][number] | undefined) =>
  (row?.calculation_trace as { purchaseBalance?: Record<string, unknown> } | undefined)?.purchaseBalance;

describe('bounded concrete-base PVC1.2mm KRER12 field operation', () => {
  test('saved composition reveals the work sequence and retains one labor owner and the existing material balances', async () => {
    const result = await compile({ area_m2: 100 });
    const process = canonicalEstimateWorkProcess([...result.rows, ...result.preliminaryNeeds].map(row => ({
      rowId: row.row_id,
      operation: (row.calculation_trace as { resourceGraph?: { operationCompositionV1?: unknown } })?.resourceGraph?.operationCompositionV1,
    })));
    expect(process[0]?.operations.map(step => step.operationId))
      .toEqual(['preparation', 'separation', 'laying', 'fastening', 'cleaning', 'welding', 'control']);
    expect(process[0]?.operations.find(step => step.operationId === 'fastening')?.resourceIds)
      .toContain('pvc-roof:material:screw');
    expect(process[0]?.operations.find(step => step.operationId === 'cleaning')?.resourceIds)
      .toContain('pvc-roof:material:cleaner');
    expect(result.rows.filter(row => row.category === 'construction_work' && row.included_in_estimate)).toHaveLength(1);
    expect(result.rows.filter(row => row.included_in_procurement)).toHaveLength(6);
    expect(q(result, 'pvc-roof:labor:workers')).toBe('5.33');
  });
  test('published titles survive the actual UI label filter and distinguish fastener stock from reserve', () => {
    const labels = Object.fromEntries(definition.parameters.map(p => [p.parameter_id, aiEstimateRuLabelForParameter(p.parameter_id, p.title_ru)]));
    expect(Object.values(labels).every(label => label.trim().length > 0)).toBe(true);
    expect(labels.field_roll_m2).toContain('Площадь рулона');
    expect(labels.detail_pack_m2).toContain('Площадь упаковки');
    expect(labels.roof_anchor_stock).toContain('пригодного наличия');
    expect(labels.roof_anchor_reserve).toContain('сохраняемого резерва');
    expect(labels.roof_anchor_stock).not.toBe(labels.roof_anchor_reserve);
  });
  test('the selected source pack is bound to its actual bytes; manufacturer variants remain distinct', () => {
    expect(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/pvc-roof-concrete-1_2mm-krer12-s27-36.json')).digest('hex'))
      .toBe(PVC_ROOF_CONCRETE_SOURCE_PACK_SHA256_S2736);
    expect(definition.resources.find(x => x.row_id === 'pvc-roof:material:field')?.source_metadata.selectedManufacturerProduct)
      .toMatchObject({ name: 'LOGICROOF V-RP 1.2мм', selectedRollAreaM2: 52.5 });
    expect(definition.resources.find(x => x.row_id === 'pvc-roof:material:detail')?.source_metadata.selectedManufacturerProduct)
      .toMatchObject({ name: 'LOGICROOF V-SR 1.5мм', selectedPackAreaM2: 20 });
  });
  test('ordinary area automatically calculates exact labor, machines and six original compatible material needs', async () => {
    const r = await compile({ area_m2: 100 });
    expect(q(r, 'pvc-roof:labor:workers')).toBe('5.33');
    expect(q(r, 'pvc-roof:machine:screwdriver')).toBe('0.39');
    expect(q(r, 'pvc-roof:machine:hammer')).toBe('1.2');
    expect(r.rows.filter(x => x.row_id.startsWith('pvc-roof:machine:'))).toHaveLength(7);
    expect(Object.fromEntries(r.rows.filter(x => x.row_id.startsWith('pvc-roof:machine:')).map(x => [x.row_id.split(':').at(-1), x.quantity])))
      .toEqual({ tower8t: '0.01', truckCrane10t: '0.02', screwdriver: '0.39', variant4_6kw: '0.45', hammer: '1.2', triac1_6kw: '0.32', lorry5t: '0.02' });
    const balances = Object.fromEntries(r.rows.filter(x => x.included_in_procurement).map(x => [x.row_id, purchaseBalance(x)]));
    expect(balances['pvc-roof:material:field']).toMatchObject({ consumed: '115', effectiveOrder: '157.5', remaining: '42.5', quantum: '52.5' });
    expect(balances['pvc-roof:material:detail']).toMatchObject({ consumed: '0.6', effectiveOrder: '20', remaining: '19.4' });
    expect(balances['pvc-roof:material:anchor']).toMatchObject({ consumed: '4', effectiveOrder: '4', remaining: '0' });
    expect(balances['pvc-roof:material:screw']).toMatchObject({ consumed: '400', effectiveOrder: '400' });
    expect(balances['pvc-roof:material:roof-dowel']).toMatchObject({ consumed: '400', effectiveOrder: '400' });
    expect(balances['pvc-roof:material:dornit']).toMatchObject({ consumed: '110', effectiveOrder: '110' });
    expect(r.preliminaryNeeds.flatMap(x => x.missing_parameter_ids).sort()).toEqual(['cleaned_surface_m2', 'cleaner_density_kg_l']);
    expect(r.preliminaryNeeds.every(x => x.row_id === 'pvc-roof:material:cleaner')).toBe(true);
  });
  test('the original646 is visible for trace comparison, never ordered, and no full-roof cleaning area or density is guessed', async () => {
    const r = await compile({ area_m2: 100 });
    const original = r.rows.find(x => x.row_id === 'pvc-roof:scope:original646')!;
    expect(original.quantity).toBe('0.9'); expect(original.included_in_estimate).toBe(false); expect(original.included_in_procurement).toBe(false);
    expect(r.rows.some(x => x.row_id === 'pvc-roof:material:cleaner')).toBe(false);
    expect(definition.runtimeInput).not.toHaveProperty('cleaned_surface_m2');
    expect(definition.runtimeInput).not.toHaveProperty('cleaner_density_kg_l');
    expect(Object.values(definition.runtimeInput)).not.toContain('YES');
  });
  test('fractional roof area cannot create fractional physical fasteners, stock or reserves', async () => {
    const r = await compile({ area_m2: 100.1, roof_screw_stock: 400, roof_screw_reserve: 1, fastener_quantum_piece: 10 });
    expect(purchaseBalance(r.rows.find(x => x.row_id === 'pvc-roof:material:screw')))
      .toMatchObject({ consumed: '401', stock: '400', reserve: '1', effectiveOrder: '10', remaining: '9', freeBeyondReserve: '8' });
    expect(purchaseBalance(r.rows.find(x => x.row_id === 'pvc-roof:material:roof-dowel')))
      .toMatchObject({ consumed: '401', effectiveOrder: '410', remaining: '9' });
    expect(purchaseBalance(r.rows.find(x => x.row_id === 'pvc-roof:material:anchor')))
      .toMatchObject({ consumed: '5', effectiveOrder: '10', remaining: '5' });
    expect(definition.resources.find(x => x.row_id === 'pvc-roof:material:screw')?.resource_graph.physicalPieceBudget)
      .toMatchObject({ rawNormativeBudgetExpression: '(area_m2/100)*400' });
    for (const bad of [{ roof_screw_stock: 400.5 }, { roof_roof_dowel_reserve: 0.5 }, { roof_anchor_stock: 0.5 }]) {
      await expect(compile({ area_m2: 100.1, ...bad })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
    }
  });
  test('manufacturer cleaned-surface mass converts to actual3l packs only through an explicit density; owner survives storage', async () => {
    // 1.2 is a QA fixture only, not a manufacturer density or runtime default.
    const r = await compile({ area_m2: 100, cleaned_surface_m2: 8, cleaner_density_kg_l: 1.2,
      roof_cleaner_stock: 1, roof_cleaner_reserve: 0.5 });
    const row = r.rows.find(x => x.row_id === 'pvc-roof:material:cleaner')!;
    expect(purchaseBalance(row)).toMatchObject({ consumed: '2', stock: '1', reserve: '0.5', quantum: '3.6', effectiveOrder: '3.6', remaining: '2.6', freeBeyondReserve: '2.1' });
    expect(canonicalEstimateRevisionRowFromStorage(JSON.parse(JSON.stringify(row)), null).calculationTrace.purchaseBalance)
      .toMatchObject({ consumed: '2', effectiveOrder: '3.6', quantum: '3.6', remaining: '2.6' });
    expect(r.preliminaryNeeds).toHaveLength(0);
  });
  test('height changes worker labor only; usable stock and preserved reserve precede roll rounding', async () => {
    const r = await compile({ area_m2: 100, roof_height_m: 25, roof_field_stock: 100, roof_field_reserve: 5, detail_pack_m2: '10' });
    expect(q(r, 'pvc-roof:labor:workers')).toBe('5.5965');
    expect(q(r, 'pvc-roof:machine:variant4_6kw')).toBe('0.45');
    expect(purchaseBalance(r.rows.find(x => x.row_id === 'pvc-roof:material:field')))
      .toMatchObject({ consumed: '115', stock: '100', reserve: '5', effectiveOrder: '52.5', remaining: '37.5', freeBeyondReserve: '32.5' });
    expect(q(r, 'pvc-roof:material:detail')).toBe('10');
  });
  test('operators and individually disclosed contractor tools are not a second paid or purchased owner', async () => {
    const r = await compile({ area_m2: 100 });
    expect(q(r, 'pvc-roof:scope:operators')).toBe('0.03');
    for (const row of r.rows.filter(x => x.row_id.startsWith('pvc-roof:tool:') || x.row_id === 'pvc-roof:scope:operators')) {
      expect(row.included_in_estimate).toBe(false); expect(row.included_in_procurement).toBe(false);
    }
    expect(r.rows.filter(x => x.row_id.startsWith('pvc-roof:tool:'))).toHaveLength(8);
  });
  test('explicit separately paid project tests reuse the saved operation and retain source arithmetic and provenance', async () => {
    const source = PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES.find(x => x.row_id === 'rc09:pvc_membrane_weld_probe_test')!;
    const original = PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS.find(x => x.formula_id === source.formula_id)!;
    expect(definition.formulas.find(x => x.formula_id === original.formula_id)).toEqual(original);
    expect((definition.resources.find(x => x.row_id === source.row_id)?.source_metadata as Record<string, unknown> | undefined)?.normativeTrace)
      .toEqual(source.source_metadata?.normativeTrace);
    const r = await compile({ area_m2: 100, separate_weld_tests: 'REQUIRED', weld_probe_control_designation: 'QA fixture:test plan only', weld_probe_control_count_test: 3 });
    expect(q(r, source.row_id)).toBe('3');
    expect(r.rows.some(x => /reinforced_pvc_roof_membrane_1_5mm|automatic_hot_air_roof_welder/.test(x.row_id))).toBe(false);
  });
  test('every declared parameter has a real consumer and false confirmed applicability cannot silently pass', async () => {
    const consumers = buildMasterParameterCalculationConsumers({ parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources });
    expect(definition.parameters.filter(p => !consumers.resourceConsumers[p.parameter_id]?.length).map(p => p.parameter_id)).toEqual([]);
    const r = await compile({ area_m2: 100, roof_applicability_mode: 'CONFIRMED_PROJECT_FACTS' });
    expect(r.preliminaryNeeds.some(x => x.missing_parameter_ids.includes('norm_material_replacement_applicability_confirmed'))).toBe(true);
    await expect(compile({ area_m2: 100, field_roll_m2: 30 })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
    await expect(compile({ area_m2: 100, cleaner_density_kg_l: 0 })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
  });
});
