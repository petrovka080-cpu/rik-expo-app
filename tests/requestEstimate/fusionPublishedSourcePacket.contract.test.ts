import published from './fixtures/fusionPublishedSourceS2758.json';
import context from './fixtures/fusionPublishedSourceContextS2758.json';
import { fusionBenchDefinitionS2758 } from '../../src/lib/estimate/v4/fusionBenchPreparedConcreteS2758';
import { buildMasterParameterCalculationConsumers as consumers } from '../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import { canonicalFusionPublishedRootSourceBindingS2758 as rootBinding,
  canonicalFusionPublishedPolicyAdoptionSourceBindingsS2758 as adoption,
  type CanonicalFusionPublishedSourcePacketS2758 as Packet } from '../../src/lib/estimate/backendPlatform/canonicalFusionPublishedSourcePacketS2758';
import { hashMasterSingleDefinitionSuccessorReceiptR1 as hash } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import { createCanonicalDefinitionClonePlan } from '../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import { canonicalApprovedBaselineRuntimeParameters } from '../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import { compileFormulaGraph } from '../../src/lib/estimate/backendPlatform/formulaGraph';
import { estimateDeterministicHash } from '../../src/lib/estimate/estimateDeterministicHash';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const parent = (): Packet => clone({ ...published, ...context, expectedReleaseId: context.manifest.release_id });
function uuid(seed: string) {
  const text = hash(seed).slice(0, 32).split(''); text[12] = '5'; text[16] = ((parseInt(text[16], 16) & 3) | 8).toString(16);
  const hex = text.join(''); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function target(changeFactory?: (definition: ReturnType<typeof fusionBenchDefinitionS2758>) => void): Packet {
  const from = parent(), d = clone(fusionBenchDefinitionS2758()), contract = from.definition.source_metadata.contract;
  changeFactory?.(d);
  const catalog = from.definition.catalog_id, fingerprint = 'a'.repeat(64);
  const id = uuid(`${contract}:${fingerprint}:definition`), release = uuid(`${contract}:${fingerprint}:definition-release`), baselineId = uuid(`${contract}:${fingerprint}:baseline`);
  const type = (category: unknown) => category === 'material' ? 'material' : category === 'equipment' ? 'equipment'
    : category === 'service' ? 'service' : category === 'construction_work' ? 'labor' : 'other';
  const formulaRows = d.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })), resourceRows = d.resources.map(r => ({ ...r, row_type: type(r.category) }));
  const calculationConsumers = consumers({ parameters: d.parameters, formulas: formulaRows, resources: resourceRows });
  const parameterSchemaSha256 = hash(d.parameters), definitionSchemaSha256 = hash({ formulaRows, resourceRows });
  const definitionSha = hash({ contract, catalogId: catalog, parameterSchemaSha256, definitionSchemaSha256 });
  const scenario = clone(from.baseline.validation_scenario_refs[0]);
  const lineage = { rootBaselineId: from.baseline.id, baselineId: from.baseline.id, definitionVersionId: from.definition.id,
    acceptedReleaseId: from.definition.release_id, depth: 0, path: [from.baseline.id] };
  const acceptanceSha = hash({ contract, shortInput: scenario.shortInput, acceptanceInput: scenario.fixture,
    runtimeProfileInput: scenario.runtimeProfile, runtimeProfileClassification: scenario.runtimeProfileClassification,
    runtimeProfileSourceIds: scenario.runtimeProfileSourceIds, independentCompletenessMap: from.passport.decision.independentCompletenessMap,
    coreAcceptance: scenario.coreAcceptance, parameterSchemaSha256, definitionSchemaSha256, lineage });
  scenario.acceptanceEvidenceSha256 = acceptanceSha;
  // Full target SQL fixture uses the actual publisher projection and hash
  // callbacks. This is a pure compatibility test, not an admitted live release.
  const plan = createCanonicalDefinitionClonePlan({ contract,
    definition: { id, releaseId: release, catalogId: catalog, definitionVersion: 2,
      passport: from.definition.passport, applicability: from.definition.applicability, definitionSha256: definitionSha,
      sourceMetadata: { ...from.definition.source_metadata, sourceFingerprint: fingerprint } },
    representative: { parameters: [...d.parameters], formulas: formulaRows, resources: resourceRows,
      bindings: [{ row_id: resourceRows[0].row_id, locator_id: from.locators[0].id, applicability: from.bindings[0].applicability }],
      baseline: { ...from.baseline, parameter_schema_sha256: parameterSchemaSha256,
        formula_consumer_ids: calculationConsumers.formulaConsumers, resource_consumer_row_ids: calculationConsumers.resourceConsumers },
      passport: from.passport },
    parameterTruthMetadata: p => ({ ...p.truth_metadata, contract, semantic_parameter_key: `${catalog}:${p.parameter_id}`,
      formula_consumers: calculationConsumers.formulaConsumers[p.parameter_id], resource_branch_consumers: calculationConsumers.resourceConsumers[p.parameter_id] }),
    resourceId: r => uuid(`${contract}:${fingerprint}:${catalog}:resource:${r.row_id}`),
    resourceSemanticOwner: r => `${catalog}:${r.row_id}`,
    resourceSha256: r => hash({ contract, targetCatalogId: catalog, resource: r }),
    baseline: { id: baselineId, key: `${contract}:${fingerprint.slice(0, 16)}:${catalog}`, sourceDefinitionVersionId: from.definition.id,
      validationScenarioRefs: [scenario], acceptanceEvidenceSha256: acceptanceSha, acceptedReleaseId: release, supersedesBaselineId: from.baseline.id },
    passport: { physicalResultRu: from.passport.physical_result_ru, excludedScopeRu: from.passport.excluded_scope_ru,
      decision: from.passport.decision, payloadSha256: hash({ targetDefinitionSha256: definitionSha,
        acceptanceEvidenceSha256: acceptanceSha, independentCompletenessMap: from.passport.decision.independentCompletenessMap }),
      sourceHead: from.passport.source_head, sourceTree: from.passport.source_tree },
    bindingApplicability: binding => binding.applicability, expectedNormativeBindingCount: 1 });
  return { ...from, expectedReleaseId: release,
    // publishCanonicalDefinitionDraft / canonicalPlanPayload perform this
    // admitted lifecycle transition after the clone-plan preflight.
    definition: { ...plan.definition, content_status: from.definition.content_status,
      content_gate_status: from.definition.content_gate_status, created_at: from.definition.created_at },
    manifest: { ...from.manifest, release_id: release, definition_version_id: id, source_release_id: release,
      approved_template_baseline_id: baselineId, definition_hash: definitionSha,
      entry_sha256: hash({ contract, releaseId: release, catalogId: catalog, definitionId: id, baselineId, targetDefinitionSha256: definitionSha }) },
    parameters: plan.parameters, formulas: plan.formulas,
    resources: plan.resources.map(r => ({ ...r, created_at: from.resources[0].created_at })),
    baseline: { ...plan.baseline, accepted_at: from.baseline.accepted_at },
    passport: { ...plan.passport, created_at: from.passport.created_at }, bindings: plan.bindings };
}

