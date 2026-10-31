import { currentFlightParentR54, monolithicInternationalStairFlightsConfigR54 as buildConfig } from './prepareMonolithicInternationalStairFlightsR54';
import { masterRetainParentBindingsOptInR1, assembleMasterExplicitParameterSourcesR1,
  assertMasterRetainedParentComputationR1 } from './masterSingleDefinitionRetainParentBindingsR1';
import { appendMonolithicInternationalStairFlightsR54, FLIGHT_SELECTOR_R54 } from '../../../src/lib/estimate/v4/monolithicInternationalStairFlightsCompositionR54';
import { internationalStairFlightsPackR54 as pack, FLIGHT_COLUMNS_R54,
  flightParameterR54 as p, flightRowR54 as r, buildMonolithicInternationalStairFlightR54 } from '../../../src/lib/estimate/v4/monolithicInternationalStairFlightsR54';
import { resolvePrimaryMeasureSelectionV1 } from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import { compileCanonicalEstimateCore } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { evaluateInclusionGraph } from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import { estimateDeterministicHash as hash } from '../../../src/lib/estimate/estimateDeterministicHash';
import { assertCanonicalMachineHourDefinitionV1, canonicalManualMachineHourPriceCoverageV1,
  parseCanonicalMachineHourPriceCoverageV1, resolveCanonicalMachineHourPriceCoverageV1 } from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';

const context = { releaseId: 'b470bf53-ae6b-54dd-a2d6-5e361810469d', searchReleaseId: '33cd1bd0-1c3e-5e51-b8d3-aecea2dd8080', outputRoot: 'work/unrun-flights-r54' };
const guard = (config: ReturnType<typeof buildConfig>) => ({ config,
  newSource: { id: '11111111-1111-5111-8111-111111111111', source_key: pack.sourceId,
    title_ru: config.sourceMetadata.source_title, authority: config.sourceMetadata.source_authority,
    official_url: null, artifact_sha256: pack.source.sha256, effective_from: null, effective_to: null,
    metadata: { contract: pack.contract, ...config.sourceMetadata } },
  newLocators: [{ id: '22222222-2222-5222-8222-222222222222', source_id: '11111111-1111-5111-8111-111111111111',
    locator_key: config.locator.key, locator: config.locator.payload, excerpt_sha256: pack.source.sha256 }],
});

