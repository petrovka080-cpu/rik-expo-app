import envelope from './fixtures/fusionPublishedSourceOriginS2758.json';
import originalRelease from './fixtures/fusionPublishedSourceReleaseS2758.json';
import inheritedNodes from './fixtures/fusionPublishedManifestChainS2758.json';
import { parent, target } from './fixtures/fusionPolicySuccessorFixtureS2758';
import { fusionBenchDefinitionS2758 } from '../../src/lib/estimate/v4/fusionBenchPreparedConcreteS2758';
import { canonicalFusionPublishedLegacyOriginSourceBindingS2758 as legacy,
  canonicalFusionPublishedPolicyAdoptionOriginBindingsS2758 as adoption } from '../../src/lib/estimate/backendPlatform/canonicalFusionPublishedSourceOriginS2758';
import { buildCanonicalMasterSingleDefinitionSourceOriginR1 as origin } from '../../src/lib/estimate/backendPlatform/canonicalMasterSingleDefinitionSourceOriginR1';
import { hashMasterSingleDefinitionSuccessorReceiptR1 as hash } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function successor(change?: (source: Record<string, any>) => void) {
  const from = parent(), definition = clone(fusionBenchDefinitionS2758());
  const type = (category: unknown) => category === 'material' ? 'material' : category === 'equipment' ? 'equipment'
    : category === 'service' ? 'service' : category === 'construction_work' ? 'labor' : 'other';
  const e: Record<string, any> = { ...clone(envelope), parentReleaseId: from.expectedReleaseId,
    parameters: definition.parameters, formulas: definition.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })),
    resources: definition.resources.map(r => ({ ...r, row_type: type(r.category) })) };
  delete e.catalogAppend;
  change?.(e);
  const declaration = origin({ catalogId: from.definition.catalog_id, envelope: e });
  if (!declaration) throw Error('Test declaration must be well formed');
  const to = target(undefined, declaration.fingerprint);
  const sourcePackage = hash({ contract: e.contract, fingerprint: declaration.fingerprint,
    definitionSchemaSha256: hash({ formulaRows: e.formulas, resourceRows: e.resources }) });
  const release = { ...clone(originalRelease), id: to.definition.release_id,
    parent_release_id: from.expectedReleaseId, source_commit: e.head, source_tree: e.tree,
    source_package_sha256: sourcePackage, metadata: { ...clone(originalRelease.metadata),
      masterSingleDefinitionSourceOriginV1: declaration } };
  return { from, fromOriginalSourceRelease: clone(originalRelease), to, toOriginalSourceRelease: release };
}

test('binds the exact real legacy SQL definition, original release and server-owned capsule', () => {
  const packet = parent();
  expect(packet.expectedReleaseId).not.toBe(originalRelease.id);
  expect(legacy({ packet, originalSourceRelease: clone(originalRelease) })?.mode).toBe('LEGACY');
});

test('an older revision pin uses the exact verified inherited publication-parent chain', () => {
  const input = successor(), publicationParent = { packet: clone(input.from), originalSourceRelease: clone(originalRelease), nodes: clone(inheritedNodes.chain) };
  const originalNode = inheritedNodes.chain[inheritedNodes.chain.length - 1];
  input.from = { ...input.from, expectedReleaseId: originalRelease.id, manifest: clone(originalNode.manifest) };
  expect(adoption(input)).toBeNull();
  expect(adoption({ ...input, publicationParent })).not.toBeNull();
  const wrong = clone(publicationParent);
  wrong.nodes[wrong.nodes.length - 1].manifest.entry_sha256 = 'f'.repeat(64);
  expect(adoption({ ...input, publicationParent: wrong })).toBeNull();
  const brokenMiddle = clone(publicationParent);
  brokenMiddle.nodes[1].aggregate.manifest_sha256 = 'e'.repeat(64);
  expect(adoption({ ...input, publicationParent: brokenMiddle })).toBeNull();
  const wrongParent = { ...clone(publicationParent), packet: { ...publicationParent.packet, expectedReleaseId: originalRelease.id } };
  expect(adoption({ ...input, publicationParent: wrongParent })).toBeNull();
  input.from.manifest.entry_sha256 = 'e'.repeat(64);
  expect(adoption({ ...input, publicationParent })).toBeNull();
});