test('verifies all actual parent records, including manifest-selected baseline, source and publication evidence', () => {
  expect(rootBinding(parent())?.mode).toBe('LEGACY');
  expect(canonicalApprovedBaselineRuntimeParameters(parent().baseline)).toEqual({});
  expect(parent().definition.release_id).not.toBe(parent().expectedReleaseId);
});

test('verifies a complete publisher-shaped three-policy successor without dropping baseline or source meaning', () => {
  const proof = adoption({ from: parent(), to: target() });
  expect(proof?.from.mode).toBe('LEGACY'); expect(proof?.to.mode).toBe('PARAMETERS_ONLY');
  expect(proof?.from.sourceSemanticSha256).toBe(proof?.to.sourceSemanticSha256);
});

test.each(['manifestDefinition', 'manifestBaseline', 'parameterBaseline', 'baselineCatalog', 'baselineDefinition',
  'baselineAcceptedRelease', 'baselineSourceDefinition', 'baselineSupersedes', 'pinnedRelease', 'definitionUuid',
  'definitionRelease', 'definitionHash', 'baselineSchema', 'acceptanceHash', 'passportHash', 'sourceFingerprint'])('rejects mismatched %s provenance', change => {
  const packet = target();
  if (change === 'manifestDefinition') packet.manifest.definition_version_id = parent().definition.id;
  if (change === 'manifestBaseline') packet.manifest.approved_template_baseline_id = parent().baseline.id;
  if (change === 'parameterBaseline') packet.parameters[0].approved_template_baseline_id = parent().baseline.id;
  if (change === 'baselineCatalog') packet.baseline.catalog_id += '-foreign';
  if (change === 'baselineDefinition') packet.baseline.definition_version_id = parent().definition.id;
  if (change === 'baselineAcceptedRelease') packet.baseline.accepted_release_id = parent().definition.release_id;
  if (change === 'baselineSourceDefinition') packet.baseline.source_definition_version_id = packet.definition.id;
  if (change === 'baselineSupersedes') packet.baseline.supersedes_baseline_id = null;
  if (change === 'pinnedRelease') packet.manifest.release_id = parent().expectedReleaseId;
  if (change === 'definitionUuid') packet.definition.id = parent().definition.id;
  if (change === 'definitionRelease') packet.definition.release_id = parent().definition.release_id;
  if (change === 'definitionHash') packet.definition.definition_sha256 = 'f'.repeat(64);
  if (change === 'baselineSchema') packet.baseline.parameter_schema_sha256 = 'f'.repeat(64);
  if (change === 'acceptanceHash') packet.baseline.acceptance_evidence_sha256 = 'f'.repeat(64);
  if (change === 'passportHash') packet.passport.payload_sha256 = 'f'.repeat(64);
  if (change === 'sourceFingerprint') packet.definition.source_metadata.sourceFingerprint = 'f'.repeat(64);
  expect(adoption({ from: parent(), to: packet })).toBeNull();
});

