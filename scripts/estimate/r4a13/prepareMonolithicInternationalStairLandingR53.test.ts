import { currentLandingParentR53, monolithicInternationalStairLandingConfigR53 } from './prepareMonolithicInternationalStairLandingR53';
import { masterRetainParentBindingsOptInR1, assembleMasterExplicitParameterSourcesR1,
  assertMasterRetainedParentComputationR1 } from './masterSingleDefinitionRetainParentBindingsR1';
import { appendMonolithicInternationalStairLandingR53, LANDING_SELECTOR_R53, LANDING_CHOICE_R53 } from '../../../src/lib/estimate/v4/monolithicInternationalStairLandingCompositionR53';
import { internationalStairLandingPackR53 as pack, landingParameterR53 as p, landingRowR53 as r } from '../../../src/lib/estimate/v4/monolithicInternationalStairLandingR53';
import { resolvePrimaryMeasureSelectionV1 } from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import { compileCanonicalEstimateCore } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { evaluateInclusionGraph } from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import { estimateDeterministicHash as hash } from '../../../src/lib/estimate/estimateDeterministicHash';
import { assertCanonicalMachineHourDefinitionV1, canonicalManualMachineHourPriceCoverageV1,
  parseCanonicalMachineHourPriceCoverageV1, resolveCanonicalMachineHourPriceCoverageV1 } from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';

const context = { releaseId: 'f7fcd344-b7f5-50f4-8c0a-b5d23851b55b', searchReleaseId: '35770814-0347-567e-9133-f53a3958b636', outputRoot: 'work/unrun-landing-r53' };
const input = { [LANDING_SELECTOR_R53]: LANDING_CHOICE_R53, [p('length_m')]: '2.5', [p('width_m')]: '1.2',
  [p('thickness_mm')]: '200', [p('identical_count')]: 2, [p('work_elevation_m')]: '3' };
// Registry UUIDs are test identities only; this pure guard never writes them.
const guardInput = (config: ReturnType<typeof monolithicInternationalStairLandingConfigR53>) => ({ config,
  newSource: { id: '11111111-1111-5111-8111-111111111111', source_key: pack.sourceId,
    title_ru: config.sourceMetadata.source_title, authority: config.sourceMetadata.source_authority,
    official_url: null, artifact_sha256: pack.source.sha256, effective_from: null, effective_to: null,
    metadata: { contract: pack.contract, ...config.sourceMetadata } },
  newLocators: [{ id: '22222222-2222-5222-8222-222222222222', source_id: '11111111-1111-5111-8111-111111111111',
    locator_key: config.locator.key, locator: config.locator.payload, excerpt_sha256: pack.source.sha256 }],
});

