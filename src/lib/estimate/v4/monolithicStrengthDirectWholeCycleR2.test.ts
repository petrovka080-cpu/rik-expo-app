/** AUTHORED UNRUN. ROOT runs in the canonical checkout after source intake.
 * All numeric expectations are independent literal source examples. */
import cases from '../../../../data/estimate-benchmarks/fixtures/monolithic-strength-direct-literal-cases-r2.json';
import map from '../../../../data/estimate-benchmarks/fixtures/monolithic-strength-direct-independent-map-r2.json';
import { buildMonolithicStrengthDirectWholeCycleR2 as build, strengthDirectParameterR2 as p,
  strengthDirectRowR2 as row, strengthDirectPackR2 as pack } from './monolithicStrengthDirectWholeCycleR2';
import { compileAutomaticConstructionOwnerR1 } from './automaticConstructionOwnerR1';
import { resolveProfessionalUnitDefinition } from '../professionalUnitRegistry';
import { resolveEngineeringUnitV4 } from './engineeringUnitRegistryV4';

function input(): Record<string, unknown> {
  return { [p('member_count')]: 1, [p('member_ref')]: 'TEST_ONLY one actual member/age/schemeV; not project approval',
    [p('thickness_mm')]: 200, [p('aggregate_mm')]: 20, [p('spacing_mm')]: 240,
    [p('edge_mm')]: 150, [p('rebar_clear_mm')]: 70, [p('device_count')]: 1,
    [p('deployment_ref')]: 'TEST_ONLY exact physical device inventory',
    [p('provider_ref')]: 'TEST_ONLY provider/equipment/verification; not actual authority' };
}
const compile = (submittedParameters: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({
  definition: build(), compilerVersion: pack.contract,
  catalogId: 'TEST_ONLY_UNPUBLISHED_STRENGTH_SOURCE_FRAGMENT',
  primaryMeasureParameterId: p('member_count'), submittedParameters,
});

describe('unpublished direct strength-control whole source composition', () => {
  it.each(cases.siteCases)('uses literal schemeV boundary $label', async c => {
    const result = await compile({ ...input(), [p('member_kind')]: c.kind,
      ...('areaM2' in c ? { [p('area_m2')]: c.areaM2 } : {}),
      ...('lengthM' in c ? { [p('length_m')]: c.lengthM } : {}) });
    const actual = result.rows.find(x => x.row_id === row(c.row));
    expect(actual?.quantity).toBe(c.expectedSites);
    expect(actual?.included_in_estimate).toBe(false);
    expect(actual?.included_in_procurement).toBe(false);
  });
  it('uses the literal eight selected kit items for actual three deployed devices; no new payment/order', async () => {
    const result = await compile({ ...input(), [p('member_kind')]: 'VERTICAL_LINEAR', [p('device_count')]: 3 });
    for (const key of cases.literalKitOne) {
      const actual = result.rows.find(x => x.row_id === row(key));
      expect(actual?.quantity).toBe('3');
      expect(actual?.included_in_estimate).toBe(false);
      expect(actual?.included_in_procurement).toBe(false);
    }
    for (const key of ['grease','test-labour','repair-mortar','whole-service','waste-transport']) {
      expect(result.preliminaryNeeds.some(x => x.row_id === row(key))).toBe(true);
      expect(result.rows.find(x => x.row_id === row(key))?.quantity ?? null).toBeNull();
    }
    expect(pack.newFull).toBe(0);
    expect(pack.closedWholeNeeds).toBe(0);
  });
  it.each([['FLAT','sites-flat'], ['HORIZONTAL_LINEAR','sites-horizontal']] as const)(
    'missing measured geometry stays unknown for %s', async (kind,key) => {
      const result = await compile({ ...input(), [p('member_kind')]: kind });
      expect(result.preliminaryNeeds.some(x => x.row_id === row(key))).toBe(true);
      expect(result.rows.find(x => x.row_id === row(key))?.quantity ?? null).toBeNull();
    });
  it.each([['member_count',2],['thickness_mm',95.9],['aggregate_mm',48.1],['spacing_mm',239.9],['edge_mm',149.9],['rebar_clear_mm',69.9]] as const)(
    'rejects invalid actual fact %s', async (key,value) => {
      await expect(compile({ ...input(), [p('member_kind')]: 'VERTICAL_LINEAR', [p(key)]: value })).rejects.toMatchObject({
        code: 'PARAMETER_VALIDATION_FAILED', message: expect.stringContaining(p(key)),
      });
    });
  it('rejects an entered value in place of an unresolved application norm', async () => {
    const key = p('application_test_labour');
    await expect(compile({ ...input(), [p('member_kind')]: 'VERTICAL_LINEAR', [key]: 77 })).rejects.toMatchObject({
      code: 'PARAMETER_VALIDATION_FAILED', message: 'unresolved application norm cannot be supplied ' + key,
    });
  });
  it('does not expose missing application norms as user resource questions', () => {
    const owner = build();
    const internal = owner.parameters.filter(x => x.parameter_id.startsWith(p('application_')));
    expect(internal.length).toBeGreaterThan(0);
    for (const x of internal) {
      expect(x.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
      expect(x.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
      expect(x.default_value).toBeNull();
    }
    expect(owner.runtimeInput).toEqual({});
  });
  it('binds the independently specified physical roles to their whole operations', () => {
    const owner = build();
    const valid = (resources: typeof owner.resources): boolean => map.requiredOperations.every(operation =>
      operation.expectedRoles.every(key => {
        const actual = resources.find(x => x.row_id === row(key));
        const ref = actual?.resource_graph.operationCompositionV1 as { operationId?: string } | undefined;
        return ref?.operationId === 'monolithic-strength-direct:r2:operation:' + operation.operationId;
      }));
    expect(valid(owner.resources)).toBe(true);
    expect(valid(owner.resources.filter(x => x.row_id !== row('repair-mortar')))).toBe(false);
    const moved = owner.resources.map(x => x.row_id !== row('repair-mortar') ? x
      : { ...x, resource_graph: { ...x.resource_graph, operationCompositionV1: { operationId: 'wrong' } } });
    expect(valid(moved)).toBe(false);
    expect(map.generatedFromCurrentRows).toBe(false);
  });
  it('keeps the unknown whole-service unit pending and uses registered units elsewhere', () => {
    const owner = build();
    expect(owner.resources.find(x => x.row_id === row('whole-service'))?.unit_id).toBe('');
    for (const resource of owner.resources) {
      if (resource.unit_id === '') continue;
      expect(resolveProfessionalUnitDefinition(resource.unit_id)).not.toBeNull();
      expect(resolveEngineeringUnitV4(resource.unit_id)).not.toBeNull();
    }
    for (const parameter of owner.parameters) {
      if (parameter.unit_id == null || parameter.unit_id === '') continue;
      expect(resolveProfessionalUnitDefinition(parameter.unit_id)).not.toBeNull();
      expect(resolveEngineeringUnitV4(parameter.unit_id)).not.toBeNull();
    }
  });
});