test('a sibling legacy pin absent from the verified publication-parent chain cannot migrate', () => {
  const input = successor(), publicationParent = { packet: clone(input.from), originalSourceRelease: clone(originalRelease), nodes: clone(inheritedNodes.chain) };
  input.from = { ...input.from, expectedReleaseId: '11111111-1111-4111-8111-111111111111' };
  input.from.manifest.release_id = input.from.expectedReleaseId;
  expect(adoption({ ...input, publicationParent })).toBeNull();
});

test('binds a complete test-only successor declaration to its own SQL schemas and original parent', () => {
  const proof = adoption(successor());
  expect(proof?.from.mode).toBe('LEGACY'); expect(proof?.to.mode).toBe('PARAMETERS_ONLY');
  expect(proof?.from.sourceSemanticSha256).toBe(proof?.to.sourceSemanticSha256);
});

test('accepts PostgreSQL Date timestamps and JSON timestamps while rejecting invalid or unsealed releases', () => {
  const input = successor();
  input.fromOriginalSourceRelease.sealed_at = new Date(input.fromOriginalSourceRelease.sealed_at) as any;
  input.toOriginalSourceRelease.sealed_at = new Date(input.toOriginalSourceRelease.sealed_at) as any;
  expect(adoption(input)).not.toBeNull();
  input.toOriginalSourceRelease.sealed_at = new Date('invalid') as any;
  expect(adoption(input)).toBeNull();
  input.toOriginalSourceRelease.sealed_at = null as any;
  expect(adoption(input)).toBeNull();
});

test.each(['source_commit', 'source_tree', 'source_package_sha256', 'parent_release_id', 'id', 'status',
  'schema_version', 'activated_at'] as const)('rejects changed original release %s', field => {
  const release: Record<string, unknown> = clone(originalRelease);
  release[field] = field === 'schema_version' ? 7 : field === 'status' ? 'draft' : 'f'.repeat(64);
  expect(legacy({ packet: parent(), originalSourceRelease: release })).toBeNull();
});

test.each(['source_commit', 'source_tree', 'source_package_sha256', 'parent_release_id', 'id', 'status',
  'schema_version', 'activated_at'] as const)('rejects changed successor release %s', field => {
  const input = successor();
  (input.toOriginalSourceRelease as Record<string, unknown>)[field] = field === 'schema_version' ? 7 : field === 'status' ? 'draft' : 'f'.repeat(64);
  expect(adoption(input)).toBeNull();
});

test('requires the own successor namespace and refuses an unexpected legacy backfill', () => {
  const input = successor();
  delete (input.toOriginalSourceRelease.metadata as Record<string, unknown>).masterSingleDefinitionSourceOriginV1;
  expect(adoption(input)).toBeNull();
  const release = { ...clone(originalRelease), metadata: { ...clone(originalRelease.metadata),
    masterSingleDefinitionSourceOriginV1: origin({ catalogId: parent().definition.catalog_id, envelope: clone(envelope) }) } };
  expect(legacy({ packet: parent(), originalSourceRelease: release })).toBeNull();
});

test('inherited generic fingerprint does not determine either source identity', () => {
  const input = successor();
  (input.fromOriginalSourceRelease.metadata as Record<string, unknown>).sourceFingerprint = 'f'.repeat(64);
  (input.toOriginalSourceRelease.metadata as Record<string, unknown>).sourceFingerprint = 'e'.repeat(64);
  expect(adoption(input)).not.toBeNull();
});

test.each(['sourceId', 'normId', 'sourceMetadata', 'passport', 'applicability', 'binding', 'locators',
  'projectSourcePackage', 'projectSourcePackageSet', 'runtimeProfileInput', 'runtimeProfileClassification',
  'runtimeProfileSourceIds', 'search', 'validationScenario', 'coreAcceptance', 'catalogAppend'] as const)
('rejects an internally rehashed producer declaration with changed %s outside the SQL schemas', field => {
  const input = successor(e => { e[field] = typeof e[field] === 'string' ? String(e[field]) + ':changed' : { changed: true }; });
  expect(adoption(input)).toBeNull();
});
