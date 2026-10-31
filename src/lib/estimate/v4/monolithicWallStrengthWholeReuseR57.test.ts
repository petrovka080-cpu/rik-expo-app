import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { compileAutomaticConstructionOwnerR1 } from './automaticConstructionOwnerR1';
import { appendMonolithicWallStrengthWholeReuseR57 as append, WALL_STRENGTH_CATALOG_R57 as catalogId,
  WALL_STRENGTH_METHOD_R57 as method, WALL_STRENGTH_CHOICE_R57 as choice, WALL_QUALITY_NEED_R57 as quality } from './monolithicWallStrengthWholeReuseR57';
import { buildMonolithicStrengthMeasuredRepairR4 as whole } from './monolithicStrengthMeasuredRepairR4';
import { strengthDirectParameterR2 as sp, strengthDirectRowR2 as sr, strengthDirectPackR2 as strengthPack } from './monolithicStrengthDirectWholeCycleR2';
import { repairParameterR3 as rp, repairRowR3 as rr, repairSourcePackR3 as repairPack } from './monolithicStrengthRepairR3';
import { canonicalEstimateOperationReferences } from '../backendPlatform/canonicalEstimateOperationComposition';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';
import { resolveInclusionGraph } from '../backendPlatform/inclusionGraph';
import type { MasterRetainedParentCaptureR1 } from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';

const bytes = readFileSync(resolve(__dirname, '../../../../data/estimate-benchmarks/fixtures/monolithic-wall-current-parent-r57.json'));
if (createHash('sha256').update(bytes).digest('hex') !== 'e61ce773c4547baf005070d2ad9875191275831bf259d8dcf169ccf54c5bd1e2') {
  throw Error('R57_EXACT_CURRENT_WALL_CAPTURE_REQUIRED');
}
type Capture = Omit<MasterRetainedParentCaptureR1, 'parameters' | 'formulas' | 'resources'>
  & Pick<AutomaticOwnerDefinition, 'parameters' | 'formulas' | 'resources'>;
const record: { capture: Capture } = JSON.parse(bytes.toString('utf8'));
const c = record.capture;
const parent: AutomaticOwnerDefinition = { parameters: c.parameters, formulas: c.formulas, resources: c.resources,
  runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {},
  ordinaryParameterIds: c.parameters.filter(p => p.truth_metadata.visibility_role === 'USER_INPUT').map(p => p.parameter_id) };
const definition = append({ catalogId, parent, expectedParentFingerprint: hash(parent) });
const child = whole();
const publicIds = new Set(definition.ordinaryParameterIds);
const wallProfile = 'Монолитная железобетонная стена 300 мм высотой до 3 м';
const basic = { m212_family_b_wall04_net_concrete_volume_m3: 30, m212_family_b_wall04_work_elevation_m: 0,
  m212_family_b_wall04_height_from_support_m: 3, m212_family_b_wall04_thickness_m: '0.3',
  [sp('area_m2')]: 100, [rp('patch_count')]: 6, [rp('length_m')]: '0.1', [rp('width_m')]: '0.1', [rp('depth_m')]: '0.075' };
