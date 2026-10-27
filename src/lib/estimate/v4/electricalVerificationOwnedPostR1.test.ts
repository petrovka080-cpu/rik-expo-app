import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput}
  from '../backendPlatform/canonicalEstimateCompileCore';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {electricalVerificationOwnedPostR1 as definition, appendElectricalVerificationOwnedPostR1 as append,
  electricalVerificationOwnedPostPackR1 as pack, electricalVerificationOwnedPostRowR1 as row}
  from './electricalVerificationOwnedPostR1';
import {socketComposableTwoGangCandidateR1} from './socketComposableSurfaceTwoGangR1';

const facts = (sets = '1'): Record<string, unknown> => ({[pack.socketSelectorId]: pack.socketProfile,
  [pack.methodId]: pack.method, [pack.countId]: sets, [pack.scheduleId]: 'TEST_ONLY unapproved owned inventory',
  [pack.fitId]: pack.fit});
async function core(submittedParameters: Record<string, unknown>,
  options: Partial<Pick<CanonicalEstimateCompileCoreInput, 'rowOverrides' | 'confirmedParameters'>> = {}) {
  const d = definition();
  return compileCanonicalEstimateCore({operation: 'recalculate', compilerVersion: pack.contract, catalogId: pack.catalogId,
    primaryMeasureParameterId: pack.countId, parameterDefinitions: [...d.parameters], formulaDefinitions: [...d.formulas],
    resourceDefinitions: [...d.resources], submittedParameters, priceItems: [], currencyCode: 'KGS',
    maximumResourceRows: d.resources.length, hashJson: estimateDeterministicHash, ...options, confirmedParameters: options.confirmedParameters ?? {}});
}

