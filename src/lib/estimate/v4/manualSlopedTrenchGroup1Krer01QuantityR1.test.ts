import { manualTrench05701QuantityDefinitionR1 as definition, compileManualTrench05701QuantityScenarioR1 as scenario,
  manualTrench05701ScenarioFactsR1 as facts, manualTrench05701QuantityPackR1 as pack,
  manualTrench05701PrefixR1 as prefix, manualTrench05701PrimaryR1 as primary,
  manualTrench05701FactIdsR1 as factIds, manualTrench05701NeedRowIdsR1 as needIds,
  manualTrench05701NeedParameterIdsR1 as needParameters,
  manualTrench05701IndependentCompletenessMapR1 as completeness,
} from './manualSlopedTrenchGroup1Krer01QuantityR1';
import { validateIndependentCompletenessMapReferences } from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const owner = prefix + ':whole-manual-excavation-labor';
const provenance = { kind: 'manual', reason: 'TEST_ONLY CONTROL77; not an actual contractor or supplier price' };
const core = async (input: Record<string, unknown>, overrides: Parameters<typeof scenario>[1] = {}) => (await scenario(input, overrides)).compiled;

describe('WORK catalogue-null manual trench05701 source quantity; author NOT_RUN', () => {
  it('has one whole labour owner, nine unitless unresolved needs and unique18 parameter ordinals', () => {
    const d = definition();
    expect(d).toMatchObject({ catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false, runtimeInput: {} });
    expect(d.parameters).toHaveLength(18); expect(d.formulas).toHaveLength(10); expect(d.resources).toHaveLength(10);
    expect(d.parameters.map(p => p.ordinal)).toEqual(Array.from({ length: 18 }, (_, i) => i));
    expect(d.resources.map(r => r.ordinal)).toEqual(Array.from({ length: 10 }, (_, i) => i));
    expect(d.parameters.every(p => p.default_value === null)).toBe(true);
    expect(d.resources.slice(1).map(r => r.unit_id)).toEqual(Array(9).fill(''));
    expect(d.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id)).toEqual([owner]);
  });
  it.each([['100','118'],['12.5','14.75'],['1','1.18'],['0.001','0.00118']])('uses exact100m3 denominator for %s bankm3', async (volume, hours) => {
    const r = await core(facts(volume));
    expect(r.rows).toHaveLength(1); expect(r.rows[0]).toMatchObject({ row_id: owner, quantity: hours, unit_id: 'man_hour', unit_price: null, included_in_estimate: true, included_in_procurement: false });
    expect(r.preliminaryNeeds.map(n => n.row_id).sort()).toEqual([...needIds].sort());
    expect(r.preliminaryNeeds.every(n => n.quantity === null && n.unit_price === null && !n.selected && !n.procurement_eligible)).toBe(true);
  });
  it('zero scope needs no invented project defaults and zeroes only labour', async () => {
    const r = await core({ [primary]: '0' });
    expect(r.rows).toHaveLength(1); expect(r.rows[0].quantity).toBe('0'); expect(r.preliminaryNeeds).toEqual([]);
  });
  it('missing bankvolume stays a need and negative volume is rejected', async () => {
    const input = facts(); delete input[primary]; const r = await core(input);
    expect(r.rows).toEqual([]); expect(r.preliminaryNeeds.some(n => n.missing_parameter_ids.includes(primary))).toBe(true);
    await expect(core(facts('-1'))).rejects.toThrow('below minimum');
  });
  it.each(['q','length_m','trench_width_m','loose_volume_m3','excavator_shift_count'])('rejects unproved conversion or machine input %s', async key => {
    await expect(core({ ...facts(), [key]: '100' })).rejects.toThrow('unknown estimate parameters');
  });
  it.each(['0','-1','2.001'])('rejects full depth %s outside exactpositive2m scope', async depth => {
    await expect(core({ ...facts(), manual_trench_maximum_depth_m: depth })).rejects.toThrow();
  });
  it('accepts depth exactly2m without extrapolating the volume', async () => {
    const r = await core({ ...facts('1'), manual_trench_maximum_depth_m: '2' });
    expect(r.rows[0].quantity).toBe('1.18');
  });
  it.each([...factIds])('keeps labour blocked when positive-scope fact %s is missing', async id => {
    const input = facts(); delete input[id]; const r = await core(input);
    expect(r.rows).toEqual([]);
    expect(r.preliminaryNeeds.find(n => n.row_id === owner)?.missing_parameter_ids).toContain(id);
    expect(definition().parameters.find(p => p.parameter_id === id)).toMatchObject({ default_value: null,
      constraints_json: { requiredWhen: { kind: 'greater_than', parameterId: primary, value: 0 } } });
  });
  it.each([['manual_trench_soil_group','GROUP_2'],['manual_trench_soil_state','WET'],['manual_trench_soil_state','FROZEN'],
    ['manual_trench_support_scope','SHORED'],['manual_trench_layer_scope','MIXED_LAYERS']])('rejects unsupported physicalscope %s=%s', async (key, value) => {
    await expect(core({ ...facts(), [key]: value })).rejects.toThrow('invalid enum');
  });
  it('cannot override derived wholelabour even with equal manualquantity', async () => {
    for (const quantity of ['118','1']) await expect(core(facts(), { [owner]: { quantity, provenance } })).rejects.toMatchObject({ code: 'ROW_AMENDMENT_INVALID' });
  });
  it.each(needIds)('cannot quantify or erase unresolved %s using manual0or1', async id => {
    for (const quantity of ['0','1']) await expect(core(facts(), { [id]: { quantity, unitPrice: '77', provenance } })).rejects.toMatchObject({ code: 'ROW_AMENDMENT_INVALID' });
  });
  it('unresolved parameters remain INTERNAL_ONLY without unit/default/source and refuse submitted0or1', async () => {
    for (const id of needParameters) {
      for (const value of ['0','1']) await expect(core({ ...facts(), [id]: value })).rejects.toThrow('unresolved application norm cannot be supplied');
      expect(definition().parameters.find(p => p.parameter_id === id)).toMatchObject({ unit_id: null, default_value: null,
        truth_metadata: { visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM' } });
    }
    expect(definition().resources.slice(1).every(r => JSON.stringify(r.source_metadata?.normativeTrace) === '[]' && JSON.stringify(r.source_metadata?.normative_source_ids) === '[]')).toBe(true);
  });
  it('recalculate preserves manualtitle CONTROL77 price and explicit exclusion without closing needs', async () => {
    const raw = { unitPrice: '77', titleRu: 'TEST_ONLY preserved manual title', includedInEstimate: false, includedInProcurement: false, provenance };
    const before = JSON.stringify(raw), r = await core(facts('12.5'), { [owner]: raw });
    expect(r.rows[0]).toMatchObject({ title_ru: raw.titleRu, quantity: '14.75', unit_price: '77', included_in_estimate: false, included_in_procurement: false });
    expect(r.totals.amount).toBe('0'); expect(r.preliminaryNeeds).toHaveLength(9); expect(JSON.stringify(raw)).toBe(before);
  });
  it('prices only one wholelabour owner for CONTROL77 without splitting cleaning or throwback', async () => {
    const r = await core(facts('12.5'), { [owner]: { unitPrice: '77', provenance } });
    expect(r.totals.amount).toBe('1135.75'); expect(r.rows.filter(x => x.included_in_estimate).map(x => x.row_id)).toEqual([owner]);
    expect(r.rows.every(x => !x.included_in_procurement)).toBe(true);
  });
  it('does not invent paidmaterials machines tools packages or bank-to-loose factors', () => {
    const d = definition();
    expect(d.resources[0].category).toBe('labor'); expect(d.resources.every(r => !r.procurement_eligible)).toBe(true);
    expect(d.formulas.some(f => /ceil|round_to|unit_convert/.test(f.expression_source ?? ''))).toBe(false);
    expect(pack.machinePriceMappings).toEqual([]); expect(pack.purchaseOrderOwners).toEqual([]);
    expect(d.resources.some(r => r.resource_graph.purchaseBalanceV1)).toBe(false);
  });
  it('retains all three literal included operations under exactlytheone labour owner', () => {
    const d = definition(), row = d.resources[0];
    expect(row.source_metadata).toMatchObject({ resource_code: '000-1002-0', printed_resource_name_ru: 'Рабочие-строители среднего разряда 2,0' });
    const operations = row.source_metadata?.included_operations as Array<{ paymentOwnerRowId: string; operationId: string }>;
    expect(operations).toHaveLength(3); expect(operations.every(op => op.paymentOwnerRowId === owner)).toBe(true);
    expect(operations.map(op => op.operationId)).toEqual(pack.includedOperations.map(op => op.id));
  });
  it('fullcycle map resolves one exactnorm and all nine specificneeds without claimingcomplete', () => {
    const d = definition(), map = completeness(); expect(map.entries).toHaveLength(10);
    expect(pack.fullCycle).toHaveLength(8); expect(pack.openNeeds.every(n => n.missingFact && n.nextTask && n.owner)).toBe(true);
    expect(validateIndependentCompletenessMapReferences({ completenessMap: map, formulaDefinitions: d.formulas, resourceDefinitions: d.resources })).toEqual([]);
    expect(pack).toMatchObject({ fullTechnicalAcceptance: false, identityAdmitted: false, actualCurrentClassification: null });
  });
  it('catalogueidentity and publication remain unadmitted even after successful arithmetic', async () => {
    expect(await scenario(facts())).toMatchObject({ catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false });
    await expect(core({ ...facts(), catalog_id: 'UNPROVEN', source_absent: true })).rejects.toThrow('unknown estimate parameters');
  });
});
