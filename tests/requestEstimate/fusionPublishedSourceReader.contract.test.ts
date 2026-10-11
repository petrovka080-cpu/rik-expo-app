import { readCanonicalFusionPublishedSourceS2758 as read, assertCanonicalFusionSourceTransactionS2758 as transaction } from '../../scripts/estimate/backendMigration/canonicalFusionPublishedSourceReaderS2758';
import { canonicalFusionPublishedLegacyOriginSourceBindingS2758 as origin } from '../../src/lib/estimate/backendPlatform/canonicalFusionPublishedSourceOriginS2758';
import { parent } from './fixtures/fusionPolicySuccessorFixtureS2758';
import chain from './fixtures/fusionPublishedManifestChainS2758.json';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function database(change?: (receipt: Record<string, any>, index: number, sql: string) => void) {
  const packet = parent(); let index = 0;
  const query = jest.fn(async (sql: string, values: unknown[] = []) => {
    const receipt: Record<string, any> = { transaction_id: '90071992547409999', backend_id: 7 };
    if (sql.includes("current_setting('transaction_isolation')")) receipt.isolation = 'repeatable read';
    else {
      const node = chain.chain.find(node => node.release.id === values[0]);
      if (sql.includes('count(*)::integer entry_count')) receipt.records = [node?.aggregate];
      else if (sql.includes('from public.estimate_definition_release')) receipt.records = [node?.release];
      else if (sql.includes('from public.estimate_cumulative_manifest_entry')) receipt.records = [node?.manifest];
      else if (sql.includes('from public.estimate_definition_version')) receipt.records = [packet.definition];
      else if (sql.includes('from public.estimate_approved_template_baseline')) receipt.records = [packet.baseline];
      else if (sql.includes('from public.estimate_content_passport_r3')) receipt.records = [packet.passport];
      else if (sql.includes('from public.estimate_parameter_definition')) receipt.records = packet.parameters;
      else if (sql.includes('from public.estimate_formula_graph')) receipt.records = packet.formulas;
      else if (sql.includes('from public.estimate_resource_spec')) receipt.records = packet.resources;
      else if (sql.includes('from public.estimate_work_normative_binding')) receipt.records = packet.bindings;
      else if (sql.includes('from public.estimate_resource_price_route_binding')) receipt.records = packet.priceBindings;
      else if (sql.includes('from public.estimate_normative_locator')) receipt.records = packet.locators;
      else if (sql.includes('from public.estimate_normative_source')) receipt.records = packet.sources;
      else throw Error('Unexpected SQL');
    }
    const detached = clone(receipt); change?.(detached, index++, sql); return { rows: [detached] };
  });
  return { query };
}
test('reads the complete real source and seven-node chain with one transaction/backend, including xid above JS safe integer', async () => {
  const client = database(), loaded = await read(client as any, chain.pinnedReleaseId);
  expect(origin(loaded)?.mode).toBe('LEGACY');
  expect(loaded.transactionIdentity).toEqual({ transaction_id: '90071992547409999', backend_id: 7 });
  expect(await transaction(client as any, loaded.transactionIdentity)).toEqual(loaded.transactionIdentity);
  expect(client.query.mock.calls.every(([sql]) => sql.includes('pg_current_xact_id()::text') && sql.includes('pg_backend_pid()'))).toBe(true);
});
test.each(['autocommit', 'backend', 'read-committed', 'duplicate-manifest', 'missing-resource', 'manifest-aggregate'] as const)
('rejects %s before granting source evidence', async mutation => {
  const client = database((r, index, sql) => {
    if (mutation === 'autocommit') r.transaction_id = String(index + 1);
    if (mutation === 'backend' && index > 0) r.backend_id = 8;
    if (mutation === 'read-committed') r.isolation = 'read committed';
    if (mutation === 'duplicate-manifest' && index === 1) r.records.push(clone(r.records[0]));
    if (mutation === 'missing-resource' && sql.includes('from public.estimate_resource_spec')) r.records.pop();
    if (mutation === 'manifest-aggregate' && sql.includes('count(*)::integer')) r.records[0].manifest_sha256 = 'f'.repeat(64);
  });
  await expect(read(client as any, chain.pinnedReleaseId)).rejects.toMatchObject({ code: 'FUSION_PUBLICATION_SOURCE_REVIEW_REQUIRED' });
});
test('a separately valid repeatable-read transaction cannot reuse the first source anchor', async () => {
  const first = await read(database() as any, chain.pinnedReleaseId);
  const other = database(r => { r.transaction_id = '90071992547410000'; });
  await expect(read(other as any, chain.pinnedReleaseId, first.transactionIdentity)).rejects.toMatchObject({ code: 'FUSION_PUBLICATION_SOURCE_REVIEW_REQUIRED' });
  await expect(transaction(other as any, first.transactionIdentity)).rejects.toMatchObject({ code: 'FUSION_PUBLICATION_SOURCE_REVIEW_REQUIRED' });
});
