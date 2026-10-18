import { roadMarking01601QuantityDefinitionR1 as definition,
  compileRoadMarking01601QuantityScenarioR1 as scenario, roadMarking01601ScenarioFactsR1 as facts,
  roadMarking01601QuantityPackR1 as pack, roadMarking01601PrefixR1 as prefix,
  roadMarking01601PrimaryR1 as primary, roadMarking01601FactIdsR1 as factIds,
  roadMarking01601NeedRowIdsR1 as needIds, roadMarking01601NeedParameterIdsR1 as needParameters,
  roadMarking01601IndependentCompletenessMapR1 as completeness,
} from './roadMarkingContinuous100Pf133QuantityR1';
import { validateIndependentCompletenessMapReferences } from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const sourceIds = pack.rows.map(row => prefix + ':' + row.suffix);
const infoSuffixes = pack.rows.slice(1).map(row => row.suffix);
const provenance = { kind: 'manual', reason: 'TEST_ONLY source-control value; not an actual supplier price' };
const core = async (input: Record<string, unknown>, overrides: Parameters<typeof scenario>[1] = {}, prices: Parameters<typeof scenario>[2] = []) =>
  (await scenario(input, overrides, prices)).compiled;

describe('WORK catalogue-null road01601 source quantity consumer;51 prospective scenarios NOT RUN by author', () => {
  it('has six literal resources and ten unitless unresolved obligations without defaults', () => {
    const d = definition();
    expect(d).toMatchObject({ catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false, runtimeInput: {} });
    expect(d.parameters).toHaveLength(17); expect(d.formulas).toHaveLength(16); expect(d.resources).toHaveLength(16);
    expect(d.parameters.map(p => p.ordinal)).toEqual(Array.from({ length: 17 }, (_, i) => i));
    expect(d.resources.map(r => r.ordinal)).toEqual(Array.from({ length: 16 }, (_, i) => i));
    expect(d.parameters.every(p => p.default_value === null)).toBe(true);
    expect(d.resources.slice(6).map(r => r.unit_id)).toEqual(Array(10).fill(''));
    expect(d.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id))
      .toEqual([prefix + ':whole-marking-labor']);
  });
  it.each([
    ['0.1', ['0.366', '0.204', '0.101', '0.103', '0.0042', '0.00008']],
    ['1', ['3.66', '2.04', '1.01', '1.03', '0.042', '0.0008']],
    ['1.25', ['4.575', '2.55', '1.2625', '1.2875', '0.0525', '0.001']],
  ])('compiles exact literal km quantities %s without closing ten missing tasks', async (km, expected) => {
    const r = await core(facts(km as string));
    expect(r.rows.map(row => row.row_id)).toEqual(sourceIds); expect(r.rows.map(row => row.quantity)).toEqual(expected);
    expect(r.preliminaryNeeds.map(need => need.row_id).sort()).toEqual([...needIds].sort());
    expect(r.preliminaryNeeds.every(need => need.quantity === null && need.unit_price === null && !need.selected && !need.procurement_eligible)).toBe(true);
    expect(r.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([sourceIds[0]]);
    expect(r.rows.every(row => row.unit_price === null && !row.included_in_procurement)).toBe(true);
  });
  it('zero physical scope invents neither a project default nor a quantity for an open task', async () => {
    const r = await core({ [primary]: '0' });
    expect(r.rows).toHaveLength(6); expect(r.rows.every(row => row.quantity === '0')).toBe(true);
    expect(r.preliminaryNeeds).toEqual([]); expect(definition().runtimeInput).toEqual({});
  });
  it('missing actual line km is a need and negative length is rejected', async () => {
    const input = facts(); delete input[primary]; const r = await core(input);
    expect(r.rows).toEqual([]); expect(r.preliminaryNeeds.some(need => need.missing_parameter_ids.includes(primary))).toBe(true);
    expect(definition().parameters.find(p => p.parameter_id === primary)).toMatchObject({ unit_id: 'km', default_value: null });
    await expect(core(facts('-1'))).rejects.toThrow('below minimum');
  });
  it('does not accept area, road centreline, q or a silently converted m parameter', async () => {
    for (const alias of ['q', 'marking_area_m2', 'road_centerline_km', 'actual_continuous_marking_length_m']) {
      await expect(core({ ...facts(), [alias]: '100' })).rejects.toThrow('unknown estimate parameters');
    }
  });
  it.each(['99', '200', '400'])('rejects width %s rather than using neighbouring columns or scaling', async width => {
    await expect(core({ ...facts(), marking_line_width_mm: width })).rejects.toThrow();
  });
  it.each([
    ['marking_line_type', 'BROKEN_1_1'], ['marking_line_type', 'ARROW'],
    ['marking_paint_system', 'WHITE_REFLECTIVE'], ['marking_paint_system', 'THERMOPLASTIC'],
    ['marking_paint_system', 'PF133_WHITE'],
  ])('rejects unsupported literal scope %s=%s', async (key, value) => {
    await expect(core({ ...facts(), [key]: value })).rejects.toThrow('invalid enum');
  });
  it.each([...factIds])('requires positive-scope project fact %s at the actual resource dependency', async id => {
    const input = facts(); delete input[id]; const r = await core(input);
    expect(r.rows).toEqual([]);
    expect(r.preliminaryNeeds.filter(need => sourceIds.includes(need.row_id))).toHaveLength(6);
    expect(r.preliminaryNeeds.filter(need => sourceIds.includes(need.row_id)).every(need => need.missing_parameter_ids.includes(id))).toBe(true);
    expect(definition().parameters.find(p => p.parameter_id === id)).toMatchObject({ default_value: null,
      constraints_json: { requiredWhen: { kind: 'greater_than', parameterId: primary, value: 0 } } });
  });
  it('keeps cord code null while literal consumption remains calculated', async () => {
    const d = definition(), r = await core(facts());
    expect(d.resources.find(row => row.row_id.endsWith(':layout-cord-consumed'))?.source_metadata)
      .toMatchObject({ resource_code: null, printed_resource_name_ru: 'Шнур полиэтиленовый крученый, диаметром 2 мм', purchase_order_admission: false });
    expect(r.rows.find(row => row.row_id.endsWith(':layout-cord-consumed'))).toMatchObject({ quantity: '0.0008', unit_id: 't', included_in_estimate: false, included_in_procurement: false });
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
  it('prices one whole labour owner without monetising operator or two machines', async () => {
    const r = await core(facts(), { [sourceIds[0]!]: { unitPrice: '100', provenance } });
    expect(r.totals.amount).toBe('366');
    expect(r.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([sourceIds[0]]);
    expect(r.rows.slice(1).every(row => !row.included_in_estimate && !row.included_in_procurement)).toBe(true);
  });
  it('recalculate preserves same-owner manual price title and exclusions', async () => {
    const raw = { unitPrice: '77', titleRu: 'TEST_ONLY preserved whole labour title', includedInEstimate: false,
      includedInProcurement: false, provenance }, before = JSON.stringify(raw);
    const r = await core(facts(), { [sourceIds[0]!]: raw });
    expect(r.rows[0]).toMatchObject({ unit_price: '77', title_ru: raw.titleRu, quantity: '3.66',
      included_in_estimate: false, included_in_procurement: false });
    expect(r.totals.amount).toBe('0'); expect(JSON.stringify(raw)).toBe(before); expect(r.preliminaryNeeds).toHaveLength(10);
  });
  it('unresolved tasks never inherit whole-source normative arrays or traces', () => {
    const d = definition();
    for (const row of d.resources.slice(6)) expect(row.source_metadata).toMatchObject({
      sourceRole: 'UNRESOLVED_APPLICATION_NORM', normativeTrace: [], normative_source_ids: [], quantityUnitUnconfirmed: true });
    expect(d.resources.slice(0, 6).every(row => Array.isArray(row.source_metadata?.normativeTrace))).toBe(true);
  });
  it('consumption has no purchase ceil stock reserve retail price or machine coverage input', async () => {
    const d = definition(); expect(d.resources.every(row => !row.procurement_eligible)).toBe(true);
    expect(d.resources.some(row => 'purchaseBalanceV1' in row.resource_graph)).toBe(false);
    expect(d.formulas.some(f => /ceil|round_to|unit_convert/.test(f.expression_source ?? ''))).toBe(false);
    for (const id of ['paint_package_kg', 'cord_spool_count', 'usable_stock', 'retail_price', 'machine_hour_rate', 'operator_price'])
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
  it('independent fullcycle map resolves six source rows and all ten documented needs', () => {
    const d = definition(), map = completeness();
    expect(map).toMatchObject({ generatedFromCurrentRows: false, sourceKind: 'NORMATIVE_OPERATION_MAP' });
    expect(map.entries).toHaveLength(16);
    expect(map.entries.filter(entry => entry.quantityRule === 'SOURCE_REQUIRED_NOT_QUANTIFIED')).toHaveLength(10);
    expect(validateIndependentCompletenessMapReferences({ completenessMap: map,
      formulaDefinitions: d.formulas, resourceDefinitions: d.resources })).toEqual([]);
  });
});
