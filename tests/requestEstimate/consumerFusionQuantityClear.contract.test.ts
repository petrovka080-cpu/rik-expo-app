import { resolveConsumerCanonicalRecalculationCatalog } from '../../src/features/consumerRepair/consumerCanonicalReleaseMigration';
import { recalculateAndPersistConsumerCanonicalEstimate } from '../../src/features/consumerRepair/consumerCanonicalParameterEditor';
import { getCanonicalEstimateCatalogItem, getCanonicalEstimateRevision, getCanonicalEstimateRevisionHistory,
  getAllCanonicalEstimateRevisionRows, getCanonicalFusionQuantityClearPreviewS2758, recalculateCanonicalEstimateAndLoad } from '../../src/lib/estimate/backendPlatform/canonicalEstimateClient';
import type { CanonicalEstimateCatalogItem, CanonicalEstimateRevisionView } from '../../src/lib/estimate/backendPlatform/contracts';
jest.mock('../../src/lib/estimate/backendPlatform/canonicalEstimateClient', () => ({ getCanonicalEstimateCatalogItem: jest.fn(),
  getCanonicalEstimateRevision: jest.fn(), getCanonicalEstimateRevisionHistory: jest.fn(), getAllCanonicalEstimateRevisionRows: jest.fn(),
  getCanonicalFusionQuantityClearPreviewS2758: jest.fn(), recalculateCanonicalEstimateAndLoad: jest.fn() }));
const physical = ['bench-consumed', 'fixing-consumed-separate'].map(key => 'fusion-bench-prepared-concrete:' + key);
const catalogId = 'canonical-work:master:glasdon_fusion_bench_prepared_concrete_standard';
const from = '11111111-1111-4111-8111-111111111111', to = '22222222-2222-4222-8222-222222222222';
const old: CanonicalEstimateCatalogItem = { catalogId, releaseId: from, workKey: 'fusion', titleRu: 'Установка готовой скамьи',
  definitionVersion: 1, namespace: 'global', domain: 'landscape', applicability: {}, professionalMetadata: {},
  parameterSchema: [{ parameterId: 'bench_count', ordinal: 0, titleRu: 'Количество скамей', valueType: 'integer', unitId: 'pcs',
    required: true, defaultValue: null, constraints: { min: 1 }, visibilityRole: 'USER_INPUT', valueSourceRole: 'USER_MEASURED' }] };
