import { fusionBenchDefinitionS2758, fusionBenchPackS2758 as pack, fusionBenchPrefixS2758 as prefix } from '../../src/lib/estimate/v4/fusionBenchPreparedConcreteS2758';
import { fusionBenchControlS2758 } from '../../scripts/estimate/r4a13/preflightS2758FusionBench';
import { compileCanonicalEstimateCore } from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../../src/lib/estimate/estimateDeterministicHash';

function compile(separate: boolean, key?: string, quantity?: string | null, count = 3) {
  const definition = fusionBenchDefinitionS2758();
  return compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: pack.contract, catalogId: pack.catalogId,
    primaryMeasureParameterId: 'bench_count', parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas],
    resourceDefinitions: [...definition.resources], submittedParameters: fusionBenchControlS2758(count, separate), confirmedParameters: {},
    currencyCode: 'KGS', priceItems: [], maximumResourceRows: 13, hashJson: async value => estimateDeterministicHash(value),
    ...(key ? { rowOverrides: { [prefix + ':' + key]: { quantity: quantity!, provenance: { kind: 'manual' as const, reason: 'CONTROL_ONLY quantity guard' } } } } : {}),
  });
}

describe('Fusion physical quantities follow installed N and four fixings per bench', () => {
  test.each([
    [false, 'bench-consumed', '7'], [true, 'bench-consumed', '7'],
    [false, 'fixing-included', '20'], [true, 'fixing-included', '20'],
    [false, 'fixing-consumed-separate', '20'], [true, 'fixing-consumed-separate', '20'],
    [false, 'bench-consumed', '3'], [false, 'fixing-included', '12'], [true, 'fixing-consumed-separate', '12'],
    [false, 'bench-consumed', '0'], [false, 'fixing-included', '0'], [true, 'fixing-consumed-separate', '0'],
  ] as const)('saves explicit %s / %s quantity %s with its automatic baseline and original cost ownership', async (separate, key, quantity) => {
    const baseline=await compile(separate),result=await compile(separate,key,quantity);
    const original=baseline.rows.find(row=>row.row_id===prefix+':'+key);
    const row=result.rows.find(row=>row.row_id===prefix+':'+key);
    if(!original){expect(row).toBeUndefined();return;}
    expect(row).toMatchObject({quantity,included_in_estimate:original.included_in_estimate,
      included_in_procurement:original.included_in_procurement,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:original.quantity}});
    expect(result.parameters.bench_count).toBe(3);
  });

  test.each([[false, 'bench-consumed', '3'], [false, 'fixing-included', '12'], [true, 'fixing-consumed-separate', '12']] as const)(
    'accepts an explicit null clear on %s / %s and restores source quantity %s', async (separate, key, expected) => {
      const result = await compile(separate, key, null);
      expect(result.rows.find(row => row.row_id === prefix + ':' + key)?.quantity).toBe(expected);
      expect(result.preliminaryNeeds).toHaveLength(8);
    });

  test.each([[false, 'bench-order', '7'], [true, 'fixing-order', '20']] as const)(
    'retains paid-order editing for %s / %s without changing installed quantities', async (separate, key, quantity) => {
      const result = await compile(separate, key, quantity);
      expect(result.rows.find(row => row.row_id === prefix + ':' + key)?.quantity).toBe(quantity);
      expect(result.rows.find(row => row.row_id === prefix + ':bench-consumed')?.quantity).toBe('3');
      expect(result.rows.find(row => row.row_id === prefix + ':' + (separate ? 'fixing-consumed-separate' : 'fixing-included'))?.quantity).toBe('12');
    });

  test.each([false, true])('changes physical and paid default quantities through bench_count (separate=%s)', async separate => {
    const result = await compile(separate, undefined, undefined, 4);
    expect(result.rows.find(row => row.row_id === prefix + ':bench-consumed')?.quantity).toBe('4');
    expect(result.rows.find(row => row.row_id === prefix + ':bench-order')?.quantity).toBe('4');
    expect(result.rows.find(row => row.row_id === prefix + ':' + (separate ? 'fixing-consumed-separate' : 'fixing-included'))?.quantity).toBe('16');
    expect(result.preliminaryNeeds).toHaveLength(8);
    expect(result.rows.filter(row => row.included_in_procurement)).toHaveLength(separate ? 2 : 1);
  });

  test('declares the existing validated policy only for the three physical rows', () => {
    const definition = fusionBenchDefinitionS2758();
    const guarded = definition.resources.filter(row => row.resource_graph.derivedQuantityEditPolicyV1 !== undefined);
    expect(guarded.map(row => row.row_id).sort()).toEqual(['bench-consumed', 'fixing-included', 'fixing-consumed-separate'].map(key => prefix + ':' + key).sort());
    for (const row of guarded) expect(row.resource_graph.derivedQuantityEditPolicyV1).toMatchObject({
      contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY', unitId: 'pcs', parameterIds: ['bench_count'],
    });
    expect(definition.resources).toHaveLength(13);
  });
});
