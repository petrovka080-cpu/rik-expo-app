import { compileAutomaticConstructionOwnerR1 } from './automaticConstructionOwnerR1';
import { pumpGroutMaterialDefinitionS2763, pumpGroutMaterialPackS2763 as pack, pumpGroutMaterialPrefixS2763 as prefix } from './pumpGroutMaterialS2763';

const geometry = { grout_material_choice: pack.selectedProductRu, grout_actual_total_volume_m3: '0.0768',
  grout_actual_layer_min_mm: '20', grout_actual_layer_max_mm: '20' };
const compile = (submittedParameters: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({ catalogId: 'control:pump-grout',
  compilerVersion: pack.contract, primaryMeasureParameterId: 'grout_actual_total_volume_m3', definition: pumpGroutMaterialDefinitionS2763(), submittedParameters });
const row = (result: Awaited<ReturnType<typeof compile>>, id: string) => result.rows.find(r => r.row_id === prefix + ':' + id);
describe('manufacturer approximate pump grout material shared owner', () => {
  test('source dry rate is source-owned, object facts have no defaults or question about the norm', () => {
    const d = pumpGroutMaterialDefinitionS2763();
    expect(d.parameters.every(p => p.default_value === null)).toBe(true);
    expect(d.runtimeInput).toEqual({});
    expect(d.parameters.map(p => p.parameter_id)).not.toContain('grout_dry_consumption');
    expect(d.resources.every(r => r.source_metadata?.quantityQuality === 'APPROXIMATE')).toBe(true);
  });
  test('nominal dry mass remains known when stock and reserve are unknown', async () => {
    const r = await compile(geometry);
    expect(row(r, 'consumed')?.quantity).toBe('153.6');
    expect(row(r, 'volume')?.quantity).toBe('0.0768');
    expect(row(r, 'order')).toBeUndefined();
    expect(r.preliminaryNeeds.find(n => n.row_id === prefix + ':order')?.missing_parameter_ids).toEqual(expect.arrayContaining(['grout_compatible_stock_kg', 'grout_retained_reserve_kg']));
  });
  test('explicit zero stock and reserve yield seven whole 25kg bags, no invented losses', async () => {
    const r = await compile({ ...geometry, grout_compatible_stock_kg: '0', grout_retained_reserve_kg: '0' });
    expect(row(r, 'consumed')?.quantity).toBe('153.6');
    expect(row(r, 'order')?.quantity).toBe('175');
    expect(row(r, 'bags')?.quantity).toBe('7');
    expect(row(r, 'remaining')?.quantity).toBe('21.4');
  });
  test('compatible stock and retained reserve use the existing shared purchase balance', async () => {
    const r = await compile({ ...geometry, grout_compatible_stock_kg: '25', grout_retained_reserve_kg: '10' });
    expect(row(r, 'order')?.quantity).toBe('150');
    expect(row(r, 'bags')?.quantity).toBe('6');
    expect(row(r, 'remaining')?.quantity).toBe('21.4');
    expect(row(r, 'free')?.quantity).toBe('11.4');
  });
  test('old 100mm preliminary thickness cannot pass selected product applicability', async () => {
    await expect(compile({ ...geometry, grout_actual_layer_max_mm: '100' })).rejects.toThrow();
  });
  test('reversed layer range is rejected', async () => {
    await expect(compile({ ...geometry, grout_actual_layer_min_mm: '25', grout_actual_layer_max_mm: '20' })).rejects.toThrow();
  });
  test('missing actual volume is not inferred from count, frame dimensions or an old 84kg control', async () => {
    const { grout_actual_total_volume_m3: _volume, ...facts } = geometry;
    const r = await compile(facts);
    expect(row(r, 'consumed')).toBeUndefined();
    expect(r.preliminaryNeeds.find(n => n.row_id === prefix + ':consumed')?.missing_parameter_ids).toContain('grout_actual_total_volume_m3');
  });
  test('other material does not use this product rate or produce a second paid material', async () => {
    const r = await compile({ grout_material_choice: pack.legacyProductRu });
    expect(r.rows.filter(r => r.included_in_estimate)).toHaveLength(0);
    expect(r.preliminaryNeeds).toHaveLength(0);
  });
  test('missing selection remains an explicit condition need', async () => {
    const r = await compile({});
    expect(row(r, 'consumed')).toBeUndefined();
    expect(r.preliminaryNeeds.some(n => n.row_id === prefix + ':consumed' && n.missing_parameter_ids.includes('grout_material_choice'))).toBe(true);
  });
  test('missing layer thickness cannot certify this product from volume alone', async () => {
    const { grout_actual_layer_max_mm: _thickness, ...facts } = geometry;
    const r = await compile(facts);
    expect(row(r, 'consumed')).toBeUndefined();
    expect(r.preliminaryNeeds.some(n => n.row_id === prefix + ':consumed' && n.missing_parameter_ids.includes('grout_actual_layer_max_mm'))).toBe(true);
  });
});