const current = { ...old, releaseId: to, definitionVersion: 2 };
function scenario() {
  const revision = { revisionId: '33333333-3333-4333-8333-333333333333', releaseId: from, catalogId, organizationId: null,
    parameters: { bench_count: '3' }, userInputSnapshot: { bench_count: '3' }, priceSnapshotIds: [], currencyCode: 'KGS',
    sourceRequestText: 'Установить три скамьи', sourceRequestHash: 'b'.repeat(64), primaryMeasureParameterId: 'bench_count',
    status: 'ready', rowCount: 0, totals: {}, checksumSha256: 'a'.repeat(64), compilerVersion: 'test', createdAt: '2026-10-11T00:00:00Z',
    amendmentContract: { rowOverrides: {
      [physical[0]]: { quantity: '5', unitPrice: '175', provenance: { kind: 'manual', reason: 'цена сметчика' } },
      [physical[1]]: { quantity: '17', includedInEstimate: false, unitPrice: '31', provenance: { kind: 'manual', reason: 'скрытая правка' } },
      'fusion-bench-prepared-concrete:bench-order': { quantity: '9', unitPrice: '500', provenance: { kind: 'manual', reason: 'партия' } },
    }, customRows: [] } } as unknown as CanonicalEstimateRevisionView;
  const preview = { contractVersion: 'canonical-fusion-quantity-clear-preview/v1' as const, catalogId, parentRevisionId: revision.revisionId,
    parentChecksumSha256: revision.checksumSha256, fromReleaseId: from, toReleaseId: to,
    rows: physical.map((rowId, i) => ({ rowId, titleRu: i ? 'Крепления' : 'Скамьи', unitId: 'pcs', oldQuantity: i ? '17' : '5', calculatedQuantity: i ? '12' : '3', excluded: i === 1 })) };
  const child = JSON.parse(JSON.stringify(revision)) as CanonicalEstimateRevisionView;
  child.revisionId = '44444444-4444-4444-8444-444444444444'; child.parentRevisionId = revision.revisionId; child.releaseId = to;
  for (const id of physical) child.amendmentContract.rowOverrides[id].quantity = null;
  return { revision, preview, child };
}
beforeEach(() => {
  jest.resetAllMocks(); const { revision, preview, child } = scenario();
  jest.mocked(getCanonicalEstimateCatalogItem).mockImplementation(async (_id, _signal, release) => release ? old : current);
  jest.mocked(getCanonicalEstimateRevision).mockImplementation(async id => id === child.revisionId ? child : revision);
  jest.mocked(getCanonicalEstimateRevisionHistory).mockResolvedValue({ apiVersion: '2026-08-14.r2', revisions: [], nextCursor: null });
  jest.mocked(getCanonicalFusionQuantityClearPreviewS2758).mockResolvedValue({ apiVersion: '2026-08-14.r2', preview });
  jest.mocked(getAllCanonicalEstimateRevisionRows).mockResolvedValue([]);
  jest.mocked(recalculateCanonicalEstimateAndLoad).mockResolvedValue({ revision: child, rows: [] } as never);
});
test('cancel creates no job and keeps physical pins, prices and the user draft unchanged', async () => {
  const { revision } = scenario(), before = JSON.stringify(revision), confirm = jest.fn().mockResolvedValue(false);
  await expect(resolveConsumerCanonicalRecalculationCatalog({ revision, allowQuantityClearTransition: true, confirmReleaseMigration: confirm }))
    .rejects.toMatchObject({ code: 'RELEASE_MIGRATION_NOT_ACKNOWLEDGED' });
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ quantityClearPreview: expect.objectContaining({ rows: expect.arrayContaining([expect.objectContaining({ excluded: true })]) }) }));
  expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled(); expect(JSON.stringify(revision)).toBe(before);
});
test('ordinary parameter Apply performs only the consented clear first and retains a pending new volume', async () => {
  const { revision } = scenario(), patches = [{ operation: 'update_param' as const, paramKey: 'bench_count', rawValue: '7' }];
  const before = JSON.stringify(patches), persist = jest.fn().mockResolvedValue({ draft: { id: 'draft' } });
  const result = await recalculateAndPersistConsumerCanonicalEstimate({ revisionId: revision.revisionId, draftId: 'draft',
    problemText: revision.sourceRequestText!, patches, confirmReleaseMigration: async () => true, persist });
  expect(result.quantityPolicyTransition).toBe(true); expect(persist).toHaveBeenCalledTimes(1);
  expect(recalculateCanonicalEstimateAndLoad).toHaveBeenCalledTimes(1);
  const request = jest.mocked(recalculateCanonicalEstimateAndLoad).mock.calls[0][0].request;
  expect(request.parameters).toEqual({ bench_count: '3' }); expect(request.priceSnapshotIds).toEqual([]);
  expect(request.rowOverrides).toEqual(Object.fromEntries(physical.map(id => [id, { quantity: null, provenance: { kind: 'manual' } }])));
  expect(request.derivedQuantityClearV1).toMatchObject({ parentChecksumSha256: revision.checksumSha256, clearedRowIds: physical });
  expect(JSON.stringify(patches)).toBe(before); expect(revision.amendmentContract.rowOverrides[physical[0]].quantity).toBe('5');
});
test('a saved matching child is reopened after a lost response without a second server command', async () => {
  const { revision, child } = scenario();
  jest.mocked(getCanonicalEstimateRevisionHistory).mockResolvedValue({ apiVersion: '2026-08-14.r2', revisions: [child], nextCursor: null });
  const result = await recalculateAndPersistConsumerCanonicalEstimate({ revisionId: revision.revisionId, draftId: 'draft', problemText: revision.sourceRequestText!,
    patches: [{ operation: 'update_param', paramKey: 'bench_count', rawValue: '7' }], confirmReleaseMigration: async () => true,
    persist: jest.fn().mockResolvedValue({ draft: { id: 'draft' } }) });
  expect(result.recovered).toBe(true); expect(result.quantityPolicyTransition).toBe(true); expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
});
test.each(['checksum', 'target', 'missing-hidden', 'order-row'] as const)('rejects a changed preview %s without asking consent', async change => {
  const { revision, preview } = scenario();
  if (change === 'checksum') preview.parentChecksumSha256 = 'c'.repeat(64);
  if (change === 'target') preview.toReleaseId = from;
  if (change === 'missing-hidden') preview.rows.pop();
  if (change === 'order-row') preview.rows[1].rowId = 'fusion-bench-prepared-concrete:bench-order';
  jest.mocked(getCanonicalFusionQuantityClearPreviewS2758).mockResolvedValue({ apiVersion: '2026-08-14.r2', preview });
  const confirm = jest.fn().mockResolvedValue(true);
  await expect(resolveConsumerCanonicalRecalculationCatalog({ revision, allowQuantityClearTransition: true, confirmReleaseMigration: confirm }))
    .rejects.toMatchObject({ code: 'FUSION_QUANTITY_CLEAR_REVIEW_REQUIRED' });
  expect(confirm).not.toHaveBeenCalled(); expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
});
test.each(['price', 'order', 'snapshot', 'volume'] as const)('rejects a mismatched saved child %s without repeating Apply', async change => {
  const { revision, child } = scenario();
  if (change === 'price') child.amendmentContract.rowOverrides[physical[0]].unitPrice = '0';
  if (change === 'order') child.amendmentContract.rowOverrides['fusion-bench-prepared-concrete:bench-order'].quantity = '1';
  if (change === 'snapshot') child.priceSnapshotIds = [from];
  if (change === 'volume') child.userInputSnapshot = { bench_count: '7' };
  jest.mocked(getCanonicalEstimateRevisionHistory).mockResolvedValue({ apiVersion: '2026-08-14.r2', revisions: [child], nextCursor: null });
  await expect(resolveConsumerCanonicalRecalculationCatalog({ revision, allowQuantityClearTransition: true, confirmReleaseMigration: async () => true }))
    .rejects.toMatchObject({ code: 'FUSION_QUANTITY_CLEAR_RECOVERY_MISMATCH' });
  expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
});
test('new row changes use the existing migration block until the separate parameter transition', async () => {
  const { revision } = scenario();
  await expect(resolveConsumerCanonicalRecalculationCatalog({ revision, allowQuantityClearTransition: true, hasNewRowAmendments: true, confirmReleaseMigration: async () => true }))
    .rejects.toMatchObject({ code: 'RELEASE_MIGRATION_ROW_BINDING_REVIEW_REQUIRED' });
  expect(getCanonicalFusionQuantityClearPreviewS2758).not.toHaveBeenCalled(); expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
});
