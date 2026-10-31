import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput}
  from '../backendPlatform/canonicalEstimateCompileCore';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {buildCanonicalRevisionCommitPayload} from '../backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {socketComposableTwoGangCandidateR1 as definition, appendSocketComposableTwoGangR1 as append,
  socketComposableTwoGangPackR1 as pack, socketComposableTwoGangRowR1 as row}
  from './socketComposableSurfaceTwoGangR1';
import independent from '../../../../data/estimate-benchmarks/fixtures/socket-composable-surface-two-gang-independent-r1.json';

const id = (suffix: string) => pack.parameterPrefix + suffix.replaceAll('-', '_');
const source = id('source_readback');
/** Values exercise transport/needs only, never claim a PPR, stock or primary source. */
function testOnlyFacts(): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const p of definition().parameters) {
    if (p.truth_metadata.visibility_role === 'INTERNAL_ONLY') continue;
    if (p.value_type === 'text') result[p.parameter_id] = 'TEST_ONLY: unapproved fixture';
    else if (p.value_type === 'enum') {
      const values = p.constraints_json?.values;
      if (!Array.isArray(values) || typeof values[0] !== 'string') throw Error('TEST_ENUM_REQUIRED');
      result[p.parameter_id] = values[0];
    } else result[p.parameter_id] = '1';
    if (p.parameter_id.endsWith('_stock') || p.parameter_id.endsWith('_reserve')) result[p.parameter_id] = '0';
  }
  result[pack.methodParameterId] = pack.method;
  result[id('node_count')] = '5';
  result[id('fixing')] = pack.fixingModes[1];
  result[id('whole_labour_h')] = '2';
  result[id('delivery_trips')] = '0';
  result[id('waste_trips')] = '0';
  return result;
}
async function core(submittedParameters: Record<string, unknown>,
  options: Partial<Pick<CanonicalEstimateCompileCoreInput, 'rowOverrides' | 'confirmedParameters'>> = {}) {
  const d = definition();
  return compileCanonicalEstimateCore({operation: 'recalculate', catalogId: pack.catalogId,
    compilerVersion: pack.contract, primaryMeasureParameterId: id('node_count'),
    parameterDefinitions: [...d.parameters], formulaDefinitions: [...d.formulas], resourceDefinitions: [...d.resources],
    submittedParameters, currencyCode: 'KGS', priceItems: [],
    maximumResourceRows: d.resources.length, hashJson: estimateDeterministicHash, ...options, confirmedParameters: options.confirmedParameters ?? {}});
}

function savedArtifactNeeds(result: Awaited<ReturnType<typeof core>>, rowOverrides: unknown = {}) {
  const checksum = estimateDeterministicHash(result.revisionProjection), payload = buildCanonicalRevisionCommitPayload({
    rowCount: result.rows.length, currencyCode: 'KGS', totals: result.totals, checksumSha256: checksum,
    compilerVersion: pack.contract, parameters: result.parameters, approvedTemplateBaselineId: null, baselineAssumptions: {},
    effectiveUserParameters: result.parameters, parentRevisionId: null, identityContract: {fixture: 'TEST_ONLY_NOT_SAVED'},
    derivedParameters: result.derivedParameters, preliminaryNeeds: result.preliminaryNeeds,
    purchaseSupplyIndexV1: result.purchaseSupplyIndexV1, compositionSelectionV1: result.compositionSelectionV1});
  return canonicalArtifactPreliminaryNeeds({id: 'TEST_ONLY_R5_SOURCE_HELD', release_id: 'TEST_ONLY_NOT_SAVED', catalog_id: pack.catalogId,
    checksum_sha256: checksum, row_count: result.rows.length, amendment_contract: {...payload, rowOverrides: structuredClone(rowOverrides ?? {})}});
}

