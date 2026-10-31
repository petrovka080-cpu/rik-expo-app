import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from './canonicalEstimateCompileCore';
import { compileFormulaGraph } from './formulaGraph';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

const sourceRoles = ['PROJECT_DOCUMENTATION', 'ENGINEERING_DESIGN', 'SITE_SURVEY',
  'MANDATORY_NORM_VALUE', 'MANUFACTURER_CONFIRMED', 'SELECTED_EQUIPMENT_PASSPORT',
  'SOURCE_BACKED_PRELIMINARY_PROFILE', 'NORM_REQUIRED_BUT_PROJECT_SELECTED'];

function input(role = 'SELECTED_EQUIPMENT_PASSPORT'): CanonicalEstimateCompileCoreInput {
  const graph = compileFormulaGraph('area*source_quantity');
  return {
    operation: 'compile', compilerVersion: 'test-source-authority', catalogId: 'TEST_ONLY_SOURCE_AUTHORITY',
    primaryMeasureParameterId: 'area',
    parameterDefinitions: [
      { parameter_id: 'area', value_type: 'decimal', unit_id: 'm2', required: true,
        default_value: null, constraints_json: { min: 0 }, truth_metadata: { visibility_role: 'USER_INPUT',
          value_source_role: 'USER_MEASURED', provenance: { consumer_input_role_v1: 'OBJECT_FACT' } } },
      { parameter_id: 'source_quantity', value_type: 'decimal', unit_id: 'piece', required: false,
        default_value: null, constraints_json: { min: 1 }, truth_metadata: { visibility_role: 'INTERNAL_ONLY',
          value_source_role: role, provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' } } },
    ],
    formulaDefinitions: [{ formula_id: 'source-use', output_unit_id: 'piece', ast: graph.ast,
      input_parameter_ids: graph.inputParameterIds, ast_sha256: estimateDeterministicHash(graph.ast) }],
    resourceDefinitions: [{ id: 'test-only-resource-spec', row_id: 'test:source-use', ordinal: 0, section: 'Оснащение', category: 'equipment',
      title_ru: 'Комплект оборудования', unit_id: 'piece', formula_id: 'source-use',
      inclusion_ast: { kind: 'literal', value: true }, resource_graph: { costTreatment: 'INFORMATIONAL_SCOPE' },
      procurement_eligible: false, cost_owner_id: null, source_metadata: {}, row_sha256: 'test-only' }],
    submittedParameters: { area: 3 }, confirmedParameters: { source_quantity: 2 }, currencyCode: 'USD',
    maximumResourceRows: 1, priceItems: [], hashJson: estimateDeterministicHash,
  };
}

describe('source authority at the canonical compiler entry, without a family wrapper', () => {
  it.each(sourceRoles)('accepts server-owned %s facts and recalculates ordinary geometry', async role => {
    const before = input(role);
    const a = await compileCanonicalEstimateCore(before);
    const b = await compileCanonicalEstimateCore({ ...before, operation: 'recalculate', submittedParameters: { area: 5 } });
    expect(a.rows[0]?.quantity).toBe('6');
    expect(b.rows[0]?.quantity).toBe('10');
    expect(a.preliminaryNeeds).toHaveLength(0);
    expect(a.rows[0]?.included_in_estimate).toBe(false);
    expect(a.rows[0]?.included_in_procurement).toBe(false);
  });
  it.each(sourceRoles)('rejects a consumer replacement of %s even when confirmed exists', async role => {
    const before = input(role);
    await expect(compileCanonicalEstimateCore({ ...before, submittedParameters: { area: 3, source_quantity: 99 } }))
      .rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED',
        message: 'source-managed parameter cannot be submitted source_quantity' });
  });
  it.each([null, undefined, 2, 0, '2'])('rejects clearing, echoing or replacing a hidden source with %p on recalculate', async value => {
    const before = input();
    await expect(compileCanonicalEstimateCore({ ...before, operation: 'recalculate',
      submittedParameters: { area: 3, source_quantity: value } })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
  });
  it('keeps missing server facts unknown and does not infer equipment from geometry', async () => {
    const result = await compileCanonicalEstimateCore({ ...input(), confirmedParameters: {} });
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: 'test:source-use', quantity: null,
      missing_parameter_ids: ['source_quantity'] });
    expect(result.parameters).not.toHaveProperty('source_quantity');
  });
  it('validates the actual trusted value rather than treating confirmation as a bypass', async () => {
    await expect(compileCanonicalEstimateCore({ ...input(), confirmedParameters: { source_quantity: 0 } }))
      .rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
  });
  it('does not change a historical hidden project field without application ownership', async () => {
    const before = input('PROJECT_DOCUMENTATION');
    before.parameterDefinitions[1]!.truth_metadata = { visibility_role: 'INTERNAL_ONLY',
      value_source_role: 'PROJECT_DOCUMENTATION', provenance: { consumer_input_role_v1: 'OBJECT_FACT' } };
    const result = await compileCanonicalEstimateCore({ ...before, submittedParameters: { area: 3, source_quantity: 4 } });
    expect(result.rows[0]?.quantity).toBe('12');
  });
  it('retains a visible replaceable profile and its ordinary consumer amendment', async () => {
    const before = input('VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE');
    before.parameterDefinitions[1]!.truth_metadata = { visibility_role: 'USER_INPUT',
      value_source_role: 'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE', provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' } };
    const result = await compileCanonicalEstimateCore({ ...before, submittedParameters: { area: 3, source_quantity: 4 } });
    expect(result.rows[0]?.quantity).toBe('12');
  });
  it.each(['submitted', 'confirmed'] as const)('still rejects an unresolved norm through the %s channel', async channel => {
    const before = input('UNRESOLVED_APPLICATION_NORM');
    before.confirmedParameters = {};
    if (channel === 'submitted') before.submittedParameters.source_quantity = 2;
    else before.confirmedParameters.source_quantity = 2;
    await expect(compileCanonicalEstimateCore(before)).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED',
      message: 'unresolved application norm cannot be supplied source_quantity' });
  });
});
