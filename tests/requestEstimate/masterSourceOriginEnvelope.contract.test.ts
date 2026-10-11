import envelope from './fixtures/fusionPublishedSourceOriginS2758.json';
import published from './fixtures/fusionPublishedSourceS2758.json';
import { buildCanonicalMasterSingleDefinitionSourceOriginR1 as build,
  canonicalMasterSingleDefinitionSourceOriginMatchesR1 as matches } from '../../src/lib/estimate/backendPlatform/canonicalMasterSingleDefinitionSourceOriginR1';
import { hashMasterSingleDefinitionSuccessorReceiptR1 as oldPublisherHash } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const expected = { catalogId: published.catalogId, fingerprint: published.definition.source_metadata.sourceFingerprint,
  sourceCommit: '471406511d91b4720b907f3ca42d46bac4355283', sourceTree: 'd134bc64ca938ae42e660db3f40905f9407e983a',
  masterSha256: published.definition.source_metadata.masterSha256,
  sourcePackageSha256: 'ac0d67a5221798bc1b4821ca458bd044f3ff6b26ebc4047856d95eb4c0cd882d',
  parameterSchemaSha256: '275852a69cb9034dd18acd473b74fc6c180ec6f29f2caa2fa2bca8323159a9cf',
  definitionSchemaSha256: '6c764432aec7a19845d48df579d165cf03b54abf426cd57c228898647e2f3a61' };
const origin = () => build({ catalogId: expected.catalogId, envelope: clone(envelope) });

test('the namespaced declaration preserves the actual old publisher fingerprint and its separate schema/package bindings', () => {
  expect(oldPublisherHash(envelope)).toBe('0d25fd59266acf957800a345caab425c4c737c403e7c445bbad8d4efc532041e');
  expect(origin()?.fingerprint).toBe(oldPublisherHash(envelope));
  expect(matches({ ...expected, origin: origin() })).toBe(true);
  expect(origin()?.envelope).toEqual(envelope);
});

test.each(['catalogId', 'fingerprint', 'sourceCommit', 'sourceTree', 'masterSha256', 'sourcePackageSha256',
  'parameterSchemaSha256', 'definitionSchemaSha256'] as const)('rejects another authoritative %s even with a self-consistent declaration', field => {
  expect(matches({ ...expected, [field]: 'f'.repeat(64), origin: origin() })).toBe(false);
});

test.each(['parameters', 'formulas', 'resources', 'sourceHashes'] as const)('changes to %s cannot retain the admitted original fingerprint', field => {
  const changed: Record<string, unknown> = clone(envelope);
  changed[field] = [...(changed[field] as unknown[])].reverse();
  const declaration = build({ catalogId: expected.catalogId, envelope: changed });
  expect(declaration).not.toBeNull(); expect(declaration?.fingerprint).not.toBe(expected.fingerprint);
  expect(matches({ ...expected, origin: declaration })).toBe(false);
});

test('captures a detached publisher snapshot before a later input object mutation', () => {
  const input = clone(envelope), declaration = build({ catalogId: expected.catalogId, envelope: input });
  input.resources[0].title_ru = 'changed after capture'; input.sourceHashes[0].sha256 = 'f'.repeat(64);
  expect(declaration?.envelope).toEqual(envelope);
  expect(matches({ ...expected, origin: declaration })).toBe(true);
});

test('JSONB roundtrip and object key reordering preserve the exact historical publisher fingerprint', () => {
  const reordered = Object.fromEntries(Object.entries(clone(envelope)).reverse());
  expect(build({ catalogId: expected.catalogId, envelope: reordered })?.fingerprint).toBe(expected.fingerprint);
  expect(matches({ ...expected, origin: clone(origin()) })).toBe(true);
});

test('missing, unknown and undefined envelope fields fail before publishing a declaration', () => {
  const missing: Record<string, unknown> = clone(envelope); delete missing.masterSha256;
  expect(build({ catalogId: expected.catalogId, envelope: missing })).toBeNull();
  expect(build({ catalogId: expected.catalogId, envelope: { ...envelope, masterSha256: undefined } })).toBeNull();
  expect(build({ catalogId: expected.catalogId, envelope: { ...envelope, sourceVerified: true } })).toBeNull();
});

test('inherited foreign generic fingerprints and permission flags cannot substitute for the typed producer declaration', () => {
  const foreign = '6cc67148d08b8f59e719f3c7be97d50343d29e4c74dde028bbc71f64620f0e72';
  expect(matches({ ...expected, origin: { sourceFingerprint: foreign, sourceVerified: true } })).toBe(false);
  expect(matches({ ...expected, fingerprint: foreign, origin: origin() })).toBe(false);
  expect(matches({ ...expected, origin: { ...origin(), sourceVerified: true } })).toBe(false);
});

test('tampered source hashes and empty inventories cannot acquire the old producer identity', () => {
  const changed = clone(envelope); changed.sourceHashes[0].sha256 = 'f'.repeat(64);
  expect(matches({ ...expected, origin: build({ catalogId: expected.catalogId, envelope: changed }) })).toBe(false);
  expect(build({ catalogId: expected.catalogId, envelope: { ...envelope, sourceHashes: [] } })).toBeNull();
  expect(build({ catalogId: expected.catalogId, envelope: { ...envelope, sourceHashes: [{ path: 'source', sha256: 'invalid' }] } })).toBeNull();
});
