import {
  compileDrywallPartitionC111S2736 as compile, C111_DEFINITION_S2736 as definition,
  C111_READY_OPERATIONS_S2736 as ready, C111_SOURCE_METADATA_S2736 as source,
} from '../../src/lib/estimate/v4/drywallPartitionC111ConstructorS2736';
import { buildMasterParameterCalculationConsumers } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const balance = (row: Record<string, unknown>) => (row.calculation_trace as Record<string, any>).purchaseBalance;

describe('C111 partition from reusable operations and primary product profiles', () => {
  test('all inputs have consumers; ready stage boundaries reused without unresolved or ceiling norms', () => {
    const {resourceConsumers} = buildMasterParameterCalculationConsumers({parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources});
    expect(definition.parameters.filter(p => !resourceConsumers[p.parameter_id]?.length)).toEqual([]);
    expect(ready.map(r => r.operation)).toEqual(['FRAME', 'CLAD', 'INSULATE', 'FINISH_JOINT']);
    expect(ready.every(r => r.sourceRows.length > 0)).toBe(true);
    expect(definition.resources.filter(r => r.source_metadata?.reusedOperation).length).toBe(8);
    expect(Object.keys(definition.runtimeInput).some(id => /_confirmed|productivity|_reference/.test(id))).toBe(false);
    expect(source.artifact_sha256).toBe(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/drywall-partition-c111-s27-36.json')).digest('hex'));
    expect(JSON.stringify(definition.formulas)).not.toMatch(/ceiling|norm_hours|productivity/);
  });
  test('30m2 short input means one-face area, physical resources for both faces and labour once', async () => {
    const r = await compile({area_m2: 30});
    const quantity = (id: string) => r.rows.find(x => x.row_id === id)?.quantity;
    expect(r.preliminaryNeeds).toEqual([]);
    expect(quantity('scope:c111:sheet-net')).toBe('60');
    expect(quantity('material:c111:board')).toBe('20');
    expect(quantity('material:c111:pn50')).toBe('8');
    expect(quantity('material:c111:ps50')).toBe('20');
    expect(quantity('scope:c111:sheet-cut')).toBe('12');
    expect(quantity('scope:c111:stud-cut')).toBe('5');
    expect(quantity('material:c111:fugen')).toBe('15');
    expect(quantity('work:c111:worker')).toBe('29.4');
    expect(quantity('work:c111:shears')).toBe('0.108');
    expect(quantity('work:c111:perforator')).toBe('0.18');
    expect(quantity('work:c111:driver')).toBe('0.87');
    expect(r.rows.filter(x => x.included_in_procurement)).toHaveLength(12);
    expect(r.rows.filter(x => x.category === 'labor' && x.included_in_estimate)).toHaveLength(1);
    expect(r.rows.filter(x => x.included_in_estimate).every(x => x.unit_price === null)).toBe(true);
  });
  test('cut strips are reused only inside layout; compatible whole stock reduces orders, not cut waste', async () => {
    const r = await compile({area_m2: 33, c111_height_m: 2.75, c111_board_stock: 4, c111_board_reserve: 2, c111_ps50_stock: 10, c111_ps50_reserve: 3});
    // 12m length: 10 full sheet equivalents per face with staggered half/end strips; 21 full-height studs.
    expect(balance(r.rows.find(x => x.row_id === 'material:c111:board')!)).toMatchObject({consumed: '20', effectiveOrder: '18', remaining: '2', freeBeyondReserve: '0'});
    expect(balance(r.rows.find(x => x.row_id === 'material:c111:ps50')!)).toMatchObject({consumed: '21', effectiveOrder: '14', remaining: '3'});
    expect(r.rows.find(x => x.row_id === 'scope:c111:sheet-cut')?.quantity).toBe('6');
    await expect(compile({area_m2: 30, c111_board_stock: 0.5})).rejects.toThrow();
    await expect(compile({area_m2: 30, c111_height_m: 3.01})).rejects.toThrow();
  });
  test('source packages, lengths and approximate primer consumption keep actual supply units', async () => {
    const r = await compile({area_m2: 30});
    expect(balance(r.rows.find(x => x.row_id === 'material:c111:tn25')!)).toMatchObject({consumed: '870', quantum: '1000', effectiveOrder: '1000', freeBeyondReserve: '130'});
    expect(balance(r.rows.find(x => x.row_id === 'material:c111:insulation')!)).toMatchObject({consumed: '30', quantum: '12', effectiveOrder: '36', freeBeyondReserve: '6'});
    const primer = r.rows.find(x => x.row_id === 'material:c111:tiefengrund')!;
    expect(primer.unit_id).toBe('kg');
    expect(Number(balance(primer).consumed)).toBeCloseTo(6.0601363636, 8);
    expect(balance(primer)).toMatchObject({quantum: '5', effectiveOrder: '10'});
    expect(primer.normative_trace).toEqual(expect.arrayContaining([expect.objectContaining({source_url: expect.stringContaining('38-IL-KNAUF_Tifengrund'), exact_locator: expect.stringContaining('0.1kg/m2')})]));
    const adjusted = await compile({area_m2: 30, c111_primer_rate_kg_m2: 0.2, c111_anchor_pack_items: 50});
    expect(adjusted.rows.find(x => x.row_id === 'material:c111:tiefengrund')?.quantity).toBe('15');
    expect(adjusted.rows.find(x => x.row_id === 'material:c111:dowel')?.quantity).toBe('50');
  });
  test('actual staggered joints replace the reference area ratio; three cut ends at4m are primed', async () => {
    const long = await compile({area_m2: 40, c111_joint_tape_stock: 60});
    expect(balance(long.rows.find(x => x.row_id === 'material:c111:joint-tape')!)).toMatchObject({consumed: '66', effectiveOrder: '50', remaining: '44'});
    const reference = await compile({area_m2: 11, c111_height_m: 2.75});
    expect(reference.rows.find(x => x.row_id === 'scope:c111:joint-length')?.quantity).toBe('16.5');
    expect(Number(reference.rows.find(x => x.row_id === 'scope:c111:cut-prime')?.quantity)).toBeCloseTo(0.325, 8);
    for (const [length, cutArea, tape] of [[0.6, 0.134, 0], [1.2, 0.158, 2.75], [1.8, 0.182, 5.5], [3.6, 0.254, 13.75]]) {
      const r = await compile({area_m2: length! * 2.75});
      expect(Number(r.rows.find(x => x.row_id === 'scope:c111:cut-prime')?.quantity)).toBeCloseTo(cutArea!, 8);
      expect(Number(balance(r.rows.find(x => x.row_id === 'material:c111:joint-tape')!).consumed)).toBe(tape);
    }
    await expect(compile({area_m2: 50})).rejects.toThrow(/15м/);
  });
  test('physical fasteners and remainders are integers, small panels retain minimum geometry', async () => {
    const r = await compile({area_m2: 11.3});
    expect(balance(r.rows.find(x => x.row_id === 'material:c111:dowel')!)).toMatchObject({consumed: '19', remaining: '81'});
    expect(balance(r.rows.find(x => x.row_id === 'material:c111:tn25')!)).toMatchObject({consumed: '328', remaining: '672'});
    const small = await compile({area_m2: 0.55});
    expect(balance(small.rows.find(x => x.row_id === 'material:c111:dowel')!).consumed).toBe('12');
    expect(balance(small.rows.find(x => x.row_id === 'material:c111:tn25')!).consumed).toBe('48');
  });
  test('partial Fugen use and water are independent of purchased powder/reserve, allocations unpaid', async () => {
    const r = await compile({area_m2: 31, c111_fugen_stock: 10, c111_fugen_reserve: 5, c111_water_stock: 1, c111_water_reserve: 2});
    expect(balance(r.rows.find(x => x.row_id === 'material:c111:fugen')!)).toMatchObject({consumed: '15.5', effectiveOrder: '15', remaining: '9.5', freeBeyondReserve: '4.5'});
    const owner = r.rows.find(x => x.row_id === 'material:c111:water')!;
    expect(balance(owner)).toMatchObject({consumed: '13.175', effectiveOrder: '15', remaining: '2.825', freeBeyondReserve: '0.825'});
    const saved = selectCanonicalArtifactRows(r.rows);
    const projection = buildCanonicalProcurementProjection({revision: {id: 'TEST', release_id: 'TEST', catalog_id: 'TEST', checksum_sha256: 'a'.repeat(64), row_count: r.rows.length}, procurementRows: saved.procurementRows, sourceRows: r.rows});
    expect(projection.rows.find(x => x.rowId === owner.row_id)?.consumptionAllocations).toEqual(expect.arrayContaining([
      expect.objectContaining({consumed: '10.075', separatelyPayable: false}), expect.objectContaining({consumed: '3.1', separatelyPayable: false}),
    ]));
  });
  test('NONE removes insulation and its knife, other individually disclosed equipment stays included in rates', async () => {
    const r = await compile({area_m2: 30, c111_insulation_mode: 'NONE'});
    expect(r.rows.some(x => x.row_id === 'material:c111:insulation')).toBe(false);
    expect(r.rows.some(x => x.row_id === 'tool:c111:insulation-knife')).toBe(false);
    for (const key of ['measure', 'level', 'sanding-holder', 'abrasive', 'brush', 'roller', 'dust-protection', 'dust-bag']) {
      const row = r.rows.find(x => x.row_id === 'tool:c111:' + key)!;
      expect(row.included_in_procurement).toBe(false);expect(row.included_in_estimate).toBe(false);expect(row.quantity).toBe('1');
    }
    expect(r.rows.find(x => x.row_id === 'work:c111:worker')?.quantity).toBe('29.4');
  });
  test('confirmed mode demands project approvals; preliminary geometry never becomes an approval', async () => {
    const r = await compile({area_m2: 30, applicability_mode: 'CONFIRMED_PROJECT_FACTS'});
    expect(r.preliminaryNeeds.some(x => x.missing_parameter_ids.includes('c111_modern_materials_krer_labor_confirmed'))).toBe(true);
    expect(r.preliminaryNeeds.some(x => x.missing_parameter_ids.includes('c111_workplace_and_contractor_costs_confirmed'))).toBe(true);
    const approved = await compile({area_m2: 30, applicability_mode: 'CONFIRMED_PROJECT_FACTS', c111_straight_no_openings_confirmed: 'YES', c111_dry_single_layer_system_confirmed: 'YES', c111_anchors_and_height_confirmed: 'YES', c111_modern_materials_krer_labor_confirmed: 'YES', c111_workplace_and_contractor_costs_confirmed: 'YES'});
    expect(approved.preliminaryNeeds).toEqual([]);
    await expect(compile({area_m2: 30, c111_anchors_and_height_confirmed: 'NO'})).rejects.toThrow();
    await expect(compile({area_m2: 30, c111_fugen_water_l_kg: 0.8})).rejects.toThrow();
    await expect(compile({area_m2: 30, c111_insulation_mode: 'UNSPECIFIED'})).rejects.toThrow();
  });
});
