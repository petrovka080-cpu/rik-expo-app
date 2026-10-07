import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { Client } from 'pg';
import pack from '../../../data/estimate-benchmarks/source-packs/pvc15-minimal-customer-input-s27-44.json';
import { normalizeCanonicalCatalogSearchQuery } from '../../../src/lib/estimate/backendPlatform/catalogSearchIntent';
import { canonicalEstimateStableJson } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import { cloneCanonicalPreparedSearchR1 } from './canonicalPreparedSearchCloneR1';

const contract = 's27-45.pvc15-ordinary-query-search-only.v1';
const pointerPath = 'data/estimate-benchmarks/r568-local-developer-canonical-release.json';
const parentSearch = '2d43bdb1-2e6f-59fa-8026-ae24e00ea278';
const definitionRelease = 'f0720637-6a4d-58be-8710-3380c5e83e65';
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const uuid = (value: string) => {
  const bytes = Buffer.from(hash(value).slice(0, 32), 'hex');
  bytes[6] = (bytes[6]! & 15) | 80; bytes[8] = (bytes[8]! & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
type SearchDocument = { catalog_id: string; aliases: string[]; normalized_search_terms: string[] };

/** Add ordinary Russian synonyms to the three existing members. No automatic
 * candidate selection, parameter prefill or definition mutation is involved. */
export function pvc15OrdinaryQueryAliasesS2745(document: SearchDocument) {
  assert(pack.members.some(member => member.catalogId === document.catalog_id), 'PVC15_SEARCH_TARGET_SCOPE');
  const aliases = [...new Set([...document.aliases, 'ПВХ кровля', 'ПВХ-кровля', 'мембранная кровля',
    'кровля из ПВХ мембраны', 'ПВХ мембрана 1,5 мм', 'ПВХ кровля 1,5 мм'])];
  const normalizedAliases = [...new Set(aliases.map(normalizeCanonicalCatalogSearchQuery))];
  const searchTerms = [...new Set([...document.normalized_search_terms, ...normalizedAliases])];
  return { aliases, normalizedAliases, searchTerms, searchBlob: searchTerms.join(' ') };
}

async function run() {
  assert.equal(process.cwd().replaceAll('\\', '/'), 'C:/dev/rik-expo-app-r4a5-dc4f0ce7');
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
  assert.equal(git('branch', '--show-current'), 'codex/r4-a5-clean-08b18902');
  const sourcePaths = ['scripts/estimate/r4a13/prepareS2745Pvc15SearchAliases.ts',
    'scripts/estimate/r4a13/canonicalPreparedSearchCloneR1.ts', 'src/lib/estimate/backendPlatform/catalogSearchIntent.ts',
    'data/estimate-benchmarks/source-packs/pvc15-minimal-customer-input-s27-44.json'];
  assert.equal(git('status', '--porcelain', '--', ...sourcePaths), '', 'SEARCH_SOURCE_MUST_BE_COMMITTED');
  const master = 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (85).md';
  assert.equal(hash(readFileSync(master)), '41bf6f20bda2fab5112b6d1f7d3b8d574e8b82ef7e6e5669fcf324aa7ba44e7f');
  const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'));
  const fingerprint = hash(canonicalEstimateStableJson(sourcePaths.map(path => ({ path, sha256: hash(readFileSync(path)) }))));
  const successor = uuid(`${contract}:${definitionRelease}:${parentSearch}:${fingerprint}`);
  assert.equal(pointer.definitionReleaseId, definitionRelease, 'DEFINITION_POINTER_DRIFT');
  assert([parentSearch, successor].includes(pointer.searchReleaseId), 'SEARCH_POINTER_DRIFT');
  const root = '.release-runtime/r568/s27-45/ordinary-query-search';
  mkdirSync(root, { recursive: true });
  const client = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2' });
  const apply = process.argv.includes('--apply');
  const receiptPath = `${root}/${apply ? 'apply' : 'rollback'}.json`;
  const atomic = (path: string, value: unknown) => { writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2) + '\n'); renameSync(`${path}.tmp`, path); };
  if (apply) {
    const rollback = JSON.parse(readFileSync(`${root}/rollback.json`, 'utf8'));
    assert.equal(rollback.fingerprint, fingerprint); assert.equal(rollback.successor, successor);
    assert.equal(rollback.status, 'GREEN_SEARCH_ONLY_ROLLBACK');
  }
  await client.connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [contract]);
    const prior = (await client.query('select status from public.estimate_search_index_release where id=$1', [parentSearch])).rows[0];
    assert.equal(prior?.status, 'draft', 'LOCAL_PREPARED_SEARCH_ONLY');
    const existing = (await client.query('select * from public.estimate_search_index_release where id=$1', [successor])).rows[0];
    if (!existing) {
      await cloneCanonicalPreparedSearchR1(client, { contract, releaseId: definitionRelease, searchReleaseId: successor,
        parentSearchReleaseId: parentSearch, releaseKey: contract + '-' + fingerprint.slice(0, 12),
        head: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), fingerprint, targetCount: 3 });
      for (const member of pack.members) {
        const document = (await client.query('select * from public.estimate_search_document where search_release_id=$1 and catalog_id=$2', [successor, member.catalogId])).rows[0];
        assert(document && document.definition_release_id === definitionRelease);
        const patch = pvc15OrdinaryQueryAliasesS2745(document);
        await client.query(`update public.estimate_search_document set aliases=$3::text[], normalized_aliases=$4::text[],
          normalized_search_terms=$5::text[],normalized_search_blob=$6,
          document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$7,'UTF8'),'sha256'),'hex')
          where search_release_id=$1 and catalog_id=$2`, [successor, member.catalogId, patch.aliases, patch.normalizedAliases, patch.searchTerms, patch.searchBlob, fingerprint]);
      }
      const snapshot = (await client.query(`select encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') hash
        from public.estimate_search_document where search_release_id=$1`, [successor])).rows[0].hash;
      await client.query('update public.estimate_search_index_release set snapshot_sha256=$2 where id=$1 and status=$3', [successor, snapshot, 'draft']);
    }
    const unrelatedChanges = (await client.query(`select count(*)::int count from public.estimate_search_document a
      full join public.estimate_search_document b on b.search_release_id=$2 and a.catalog_id=b.catalog_id
      where a.search_release_id=$1 and not(a.catalog_id=any($3::text[]))
        and (b.catalog_id is null or a.aliases<>b.aliases or a.normalized_search_blob<>b.normalized_search_blob
          or a.definition_version_id<>b.definition_version_id or a.selectable<>b.selectable)`, [parentSearch, successor, pack.members.map(m => m.catalogId)])).rows[0].count;
    assert.equal(unrelatedChanges, 0);
    const after = (await client.query('select * from public.estimate_search_index_release where id=$1', [successor])).rows[0];
    const matched = (await client.query(`select catalog_id from public.estimate_search_document
      where search_release_id=$1 and catalog_id=any($2::text[]) and normalized_search_blob like '%пвх кровля%'`, [successor, pack.members.map(m => m.catalogId)])).rows;
    assert.equal(matched.length, 3);
    const receipt = { status: apply ? 'GREEN_SEARCH_ONLY_LOCAL_APPLY' : 'GREEN_SEARCH_ONLY_ROLLBACK',
      fingerprint, parentSearch, successor, definitionRelease, definitionChanged: false, unrelatedChanges,
      matched: matched.map(r => r.catalog_id), searchSnapshot: after.snapshot_sha256, productionAccessed: false };
    await client.query(apply ? 'commit' : 'rollback');
    atomic(receiptPath, receipt);
    if (apply) atomic(pointerPath, { ...pointer, searchReleaseId: successor, searchHashChainSha256: after.snapshot_sha256, owner: contract });
    console.log(JSON.stringify(receipt));
  } finally { try { await client.query('rollback'); } catch {} await client.end(); }
}
if (require.main === module) run().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
