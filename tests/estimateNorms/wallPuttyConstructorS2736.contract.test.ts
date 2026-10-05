import {
  compileWallPuttyConstructorS2736 as compile, WALL_PUTTY_DEFINITION_S2736 as definition,
  WALL_PUTTY_READY_ROWS_S2736 as ready,
} from '../../src/lib/estimate/v4/wallPuttyConstructorS2736';
import { compileFormulaGraph } from '../../src/lib/estimate/backendPlatform/formulaGraph';
import { buildMasterParameterCalculationConsumers } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { WALL_PUTTY_SOURCE_METADATA_S2736 } from '../../src/lib/estimate/v4/wallPuttyConstructorS2736';
const balance = (row: Record<string, unknown>) => (row.calculation_trace as Record<string, any>).purchaseBalance;

describe('third prepared mineral wall putty reuses corrected norm and common purchasing', () => {
  test('every exposed parameter has a real consumer; no hidden approval or productivity default', () => {
    const { resourceConsumers } = buildMasterParameterCalculationConsumers({ parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources });
    expect(definition.parameters.filter(p => !resourceConsumers[p.parameter_id]?.length)).toEqual([]);
    expect(Object.keys(definition.runtimeInput).some(id => /_confirmed|productivity|_reference/.test(id))).toBe(false);
    expect(WALL_PUTTY_SOURCE_METADATA_S2736.artifact_sha256).toBe(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/wall-putty-third-mineral-ct127-s27-36.json')).digest('hex'));
  });
  test('area alone discloses real resources, automatic applicable labour and individual tools', async () => {
    const result = await compile({ area_m2: 50 });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === 'wall-putty:ready:construction_worker_labor')?.quantity).toBe('5.995');
    expect(result.rows.find(r => r.row_id === 'wall-putty:ready:flatbed_truck')?.quantity).toBe('0.015');
    expect(result.rows.filter(r => r.included_in_procurement)).toHaveLength(19);
    expect(result.rows.filter(r => r.included_in_procurement).some(r => r.unit_id === 'set')).toBe(false);
    expect(result.rows.find(r => r.row_id === 'wall-putty:ready:machine_operator_labor')?.included_in_estimate).toBe(false);
    expect(result.rows.some(r => r.row_id === 'material:wall-putty:ct17')).toBe(false);
    expect(result.rows.filter(r => r.included_in_estimate).every(r => r.unit_price === null)).toBe(true);
  });
  test('labour and equipment ASTs preserve the exact reused corrected operation', () => {
    for (const key of ['construction_worker_labor', 'machine_operator_labor', 'cargo_lift', 'flatbed_truck']) {
      expect(definition.formulas.find(f => f.formula_id === 'wall_putty_ready_' + key + '_v1')?.ast).toEqual(compileFormulaGraph(ready[key]!.formula.expression).ast);
    }
  });
  test('net use, whole-bag mixing, wet surplus and dry stock remain different quantities', async () => {
    const result = await compile({ area_m2: 50, wall_putty_ct127_stock: 40, wall_putty_ct127_reserve: 20 });
    expect(result.rows.find(r => r.row_id === 'scope:wall-putty:net')?.quantity).toBe('35');
    expect(result.rows.find(r => r.row_id === 'scope:wall-putty:mixed')?.quantity).toBe('40');
    expect(result.rows.find(r => r.row_id === 'scope:wall-putty:wet-surplus')?.quantity).toBe('5');
    expect(balance(result.rows.find(r => r.row_id === 'material:wall-putty:ct127')!)).toMatchObject({ consumed: '40', stock: '40', reserve: '20', effectiveOrder: '20', remaining: '20', freeBeyondReserve: '0' });
    expect(balance(result.rows.find(r => r.row_id === 'material:wall-putty:water')!).consumed).toBe('21');
    const noOrder = await compile({ area_m2: 50, wall_putty_ct127_stock: 40 });
    expect(noOrder.rows.find(r => r.row_id === 'material:wall-putty:ct127')?.quantity).toBe('0');
    expect(balance(noOrder.rows.find(r => r.row_id === 'material:wall-putty:water')!).consumed).toBe('21');
  });
  test('water merges before rounding and exports unpaid mixing/cleaning allocations', async () => {
    const result = await compile({ area_m2: 50, wall_putty_water_stock: 1, wall_putty_water_reserve: 2 });
    const owner = result.rows.find(r => r.row_id === 'material:wall-putty:water')!;
    expect(balance(owner)).toMatchObject({ consumed: '21', effectiveOrder: '25', remaining: '5', freeBeyondReserve: '3' });
    const saved = selectCanonicalArtifactRows(result.rows);
    const projection = buildCanonicalProcurementProjection({ revision: { id: 'TEST', release_id: 'TEST', catalog_id: 'TEST', checksum_sha256: 'a'.repeat(64), row_count: result.rows.length }, procurementRows: saved.procurementRows, sourceRows: result.rows });
    expect(projection.rows.find(r => r.rowId === owner.row_id)?.consumptionAllocations).toEqual(expect.arrayContaining([
      expect.objectContaining({ consumed: '16', separatelyPayable: false }), expect.objectContaining({ consumed: '5', separatelyPayable: false }),
    ]));
  });
  test('optional new priming has separate materials and only its actual labour remains unresolved', async () => {
    const pending = await compile({ area_m2: 50, putty_priming_mode: 'CT17_UNDILUTED' });
    expect(pending.preliminaryNeeds.some(r => r.missing_parameter_ids.includes('primer_productivity_m2_per_man_hour'))).toBe(true);
    const result = await compile({ area_m2: 50, putty_priming_mode: 'CT17_UNDILUTED', primer_productivity_m2_per_man_hour: 10, primer_compatibility_drying_reference: 'VISIBLE_TEST_PROJECT_CT17_COMPATIBILITY_AND_DRYING' });
    expect(result.rows.find(r => r.row_id === 'material:wall-putty:ct17')?.quantity).toBe('10');
    expect(result.rows.find(r => r.row_id === 'material:wall-putty:ct17')!.normative_trace).toEqual(expect.arrayContaining([
      expect.objectContaining({ source_id: 'src_professional_norm_pack_paint_ceresit_ct17_primer_l_m2_before_paint_v1',
        tds_identifier: 'TDS No CT17 Profi 03.24', source_definition_hash: 'eh_a54248367d4c85a8', source_url: 'https://datasheets.tdx.henkel.com/CERESIT-CT-17-en_GL.pdf' }),
    ]));
    expect(result.rows.find(r => r.row_id === 'labor:wall-putty:new-primer')?.quantity).toBe('5');
    expect(result.rows.find(r => r.row_id === 'wall-putty:ready:construction_worker_labor')?.quantity).toBe('5.995');
  });
  test('confirmed project requires explicit mineral substrate, third-coat replacement and dry conditions', async () => {
    const pending = await compile({ area_m2: 50, applicability_mode: 'CONFIRMED_PROJECT_FACTS' });
    expect(pending.preliminaryNeeds.some(r => r.missing_parameter_ids.includes('third_coat_and_ct127_norm_replacement_confirmed'))).toBe(true);
    const result = await compile({ area_m2: 50, applicability_mode: 'CONFIRMED_PROJECT_FACTS', prepared_mineral_wall_confirmed: 'YES', third_coat_and_ct127_norm_replacement_confirmed: 'YES', dry_interior_conditions_confirmed: 'YES', delivered_ct127_version_confirmed: 'YES' });
    expect(result.preliminaryNeeds).toEqual([]);
    await expect(compile({ area_m2: 50, prepared_mineral_wall_confirmed: 'NO' })).rejects.toThrow();
  });
  test('consumption is not multiplied by layer thickness and unsupported scope/rates are rejected', async () => {
    const result = await compile({ area_m2: 50, ct127_layer_mm: 2, ct127_selected_rate_kg_m2: 1.2 });
    expect(result.rows.find(r => r.row_id === 'scope:wall-putty:net')?.quantity).toBe('60');
    await expect(compile({ area_m2: 50, ct127_layer_mm: 3 })).rejects.toThrow();
    await expect(compile({ area_m2: 50, ct127_selected_rate_kg_m2: 1.3 })).rejects.toThrow();
    await expect(compile({ area_m2: 50, putty_scope: 'ALL_COATS' })).rejects.toThrow();
  });
});