test.each(['classification', 'baselineValues', 'normativeSources', 'guide', 'parameterMeaning', 'master', 'applicability',
  'passportScope', 'locator', 'source', 'bindingApplicability', 'sourcePriceBinding', 'unknownColumn'])('rejects changed %s semantics', change => {
  const packet = target();
  if (change === 'classification') delete packet.baseline.input_classification.bench_count;
  if (change === 'baselineValues') packet.baseline.input_values.bench_stock = 99;
  if (change === 'normativeSources') packet.baseline.normative_source_ids.bench_count = ['foreign source'];
  if (change === 'guide') packet.baseline.guide_provenance_ru.bench_count = 'different guide';
  if (change === 'parameterMeaning') packet.parameters[0].truth_metadata.semantic_parameter_key = 'foreign parameter';
  if (change === 'master') packet.definition.source_metadata.masterSha256 = 'f'.repeat(64);
  if (change === 'applicability') packet.definition.applicability.fixingsPerInstalledBench = 5;
  if (change === 'passportScope') packet.passport.included_scope_ru = ['Different scope'];
  if (change === 'locator') packet.locators[0].locator = { changed: true };
  if (change === 'source') packet.sources[0].metadata.useRestriction = 'different restriction';
  if (change === 'bindingApplicability') packet.bindings[0].applicability = { changed: true };
  if (change === 'sourcePriceBinding') (packet.priceBindings as Record<string, unknown>[]).push({ price_key: 'new price' });
  if (change === 'unknownColumn') packet.parameters[0].futureUnreviewedMeaning = 'new';
  expect(adoption({ from: parent(), to: packet })).toBeNull();
});

test('SQL record order is immaterial while logical ordinals and complete metadata remain preserved', () => {
  const from = parent(), to = target();
  (from.parameters as unknown[]).reverse(); (from.resources as unknown[]).reverse(); (from.formulas as unknown[]).reverse();
  (to.parameters as unknown[]).reverse(); (to.resources as unknown[]).reverse(); (to.formulas as unknown[]).reverse();
  expect(adoption({ from, to })).not.toBeNull();
});

test.each(['parameter', 'formula', 'resourceSource', 'resourceGraph'] as const)('a correctly rehashed %s change still fails policy-only semantic compatibility', change => {
  const to = target(d => {
    if (change === 'parameter') d.parameters.find(p => p.parameter_id === 'bench_stock')!.constraints_json = { min: 2 };
    if (change === 'formula') {
      const f = d.formulas[1], expression = String(f.expression_source) + '+0';
      const compiled = compileFormulaGraph(expression); f.expression_source = expression;
      f.ast = compiled.ast; f.input_parameter_ids = [...compiled.inputParameterIds];
    }
    if (change === 'resourceSource') d.resources[0].source_metadata = { ...d.resources[0].source_metadata, exact_locator: 'different physical source' };
    if (change === 'resourceGraph') d.resources[0].resource_graph.additionalUnreviewedOwner = 'different owner';
    for (const r of d.resources) { const { row_sha256: ignored, ...body } = r; r.row_sha256 = estimateDeterministicHash(body); }
  });
  expect(adoption({ from: parent(), to })).toBeNull();
});

test('rejects unready definitions and manifests and an unrelated definition generation', () => {
  const unready = target(); unready.definition.content_status = 'QUARANTINED'; unready.definition.content_gate_status = 'RED';
  expect(adoption({ from: parent(), to: unready })).toBeNull();
  const manifest = target(); manifest.manifest.scenario_ready = false;
  expect(adoption({ from: parent(), to: manifest })).toBeNull();
  const unrelated = target(); unrelated.definition.definition_version = 3;
  expect(adoption({ from: parent(), to: unrelated })).toBeNull();
});