const facts = {
  m212_family_b_profile: wallProfile, [method]: choice,
  [sp('member_count')]: 1, [sp('member_kind')]: 'FLAT', [sp('member_ref')]: 'TEST_ONLY one identified actual wall and programme',
  [sp('device_count')]: 1, [sp('deployment_ref')]: 'TEST_ONLY actual selected device', [sp('provider_ref')]: 'TEST_ONLY current verification',
  [sp('thickness_mm')]: 300, [sp('aggregate_mm')]: 20, [sp('spacing_mm')]: 240, [sp('edge_mm')]: 150, [sp('rebar_clear_mm')]: 70,
  [sp('drill_post_count')]: 1, [sp('drill_deployment_ref')]: 'TEST_ONLY deployed single drilling station',
  [sp('drill_face')]: 'VERTICAL_WALL', [sp('drill_condition')]: 'DRY', [sp('drill_access')]: 'STABLE_GROUND',
  [sp('drill_voltage_v')]: 230, [sp('drill_holder')]: 'SDS_PLUS', [sp('drill_diameter_mm')]: 25, [sp('drill_depth_mm')]: 75,
  [sp('drill_dust_class')]: 'H', [sp('drill_flow_m3h')]: '57.9', [sp('drill_dust_system_ref')]: 'TEST_ONLY accepted compatible H assembly',
  [sp('drill_dust_bag_system')]: strengthPack.drillingInitialDryDustKit.bagSystem,
  [rp('geometry_ref')]: 'TEST_ONLY measured prepared actual damage, not an inferred cone',
  [rp('method_ref')]: 'TEST_ONLY selected exact hand repair', [rp('substrate')]: 'SOUND_ROUGH_NO_EXPOSED_REBAR_NO_SEPARATE_PRIMER',
  [rp('ambient_c')]: 20, [rp('substrate_c')]: 20, [rp('station_count')]: 2,
  [rp('station_ref')]: 'TEST_ONLY two complete repair posts', [rp('container_ref')]: 'TEST_ONLY safe actual full-charge container',
  [rp('voltage_v')]: 230, [rp('gear')]: 1, [rp('paddle_mm')]: 140, [rp('paddle_key_mm')]: '24',
  [rp('mixing_programme_ref')]: 'TEST_ONLY one whole charge and actual water dose', [rp('whole_charge_count')]: 1,
  [rp('water_l_per_charge')]: '3.6', [rp('dry_supply_ref')]: 'TEST_ONLY actual usable bags and reserve',
  [rp('dry_stock_bags')]: 1, [rp('dry_reserve_bags')]: 1,
};
const compile = (input: Record<string, unknown>) => {
  process.stdout.write('R57_NEW_WALL_CONSUMER_CORE_CALL\n');
  return compileAutomaticConstructionOwnerR1({ definition, compilerVersion: 'TEST_ONLY_R57_WHOLE_WALL', catalogId,
    primaryMeasureParameterId: 'm212_family_b_wall04_net_concrete_volume_m3',
    submittedParameters: Object.fromEntries(Object.entries(input).filter(([id]) => publicIds.has(id))),
    confirmedParameters: { ...facts, ...Object.fromEntries(Object.entries(input).filter(([id]) => !publicIds.has(id))) } });
};

