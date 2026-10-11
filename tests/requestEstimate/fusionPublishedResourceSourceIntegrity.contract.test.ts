import { createHash } from 'node:crypto';
import published from './fixtures/fusionPublishedSourceS2758.json';
import { fusionBenchDefinitionS2758 } from '../../src/lib/estimate/v4/fusionBenchPreparedConcreteS2758';
import { estimateDeterministicHash } from '../../src/lib/estimate/estimateDeterministicHash';
import { canonicalEstimateStableJson } from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import { canonicalDefinitionPublicationStableValueR1 } from '../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import { canonicalFusionResourceSourceBodyS2758 as body } from '../../src/lib/estimate/backendPlatform/canonicalFusionResourceSourceIntegrityS2758';
import { createCanonicalDefinitionClonePlan } from '../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import { hashMasterSingleDefinitionSuccessorReceiptR1 as publisherHash } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const origin = { contract: published.definition.source_metadata.contract, catalogId: published.catalogId,
  definitionId: published.definitionId, sourceFingerprint: published.definition.source_metadata.sourceFingerprint };
const factory = () => clone(fusionBenchDefinitionS2758());
const type = (category: unknown) => category === 'material' ? 'material' : category === 'equipment' ? 'equipment'
  : category === 'service' ? 'service' : category === 'construction_work' ? 'labor' : 'other';
function uuid(seed: string) {
  const bytes = Buffer.from(publisherHash(seed).slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function targetPlan() {
  const targetOrigin = { ...origin, definitionId: 'a40acd1d-0731-5a9f-8750-c18cb4f1e110', sourceFingerprint: 'a'.repeat(64) };
  const resources = factory().resources.map(resource => ({ ...resource, row_type: type(resource.category) }));
  // The actual publisher projection is the subject of this fixture. Header and
  // baseline placeholders are not admission evidence for a complete definition.
  const plan = createCanonicalDefinitionClonePlan({ contract: origin.contract,
    definition: { id: targetOrigin.definitionId, releaseId: published.definition.release_id, catalogId: origin.catalogId,
      definitionVersion: 2, passport: {}, applicability: {}, definitionSha256: 'b'.repeat(64), sourceMetadata: {} },
    representative: { parameters: [], formulas: [], resources, bindings: [], baseline: {}, passport: {} },
    parameterTruthMetadata: parameter => parameter.truth_metadata,
    resourceId: resource => uuid(`${origin.contract}:${targetOrigin.sourceFingerprint}:${origin.catalogId}:resource:${resource.row_id}`),
    resourceSemanticOwner: resource => `${origin.catalogId}:${resource.row_id}`,
    resourceSha256: resource => publisherHash({ contract: origin.contract, targetCatalogId: origin.catalogId, resource }),
    baseline: { id: published.parameters[0].approved_template_baseline_id, key: 'resource-integrity-fixture',
      sourceDefinitionVersionId: origin.definitionId, validationScenarioRefs: [], acceptanceEvidenceSha256: 'c'.repeat(64),
      acceptedReleaseId: published.definition.release_id, supersedesBaselineId: null },
    passport: { physicalResultRu: '', excludedScopeRu: [], decision: {}, payloadSha256: 'd'.repeat(64), sourceHead: '', sourceTree: '' },
    bindingApplicability: binding => binding.applicability, expectedNormativeBindingCount: 0 });
  return { origin: targetOrigin, resources: plan.resources.map(resource => ({ ...resource, created_at: published.resources[0].created_at })) };
}

test.each(published.resources)('verifies the actual published resource $row_id and its complete factory inverse', resource => {
  const actual = body({ resource, representation: 'PUBLISHED_MASTER_SQL', publishedOrigin: origin });
  expect(actual).not.toBeNull();
  const row = factory().resources.find(item => item.row_id === resource.row_id)!;
  delete row.resource_graph.derivedQuantityEditPolicyV1;
  const { row_sha256: ignored, ...legacy } = row;
  expect(actual).toEqual(legacy);
  expect(body({ resource: { ...legacy, row_sha256: estimateDeterministicHash(legacy) }, representation: 'FACTORY_ARTIFACT' })).toEqual(actual);
});

test('uses the actual publisher plan for all thirteen policy-bearing target resources', () => {
  const plan = targetPlan();
  expect(plan.resources).toHaveLength(13);
  for (const resource of plan.resources) {
    const verified = body({ resource, representation: 'PUBLISHED_MASTER_SQL', publishedOrigin: plan.origin });
    const { row_sha256: ignored, ...source } = factory().resources.find(row => row.row_id === resource.row_id)!;
    expect(verified).toEqual(source);
  }
});

test.each(['hash', 'source', 'unit', 'graph', 'rowType', 'owner', 'uuid', 'definition', 'extra', 'missing'])('rejects %s corruption without weakening the published hash guard', change => {
  const resource: Record<string, unknown> = clone(published.resources[0]);
  if (change === 'hash') resource.row_sha256 = 'f'.repeat(64);
  if (change === 'source') resource.source_metadata = { ...published.resources[0].source_metadata, exact_locator: 'different source' };
  if (change === 'unit') resource.unit_id = 'm';
  if (change === 'graph') resource.resource_graph = { ...published.resources[0].resource_graph, extraOwner: 'unreviewed' };
  if (change === 'rowType') resource.row_type = 'labor';
  if (change === 'owner') resource.semantic_owner = 'different owner';
  if (change === 'uuid') resource.id = 'a40acd1d-0731-5a9f-8750-c18cb4f1e110';
  if (change === 'definition') resource.definition_version_id = 'a40acd1d-0731-5a9f-8750-c18cb4f1e110';
  if (change === 'extra') resource.futureUnreviewedField = 'unreviewed';
  if (change === 'missing') delete resource.cost_owner_id;
  expect(body({ resource, representation: 'PUBLISHED_MASTER_SQL', publishedOrigin: origin })).toBeNull();
});

test.each(['catalog', 'contract', 'fingerprint'])('rejects an unbound %s publication origin', change => {
  const forged = { ...origin };
  if (change === 'catalog') forged.catalogId += '-other';
  if (change === 'contract') forged.contract += '.other';
  if (change === 'fingerprint') forged.sourceFingerprint = 'f'.repeat(64);
  expect(body({ resource: published.resources[0], representation: 'PUBLISHED_MASTER_SQL', publishedOrigin: forged })).toBeNull();
});

test('keeps the historical serializer byte order, with a fixed golden digest and all real outer hashes', () => {
  const value = { Z: 1, A: 2, aB: 3, a_b: 5, _a: 6, nested: { X: 7, b: 8 }, omitted: undefined };
  const serialized = JSON.stringify(canonicalDefinitionPublicationStableValueR1(value));
  expect(serialized).toBe('{"_a":6,"A":2,"a_b":5,"aB":3,"nested":{"b":8,"X":7},"Z":1}');
  expect(publisherHash(value)).toBe('7bb991a41202bc8aa5ad8779e70176079d8a4f2c5ed33df56122c04e24d5c729');
  const resource = published.resources[0], verified = body({ resource, representation: 'PUBLISHED_MASTER_SQL', publishedOrigin: origin })!;
  const envelope = { contract: origin.contract, targetCatalogId: origin.catalogId,
    resource: { ...verified, row_sha256: estimateDeterministicHash(verified), row_type: resource.row_type } };
  expect(publisherHash(envelope)).toBe(resource.row_sha256);
  expect(createHash('sha256').update(canonicalEstimateStableJson(envelope)).digest('hex')).not.toBe(resource.row_sha256);
});