it('retains all four current stair profiles, accepts two whole flight columns through the normal guard and qualifies the public scope', () => {
  const config = buildConfig(context), { record, parent, primarySelection } = currentFlightParentR54();
  const next = appendMonolithicInternationalStairFlightsR54({ catalogId: pack.catalogId, parent, primarySelection, expectedParentFingerprint: hash(parent) });
  const opt = masterRetainParentBindingsOptInR1(guard(config));
  expect(opt).not.toBeNull();
  assertMasterRetainedParentComputationR1(guard(config), { parameters: [...next.definition.parameters],
    formulas: [...next.definition.formulas], resources: [...next.definition.resources] }, 'REPRESENTATIVE');
  expect(next.definition.formulas.slice(0, 519)).toEqual(parent.formulas);
  expect(next.definition.resources.slice(0, 521).map(q => [q.id, q.row_id, q.cost_owner_id])).toEqual(parent.resources.map(q => [q.id, q.row_id, q.cost_owner_id]));
  expect(next.primarySelection.selections.slice(0, 4)).toEqual(primarySelection.selections);
  expect(record.capture.bindings).toHaveLength(378); expect(config.catalogAppend).toBeUndefined();
  expect(config.passport.physicalResultRu).toContain('либо прямоугольная площадка');
  expect(config.passport.physicalResultRu).not.toContain('Не площадка');
  expect(config.passport.excludedScopeRu.some(s => s.includes('Новый источник не допущен:'))).toBe(false);
  expect(config.search.includedBoundaries).toEqual(config.passport.includedScopeRu);
  expect(config.search.excludedBoundaries).toEqual(config.passport.excludedScopeRu);
  const oldIds = new Set(parent.parameters.map(q => q.parameter_id));
  const added = next.definition.parameters.filter(q => !oldIds.has(q.parameter_id));
  const sources = assembleMasterExplicitParameterSourcesR1({ errorPrefix: 'FLIGHTS_TEST_', parameters: [...added],
    newParameterSources: opt!.newParameterSources, sourceClosure: [pack.sourceId], oldResourceRowIds: parent.resources.map(q => q.row_id),
    next: { parameters: [...next.definition.parameters], formulas: [...next.definition.formulas], resources: [...next.definition.resources] } });
  expect(Object.keys(sources).sort()).toEqual(added.map(q => q.parameter_id).sort());
  const unresolved = added.filter(q => q.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM');
  expect(unresolved).toHaveLength(20);
  for (const q of unresolved) expect(sources[q.parameter_id]).toEqual([]);
  const schema = next.definition.parameters.map(q => ({ parameterId: q.parameter_id, valueType: q.value_type,
    unitId: q.unit_id, visibilityRole: String(q.truth_metadata.visibility_role), valueSourceRole: String(q.truth_metadata.value_source_role),
    constraints: q.constraints_json ?? undefined, formulaConsumers: q.truth_metadata.formula_consumers as string[],
    provenance: q.truth_metadata.provenance as Record<string, unknown> }));
  for (const column of FLIGHT_COLUMNS_R54) {
    const input = { [FLIGHT_SELECTOR_R54]: pack.columns.find(c => c.normId === column)!.choiceRu,
      [p(column, 'volume_m3')]: '2', [p(column, 'work_elevation_m')]: '3' };
    const visible = next.definition.parameters.filter(q => q.truth_metadata.visibility_role === 'USER_INPUT'
      && (!q.truth_metadata.visible_when || evaluateInclusionGraph(q.truth_metadata.visible_when as Record<string, unknown>, input)));
    expect(visible.map(q => q.parameter_id)).toEqual([FLIGHT_SELECTOR_R54, p(column, 'volume_m3'), p(column, 'work_elevation_m')]);
    expect(resolvePrimaryMeasureSelectionV1({ selectionMetadata: next.primarySelection, parameterSchema: schema, submittedParameters: input }))
      .toMatchObject({ kind: 'RESOLVED', primaryMeasure: { parameterId: p(column, 'volume_m3'), unitId: 'm3' } });
    expect(resolvePrimaryMeasureSelectionV1({ selectionMetadata: next.primarySelection, parameterSchema: schema, submittedParameters: input,
      parentPrimaryMeasure: { parameterId: 'mono_international_landing_r53_volume_m3', unitId: 'm3' } }))
      .toMatchObject({ kind: 'NEW_ROOT_REQUIRED', carryForward: { parameters: false, rowOverrides: false, prices: false } });
  }
});

it('checks both real whole flight profiles once through the normal Config verifier without carrying old source cycles', async () => {
  expect(await buildConfig(context).verifyCore()).toMatchObject({
    status: 'NORMAL_CONFIG_EXISTING_STAIRS_TWO_WHOLE_FLIGHTS_CORE_VERIFIED', coreCalls: 2,
    addedSourceRows: 108, addedSourceBindings: 88, ordinaryFields: 3, passportScopeQualified: true, newPublicCards: 0, newFull: 0,
  });
});

it('halves the new curved-flight quantities using the same core and preserves unknown project steel and kit needs', async () => {
  const column = FLIGHT_COLUMNS_R54[1], d = buildMonolithicInternationalStairFlightR54(column);
  const result = await compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: pack.contract, catalogId: pack.catalogId,
    primaryMeasureParameterId: p(column, 'volume_m3'), parameterDefinitions: [...d.parameters], formulaDefinitions: [...d.formulas],
    resourceDefinitions: [...d.resources], submittedParameters: { [p(column, 'volume_m3')]: '1', [p(column, 'work_elevation_m')]: '3' },
    confirmedParameters: {}, priceItems: [], currencyCode: 'USD', maximumResourceRows: d.resources.length, hashJson: hash });
  const all = [...result.rows, ...result.preliminaryNeeds];
  for (const [key, quantity] of Object.entries({ 'net-volume': '1', workers: '31.3638', operators: '0.6502',
    'tower-crane8t-consumed': '0.566', 'surface-vibrator-consumed': '0.78', 'heavy-concrete-consumed': '1.015',
    'bakelized-plywood-consumed': '0.876', 'construction-nails-consumed': '0.16', 'wire-11mm-consumed': '0.236' }))
    expect(all.find(q => q.row_id === r(column, key))?.quantity).toBe(quantity);
  expect(all.find(q => q.row_id === r(column, 'reinforcing-steel'))?.quantity).toBeNull();
  for (const need of pack.needs) expect(result.preliminaryNeeds.find(q => q.row_id === r(column, 'need:' + need.key))?.quantity).toBeNull();
  expect(all.some(q => q.included_in_procurement)).toBe(false);
});

it('admits only24 exact new flight machine owners and keeps unknown operation prices unconfirmed', () => {
  const resources = buildConfig(context).resourceDefinitions.filter(q => q.row_id.startsWith('monolithic-stair-flight:gesn2020:')
    && q.category === 'equipment' && q.unit_id === 'machine_hour' && q.resource_graph.costTreatment === 'OWN_COST');
  expect(resources).toHaveLength(24);
  for (const q of resources) {
    const request = { catalogId: pack.catalogId, rowId: q.row_id, unitId: q.unit_id, sourceMetadata: q.source_metadata ?? null };
    expect(assertCanonicalMachineHourDefinitionV1(request)?.operationScope).toBe('FULL_SOURCE_OPERATION');
    expect(() => assertCanonicalMachineHourDefinitionV1({ ...request, sourceMetadata: { ...q.source_metadata,
      exact_column: '06-20-001-01' } })).toThrow('not admitted');
    expect(assertCanonicalMachineHourDefinitionV1({ ...request, catalogId: 'canonical-work:expanded:standing_seam_roof' })).toBeNull();
    const evidence = canonicalManualMachineHourPriceCoverageV1({ rowId: q.row_id, unitPrice: '25', currencyCode: 'USD' });
    expect(parseCanonicalMachineHourPriceCoverageV1(evidence)).toEqual(evidence);
    expect(resolveCanonicalMachineHourPriceCoverageV1({ catalogId: pack.catalogId, rowId: q.row_id, unitId: q.unit_id,
      currencyCode: 'USD', unitPrice: '25', evidence: null, manual: true })?.status).toBe('UNCONFIRMED');
  }
});
