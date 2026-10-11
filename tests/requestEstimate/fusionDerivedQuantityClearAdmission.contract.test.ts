import { canonicalFusionDerivedQuantityClearAdmissionS2758 as admit, canonicalFusionDerivedQuantityClearConsentS2758 as consent,
  canonicalFusionQuantityClearRevisionNumberConflictS2758 as retryConflict } from '../../src/lib/estimate/backendPlatform/canonicalFusionDerivedQuantityClearAdmissionS2758';
import { canonicalEstimateSha256HexText as sha } from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import { canonicalEstimateStableJson as stable } from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import { parent as source, target } from './fixtures/fusionPolicySuccessorFixtureS2758';
import { canonicalFusionPublishedPolicyAdoptionSourceBindingsS2758 as bindings } from '../../src/lib/estimate/backendPlatform/canonicalFusionPublishedSourcePacketS2758';
import { assertCreateRequest } from '../../src/lib/estimate/backendPlatform/contracts';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const ROWS = ['bench-consumed', 'fixing-included', 'fixing-consumed-separate'].map(key => 'fusion-bench-prepared-concrete:' + key);
function scenario() {
  const from = source(), to = target();
  const parent = { id: '11111111-1111-4111-8111-111111111111', owner_user_id: '22222222-2222-4222-8222-222222222222',
    organization_id: '33333333-3333-4333-8333-333333333333', release_id: from.expectedReleaseId,
    catalog_id: from.definition.catalog_id, definition_version_id: from.definition.id, status: 'ready',
    revision_contract_version: 'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V2', checksum_sha256: 'a'.repeat(64),
    currency_code: 'KGS', price_snapshot_ids: [] as string[], source_request_text: 'Установить три скамьи на готовом бетоне',
    source_request_hash: sha('Установить три скамьи на готовом бетоне'), primary_measure_parameter_id: 'bench_count',
    amendment_contract: { customRows: [], parameterSources: { userParameters: { bench_count: '3', fixing_supply_mode: 'included' } },
      rowOverrides: { [ROWS[0]]: { quantity: '5', unitPrice: '151.25', titleRu: 'Сохранённая скамья', provenance: { kind: 'manual', reason: 'сметчик' } },
        [ROWS[2]]: { quantity: '17', includedInEstimate: false, unitPrice: '72', provenance: { kind: 'manual', reason: 'скрытая ветвь' } },
        'fusion-bench-prepared-concrete:bench-order': { quantity: '9', unitPrice: '300', provenance: { kind: 'manual', reason: 'партия' } } } },
  };
  const request = { idempotencyKey: 'clear-test', parentRevisionId: parent.id, catalogId: parent.catalog_id,
    organizationId: parent.organization_id, currencyCode: parent.currency_code, parameters: clone(parent.amendment_contract.parameterSources.userParameters),
    releaseMigration: { contractVersion: 'canonical_revision_release_migration.r2', acknowledged: true,
      fromReleaseId: parent.release_id, toReleaseId: to.expectedReleaseId },
    derivedQuantityClearV1: { contractVersion: 'canonical-fusion-derived-quantity-clear/v1', acknowledged: true,
      parentChecksumSha256: parent.checksum_sha256, clearedRowIds: [ROWS[0], ROWS[2]] },
    rowOverrides: { [ROWS[0]]: { quantity: null, provenance: { kind: 'manual' } }, [ROWS[2]]: { quantity: null, provenance: { kind: 'manual' } } }, customRows: [],
  };
  return { phase: 'INTAKE' as 'INTAKE' | 'WORKER', parent, request: request as Record<string, any>, ownerUserId: parent.owner_user_id,
    organizationId: parent.organization_id as string | null, targetReleaseId: to.expectedReleaseId,
    sourceBindings: bindings({ from, to }), parentRouteBindings: [], targetRouteBindings: [] };
}

test('intake and worker preserve prices, provenance, order quantities and hidden amendments; snapshots remain detached', () => {
  const input = scenario(), before = stable(input), accepted = admit(input)!;
  expect(accepted).not.toBeNull(); expect(accepted.priceSnapshotIds).toEqual([]);
  const expected = clone(input.parent.amendment_contract.rowOverrides) as Record<string, any>;
  expected[ROWS[0]].quantity = null; expected[ROWS[2]].quantity = null;
  expect(accepted.rowOverrides).toEqual(expected);
  input.phase = 'WORKER'; input.request = { ...input.request, rowOverrides: accepted.rowOverrides, priceSnapshotIds: accepted.priceSnapshotIds };
  const worker = admit(input)!; expect(worker).not.toBeNull(); expect(worker.rowOverrides).toEqual(expected);
  (worker.rowOverrides[ROWS[0]] as any).unitPrice = '0'; worker.parameters.bench_count = '99';
  expect(accepted.rowOverrides).toEqual(expected); expect(input.parent.amendment_contract.rowOverrides[ROWS[0]].unitPrice).toBe('151.25');
  expect(stable({ ...input, phase: 'INTAKE', request: scenario().request })).toBe(before);
});

test('existing API validator accepts consent while retaining row provenance validation', () => {
  expect(() => assertCreateRequest(scenario().request)).not.toThrow();
});

