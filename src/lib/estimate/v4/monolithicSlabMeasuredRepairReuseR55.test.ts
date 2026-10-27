import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { appendMonolithicSlabMeasuredRepairReuseR55 as append, SLAB_REPAIR_CATALOG_R55 as catalogId,
  SLAB_REPAIR_METHOD_R55 as method, SLAB_REPAIR_CHOICE_R55 as choice } from './monolithicSlabMeasuredRepairReuseR55';
import { buildMonolithicRepairHandSourceCandidateR3 as repair, repairParameterR3 as p,
  repairRowR3 as r, repairSourcePackR3 as pack } from './monolithicStrengthRepairR3';
import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { compileAutomaticConstructionOwnerR1 } from './automaticConstructionOwnerR1';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';
import { resolveInclusionGraph } from '../backendPlatform/inclusionGraph';
import { canonicalEstimateOperationReferences } from '../backendPlatform/canonicalEstimateOperationComposition';
import type { MasterRetainedParentCaptureR1 } from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';

const path = resolve(__dirname, '../../../../data/estimate-benchmarks/fixtures/monolithic-slab-measured-repair-current-parent-r55.json');
const bytes = readFileSync(path);
if (createHash('sha256').update(bytes).digest('hex') !== '77cdd13c0944c9fbd1eb29b729b512e272ba9424ab892f49bec3b728952f6392') {
  throw Error('R55_EXACT_CURRENT_CAPTURE_REQUIRED');
}
type Capture = Omit<MasterRetainedParentCaptureR1, 'parameters' | 'formulas' | 'resources'>
  & Pick<AutomaticOwnerDefinition, 'parameters' | 'formulas' | 'resources'>;
const record: { capture: Capture } = JSON.parse(bytes.toString('utf8'));
const c = record.capture;
const parent: AutomaticOwnerDefinition = { parameters: c.parameters, formulas: c.formulas, resources: c.resources,
  runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {},
  ordinaryParameterIds: c.parameters.filter(item => item.truth_metadata.visibility_role === 'USER_INPUT').map(item => item.parameter_id) };
const definition = append({ catalogId, parent, expectedParentFingerprint: hash(parent) });
const publicIds = new Set(definition.ordinaryParameterIds);
const base = { m212_family_b_plain15_net_concrete_volume_m3: 2, m212_family_b_plain15_work_elevation_m: 2 };
const programme = {
  m212_foundation_cycle_profile: 'Монолитная бетонная фундаментная плита без армирования',
  [method]: choice,
  [p('geometry_ref')]: 'TEST_ONLY actual measured prepared patches',
  [p('method_ref')]: 'TEST_ONLY accepted exact hand repair method',
  [p('substrate')]: 'SOUND_ROUGH_NO_EXPOSED_REBAR_NO_SEPARATE_PRIMER',
  [p('ambient_c')]: 20, [p('substrate_c')]: 20, [p('station_count')]: 2,
  [p('station_ref')]: 'TEST_ONLY two actual repair stations',
  [p('container_ref')]: 'TEST_ONLY safe full-charge container',
  [p('voltage_v')]: 230, [p('gear')]: 1, [p('paddle_mm')]: 140, [p('paddle_key_mm')]: '24',
  [p('mixing_programme_ref')]: 'TEST_ONLY one whole charge and actual dose',
  [p('whole_charge_count')]: 1, [p('water_l_per_charge')]: '3.6',
  [p('dry_supply_ref')]: 'TEST_ONLY usable whole bags and reserve',
  [p('dry_stock_bags')]: 1, [p('dry_reserve_bags')]: 1,
};
const geometry = { [p('patch_count')]: 6, [p('length_m')]: '0.1', [p('width_m')]: '0.1', [p('depth_m')]: '0.075' };
const compile = (submittedParameters: Record<string, unknown>, confirmedParameters: Record<string, unknown>) =>
  (process.stdout.write('R55_EXISTING_CORE_CALL\n'), compileAutomaticConstructionOwnerR1({ definition, compilerVersion: 'TEST_ONLY_R55_REUSE', catalogId,
    primaryMeasureParameterId: 'm212_family_b_plain15_net_concrete_volume_m3', submittedParameters, confirmedParameters }));