describe('Master32 frozen instrument-only owned inventory reuse; author runtime UNRUN', () => {
  const expected = ['voltage-indicator', 'proving-unit', 'proving-batteries', 'proving-magnetic-hanger', 'voltage-kit-case',
    'installation-tester', 'continuity-red-lead', 'continuity-green-lead', 'continuity-red-probe', 'continuity-green-probe',
    'continuity-red-gs38-cap', 'continuity-green-gs38-cap', 'continuity-red-clip', 'continuity-green-clip',
    'continuity-zero-adapter', 'continuity-batteries', 'continuity-padded-strap', 'continuity-hard-case'];
  it('preserves all eighteen exact initial instrument roles and both distinct power sources', () => {
    const d = definition();
    expect(pack.parts.map(p => p.key)).toEqual(expected);
    expect(pack.parts.map(p => p.countPerPost)).toEqual([1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 1, 1]);
    expect(pack.sources).toHaveLength(5);
    expect(d.resources).toHaveLength(21);
    expect(d.resources.every(r => !r.procurement_eligible && r.cost_owner_id === null
      && r.resource_graph.costTreatment === 'INFORMATIONAL_SCOPE')).toBe(true);
    expect(d.resources.every(r => r.source_metadata?.actualElectricalTestsOrSafeIsolationProved === false)).toBe(true);
    expect(d).toMatchObject({publicationAllowed: false, completeInstallation: false, runtimeInput: {}});
    for (const need of pack.openNeeds) {
      const truth = d.parameters.find(p => p.parameter_id === need.parameterId)?.truth_metadata;
      expect(truth).toMatchObject({visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM',
        unresolved_norm_reason: need.reasonRu, projectAuthenticated: false, sourceAuthorityPromoted: false,
        guide: {source_role: 'UNRESOLVED_APPLICATION_NORM', source_locator: need.reasonRu}});
      const guide = truth?.guide as Record<string, unknown>;
      expect(Object.hasOwn(guide, 'verified_at')).toBe(false);
      expect(Object.hasOwn(guide, 'source_snapshot_hash')).toBe(false);
    }
  });
  it.each([['1', '28'], ['2', '56']])('uses actual%s whole inventory sets and shows%s physical items, independent of socket N', async (sets, sum) => {
    const result = await core(facts(sets));
    expect(result.rows.map(r => r.row_id)).toEqual(expected.map(row));
    expect(result.rows.filter(r => r.row_id.endsWith('-batteries')).map(r => r.quantity))
      .toEqual([sets === '1' ? '6' : '12', sets === '1' ? '6' : '12']);
    expect(result.rows.reduce((n, r) => n + Number(r.quantity), 0)).toBe(Number(sum));
    expect(result.rows.every(r => !r.included_in_estimate && !r.included_in_procurement && r.unit_price === null)).toBe(true);
    expect(result.preliminaryNeeds).toHaveLength(3);
    expect(result.preliminaryNeeds.every(n => n.quantity === null && !n.procurement_eligible)).toBe(true);
    expect(result.totals.amount).toBe('0');
  });
  it('does not derive instrument sets from socket ways, panel count or a min(1,N) scheduling assumption', () => {
    const d = definition();
    expect(d.formulas.slice(0, 18).every(f => f.input_parameter_ids.length === 1 && f.input_parameter_ids[0] === pack.countId)).toBe(true);
    expect(d.formulas.every(f => !/m30_fixture_count|min\(/u.test(f.expression_source ?? ''))).toBe(true);
    expect(pack.parts.some(p => /stripper|driver|measuring-rule/u.test(p.key))).toBe(false);
  });
  it('shows the same saved instrument resource in exact existing connection and QA operations', () => {
    const d = definition(), group = 'electrical:socket-composable-two-gang-r1';
    expect(pack.usingOperationGroupId).toBe(group);
    for (const part of pack.parts) {
      const both = ['voltage-indicator', 'proving-unit', 'proving-batteries', 'proving-magnetic-hanger', 'voltage-kit-case'].includes(part.key);
      expect(d.resources.find(r => r.row_id === row(part.key))?.resource_graph.operationCompositionV1).toMatchObject({
        groupId: group, operationId: group + (both ? ':connection' : ':qa-close'), processOrdinal: both ? 2 : 3,
        additionalOperations: both ? [{operationId: group + ':qa-close', processOrdinal: 3}] : []});
    }
    expect(d.resources.some(r => JSON.stringify(r.resource_graph.operationCompositionV1).includes(pack.prefix + ':verification'))).toBe(false);
  });
  it('missing inventory count keeps every instrument unknown instead of creating a one-set default', async () => {
    const p = facts(); delete p[pack.countId];
    const result = await core(p);
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.filter(n => expected.map(row).includes(n.row_id))
      .every(n => n.quantity === null && n.missing_parameter_ids.includes(pack.countId))).toBe(true);
    expect(definition().parameters.every(p => p.default_value === null)).toBe(true);
  });
  it('manual reference prices cannot add an estimate amount, procurement or second labour owner', async () => {
    const overrides = Object.fromEntries(expected.map(k => [row(k), {unitPrice: '77', includedInEstimate: true,
      includedInProcurement: true, provenance: {kind: 'manual', reason: 'TEST_ONLY no second payment'}}]));
    const result = await core(facts(), {rowOverrides: overrides});
    expect(result.rows.every(r => !r.included_in_estimate && !r.included_in_procurement)).toBe(true);
    expect(result.totals.amount).toBe('0');
  });
  it.each(['0', '-1', '1.5'])('rejects invalid inventory count%s', async value => {
    await expect(core(facts(value))).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
  });
  it.each(pack.openNeeds.map(n => n.parameterId))('keeps maintenance/additional measurement need%s protected from consumer and trusted0', async parameter => {
    await expect(core({...facts(), [parameter]: '0'})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
    await expect(core(facts(), {confirmedParameters: {[parameter]: '0'}})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
  });
  it('replaces only three broad socket instrument displays when the whole documented owned inventory is selected', () => {
    const parent = socketComposableTwoGangCandidateR1(), before = JSON.stringify(parent);
    const d = append(parent);
    expect(JSON.stringify(parent)).toBe(before);
    expect(parent.resources).toHaveLength(50);
    expect(d.resources).toHaveLength(71);
    expect(new Set(d.resources.map(r => r.row_id)).size).toBe(71);
    // R5 adds three physical contents of the same paid box. Inventory reuse
    // must retain their own IDs, source hashes and existing non-order owner.
    for (const key of ['support-plate', 'frame', 'membrane-entry']) {
      const id = 'electrical:socket-composable-two-gang-r1:box:factory-' + key;
      const old = parent.resources.find(r => r.row_id === id), next = d.resources.find(r => r.row_id === id);
      expect(old).toBeDefined();expect(next).toEqual(old);
      expect(next).toMatchObject({cost_owner_id: 'electrical:socket-composable-two-gang-r1:box:order',
        procurement_eligible: false, resource_graph: {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'}});
    }
    expect(d.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id))
      .toEqual(parent.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id));
    for (const id of pack.coveredCandidateRowIds) {
      const old = parent.resources.find(r => r.row_id === id)!, next = d.resources.find(r => r.row_id === id)!;
      expect(resolveInclusionGraph(next.inclusion_ast, facts()).value).toBe(false);
      const omitted = {[pack.socketSelectorId]: pack.socketProfile};
      expect(resolveInclusionGraph(next.inclusion_ast, omitted)).toEqual(resolveInclusionGraph(old.inclusion_ast, omitted));
    }
    expect(d.resources.filter(r => !pack.coveredCandidateRowIds.includes(r.row_id) && !r.row_id.startsWith(pack.prefix))
      .map(r => r.row_sha256)).toEqual(parent.resources.filter(r => !pack.coveredCandidateRowIds.includes(r.row_id)).map(r => r.row_sha256));
    expect(parent.parameters.find(p => p.parameter_id.endsWith('source_readback'))?.truth_metadata.value_source_role)
      .toBe('UNRESOLVED_APPLICATION_NORM');
  });
});