it('retains exact old formulas and owner identities through the normal retained guard, and exposes only six understandable fields for landing', () => {
  const config = monolithicInternationalStairLandingConfigR53(context);
  const opt = masterRetainParentBindingsOptInR1(guardInput(config));
  expect(opt).not.toBeNull();
  const { parent, primarySelection } = currentLandingParentR53();
  const next = appendMonolithicInternationalStairLandingR53({ catalogId: pack.catalogId, parent, primarySelection, expectedParentFingerprint: hash(parent) });
  assertMasterRetainedParentComputationR1(guardInput(config), { parameters: [...next.definition.parameters],
    formulas: [...next.definition.formulas], resources: [...next.definition.resources] }, 'REPRESENTATIVE');
  expect(next.definition.formulas.slice(0, parent.formulas.length)).toEqual(parent.formulas);
  expect(next.primarySelection.selections.slice(0, 3)).toEqual(primarySelection.selections);
  expect(config.catalogAppend).toBeUndefined();
  const visible = next.definition.parameters.filter(q => q.truth_metadata.visibility_role === 'USER_INPUT'
    && (!q.truth_metadata.visible_when || evaluateInclusionGraph(q.truth_metadata.visible_when as Record<string, unknown>, input)));
  expect(visible.map(q => q.parameter_id)).toEqual([LANDING_SELECTOR_R53, ...['length_m','width_m','thickness_mm','identical_count','work_elevation_m'].map(p)]);
  const oldIds = new Set(parent.parameters.map(q => q.parameter_id));
  const added = next.definition.parameters.filter(q => !oldIds.has(q.parameter_id));
  const sources = assembleMasterExplicitParameterSourcesR1({ errorPrefix: 'LANDING_TEST_', parameters: [...added],
    newParameterSources: opt!.newParameterSources, sourceClosure: [pack.sourceId], oldResourceRowIds: parent.resources.map(q => q.row_id),
    next: { parameters: [...next.definition.parameters], formulas: [...next.definition.formulas], resources: [...next.definition.resources] } });
  expect(Object.keys(sources).sort()).toEqual(added.map(q => q.parameter_id).sort());
  expect(added.filter(q => q.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM')).toHaveLength(10);
  for (const q of added.filter(q => q.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM')) expect(sources[q.parameter_id]).toEqual([]);
  const schema = next.definition.parameters.map(q => ({ parameterId: q.parameter_id, valueType: q.value_type,
    unitId: q.unit_id, visibilityRole: q.truth_metadata.visibility_role as string, valueSourceRole: q.truth_metadata.value_source_role as string,
    constraints: q.constraints_json ?? undefined, formulaConsumers: q.truth_metadata.formula_consumers as string[], provenance: q.truth_metadata.provenance as Record<string, unknown> }));
  expect(resolvePrimaryMeasureSelectionV1({ selectionMetadata: next.primarySelection, parameterSchema: schema, submittedParameters: input })).toMatchObject({ kind: 'RESOLVED', primaryMeasure: { parameterId: p('volume_m3'), unitId: 'm3' } });
  expect(resolvePrimaryMeasureSelectionV1({ selectionMetadata: next.primarySelection, parameterSchema: schema, submittedParameters: input,
    parentPrimaryMeasure: { parameterId: 'plan_dimension_concrete_volume_m3', unitId: 'm3' } })).toMatchObject({ kind: 'NEW_ROOT_REQUIRED', carryForward: { parameters: false, rowOverrides: false, prices: false } });
});

it('runs the actual normal Config verifier once against the full retained current stairs model', async () => {
  const config = monolithicInternationalStairLandingConfigR53(context);
  expect(await config.verifyCore()).toMatchObject({ status: 'NORMAL_CONFIG_EXISTING_STAIRS_WHOLE_LANDING_CORE_VERIFIED',
    addedSourceRows: 49, addedSourceBindings: 39, ordinaryFields: 6, unresolvedWholeNeeds: 9, newPublicCards: 0, newFull: 0 });
});

it('keeps the exact current legacy calculation result when the landing branch is not selected', async () => {
  const { record, parent, primarySelection } = currentLandingParentR53();
  const next = appendMonolithicInternationalStairLandingR53({ catalogId: pack.catalogId, parent, primarySelection, expectedParentFingerprint: hash(parent) });
  const legacy = { ...record.capture.baseline.input_values, [LANDING_SELECTOR_R53]: 'Сохранённый прежний расчёт' };
  const run = (d: typeof parent) => compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: pack.contract,
    catalogId: pack.catalogId, primaryMeasureParameterId: 'plan_dimension_concrete_volume_m3', parameterDefinitions: [...d.parameters],
    formulaDefinitions: [...d.formulas], resourceDefinitions: [...d.resources], submittedParameters: legacy,
    confirmedParameters: {}, priceItems: [], currencyCode: 'USD', maximumResourceRows: d.resources.length, hashJson: hash });
  const before = await run(parent), after = await run(next.definition);
  const values = (v: typeof before) => [...v.rows, ...v.preliminaryNeeds].map(q => ({ id: q.row_id, quantity: q.quantity,
    unit: q.unit_id, title: q.title_ru, price: q.unit_price, total: q.amount, procurement: q.included_in_procurement }));
  expect(values(after)).toEqual(values(before));
  expect(values(after).some(q => q.id === r('net-volume'))).toBe(false);
});

it('admits only eight exact landing machine owners and keeps each full operation price unconfirmed without real price evidence', () => {
  const config = monolithicInternationalStairLandingConfigR53(context);
  const equipment = config.resourceDefinitions.filter(q => q.row_id.startsWith('monolithic-stair-landing:')
    && q.category === 'equipment' && q.unit_id === 'machine_hour' && q.resource_graph.costTreatment === 'OWN_COST');
  expect(equipment).toHaveLength(8);
  expect(assertCanonicalMachineHourDefinitionV1({ catalogId: pack.catalogId, rowId: r('metal-formwork-amortization'),
    unitId: 'set', sourceMetadata: null })).toBeNull();
  for (const q of equipment) {
    const requirement = assertCanonicalMachineHourDefinitionV1({ catalogId: pack.catalogId, rowId: q.row_id,
      unitId: q.unit_id, sourceMetadata: q.source_metadata ?? null });
    expect(requirement?.operationScope).toBe('FULL_SOURCE_OPERATION');
    expect(() => assertCanonicalMachineHourDefinitionV1({ catalogId: pack.catalogId, rowId: q.row_id, unitId: q.unit_id,
      sourceMetadata: { ...q.source_metadata, exact_column: '06-19-003-01' } })).toThrow('not admitted');
    expect(assertCanonicalMachineHourDefinitionV1({ catalogId: 'canonical-work:master:monolithic_reinforced_concrete_beam_standard',
      rowId: q.row_id, unitId: q.unit_id, sourceMetadata: q.source_metadata ?? null })).toBeNull();
    const evidence = canonicalManualMachineHourPriceCoverageV1({ rowId: q.row_id, unitPrice: '25', currencyCode: 'USD' });
    expect(parseCanonicalMachineHourPriceCoverageV1(evidence)).toEqual(evidence);
    expect(resolveCanonicalMachineHourPriceCoverageV1({ catalogId: pack.catalogId, rowId: q.row_id, unitId: q.unit_id,
      currencyCode: 'USD', unitPrice: '25', evidence: null, manual: true })?.status).toBe('UNCONFIRMED');
  }
});
