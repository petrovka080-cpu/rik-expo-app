import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hashMasterSingleDefinitionSuccessorReceiptR1 as receiptHash } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import { pvcRoofRussianPresentationS2737PublishConfig as russian } from '../../scripts/estimate/r4a13/prepareS2737PvcRoofRussianPresentationSuccessor';
import { resolvePvcRoofVolumeCleanerParentS2737 as parent, pvcRoofVolumeCleanerS2737PublishConfig as config } from '../../scripts/estimate/r4a13/prepareS2737PvcRoofVolumeCleanerSuccessor';
import { PVC_ROOF_VOLUME_CLEANER_ROW_ID_S2737 as cleanerRowId } from '../../src/lib/estimate/v4/pvcRoofCleanerVolume472219S2737';

jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return { ...actual, existsSync: jest.fn(actual.existsSync), readFileSync: jest.fn(actual.readFileSync) };
});
const actualFs = jest.requireActual('node:fs') as typeof import('node:fs');
const prerequisite = resolve(russian.outputRoot, 'acceptance.json');
const fileHash = (path: string) => createHash('sha256').update(actualFs.readFileSync(path)).digest('hex');
const successor = { releaseId: '42734a56-9145-5681-b625-94701734fdc6', searchReleaseId: '4204fb15-acce-5727-877e-7e33df724fe3' };

function body() {
  return {
    schemaVersion: russian.contract + '.receipt.v1',
    status: 'GREEN_S2737_PVC_ROOF_RUSSIAN_PRESENTATION_PREPARED_NOT_ACTIVE', mutationPerformed: true,
    master: { sha256: russian.masterSha256 },
    source: {
      branch: russian.expectedBranch, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(),
      hashedDirtySourceAccepted: false,
      sourceHashes: [...new Set([...russian.sourcePaths,
        'scripts/estimate/r4a13/projectSourcePackageBindingR1.ts', 'scripts/estimate/r4a13/projectSourcePackagePreflightR1.ts'])]
        .map(path => ({ path, sha256: fileHash(path) })),
    },
    audit: { unrelatedManifestChanges: 0 }, successor,
  };
}
function provideReceipt(value: unknown) {
  (existsSync as jest.Mock).mockImplementation(path => String(path) === prerequisite || actualFs.existsSync(path));
  (readFileSync as jest.Mock).mockImplementation((path, options) => String(path) === prerequisite
    ? JSON.stringify(value, null, 2) : actualFs.readFileSync(path, options));
}
afterEach(() => {
  (existsSync as jest.Mock).mockImplementation(actualFs.existsSync);
  (readFileSync as jest.Mock).mockImplementation(actualFs.readFileSync);
});

test('receipt hashing follows the actual recursively sorted publisher contract', () => {
  const expected = createHash('sha256').update('{"a":[{"b":3,"d":4}],"z":{"alpha":1,"beta":2}}').digest('hex');
  expect(receiptHash({ z: { beta: 2, alpha: 1 }, a: [{ d: 4, b: 3 }] })).toBe(expected);
  const value = body();
  provideReceipt({ ...value, receiptSha256: receiptHash(value) });
  expect(parent(true)).toEqual(successor);
});

test('apply requires a sealed prerequisite and rejects tampered bytes or changed source identity', () => {
  (existsSync as jest.Mock).mockImplementation(path => String(path) === prerequisite ? false : actualFs.existsSync(path));
  expect(() => parent(true)).toThrow('S2737_VOLUME_REQUIRES_COMPLETED_RUSSIAN_PROCESS_PUBLICATION');
  expect(parent(false)).toEqual({ releaseId: russian.parentReleaseId, searchReleaseId: russian.parentSearchReleaseId });
  const value = body();
  provideReceipt({ ...value, mutationPerformed: false, receiptSha256: receiptHash(value) });
  expect(() => parent(true)).toThrow('S2737_PREREQUISITE_RECEIPT_HASH');
  value.source.sourceHashes[0]!.sha256 = '0'.repeat(64);
  provideReceipt({ ...value, receiptSha256: receiptHash(value) });
  expect(() => parent(true)).toThrow('S2737_PREREQUISITE_SOURCE_CHANGED');
});

test('the composite binding owns the litre row and preserves the separate primary documents', () => {
  const publication = config(successor);
  expect([...new Set(Object.values(publication.runtimeProfileSourceIds!).flat())]).toEqual([publication.sourceId]);
  expect(publication.sourceMetadata.artifact_sha256).toBe(fileHash('data/estimate-benchmarks/source-packs/pvc-roof-cleaner-472219-volume-s27-37.json'));
  expect(publication.sourceMetadata.official_url).toBeNull();
  expect(publication.binding.rowId).toBe(cleanerRowId);
  expect(publication.binding.applicability.exact_locator).toBe(publication.sourceMetadata.exact_locator);
  expect(publication.locator.payload.primarySources).toMatchObject({
    field: { originalSourceId: 'kg_krer12_01_028_02_pvc_concrete_s2736', normId: 'KRER12-01-028-02',
      primaryDocument: { artifactSha256: '114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8' } },
    cleaner: { productEkn: '472219', rateLPerCleanedM2: 0.25,
      artifactSha256: '2c18f654cd628cc204bc657af83897e5e3d84146572c8664151e07e345ee8654' },
  });
});