it('connects the whole accepted repair factory to the exact current foundation without changing parent owners', () => {
  expect(c.definition.id).toBe('b56ba11f-16a8-509d-95da-714fff65e2a0');
  expect(c.definition.definition_version).toBe(14);
  const child = repair();
  expect(definition.resources.slice(0, parent.resources.length)).toEqual(parent.resources);
  expect(definition.formulas).toEqual([...parent.formulas, ...child.formulas]);
  expect(definition.resources.slice(parent.resources.length).map(row => [row.row_id, row.unit_id, row.formula_id,
    row.source_metadata, row.cost_owner_id, row.procurement_eligible, row.resource_graph.costTreatment]))
    .toEqual(child.resources.map(row => [row.row_id, row.unit_id, row.formula_id,
      row.source_metadata, row.cost_owner_id, row.procurement_eligible, row.resource_graph.costTreatment]));
  expect(definition.parameters.find(item => item.parameter_id === method)?.default_value).toBeNull();
  expect(definition.parameters.find(item => item.parameter_id === method)?.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
  expect(definition.parameters.filter(item => item.parameter_id.startsWith('mono_repair_r3_application_'))
    .every(item => item.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM')).toBe(true);
  expect(publicIds.size).toBeLessThanOrEqual(10);
  for (const row of definition.resources.slice(parent.resources.length)) {
    expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(op => op.operationId))
      .toContain('master212:slab_foundation:retained-operation:repair');
  }
  expect(() => append({ catalogId, parent, expectedParentFingerprint: 'bad' })).toThrow('EXACT_PARENT');
  expect(() => append({ catalogId: 'other', parent, expectedParentFingerprint: hash(parent) })).toThrow('EXACT_CARD');
  expect(pack.initialStationKit).toHaveLength(9);
});

it('keeps the missing actual repair method preliminary while retaining known programme quantities', async () => {
  const noMethod: Record<string, unknown> = { ...programme }; delete noMethod[method];
  const result = await compile(base, noMethod);
  const needs = result.preliminaryNeeds.filter(row => row.row_id.startsWith('monolithic-strength-repair:r3:'));
  expect(result.rows.some(row => row.row_id.startsWith('monolithic-strength-repair:r3:'))).toBe(false);
  expect(needs).toHaveLength(repair().resources.length);
  expect(needs.find(row => row.row_id === r('dry-material-order'))?.quantity).toBe('25');
  expect(needs.find(row => row.row_id === r('dry-material-order'))?.need_state).toBe('CONDITION_REQUIRED');
  expect(needs.find(row => row.row_id === r('dry-material-order'))?.missing_parameter_ids).toContain(method);
  expect(needs.find(row => row.row_id === r('measured-volume'))?.quantity).toBeNull();
  expect(needs.find(row => row.row_id === r('repair-labour'))?.quantity).toBeNull();
  for (const key of ['repair-mortar', 'repair-water', 'repair-labor', 'repair-tools']) {
    expect(result.preliminaryNeeds.some(row => row.row_id === 'master212:slab_foundation:scope-need:' + key)).toBe(true);
  }
});

it('keeps active measured repair quantities and sole owners independent of foundation volume', async () => {
  const a = await compile({ ...base, ...geometry }, programme);
  const b = await compile({ ...base, m212_family_b_plain15_net_concrete_volume_m3: 20, ...geometry }, programme);
  const allA = [...a.rows, ...a.preliminaryNeeds], allB = [...b.rows, ...b.preliminaryNeeds];
  const parentConcrete = 'master212:family-b:krer06-01-001-15:r1:ready-concrete';
  const expected: Record<string, string> = { [r('theoretical-dry')]: '8.1', [r('dry-material-order')]: '25',
    [r('mixing-water')]: '0.0036', [r('mixer')]: '2', [r('dry-order-bags')]: '1' };
  process.stdout.write('R55_ASTRA_ACTIVE_REUSE=' + JSON.stringify([a, b].map(result => ({
    known: [...result.rows, ...result.preliminaryNeeds].filter(row => Object.hasOwn(expected, row.row_id))
      .map(row => ({ id: row.row_id, quantity: row.quantity })),
    paidOwners: result.rows.filter(row => row.row_id.startsWith('monolithic-strength-repair:r3:') && row.included_in_estimate).map(row => row.row_id),
    purchaseOwners: result.rows.filter(row => row.row_id.startsWith('monolithic-strength-repair:r3:') && row.included_in_procurement).map(row => row.row_id)
  }))) + '\n');
  expect(allA.find(row => row.row_id === parentConcrete)?.quantity).toBe('2.03');
  expect(allB.find(row => row.row_id === parentConcrete)?.quantity).toBe('20.3');
  for (const result of [a, b]) {
    const all = [...result.rows, ...result.preliminaryNeeds];
    for (const [id, quantity] of Object.entries(expected)) {
      expect(all.filter(row => row.row_id === id)).toHaveLength(1);
      expect(all.find(row => row.row_id === id)?.quantity).toBe(quantity);
    }
    expect(result.rows.find(row => row.row_id === r('dry-material-order'))).toBeDefined();
    expect(result.rows.filter(row => row.row_id.startsWith('monolithic-strength-repair:r3:') && row.included_in_estimate).map(row => row.row_id))
      .toEqual([r('dry-material-order')]);
    expect(result.rows.filter(row => row.row_id.startsWith('monolithic-strength-repair:r3:') && row.included_in_procurement).map(row => row.row_id))
      .toEqual([r('dry-material-order')]);
    for (const key of ['repair-mortar', 'repair-water', 'repair-labor', 'repair-tools']) {
      expect(result.preliminaryNeeds.some(row => row.row_id === 'master212:slab_foundation:scope-need:' + key)).toBe(true);
    }
    for (const item of pack.unresolvedRoles.filter(item => item.key !== 'mixing-water')) {
      expect(result.preliminaryNeeds.find(row => row.row_id === r(item.key))?.quantity).toBeNull();
    }
  }
});

it('limits the new repair gate to both admitted foundation branches and positive actual patch applicability', () => {
  const cases = [
    { profile: 'Монолитная бетонная фундаментная плита без армирования', volume: 2, patches: 6, expected: true },
    { profile: 'Полный цикл фундамента с отдельной бетонной подготовкой по подтверждённому проекту', volume: 2, patches: 6, expected: true },
    { profile: 'Сохранённый исходный состав фундамента', volume: 2, patches: 6, expected: false },
    { profile: 'Монолитная бетонная фундаментная плита без армирования', volume: 0, patches: 6, expected: false },
    { profile: 'Полный цикл фундамента с отдельной бетонной подготовкой по подтверждённому проекту', volume: 0, patches: 6, expected: false },
    { profile: 'Монолитная бетонная фундаментная плита без армирования', volume: 2, patches: 0, expected: false },
    { profile: 'Полный цикл фундамента с отдельной бетонной подготовкой по подтверждённому проекту', volume: 2, patches: 0, expected: false },
  ];
  for (const item of cases) for (const row of definition.resources.slice(parent.resources.length)) {
    expect(resolveInclusionGraph(row.inclusion_ast, { ...programme, ...geometry,
      m212_foundation_cycle_profile: item.profile, m212_concrete_net_volume_m3: item.volume,
      m212_family_b_plain15_net_concrete_volume_m3: item.volume, [p('patch_count')]: item.patches }).value).toBe(item.expected);
  }
});