test('preserves an already cleared physical quantity and its manual price while clearing the remaining real pins', () => {
  const input = scenario();
  (input.parent.amendment_contract.rowOverrides as Record<string, any>)[ROWS[1]] = { quantity: null, unitPrice: '27', provenance: { kind: 'manual', reason: 'старый сброс' } };
  expect(admit(input)?.rowOverrides[ROWS[1]]).toEqual({ quantity: null, unitPrice: '27', provenance: { kind: 'manual', reason: 'старый сброс' } });
});

test('only the known revision-number uniqueness conflict is retryable for a bounded RR worker', () => {
  const constraint = 'estimate_revision_owner_user_id_catalog_id_revision_number_key';
  expect(retryConflict({ code: '23505', constraint })).toBe(true);
  for (const error of [null, { code: '23505' }, { code: '23505', constraint: 'estimate_compile_job_owner_user_id_idempotency_key_key' }, { code: '40001', constraint }])
    expect(retryConflict(error)).toBe(false);
});

test.each(['owner', 'organization', 'parent-id', 'checksum', 'status', 'version', 'catalog', 'release', 'target', 'currency',
  'parameters', 'request-text', 'request-hash', 'measure', 'consent', 'new-row-price', 'hidden-pin', 'custom-row', 'source-binding', 'price-route'] as const)
('rejects changed %s at intake', mutation => {
  const input = scenario(), p = input.parent as any, r = input.request;
  switch (mutation) {
    case 'owner': input.ownerUserId = '44444444-4444-4444-8444-444444444444'; break;
    case 'organization': input.organizationId = null; break;
    case 'parent-id': r.parentRevisionId = '44444444-4444-4444-8444-444444444444'; break;
    case 'checksum': r.derivedQuantityClearV1.parentChecksumSha256 = 'b'.repeat(64); break;
    case 'status': p.status = 'archived'; break;
    case 'version': p.revision_contract_version = 'legacy'; break;
    case 'catalog': r.catalogId += ':other'; break;
    case 'release': r.releaseMigration.fromReleaseId = input.targetReleaseId; break;
    case 'target': r.releaseMigration.toReleaseId = p.release_id; break;
    case 'currency': r.currencyCode = 'USD'; break;
    case 'parameters': r.parameters.bench_count = '4'; break;
    case 'request-text': r.sourceRequestText = 'другая работа'; break;
    case 'request-hash': p.source_request_hash = 'b'.repeat(64); break;
    case 'measure': r.primaryMeasureParameterId = 'area'; break;
    case 'consent': r.derivedQuantityClearV1.acknowledged = false; break;
    case 'new-row-price': r.rowOverrides[ROWS[0]].unitPrice = '1'; break;
    case 'hidden-pin': delete r.rowOverrides[ROWS[2]]; r.derivedQuantityClearV1.clearedRowIds = [ROWS[0]]; break;
    case 'custom-row': p.amendment_contract.customRows = [{ clientRowId: 'custom' }]; break;
    case 'source-binding': input.sourceBindings = null; break;
    case 'price-route': (input.targetRouteBindings as unknown[]) = [{ route_id: 'new' }]; break;
  }
  expect(admit(input)).toBeNull();
});

test.each(['parameters', 'price', 'provenance', 'order', 'price-selection', 'missing-selection', 'staged-only'] as const)
('worker rejects changed %s after normalization', mutation => {
  const input = scenario(), normalized = admit(input)!;
  input.phase = 'WORKER'; input.request = { ...input.request, rowOverrides: normalized.rowOverrides, priceSnapshotIds: normalized.priceSnapshotIds };
  const r = input.request;
  if (mutation === 'parameters') r.parameters.bench_count = '6';
  if (mutation === 'price') r.rowOverrides[ROWS[0]].unitPrice = '0';
  if (mutation === 'provenance') r.rowOverrides[ROWS[0]].provenance.reason = 'changed';
  if (mutation === 'order') r.rowOverrides['fusion-bench-prepared-concrete:bench-order'].quantity = '1';
  if (mutation === 'price-selection') r.priceSnapshotIds = ['44444444-4444-4444-8444-444444444444'];
  if (mutation === 'missing-selection') delete r.priceSnapshotIds;
  if (mutation === 'staged-only') r.rowOverrides = { [ROWS[0]]: { quantity: null }, [ROWS[2]]: { quantity: null } };
  expect(admit(input)).toBeNull();
});

test('exact ordered and duplicated price selections survive both phases at the 64 boundary', () => {
  const input = scenario(); input.parent.price_snapshot_ids = Array.from({ length: 64 }, (_, i) => i % 2 ? input.parent.id : input.parent.owner_user_id);
  const normalized = admit(input)!; expect(normalized.priceSnapshotIds).toEqual(input.parent.price_snapshot_ids);
  input.phase = 'WORKER'; input.request = { ...input.request, rowOverrides: normalized.rowOverrides, priceSnapshotIds: normalized.priceSnapshotIds };
  expect(admit(input)?.priceSnapshotIds).toEqual(input.parent.price_snapshot_ids);
  input.request.priceSnapshotIds.reverse(); expect(admit(input)).toBeNull();
});

test.each([null, {}, { contractVersion: 'canonical-fusion-derived-quantity-clear/v1', acknowledged: true, parentChecksumSha256: 'a'.repeat(64), clearedRowIds: [] },
  { contractVersion: 'canonical-fusion-derived-quantity-clear/v1', acknowledged: true, parentChecksumSha256: 'a'.repeat(64), clearedRowIds: [ROWS[0], ROWS[0]] }])
('malformed consent fails closed', value => { expect(consent(value)).toBeNull(); });