it('retains the exact current wall and both whole declarations, original operation links and unresolved needs', () => {
  expect(c.definition.id).toBe('462094da-b42e-5f09-afb8-1003b5ff86d2');
  expect(c.definition.definition_version).toBe(3);
  expect(parent.resources).toHaveLength(271);
  expect(definition.resources).toHaveLength(365);
  expect(definition.resources.slice(0, parent.resources.length)).toEqual(parent.resources);
  expect(definition.formulas).toEqual([...parent.formulas, ...child.formulas]);
  const identity = (row: AutomaticOwnerDefinition['resources'][number]) => [row.row_id, row.unit_id,
    row.formula_id, row.cost_owner_id, row.procurement_eligible, row.resource_graph.costTreatment, row.source_metadata];
  expect(definition.resources.slice(parent.resources.length).map(identity)).toEqual(child.resources.map(identity));
  for (const operation of strengthPack.operations) for (const role of operation.resources) {
    expect(definition.resources.find(row => row.row_id === sr(role.key))?.unit_id).toBe(role.unitId);
  }
  for (const row of definition.resources.slice(parent.resources.length)) {
    const refs = canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1);
    expect(refs.map(op => op.operationId)).toContain('master212:family-b:krer06-01-031-04:r1:operation:quality-lab');
    const original = canonicalEstimateOperationReferences(child.resources.find(item => item.row_id === row.row_id)?.resource_graph.operationCompositionV1);
    expect(refs.slice(0, original.length).map(op => [op.operationId, op.operationTitleRu,
      op.completionCriterionRu, op.processOrdinal, op.whenResourcePresent]))
      .toEqual(original.map(op => [op.operationId, op.operationTitleRu,
        op.completionCriterionRu, op.processOrdinal, op.whenResourcePresent]));
    expect(refs.every(op => op.groupId === 'monolithic-physical:r2')).toBe(true);
    if (['sites-flat', 'sites-horizontal', 'sites-vertical'].map(sr).includes(row.row_id)) {
      expect(refs[0].operationId).toBe(sr('operation:plan'));
      expect(row.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
      expect(row.procurement_eligible).toBe(false);
    }
  }
  expect(publicIds.size).toBe(9);
  expect(publicIds.has(sp('area_m2'))).toBe(true);
  for (const id of [method, sp('member_count'), sp('member_kind'), sp('length_m')]) {
    expect(definition.parameters.find(p => p.parameter_id === id)?.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
    expect(definition.parameters.find(p => p.parameter_id === id)?.default_value).toBeNull();
    expect(publicIds.has(id)).toBe(false);
  }
  expect(definition.parameters.filter(p => p.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM')
    .every(p => p.truth_metadata.visibility_role === 'INTERNAL_ONLY')).toBe(true);
  expect(definition.runtimeInput).toEqual({});
  expect(() => append({ catalogId: 'another-card', parent, expectedParentFingerprint: hash(parent) })).toThrow('EXACT_CARD');
  expect(() => append({ catalogId, parent, expectedParentFingerprint: 'changed' })).toThrow('EXACT_PARENT');
});

it('keeps the finite parent and method gates without forcing another member kind or zero-volume scope', () => {
  const scenarios = [
    { input: { ...facts, ...basic }, active: true },
    { input: { ...facts, ...basic, [method]: 'OTHER' }, active: false },
    { input: { ...facts, ...basic, m212_family_b_wall04_net_concrete_volume_m3: 0 }, active: false },
    { input: { ...facts, ...basic, m212_family_b_profile: 'OTHER' }, active: false },
  ];
  for (const scenario of scenarios) for (const row of definition.resources.slice(parent.resources.length)) {
    const original = child.resources.find(item => item.row_id === row.row_id);
    if (!original) throw Error('R57_WHOLE_SOURCE_ROW_REQUIRED');
    const expected = scenario.active ? resolveInclusionGraph(original.inclusion_ast, scenario.input).value : false;
    expect(resolveInclusionGraph(row.inclusion_ast, scenario.input).value).toBe(expected);
  }
  const missing: Record<string, unknown> = { ...facts, ...basic }; delete missing[method];
  for (const row of definition.resources.slice(parent.resources.length)) {
    expect(resolveInclusionGraph(row.inclusion_ast, missing).value).not.toBe(true);
  }
});

it('runs the new wall consumer with independent concrete, controlled area and repair geometry through the existing core', async () => {
  const a = await compile(basic);
  const b = await compile({ ...basic, m212_family_b_wall04_net_concrete_volume_m3: 300, [sp('area_m2')]: 1000 });
  const expected: Record<string, string> = { [rr('theoretical-dry')]: '8.1', [rr('dry-material-order')]: '25',
    [rr('mixing-water')]: '0.0036', [rr('mixer')]: '2', [sr('drill')]: '1', [sr('press')]: '1' };
  const snapshot = [a, b].map(result => ({
    native: [...result.rows, ...result.preliminaryNeeds].filter(row => row.row_id.endsWith(':ready-concrete') || row.row_id === sr('sites-flat') || Object.hasOwn(expected, row.row_id))
      .map(row => ({ id: row.row_id, quantity: row.quantity })),
    newPaid: result.rows.filter(row => row.row_id.startsWith('monolithic-strength-') && row.included_in_estimate).map(row => row.row_id),
    newPurchase: result.rows.filter(row => row.row_id.startsWith('monolithic-strength-') && row.included_in_procurement).map(row => row.row_id),
  }));
  process.stdout.write('R57_NEW_WALL_CONSUMER_ACTUAL=' + JSON.stringify(snapshot) + '\n');
  expect(snapshot[0].native.find(row => row.id.endsWith(':ready-concrete'))?.quantity).toBe('30.45');
  expect(snapshot[1].native.find(row => row.id.endsWith(':ready-concrete'))?.quantity).toBe('304.5');
  expect(snapshot[0].native.find(row => row.id === sr('sites-flat'))?.quantity).toBe('20');
  expect(snapshot[1].native.find(row => row.id === sr('sites-flat'))?.quantity).toBe('50');
  for (const result of [a, b]) {
    const all = [...result.rows, ...result.preliminaryNeeds];
    for (const [id, quantity] of Object.entries(expected)) expect(all.find(row => row.row_id === id)?.quantity).toBe(quantity);
    expect(result.preliminaryNeeds.some(row => row.row_id === quality)).toBe(true);
    for (const key of ['planning-labour', 'prepare-labour', 'test-labour', 'report-labour', 'whole-service', 'waste-transport']) {
      expect(result.preliminaryNeeds.find(row => row.row_id === sr(key))?.quantity).toBeNull();
    }
    for (const role of repairPack.unresolvedRoles.filter(role => role.key !== 'mixing-water')) {
      expect(result.preliminaryNeeds.find(row => row.row_id === rr(role.key))?.quantity).toBeNull();
    }
    expect(result.rows.filter(row => row.row_id.startsWith('monolithic-strength-') && row.included_in_estimate).map(row => row.row_id)).toEqual([rr('dry-material-order')]);
    expect(result.rows.filter(row => row.row_id.startsWith('monolithic-strength-') && row.included_in_procurement).map(row => row.row_id)).toEqual([rr('dry-material-order')]);
  }
});
