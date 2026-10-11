import { previewCanonicalFusionDerivedQuantityClearServerS2758 as preview } from '../../scripts/estimate/backendMigration/canonicalFusionDerivedQuantityClearServerS2758';
import { readCanonicalFusionPublishedSourceS2758 as read, assertCanonicalFusionSourceTransactionS2758 as transaction } from '../../scripts/estimate/backendMigration/canonicalFusionPublishedSourceReaderS2758';
import { canonicalFusionPublishedPolicyAdoptionOriginBindingsS2758 as origins } from '../../src/lib/estimate/backendPlatform/canonicalFusionPublishedSourceOriginS2758';
import { canonicalFusionPublishedPolicyAdoptionSourceBindingsS2758 as bindings } from '../../src/lib/estimate/backendPlatform/canonicalFusionPublishedSourcePacketS2758';
import { canonicalEstimateSha256HexText as sha } from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import { parent as source, target } from './fixtures/fusionPolicySuccessorFixtureS2758';
import inheritedNodes from './fixtures/fusionPublishedManifestChainS2758.json';
jest.mock('../../scripts/estimate/backendMigration/canonicalFusionPublishedSourceReaderS2758', () => ({
  readCanonicalFusionPublishedSourceS2758: jest.fn(), assertCanonicalFusionSourceTransactionS2758: jest.fn(),
}));
jest.mock('../../src/lib/estimate/backendPlatform/canonicalFusionPublishedSourceOriginS2758', () => ({
  canonicalFusionPublishedPolicyAdoptionOriginBindingsS2758: jest.fn(),
}));
const physical = ['bench-consumed', 'fixing-consumed-separate'].map(key => 'fusion-bench-prepared-concrete:' + key);
const anchor = { transaction_id: '90071992547409999', backend_id: 7 };
test.each(['immediate', 'inherited'])('a hidden pin without a saved row is previewed through the %s publication parent', async mode => {
  const initial = source(), to = target();
  const publicationParent = source();
  const from = mode === 'inherited' ? { ...initial, expectedReleaseId: initial.definition.release_id,
    manifest: inheritedNodes.chain[inheritedNodes.chain.length - 1].manifest as typeof initial.manifest } : initial;
  const parent = { id: '11111111-1111-4111-8111-111111111111', owner_user_id: '22222222-2222-4222-8222-222222222222', organization_id: null,
    release_id: from.expectedReleaseId, catalog_id: from.definition.catalog_id, definition_version_id: from.definition.id,
    status: 'ready', revision_contract_version: 'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V2', checksum_sha256: 'a'.repeat(64), currency_code: 'KGS',
    price_snapshot_ids: [], input_parameters: { bench_count: '3' }, source_request_text: 'Установить три скамьи',
    source_request_hash: sha('Установить три скамьи'), primary_measure_parameter_id: 'bench_count',
    amendment_contract: { parameterSources: { userParameters: { bench_count: '3' } }, customRows: [], rowOverrides: {
      [physical[0]]: { quantity: '5', unitPrice: '150', provenance: { kind: 'manual' } },
      [physical[1]]: { quantity: '17', titleRu: 'Сохранённый скрытый крепёж', unitPrice: '31', provenance: { kind: 'manual', reason: 'скрытая ветвь' } },
    } } };
  jest.mocked(transaction).mockResolvedValue(anchor);
  jest.mocked(read).mockImplementation(async (_client, pin) => ({ packet: pin === from.expectedReleaseId ? from : pin === to.expectedReleaseId ? to : publicationParent,
    originalSourceRelease: { parent_release_id: publicationParent.expectedReleaseId }, transactionIdentity: anchor, manifestNodes: inheritedNodes.chain }));
  jest.mocked(origins).mockReturnValue(bindings({ from, to }));
  const query = jest.fn(async (sql: string) => ({ rows: sql.includes('from public.estimate_revision_row')
    ? [{ row_id: physical[0], title_ru: 'Скамья из сохранённой сметы', included_in_estimate: true }] : [parent] }));
  const before = JSON.stringify(parent);
  const result = await preview({ query } as any, { parentRevisionId: parent.id, ownerUserId: parent.owner_user_id, organizationId: null, targetReleaseId: to.expectedReleaseId });
  expect(result?.rows).toEqual([
    { rowId: physical[0], titleRu: 'Скамья из сохранённой сметы', unitId: 'pcs', oldQuantity: '5', calculatedQuantity: '3', excluded: false },
    { rowId: physical[1], titleRu: 'Сохранённый скрытый крепёж', unitId: 'pcs', oldQuantity: '17', calculatedQuantity: '12', excluded: true },
  ]);
  expect(read).toHaveBeenNthCalledWith(1, expect.anything(), from.expectedReleaseId, anchor);
  expect(read).toHaveBeenNthCalledWith(2, expect.anything(), to.expectedReleaseId, anchor);
  if (mode === 'inherited') expect(read).toHaveBeenNthCalledWith(3, expect.anything(), publicationParent.expectedReleaseId, anchor);
  expect(transaction).toHaveBeenLastCalledWith(expect.anything(), anchor);
  expect(query.mock.calls.every(([sql]) => /^select /u.test(sql))).toBe(true); expect(JSON.stringify(parent)).toBe(before);
  jest.clearAllMocks();
});
