import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMonolithicInternationalBeamR5 as build, internationalBeamGeometryR5 as g,
  internationalBeamParameterR5 as p, internationalBeamRowR5 as r,
  internationalBeamPackR5 as pack, internationalBeamSourceSelectionR5 as selection,
  INTERNATIONAL_BEAM_SELECTOR_R5 as selector,
} from './monolithicInternationalBeamR5';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { resolveCanonicalSourceProfileSelectionV1 } from '../backendPlatform/canonicalSourceProfileSelectionV1';
import { assertCanonicalMachineHourDefinitionV1 as machineDefinition,
  canonicalMachineHourPriceRequirementV1 as machineRequirement,
  canonicalManualMachineHourPriceCoverageV1 as machinePrice,
  parseCanonicalMachineHourPriceCoverageV1 as parseMachinePrice } from '../backendPlatform/canonicalMachineHourPriceCoverageV1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

const definition = build();
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const geometry = (volume = 100): Record<string, string | number> => ({
  [g('volume_m3')]: volume, [g('depth_mm')]: 500, [g('support_height_m')]: 6, [g('work_elevation_m')]: 15,
});
const facts = (): Record<string, unknown> => ({
  [p('project_reference')]: 'TEST_ONLY accepted KJ/PPR; not a real project', [p('shape')]: 'STRAIGHT_HORIZONTAL',
  [p('formwork_method')]: 'INDUSTRIAL_INVENTORY', [p('concrete_feed')]: 'BUCKET',
  [p('project_concrete_specification')]: 'TEST_ONLY actual project mix, not a default concrete class',
  [p('project_steel_kg')]: 2300, [p('machine_cost_mode')]: 'HIRED_FULL_OPERATION',
});
const schema = definition.parameters.map(parameter => ({
  parameterId: parameter.parameter_id, valueType: parameter.value_type, unitId: parameter.unit_id,
  visibilityRole: typeof parameter.truth_metadata.visibility_role === 'string' ? parameter.truth_metadata.visibility_role : null,
  valueSourceRole: typeof parameter.truth_metadata.value_source_role === 'string' ? parameter.truth_metadata.value_source_role : null,
  defaultValue: parameter.default_value, constraints: parameter.constraints_json ?? undefined,
  provenance: record(parameter.truth_metadata.provenance) ? parameter.truth_metadata.provenance : undefined,
}));
const sourceProfile = (input: Record<string, unknown>) => resolveCanonicalSourceProfileSelectionV1({
  sourceProfileSelectionMetadata: selection(), parameterSchema: schema,
  effectiveUserParameters: input, confirmedParameters: {},
});
const compile = (input: Record<string, unknown> = geometry(), confirmed: Record<string, unknown> = facts(),
  rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {}) => compileCanonicalEstimateCore({
  operation: 'recalculate', compilerVersion: pack.contract, catalogId: pack.catalogId,
  primaryMeasureParameterId: g('volume_m3'), parameterDefinitions: [...definition.parameters],
  formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
  submittedParameters: input, confirmedParameters: confirmed,
  sourceProfileSelectionV1: { metadata: selection(), effectiveUserParameters: input },
  rowOverrides, priceItems: [], currencyCode: 'USD', maximumResourceRows: definition.resources.length,
  hashJson: estimateDeterministicHash,
});
const allRows = (result: Awaited<ReturnType<typeof compile>>) => [...result.rows, ...result.preliminaryNeeds];
const fixedExpected: Readonly<Record<string, string>> = {
  workers: '1627', operators: '60.43', 'tower-crane8t-consumed': '50.8', 'truck-crane16t-consumed': '2.89',
  'forklift5t-consumed': '2.4', 'vibrator-consumed': '72.3', 'flatbed8t-consumed': '4.34', 'arc-welder-consumed': '17.25',
  'oil-consumed': '196', 'water-consumed': '0.235', 'electrodes-consumed': '17', 'nails-consumed': '10',
  'wire-consumed': '47', 'bars-consumed': '1.81', 'boards44III-consumed': '0.51', 'deck-consumed': '42.22',
  'concrete-consumed': '101.5',
};