describe('source-only composable two-gang socket candidate; author runtime UNRUN', () => {
  it('uses one existing work and distinct component owners, without declaring primary acceptance', () => {
    const d = definition();
    expect(d).toMatchObject({publicationAllowed: false, sourceAuthorityPromoted: false, fullTechnicalAcceptance: false,
      runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {}});
    expect(pack.catalogId).toBe('canonical-work:base:electrical_interior_socket_install_standard');
    expect(pack.materials.map(m => m.key)).toEqual(['mechanism', 'box', 'screws', 'anchors', 'markers', 'waste-bags']);
    expect(d.resources).toHaveLength(50);
    expect(d.resources.filter(r => r.resource_graph.purchaseBalanceV1 != null).map(r => r.row_id))
      .toEqual(pack.materials.map(m => row(m.key + ':order')));
    expect(d.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id))
      .toEqual([...pack.materials.map(m => row(m.key + ':order')), row('whole-labour'), row('delivery'), row('waste-removal')]);
    expect(d.parameters.every(p => p.default_value === null)).toBe(true);
    expect(d.resources.filter(r => r.resource_graph.excludeKnownZeroQuantityV1 === true).map(r => r.row_id))
      .toEqual(['delivery', 'waste-removal'].map(row));
    for (const p of d.parameters) {
      expect(p.truth_metadata).toMatchObject({projectAuthenticated: false, sourceAuthorityPromoted: false});
      const guide = p.truth_metadata.guide;
      if (p.truth_metadata.visibility_role === 'INTERNAL_ONLY') expect(Object.hasOwn(p.truth_metadata, 'guide')).toBe(false);
      else {
        expect(guide).toMatchObject({source_role: 'ACTUAL_PROJECT_DOCUMENT_REQUIRES_SERVER_BINDING', source_locator: p.title_ru});
        expect(Object.hasOwn(guide as object, 'verified_at')).toBe(false);
        expect(Object.hasOwn(guide as object, 'source_snapshot_hash')).toBe(false);
      }
    }
    expect(d.resources.every(r => r.source_metadata?.automaticGenericPriceInheritanceAllowed === false)).toBe(true);
  });
  it('keeps whole operation consumers, one payment/one order per material and one QA labour owner', () => {
    const d = definition();
    for (const m of pack.materials) {
      const consumed = d.resources.find(r => r.row_id === row(m.key + ':consumed'))!;
      expect(consumed).toMatchObject({cost_owner_id: row(m.key + ':order'), procurement_eligible: false,
        resource_graph: {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', parentCostOwnerId: row(m.key + ':order')}});
    }
    expect(d.resources.find(r => r.row_id === row('qa-included'))).toMatchObject({cost_owner_id: row('whole-labour'),
      resource_graph: {parentCostOwnerId: row('whole-labour'), costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'}});
    for (const r of d.resources) expect(r.resource_graph.operationCompositionV1).toBeDefined();
    for (const t of pack.ownEquipment) expect(d.resources.find(r => r.row_id === row('own:' + t.key)))
      .toMatchObject({procurement_eligible: false, resource_graph: {costTreatment: 'INFORMATIONAL_SCOPE'}});
    const driver = d.resources.filter(r => r.row_id === row('own:driver'));
    expect(driver).toHaveLength(1);
    expect(driver[0]?.resource_graph.operationCompositionV1).toMatchObject({
      operationId: pack.prefix + ':housing-fix', additionalOperations: expect.arrayContaining([{
        operationId: pack.prefix + ':connection', operationTitleRu: expect.any(String),
        processOrdinal: 2, processRole: 'PROCESS', completionCriterionRu: expect.any(String)}])});
    expect(pack.boxEntryPreparationPrimaryReviewR1).toMatchObject({sourceKey: 'box', pdfPage: 2, section: '4.3',
      usedEntryCountIsProjectSpecificNotSuppliedMembraneCount: true, driverIsNotForTighteningScrewlessTerminals: true,
      condensateDrain: {onlyIfRequiredByProject: true, automaticSelectionOrHoleCountAuthored: false}, exactPairAdmission: false});
  });
  it('keeps five nodes as five mechanisms plus five boxes, never ten complete assemblies or field jumpers', () => {
    const d = definition();
    for (const key of ['mechanism', 'box']) {
      const r = d.resources.find(r => r.row_id === row(key + ':consumed'))!;
      expect(d.formulas.find(f => f.formula_id === r.formula_id)?.expression_source).toBe(id('node_count'));
    }
    expect(d.resources.some(r => /jumper|bridge|перемычк/u.test(r.row_id + r.title_ru))).toBe(false);
    expect(d.formulas.some(f => f.input_parameter_ids.includes('q'))).toBe(false);
    expect(d.parameters.find(p => p.parameter_id === source)).toMatchObject({default_value: null,
      truth_metadata: {visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM'}});
  });
  it('declares every normalized formula operand once and keeps exact primary facts separate from pair/object admission', () => {
    const d = definition(), ids = new Set(d.parameters.map(p => p.parameter_id));
    expect(ids.size).toBe(d.parameters.length);
    expect([...ids].every(value => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(value))).toBe(true);
    expect(d.formulas.every(f => f.input_parameter_ids.every(parameter => ids.has(parameter)))).toBe(true);
    expect(ids.has('socket_composable_two_gang_waste_bags_count')).toBe(true);
    expect(ids.has('socket_composable_two_gang_own_voltage_indicator_count')).toBe(true);
    expect(pack.internalCompatibilityCandidate).toMatchObject({terminalType: 'automatic', stripLengthMm: 12,
      terminalCrossSectionMm2: [1.5, 2.5], conductorsPerTerminal: [1, 2], sourceIpFlapClosed: 'IP55',
      sourceIpFlapOpen: 'IP44', finalAssemblyIp: null, exactPairAdmission: false, actualLotMatch: false});
    expect(pack.sources.find(s => s.key === 'mechanism-certified-construction')).toMatchObject({
      sha256: 'c870413fed05a7f74fdcec61522f1e98e3e4bfa6fbd528a50ce2ba4bbb3e5fc5',
      exactMechanismConstruction: {salesReference: '069576L', terminalType: 'SCREWLESS', productScope: 'MECHANISM_ONLY'},
      exactPairAdmission: false, actualLotMatch: false, assembledIpAdmitted: false, sourceAuthorityPromoted: false});
    expect(d.resources.map(r => r.source_metadata?.primaryArtifactCandidates)).toEqual(d.resources.map(() => pack.sources));
    expect(pack.sources.find(s => s.key === 'box-manufacturer-mounting-guidance')).toMatchObject({
      representationKind: 'BOUNDED_CLOUD_PRIMARY_HTML_TEXT_WITNESS_NOT_RAW_HTML',
      manufacturerFact: {boxReference: '069672L', describedFixingPoints: 2, fixingCountAutoDerived: false, projectFixingScheduleStillRequired: true},
      exactPair069576L069672LAdmitted: false, actualPreparedHolesAdmitted: false, substrateCapacityAdmitted: false});
  });
  it('preserves the application source need even with all object and commercial fixture fields', async () => {
    const result = await core(testOnlyFacts());
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds).toHaveLength(50);
    expect(result.preliminaryNeeds.every(n => n.missing_parameter_ids.includes(source) && !Object.hasOwn(n, 'amount'))).toBe(true);
    const artifacts = savedArtifactNeeds(result); expect(artifacts).toHaveLength(50);
    expect(artifacts.every(n => n.included_in_estimate === false && n.included_in_procurement === false && n.procurement_eligible === false && n.amount === null)).toBe(true);
    for (const key of ['delivery', 'waste-removal']) expect(result.preliminaryNeeds.find(n => n.row_id === row(key))?.quantity).toBe('0');
    for (const trips of ['1', undefined]) {
      const facts = testOnlyFacts();
      for (const parameter of ['delivery_trips', 'waste_trips']) {
        if (trips === undefined) delete facts[id(parameter)]; else facts[id(parameter)] = trips;
      }
      const out = await core(facts); expect(out.rows).toEqual([]);
      for (const key of ['delivery', 'waste-removal']) {
        const needs = out.preliminaryNeeds.filter(n => n.row_id === row(key)); expect(needs).toHaveLength(1);
        expect(needs[0]?.quantity).toBe(trips ?? null);
        expect(needs[0]?.missing_parameter_ids).toContain(source);
      }
    }
    expect(result.preliminaryNeeds.find(n => n.row_id === row('mechanism:consumed'))?.quantity).toBe('5');
    expect(result.preliminaryNeeds.find(n => n.row_id === row('box:consumed'))?.quantity).toBe('5');
    expect(result.totals.amount).toBe('0');
  });
  it.each(independent.independentSupplyVectors)('calculates the held order reference through the real core for $name', async vector => {
    const result = await core({...testOnlyFacts(), [id('node_count')]: vector.consumed,
      [id('mechanism_stock')]: vector.stock, [id('mechanism_reserve')]: vector.reserve,
      [id('mechanism_quantum')]: vector.quantum});
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.find(n => n.row_id === row('mechanism:order'))?.quantity).toBe(vector.expectedOrder);
    expect(result.preliminaryNeeds.find(n => n.row_id === row('mechanism:remaining'))?.quantity).toBeNull();
    expect(savedArtifactNeeds(result).every(n => n.included_in_estimate === false && n.included_in_procurement === false && n.amount === null)).toBe(true);
  });
  it.each(['submitted', 'confirmed'] as const)('rejects a manufactured source acceptance through %s', async channel => {
    const p = testOnlyFacts();
    if (channel === 'submitted') p[source] = 'verified';
    await expect(core(p, channel === 'confirmed' ? {confirmedParameters: {[source]: 'verified'}} : {}))
      .rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
  });
  it('shows the factory box plate, frame and four membranes without new payment or orders', async () => {
    const d = definition(), result = await core(testOnlyFacts());
    for (const [key, quantity] of [['support-plate', '5'], ['frame', '5'], ['membrane-entry', '20']] as const) {
      const component = d.resources.find(r => r.row_id === row('box:factory-' + key));
      expect(component).toMatchObject({cost_owner_id: row('box:order'), procurement_eligible: false,
        resource_graph: {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', parentCostOwnerId: row('box:order'), includedInResourceOwnerRowId: row('box:order')}});
      expect(result.preliminaryNeeds.find(r => r.row_id === row('box:factory-' + key))?.quantity).toBe(quantity);
    }
    expect(d.resources.filter(r => r.procurement_eligible).map(r => r.row_id)).not.toContain(row('box:factory-membrane-entry'));
    expect(result.preliminaryNeeds.filter(r => r.row_id.includes(':box:factory-')).every(r =>
      r.missing_parameter_ids.includes(source) && !r.procurement_eligible)).toBe(true);
    expect(result.rows).toEqual([]);
  });
  it('does not turn a manual price or order into a source admission', async () => {
    const p = testOnlyFacts();
    const rowOverrides = {[row('mechanism:order')]: {quantity: '5', unitPrice: '77', includedInEstimate: true, includedInProcurement: true,
      provenance: {kind: 'manual', reason: 'TEST_ONLY source must remain held'}}};
    const result = await core(p, {rowOverrides});
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.find(n => n.row_id === row('mechanism:order'))?.missing_parameter_ids).toContain(source);
    const raw = result.preliminaryNeeds.find(n => n.row_id === row('mechanism:order'));
    expect(raw).toMatchObject({quantity: '5', unit_price: '77', procurement_eligible: true});
    const saved = savedArtifactNeeds(result, rowOverrides).filter(n => n.row_id === row('mechanism:order')); expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({quantity: '5', unit_price: '77', amount: null, included_in_estimate: false, included_in_procurement: false, procurement_eligible: false});
    expect(result.totals.amount).toBe('0');
  });
  it('retains unknown stock and cannot infer it from the count, price, pack or legacy q', async () => {
    const p = testOnlyFacts(); delete p[id('mechanism_stock')];
    const result = await core(p);
    expect(result.preliminaryNeeds.find(n => n.row_id === row('mechanism:order'))?.missing_parameter_ids)
      .toContain(id('mechanism_stock'));
    expect(result.preliminaryNeeds.find(n => n.row_id === row('mechanism:order'))?.quantity).toBeNull();
    await expect(core({...testOnlyFacts(), q: '100'})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
  });
  it.each([['node_count', '0'], ['node_count', '1.5'], ['mechanism_stock', '-1'], ['mechanism_quantum', '0']])
    ('rejects incompatible numeric fact %s=%s', async (key, value) => {
      await expect(core({...testOnlyFacts(), [id(key)]: value})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
    });
  it('omission of the new selector does not activate new rows; prepared direct fixing does not order anchors', () => {
    const d = definition();
    expect(d.resources.every(r => resolveInclusionGraph(r.inclusion_ast, {}).value === false)).toBe(true);
    const facts = {...testOnlyFacts(), [id('fixing')]: pack.fixingModes[0]};
    expect(d.resources.filter(r => r.row_id.startsWith(row('anchors:')))
      .every(r => resolveInclusionGraph(r.inclusion_ast, facts).value === false)).toBe(true);
  });
  it('rejects a shape-neighbour parent instead of silently replacing an existing variant', () => {
    const candidate = definition();
    expect(() => append(candidate)).toThrow('SOCKET_COMPOSABLE_EXACT_R266_SINGLE_PARENT_REQUIRED');
  });
});
