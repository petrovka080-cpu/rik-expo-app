import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildMonolithicInternationalStairLandingR53 as build, landingParameterR53 as p,
  landingRowR53 as r, internationalStairLandingPackR53 as pack } from './monolithicInternationalStairLandingR53';
import { compileCanonicalEstimateCore } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

const definition = build();
// Independent examples: 2.5m * 1.2m * 200mm * 2 = 1.2m3; one landing = 0.6m3.
// These are test geometry, with no real PPR, steel, concrete or machine facts.
const geometry = (count: number) => Object.fromEntries(Object.entries({
  length_m: '2.5', width_m: '1.2', thickness_mm: '200', identical_count: count, work_elevation_m: '3',
}).map(([key, value]) => [p(key), value]));
const compile = (count: number) => compileCanonicalEstimateCore({
  operation: 'recalculate', compilerVersion: pack.contract, catalogId: pack.catalogId,
  primaryMeasureParameterId: p('volume_m3'), parameterDefinitions: [...definition.parameters],
  formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
  submittedParameters: geometry(count), confirmedParameters: {}, rowOverrides: {},
  priceItems: [], currencyCode: 'USD', maximumResourceRows: definition.resources.length,
  hashJson: estimateDeterministicHash,
});

it('retains the exact whole landing column, five measured fields, project steel and unresolved physical-kit boundaries', () => {
  expect(pack.rows.map(row => row.literalRate).join('|')).toBe('3050.65|235.96|234.43|1.53|94.3|5.95|0.03|0.3|0.44|0.0275|500|0.02|0.0132|1|138|300|П|101.5|17.75|0.75');
  expect(createHash('sha256').update(readFileSync(pack.source.path)).digest('hex')).toBe(pack.source.sha256);
  expect(pack.rows).toHaveLength(20); expect(pack.operations).toHaveLength(7);
  expect(definition.ordinaryParameterIds).toEqual(['length_m', 'width_m', 'thickness_mm', 'identical_count', 'work_elevation_m'].map(p));
  expect(definition.parameters.filter(parameter => parameter.truth_metadata.visibility_role !== 'INTERNAL_ONLY').map(parameter => parameter.parameter_id)).toEqual(definition.ordinaryParameterIds);
  expect(definition.parameters.every(parameter => parameter.default_value === null)).toBe(true);
  expect(definition.parameters.find(parameter => parameter.parameter_id === p('volume_m3'))?.truth_metadata.value_source_role).toBe('COMPILER_DERIVED_RESOURCE_QUANTITY');
  for (const key of ['operators', 'reinforcing-steel-a1', 'reinforcing-steel-a3', 'metal-formwork-amortization']) {
    const row = definition.resources.find(row => row.row_id === r(key));
    expect(row?.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
    expect(row?.procurement_eligible).toBe(false);
  }
  expect(definition.runtimeInput).toEqual({}); expect(pack.newPublicCards).toBe(0); expect(pack.newFull).toBe(0);
});

it('derives volume and exact source quantities for two landings while actual project and whole-kit gaps remain preliminary', async () => {
  const result = await compile(2), rows = [...result.rows, ...result.preliminaryNeeds];
  const expected = { 'net-volume': '1.2', workers: '36.6078', operators: '2.83152',
    'tower-crane-10t-consumed': '2.81316', 'loader-5t-consumed': '0.01836', 'deep-vibrator-consumed': '1.1316',
    'gas-welding-cutting-consumed': '0.0714', 'refractory-grease-consumed': '0.36', 'propane-butane-consumed': '0.0036',
    'water-consumed': '0.00528', 'electrodes-e42-4mm-consumed': '0.33', 'sheet-polyethylene-consumed': '6',
    'rod-6_3-6_5mm-consumed': '0.24', 'rebar-wire-bp1-4mm-consumed': '0.1584', 'timber-bars-consumed': '0.012',
    'pvc-tube-25mm-consumed': '1.656', 'surfactant-additive-consumed': '3.6', 'heavy-concrete-consumed': '1.218' };
  for (const [key, quantity] of Object.entries(expected)) expect(rows.find(row => row.row_id === r(key))?.quantity).toBe(quantity);
  for (const key of ['reinforcing-steel-a1', 'reinforcing-steel-a3', 'metal-formwork-amortization', ...pack.needs.map(need => 'need:' + need.key)])
    expect(result.preliminaryNeeds.find(row => row.row_id === r(key))?.quantity).toBeNull();
  expect(result.rows.every(row => !row.included_in_procurement)).toBe(true);
});

it('changes only the identical landing count and halves geometric source quantities without inventing project steel or equipment supply', async () => {
  const result = await compile(1), rows = [...result.rows, ...result.preliminaryNeeds];
  expect(rows.find(row => row.row_id === r('net-volume'))?.quantity).toBe('0.6');
  expect(rows.find(row => row.row_id === r('workers'))?.quantity).toBe('18.3039');
  expect(rows.find(row => row.row_id === r('heavy-concrete-consumed'))?.quantity).toBe('0.609');
  expect(rows.find(row => row.row_id === r('sheet-polyethylene-consumed'))?.quantity).toBe('3');
  expect(rows.find(row => row.row_id === r('reinforcing-steel-a1'))?.quantity).toBeNull();
  expect(rows.find(row => row.row_id === r('reinforcing-steel-a3'))?.quantity).toBeNull();
  expect(result.rows.every(row => !row.included_in_procurement)).toBe(true);
});
