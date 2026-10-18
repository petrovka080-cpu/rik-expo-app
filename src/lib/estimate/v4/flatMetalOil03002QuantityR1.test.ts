import { flatMetalOil03002QuantityDefinitionR1 as definition,
  compileFlatMetalOil03002QuantityScenarioR1 as scenario, flatMetalOil03002ScenarioFactsR1 as facts,
  flatMetalOil03002QuantityPackR1 as pack, flatMetalOil03002PrefixR1 as prefix,
  flatMetalOil03002PrimaryR1 as primary, flatMetalOil03002FactIdsR1 as factIds,
  flatMetalOil03002NeedRowIdsR1 as needIds, flatMetalOil03002NeedParameterIdsR1 as needParameters,
  flatMetalOil03002IndependentCompletenessMapR1 as completeness,
} from './flatMetalOil03002QuantityR1';
import { validateIndependentCompletenessMapReferences } from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const sourceIds = pack.rows.map(row => prefix + ':' + row.suffix);
const infoSuffixes = pack.rows.slice(1).map(row => row.suffix);
const provenance = { kind: 'manual', reason: 'TEST_ONLY source-control value; not an actual supplier price' };
const core = async (input: Record<string, unknown>, overrides: Parameters<typeof scenario>[1] = {}, prices: Parameters<typeof scenario>[2] = []) =>
  (await scenario(input, overrides, prices)).compiled;