it('pins the whole original19-role column and omits the blank25mm-board cell without importing adjacent rates', () => {
  expect(pack.rows.map(s => s.literalRate).join('|')).toBe('1627|60.43|50.8|2.89|2.4|72.3|4.34|17.25|0.196|0.235|0.017|0.01|0.047|1.81|0.51|42.22|П|101.5|31');
  expect(pack.rows).toHaveLength(19); expect(pack.rows.filter(s => s.category === 'equipment')).toHaveLength(6);
  expect(createHash('sha256').update(readFileSync(resolve(process.cwd(), pack.source.artifactPath))).digest('hex')).toBe(pack.source.sha256);
  expect(definition.resources.some(s => s.source_metadata?.normativeResourceCode === '11.1.03.06-0087')).toBe(false);
  expect(machineRequirement('monolithic-remaining:krer06:r1:beam-109-01:vibrator-own', 'machine_hour')).toBeNull();
});

it('exposes only four measured geometry fields, with no technical defaults or assumed project programme', () => {
  expect(definition.ordinaryParameterIds).toEqual(['volume_m3', 'depth_mm', 'support_height_m', 'work_elevation_m'].map(g));
  expect(definition.parameters.filter(s => s.truth_metadata.visibility_role !== 'INTERNAL_ONLY').map(s => s.parameter_id)).toEqual(definition.ordinaryParameterIds);
  expect(definition.parameters.every(s => s.default_value === null)).toBe(true);
  expect(definition.runtimeInput).toEqual({}); expect(pack.newFull).toBe(0);
});

it('calculates the complete fixed column at100m3 and retains all independent whole-kit needs', async () => {
  const result = await compile(), rows = allRows(result);
  for (const [key, quantity] of Object.entries(fixedExpected)) expect(rows.find(s => s.row_id === r(key))?.quantity).toBe(quantity);
  for (const need of pack.needs) expect(result.preliminaryNeeds.find(s => s.row_id === r('need:' + need.key))?.quantity).toBeNull();
  expect(rows.find(s => s.row_id === r('formMetal'))?.quantity).toBeNull();
  expect(rows.find(s => s.row_id === r('rebar'))?.quantity).toBe('2300');
  expect(rows.filter(s => s.row_id.endsWith('-own'))).toHaveLength(0);
  expect(rows.filter(s => s.row_id.endsWith('-hired'))).toHaveLength(6);
});

it('scales normative work by actual volume while actual steel remains a project mass', async () => {
  const rows = allRows(await compile(geometry(5)));
  expect(rows.find(s => s.row_id === r('workers'))?.quantity).toBe('81.35');
  expect(rows.find(s => s.row_id === r('concrete'))?.quantity).toBe('5.075');
  expect(rows.find(s => s.row_id === r('deck'))?.quantity).toBe('2.111');
  expect(rows.find(s => s.row_id === r('rebar'))?.quantity).toBe('2300');
});

it('keeps geometry-only results preliminary without asserting method, real steel, concrete class or initial kits', async () => {
  const result = await compile(geometry(), {});
  expect(sourceProfile(geometry()).applied).toBe(true);
  expect(result.rows.every(s => !s.included_in_estimate && !s.included_in_procurement)).toBe(true);
  expect(result.preliminaryNeeds.find(s => s.row_id === r('workers'))?.missing_parameter_ids).toEqual(expect.arrayContaining([p('project_reference'), p('formwork_method'), p('concrete_feed')]));
  expect(result.preliminaryNeeds.find(s => s.row_id === r('rebar'))?.quantity).toBeNull();
  expect(result.preliminaryNeeds.length).toBeGreaterThan(pack.needs.length);
});

