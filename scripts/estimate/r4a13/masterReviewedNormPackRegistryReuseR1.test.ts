import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareSelectedDeliveryNormativeRegistryR1} from './selectedMaterialDeliveryNormativeRegistryR1';
import {resolveMasterExistingNormativeRegistryReuseR1 as reuse, assertMasterExistingNormativeRegistrySnapshotR1 as snapshot,
  resolveMasterSingleDefinitionLocatorExcerptSha256R1 as excerpt} from './prepareMasterSingleDefinitionSuccessorR1';

type Json = Record<string, any>;
const path = 'data/estimate-norms/professional/delivery.json';
const bytes = readFileSync(path), sha = createHash('sha256').update(bytes).digest('hex');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function input(): Json {
  const r = prepareSelectedDeliveryNormativeRegistryR1({reviewedNormPackBytes: bytes, expectedNormPackSha256: sha});
  const source = {...r.source, effective_from: null, effective_to: null, created_at: '2026-10-18T12:47:32.310843+05:00'};
  return {config: {stopCode: 'TEST_PACK_REUSE', binding: {retainParentBindings: {captureCheckedByExistingGuard: true},
    reuseExistingNormativeRegistry: {contract: 'master-existing-normative-registry-reuse/r1',
      locatorExcerptHashKind: 'REVIEWED_NORM_PACK_ITEM_SHA256_R1', source, locators: [r.locator],
      reviewedNormPack: {artifactPath: path, artifactUtf8: bytes.toString('utf8')}}}},
    newSource: {...source, id: '11111111-1111-5111-8111-111111111111', created_at: undefined,
      metadata: {contract: 'new-consumer-does-not-own-the-registry'}},
    newLocators: [{...r.locator, id: '22222222-2222-5222-8222-222222222222', source_id: '11111111-1111-5111-8111-111111111111'}]};
}
const d = (v: Json) => v.config.binding.reuseExistingNormativeRegistry;
const run = (v: Json) => {delete v.newSource.created_at;return reuse(v as Parameters<typeof reuse>[0]);};

test('reuses the existing Ford item hash and full contract-free metadata without creating another registry owner', () => {
  const v = input(), original = clone(d(v)), r = run(v)!;
  expect(r.managedSource.id).toBe('f9d42c69-47ac-5246-8d9f-745e207d297d');
  expect(r.locators[0]!.id).toBe('d432b0bc-fd5a-5879-876b-0f425332cfc0');
  expect(r.locators[0]!.excerpt_sha256).toBe('efdb316d8d0ef025f884f9dd849792361717b020b304ab8e2658093ff7500b1c');
  expect(r.managedSource.metadata).toEqual(original.source.metadata);
  expect(r.managedSource.metadata).not.toHaveProperty('contract');
  expect(d(v)).toEqual(original);
  const config = {...v.config, locator: {key: original.locators[0].locator_key, payload: original.locators[0].locator},
    sourceMetadata: {exact_locator: original.locators[0].locator.exactLocator}};
  expect(excerpt(config as Parameters<typeof excerpt>[0])).toBe(r.locators[0]!.excerpt_sha256);
  expect(() => snapshot(r, {newSources: [original.source], newLocators: original.locators})).not.toThrow();
});

test.each(['bytes', 'path', 'unreviewed', 'metadata', 'owner-contract', 'item-hash', 'unit', 'source-url', 'locator-text', 'version', 'candidate-hash', 'extra-proof', 'missing-proof'])(
  'rejects an incompatible reviewed registry proof: %s', mode => {
    const v = input(), p = d(v);
    if (mode === 'bytes') p.reviewedNormPack.artifactUtf8 += '\n';
    if (mode === 'path') p.reviewedNormPack.artifactPath = '../delivery.json';
    if (mode === 'unreviewed') {
      const raw = JSON.parse(p.reviewedNormPack.artifactUtf8);raw.review_status = 'draft';
      p.reviewedNormPack.artifactUtf8 = JSON.stringify(raw);p.source.artifact_sha256 = createHash('sha256').update(p.reviewedNormPack.artifactUtf8).digest('hex');v.newSource.artifact_sha256 = p.source.artifact_sha256;
    }
    if (mode === 'metadata') p.source.metadata.newPhysicalNorms = 1;
    if (mode === 'owner-contract') p.source.metadata.contract = 'replacement-owner';
    if (mode === 'item-hash') p.locators[0].excerpt_sha256 = 'a'.repeat(64);
    if (mode === 'unit') p.locators[0].locator.unitId = 'kg';
    if (mode === 'source-url') p.locators[0].locator.sourceUrl = 'https://example.invalid/other.pdf';
    if (mode === 'locator-text') p.locators[0].locator.exactLocator = 'another page';
    if (mode === 'version') p.locators[0].locator.sourceDocumentVersion = 'different';
    if (mode === 'candidate-hash') v.newLocators[0].excerpt_sha256 = 'a'.repeat(64);
    if (mode === 'extra-proof') p.reviewedNormPack.assumeCompatible = true;
    if (mode === 'missing-proof') delete p.reviewedNormPack;
    expect(() => run(v)).toThrow();
  });

test.each(['missing', 'timestamp', 'metadata', 'locator'])(
  'keeps exact existing registry readback mandatory: %s', mode => {
    const v = input(), r = run(v)!, actual = {newSources: [clone(d(v).source)], newLocators: clone(d(v).locators)};
    if (mode === 'missing') actual.newSources = [];
    if (mode === 'timestamp') actual.newSources[0].created_at = '2026-10-18T12:47:32.310+05:00';
    if (mode === 'metadata') actual.newSources[0].metadata.newPhysicalNorms = 1;
    if (mode === 'locator') actual.newLocators[0].locator.unitId = 'kg';
    expect(() => snapshot(r, actual)).toThrow('FULL_EXISTING_');
  });