describe('WORK catalogue-null flat-metal oil03002 source quantity consumer; prospective scenarios NOT RUN by author', () => {
  it('has seven literal resources and ten unitless unresolved obligations without defaults', () => {
    const d = definition();
    expect(d).toMatchObject({ catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false, runtimeInput: {} });
    expect(d.parameters).toHaveLength(19); expect(d.formulas).toHaveLength(17); expect(d.resources).toHaveLength(17);
    expect(d.parameters.map(p => p.ordinal)).toEqual(Array.from({ length: 19 }, (_, i) => i));
    expect(d.resources.map(r => r.ordinal)).toEqual(Array.from({ length: 17 }, (_, i) => i));
    expect(d.parameters.every(p => p.default_value === null)).toBe(true);
    expect(d.resources.slice(7).map(r => r.unit_id)).toEqual(Array(10).fill(''));
    expect(d.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id))
      .toEqual([prefix + ':whole-oil-painting-labor']);
  });
  it.each([
    ['100', ['12.21', '0.01', '0.01', '0.03', '0.0277', '3.2', '0.1']],
    ['12.5', ['1.52625', '0.00125', '0.00125', '0.00375', '0.0034625', '0.4', '0.0125']],
    ['1', ['0.1221', '0.0001', '0.0001', '0.0003', '0.000277', '0.032', '0.001']],
  ])('compiles literal actual paintedm2 %s with two coats already included', async (area, expected) => {
    const r = await core(facts(area as string));
    expect(r.rows.map(row => row.row_id)).toEqual(sourceIds); expect(r.rows.map(row => row.quantity)).toEqual(expected);
    expect(r.preliminaryNeeds.map(need => need.row_id).sort()).toEqual([...needIds].sort());
    expect(r.preliminaryNeeds.every(need => need.quantity === null && need.unit_price === null && !need.selected && !need.procurement_eligible)).toBe(true);
    expect(r.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([sourceIds[0]]);
    expect(r.rows.every(row => row.unit_price === null && !row.included_in_procurement)).toBe(true);
  });
  it('zero physical scope invents neither a project default nor a quantity for an open task', async () => {
    const r = await core({ [primary]: '0' });
    expect(r.rows).toHaveLength(7); expect(r.rows.every(row => row.quantity === '0')).toBe(true);
    expect(r.preliminaryNeeds).toEqual([]); expect(definition().runtimeInput).toEqual({});
  });
  it('missing actual painted area stays a need and negative area is rejected', async () => {
    const input = facts(); delete input[primary]; const r = await core(input);
    expect(r.rows).toEqual([]); expect(r.preliminaryNeeds.some(need => need.missing_parameter_ids.includes(primary))).toBe(true);
    expect(definition().parameters.find(p => p.parameter_id === primary)).toMatchObject({ unit_id: 'm2', default_value: null });
    await expect(core(facts('-1'))).rejects.toThrow('below minimum');
  });
  it.each(['q', 'pipe_length_m', 'pipe_diameter_mm', 'wall_projection_m2', 'coat_count', 'steel_structure_t'])('rejects unproved area conversion or neighbouring scope %s', async alias => {
    await expect(core({ ...facts(), [alias]: '100' })).rejects.toThrow('unknown estimate parameters');
  });
  it.each(['0', '-1', '3.501'])('rejects roomheight %s outside the selected standard scope', async height => {
    await expect(core({ ...facts(), oil_paint_room_height_m: height })).rejects.toThrow();
  });
  it.each([
    ['flat_metal_surface_class', 'SMALL_METAL_PART'], ['flat_metal_surface_class', 'STRUCTURAL_STEEL'], ['flat_metal_surface_class', 'ROOF'],
    ['flat_metal_surface_class', 'PIPE_OR_GRILLE'], ['oil_paint_interior_scope', 'EXTERIOR'],
    ['oil_paint_product_and_two_coats', 'MA25_ONE_COAT'], ['oil_paint_product_and_two_coats', 'OTHER_PAINT_THREE_COATS'],
  ])('rejects incompatible source scope %s=%s', async (key, value) => {
    await expect(core({ ...facts(), [key]: value })).rejects.toThrow('invalid enum');
  });
  it.each([...factIds])('requires positive-scope project fact %s at the actual resource dependency', async id => {
    const input = facts(); delete input[id]; const r = await core(input);
    expect(r.rows).toEqual([]);
    expect(r.preliminaryNeeds.filter(need => sourceIds.includes(need.row_id))).toHaveLength(7);
    expect(r.preliminaryNeeds.filter(need => sourceIds.includes(need.row_id)).every(need => need.missing_parameter_ids.includes(id))).toBe(true);
    expect(definition().parameters.find(p => p.parameter_id === id)).toMatchObject({ default_value: null,
      constraints_json: { requiredWhen: { kind: 'greater_than', parameterId: primary, value: 0 } } });
  });
  it('preserves literal seven resources and four operations in the one labour owner', () => {
    const d = definition(); expect(d.resources.slice(0, 7).map(row => row.source_metadata?.resource_code))
      .toEqual(['000-1003-3', null, '03-0327', '40-0001', '01-3804-0037', '01-7104-0038', '01-7204-0001']);
    const included = d.resources[0]!.source_metadata?.included_operations as Array<{ paymentOwnerRowId: string; operationId: string }>;
    expect(included.map(op => op.operationId)).toEqual(['cleaning', 'drying-oil-prime', 'first-coat', 'second-coat']);
    expect(included.every(op => op.paymentOwnerRowId === sourceIds[0])).toBe(true);
    expect(d.resources.slice(1, 7).every(row => JSON.stringify(row.source_metadata?.included_operations) === '[]')).toBe(true);
    expect(d.resources[4]).toMatchObject({ unit_id: 't', source_metadata: { purchase_order_admission: false } });
  });
  it.each(sourceIds)('cannot pin source norm quantity %s with a manual row amount', async id => {
    await expect(core(facts(), { [id]: { quantity: '1', provenance } })).rejects.toMatchObject({ code: 'ROW_AMENDMENT_INVALID' });
  });
  it.each(needIds)('cannot erase or quantify unresolved %s with manual0/1 and price', async id => {
    for (const quantity of ['0', '1']) await expect(core(facts(), { [id]: { quantity, unitPrice: '77', provenance } }))
      .rejects.toMatchObject({ code: 'ROW_AMENDMENT_INVALID' });
  });
  it('cannot supply unresolved norms as project or hidden default facts', async () => {
    for (const id of needParameters) {
      for (const value of ['0', '1']) await expect(core({ ...facts(), [id]: value })).rejects.toThrow('unresolved application norm cannot be supplied');
      expect(definition().parameters.find(p => p.parameter_id === id)).toMatchObject({ unit_id: null, default_value: null,
        truth_metadata: { visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM' } });
    }
  });
  it.each(infoSuffixes)('keeps manual and snapshot %s prices as excluded reference values', async suffix => {
    const id = prefix + ':' + suffix, override = { unitPrice: '77', includedInEstimate: true, includedInProcurement: true, provenance };
    const r = await core(facts(), { [id]: override });
    expect(r.rows.find(row => row.row_id === id)).toMatchObject({ unit_price: '77', ownership_status: 'OWNED_EXCLUDED',
      included_in_estimate: false, included_in_procurement: false });
    expect(r.totals.amount).toBe('0'); expect(r.preliminaryNeeds).toHaveLength(10);
    const resource = definition().resources.find(row => row.row_id === id)!;
    const snapshot = await core(facts(), {}, [{ price_key: resource.cost_owner_id!, unit_id: resource.unit_id,
      unit_price: '77', currency_code: 'KGS', snapshot_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }]);
    expect(snapshot.rows.find(row => row.row_id === id)).toMatchObject({ unit_price: '77',
      included_in_estimate: false, included_in_procurement: false });
    expect(snapshot.totals.amount).toBe('0');
    // Reference amount may exist per the existing pure-core contract; it never enters totals/procurement.
  });
  it('prices one whole labour owner without monetising operator, two machines or materials', async () => {
    const r = await core(facts(), { [sourceIds[0]!]: { unitPrice: '100', provenance } });
    expect(r.totals.amount).toBe('1221');
    expect(r.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([sourceIds[0]]);
    expect(r.rows.slice(1).every(row => !row.included_in_estimate && !row.included_in_procurement)).toBe(true);
  });
  it('recalculate preserves same-owner manual price title and exclusions', async () => {
    const raw = { unitPrice: '77', titleRu: 'TEST_ONLY preserved whole labour title', includedInEstimate: false,
      includedInProcurement: false, provenance }, before = JSON.stringify(raw);
    const r = await core(facts(), { [sourceIds[0]!]: raw });
    expect(r.rows[0]).toMatchObject({ unit_price: '77', title_ru: raw.titleRu, quantity: '12.21',
      included_in_estimate: false, included_in_procurement: false });
    expect(r.totals.amount).toBe('0'); expect(JSON.stringify(raw)).toBe(before); expect(r.preliminaryNeeds).toHaveLength(10);
  });
  it('unresolved tasks never inherit whole-source normative arrays or traces', () => {
    const d = definition();
    for (const row of d.resources.slice(7)) expect(row.source_metadata).toMatchObject({
      sourceRole: 'UNRESOLVED_APPLICATION_NORM', normativeTrace: [], normative_source_ids: [], quantityUnitUnconfirmed: true });
    expect(d.resources.slice(0, 7).every(row => Array.isArray(row.source_metadata?.normativeTrace))).toBe(true);
  });
  it('consumption has no purchase ceil stock reserve retail price or machine coverage input', async () => {
    const d = definition(); expect(d.resources.every(row => !row.procurement_eligible)).toBe(true);
    expect(d.resources.some(row => 'purchaseBalanceV1' in row.resource_graph)).toBe(false);
    expect(d.formulas.some(f => /ceil|round_to|unit_convert/.test(f.expression_source ?? ''))).toBe(false);
    for (const id of ['paint_package_kg', 'paint_density_kg_l', 'usable_stock', 'retail_price', 'machine_hour_rate', 'operator_price'])
      await expect(core({ ...facts(), [id]: '1' })).rejects.toThrow('unknown estimate parameters');
  });
  it('does not consume or rewrite historical saved fields as quantity inputs', async () => {
    const saved = { rows: [{ row_id: 'existing-generic-owner', quantity: '9', unit_price: '77' }],
      rowOverrides: { aggregate: { includedInEstimate: false } }, preliminaryNeeds: [{ title_ru: 'existing obligation' }] };
    const before = JSON.stringify(saved);
    await expect(core({ ...facts(), ...saved })).rejects.toThrow('unknown estimate parameters');
    expect(JSON.stringify(saved)).toBe(before);
  });
  it('keeps actual identity and publication unresolved regardless of source arithmetic', async () => {
    expect(await scenario(facts())).toMatchObject({ catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false });
    expect(pack).toMatchObject({ catalogId: null, identityAdmitted: false, machinePriceMappings: [], purchaseOrderOwners: [],
      fullTechnicalAcceptance: false, actualCurrentClassification: null });
    await expect(core({ ...facts(), catalog_id: 'UNPROVEN', source_absent: true })).rejects.toThrow('unknown estimate parameters');
  });
  it('independent fullcycle map resolves seven source rows and all ten documented needs', () => {
    const d = definition(), map = completeness();
    expect(map).toMatchObject({ generatedFromCurrentRows: false, sourceKind: 'NORMATIVE_OPERATION_MAP' });
    expect(map.entries).toHaveLength(17);
    expect(map.entries.filter(entry => entry.quantityRule === 'SOURCE_REQUIRED_NOT_QUANTIFIED')).toHaveLength(10);
    expect(validateIndependentCompletenessMapReferences({ completenessMap: map,
      formulaDefinitions: d.formulas, resourceDefinitions: d.resources })).toEqual([]);
  });
});