it('never creates a second steel supply owner or initial formwork order from amortized consumption', async () => {
  const result = await compile(), rows = allRows(result);
  for (const key of ['rebar', 'operators']) {
    expect(definition.resources.find(s => s.row_id === r(key))?.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
    expect(rows.find(s => s.row_id === r(key))?.included_in_estimate).toBe(false);
    expect(rows.find(s => s.row_id === r(key))?.included_in_procurement).toBe(false);
  }
  for (const key of ['deck', 'bars', 'boards44III']) expect(rows.find(s => s.row_id === r(key))?.included_in_procurement).toBe(false);
  expect(definition.resources.find(s => s.row_id === r('concrete'))?.source_metadata?.sourceCodeIsNotAutomaticProjectSku).toBe(true);
});

it('propagates an actual manual consumption to the same supply owner with no second order', async () => {
  const rows = allRows(await compile(geometry(), facts(), { [r('oil-consumed')]: { quantity: '250', provenance: { kind: 'manual', reason: 'TEST_ONLY actual required consumption' } } }));
  expect(rows.find(s => s.row_id === r('oil'))?.quantity).toBe('250');
  expect(rows.filter(s => s.row_id === r('oil'))).toHaveLength(1);
  expect(rows.find(s => s.row_id === r('oil-consumed'))?.included_in_estimate).toBe(false);
});

it('keeps own and hired machine operation exclusive and requires exact full-operation price evidence', async () => {
  const id = r('truck-crane16t-own'), result = await compile(geometry(), { ...facts(), [p('machine_cost_mode')]: 'OWN_OPERATION' }, {
    [id]: { unitPrice: '77', machineHourPriceCoverageV1: machinePrice({ rowId: id, unitPrice: '77', currencyCode: 'USD' }),
      provenance: { kind: 'manual', reason: 'consumer_estimate_row_batch_edit' } },
  });
  expect(allRows(result).filter(s => s.row_id.endsWith('-hired'))).toHaveLength(0);
  expect(allRows(result).filter(s => s.row_id.endsWith('-own'))).toHaveLength(6);
  expect(allRows(result).find(s => s.row_id === id)?.quantity).toBe('2.89');
  expect(allRows(result).find(s => s.row_id === id)?.unit_price).toBe('77');
});

it('binds all12 paid machine identities to the exact international source without weakening old admissions', () => {
  const owners = definition.resources.filter(s => s.unit_id === 'machine_hour' && s.resource_graph.costTreatment === 'OWN_COST');
  expect(owners).toHaveLength(12);
  for (const owner of owners) {
    const input = { catalogId: pack.catalogId, rowId: owner.row_id, unitId: owner.unit_id, sourceMetadata: owner.source_metadata };
    expect(machineDefinition(input)?.operationScope).toBe('FULL_SOURCE_OPERATION');
    for (const patch of [{ exact_column: '06-01-109-01' }, { source_artifact_sha256: '0'.repeat(64) },
      { normativeResourceCode: '02-0075' }, { machinePriceOperationScope: 'BARE_RENT' }])
      expect(() => machineDefinition({ ...input, sourceMetadata: { ...owner.source_metadata, ...patch } })).toThrow('Machine-hour definition identity is not admitted');
    expect(machineDefinition({ ...input, catalogId: 'foreign-catalog' })).toBeNull();
  }
});

it('selects only positive straight-beam geometry within the inclusive500mm/6m/15m source limits', () => {
  expect(sourceProfile(geometry()).applied).toBe(true);
  expect(sourceProfile({ ...geometry(), [g('work_elevation_m')]: 0 }).applied).toBe(true);
  for (const [key, value] of [['volume_m3', 0], ['depth_mm', 0], ['depth_mm', 500.01], ['support_height_m', 6.01], ['work_elevation_m', 15.01], ['work_elevation_m', -1]] as const)
    expect(sourceProfile({ ...geometry(), [g(key)]: value }).applied).toBe(false);
  const missing = geometry(); delete missing[g('depth_mm')]; expect(sourceProfile(missing).applied).toBe(false);
});

it('rejects technical selector and programme spoofing from ordinary input', async () => {
  await expect(compile({ ...geometry(), [selector]: pack.choiceRu })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
  await expect(compile({ ...geometry(), [p('formwork_method')]: 'INDUSTRIAL_INVENTORY' })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
});

it('accepts the six registered international machine code formats without admitting arbitrary dotted codes or bare rental evidence', () => {
  const evidence = machinePrice({ rowId: r('truck-crane16t-own'), unitPrice: '77', currencyCode: 'USD' });
  expect(parseMachinePrice(evidence)).toEqual(evidence);
  for (const patch of [{ resourceCode: '91.05.05-999' }, { resourceCode: '91.05.05.015' },
    { operationScope: 'BARE_RENT' }, { minimumBillableHours: '8' }, { fixedFees: '1' }, { billingBasis: 'SHIFT' }])
    expect(parseMachinePrice({ ...evidence, ...patch })).toBeNull();
});

it('retains unknown P and whole-kit needs when null is absent, rejects invented zero/one norms in either lane', async () => {
  const id = p('unresolved_formMetal');
  const rows = allRows(await compile(geometry(), { ...facts(), [id]: null }));
  expect(rows.find(s => s.row_id === r('formMetal'))?.quantity).toBeNull();
  for (const value of [0, 1]) {
    await expect(compile({ ...geometry(), [id]: value })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
    await expect(compile(geometry(), { ...facts(), [id]: value })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
  }
});
