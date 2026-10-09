import { compileCandidate, parameterDefinitions, resourceDefinitions, sourcePack } from '../../src/lib/estimate/v4/roofLanternCfp100100LimitedS2748';
import { buildMasterParameterCalculationConsumers } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import { formulaDefinitions } from '../../src/lib/estimate/v4/roofLanternCfp100100LimitedS2748';

const selected = { lantern_count: 10, lantern_model: sourcePack.model };
const inventory = { base_stock_units: 2, base_reserve_units: 1, dome_stock_units: 3, dome_reserve_units: 2 };
const row = (id: string) => `roof-cfp100100:${id}`;

describe('exact lantern composition through the common compiler', () => {
  it('keeps a count-only request preliminary without selecting a product or facade facts', async () => {
    const result = await compileCandidate({ lantern_count: 10 });
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(resourceDefinitions.length);
    expect(result.parameters.floors).toBeUndefined();
    expect(result.parameters.glazing_area_m2).toBeUndefined();
    expect(parameterDefinitions.every(p => p.default_value === null)).toBe(true);
  });
  it('preserves ten known bases and domes when inventory and exact order are unknown', async () => {
    const result = await compileCandidate(selected);
    for (const id of ['base', 'dome']) {
      const need = result.preliminaryNeeds.find(r => r.row_id === row(id))!;
      expect(need.quantity).toBeNull();
      expect((need.calculation_trace.purchaseRequirementV1 as { consumed: string }).consumed).toBe('10');
    }
    expect(result.rows.find(r => r.row_id === row('daylight'))?.quantity).toBe('7');
    expect(result.rows.find(r => r.row_id === row('product-net-mass'))?.quantity).toBe('532.54');
    expect(result.rows.find(r => r.row_id === row('opening-width'))?.quantity).toBe('1000');
  });
  it('calculates independent inventory balances and never buys included glazing or dome fastenings twice', async () => {
    const result = await compileCandidate({ ...selected, ...inventory });
    expect(result.rows.filter(r => r.included_in_procurement).map(r => [r.row_id, r.quantity])).toEqual([
      [row('base'), '9'], [row('dome'), '9'],
    ]);
    for (const [included, owner] of [['included-glazing', 'base'], ['included-dome-fastening', 'dome']]) {
      const definition = resourceDefinitions.find(r => r.row_id === row(included))!;
      expect(definition.resource_graph.costTreatment).toBe('INCLUDED_IN_RESOURCE_ROWS');
      expect(definition.resource_graph.purchaseBalanceOwnerRowId).toBe(row(owner));
      expect(result.rows.find(r => r.row_id === row(included))?.included_in_procurement).toBe(false);
    }
  });
  it('retains manual surplus and exposes an insufficient manual order without silently replacing either', async () => {
    for (const quantity of ['11', '7']) {
      const result = await compileCandidate({ ...selected, ...inventory }, {
        [row('base')]: { quantity, provenance: { kind: 'manual', reason: 'VALIDATION_FIXTURE: explicit base order' } },
      });
      const base = result.rows.find(r => r.row_id === row('base'))!;
      expect(base.quantity).toBe(quantity);
      const balance = base.calculation_trace.purchaseBalance as Record<string, unknown>;
      if (quantity === '11') { expect(balance.remaining).toBe('3'); expect(balance.freeBeyondReserve).toBe('2'); }
      else { expect(balance.consumptionShortage).toBe('1'); expect(balance.procurementReady).toBe(false); }
    }
  });
  it('leaves all installation and completion quantities unknown and owned by the application', async () => {
    const result = await compileCandidate({ ...selected, ...inventory });
    expect(result.preliminaryNeeds).toHaveLength(13);
    for (const id of Object.keys(sourcePack.unresolvedApplicationParameters)) {
      expect(result.preliminaryNeeds.some(r => r.quantity === null && r.missing_parameter_ids.includes(id))).toBe(true);
      const parameter = parameterDefinitions.find(p => p.parameter_id === id)!;
      expect(parameter.truth_metadata).toMatchObject({ visibility_role: 'INTERNAL_ONLY',
        value_source_role: 'UNRESOLVED_APPLICATION_NORM', provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' } });
    }
    expect(result.rows.every(r => r.unit_price === null)).toBe(true);
    const { resourceConsumers } = buildMasterParameterCalculationConsumers({ parameters: parameterDefinitions,
      formulas: formulaDefinitions, resources: resourceDefinitions });
    expect(parameterDefinitions.filter(p => resourceConsumers[p.parameter_id].length === 0)).toEqual([]);
  });
  it('rejects unknown products and non-integer counts or inventories', async () => {
    await expect(compileCandidate({ ...selected, lantern_model: 'UNLISTED_MODEL' })).rejects.toThrow();
    for (const lantern_count of [0, 10.5]) await expect(compileCandidate({ ...selected, lantern_count })).rejects.toThrow();
    await expect(compileCandidate({ ...selected, ...inventory, base_stock_units: 0.5 })).rejects.toThrow();
  });
});
