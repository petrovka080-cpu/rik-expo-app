import { readCanonicalUserCommandReplayV1 as replay, type CanonicalUserCommandReplayIdentity } from './canonicalUserCommandIntentV1';
import { canonicalEstimateCandidateAdmissionIdempotencyKey as candidateKey } from './canonicalEstimateCommandIdentity';

const identity = (key = 'one-apply'): CanonicalUserCommandReplayIdentity => ({ ownerUserId: 'owner', organizationId: null,
  targetReleaseId: 'release', operation: 'recalculate', catalogId: 'work', parentRevisionId: 'parent',
  clientIdempotencyKey: key, persistenceIdempotencyKey: candidateKey({ clientIdempotencyKey: key, candidateSourceTree: 'new-tree', isolatedCandidateTest: true }),
  payload: { parameters: { area_m2: 75 }, currencyCode: 'KGS', priceSnapshotIds: [], rowOverrides: {}, customRows: [],
    apiVersion: 'current', estimateAdmission: { sourceTree: 'new-tree' }, commandIntentV1: { contractVersion: 'canonical-user-command-intent:v1', key } },
});
const job = (key = 'one-apply', overrides: Record<string, unknown> = {}) => {
  const input = identity(key);
  const legacyPayload: Record<string, any> = { ...input.payload, commandIntentV1: undefined, estimateAdmission: { sourceTree: 'old-tree' }, apiVersion: 'old',
    releaseAdmission: true, cumulativeManifest: true, admissionRunId: 'old-admitted-run' };
  return { id: 'existing-child-job', owner_user_id: input.ownerUserId, organization_id: null, target_release_id: 'release',
    operation: input.operation, catalog_id: input.catalogId, parent_revision_id: input.parentRevisionId,
    idempotency_key: candidateKey({ clientIdempotencyKey: key, candidateSourceTree: 'old-tree', isolatedCandidateTest: true }),
    input_payload: legacyPayload,
    status: 'succeeded', result_revision_id: 'existing-child', checksum_sha256: 'same-boq', ...overrides };
};
function store(jobs: ReturnType<typeof job>[]) {
  let calls = 0;
  return { get calls() { return calls; }, async query(_sql: string, values?: any[]) {
    calls += 1;
    if (values?.length === 1) return { rows: [] };
    const [owner, organization, release, key, prefix] = values!;
    return { rows: jobs.filter(j => j.owner_user_id === owner && j.organization_id === organization && j.target_release_id === release
      && (j.input_payload.commandIntentV1?.key === key || j.idempotency_key === key || (prefix && j.idempotency_key.startsWith(prefix)))) };
  } };
}
describe('interactive intent replay without weakening candidate admission', () => {
  test('reads the same completed legacy delivery across source builds instead of writing another child', async () => {
    const database = store([job()]);
    expect(await replay(database, identity())).toEqual({ job_id: 'existing-child-job', job_status: 'succeeded', created: false });
    expect(database.calls).toBe(2);
  });
  test.each(['parameters', 'rowOverrides', 'customRows', 'derivedQuantityClearV1'])('rejects changed %s under the same intent', async key => {
    const input = identity();
    input.payload[key] = key === 'customRows' ? [{ clientRowId: 'different' }] : { changed: 10 };
    await expect(replay(store([job()]), input)).rejects.toMatchObject({ code: 'COMMAND_INTENT_PAYLOAD_MISMATCH', httpStatus: 409 });
  });
  test('cannot glue different deliberate commands merely because their BOQ checksums match', async () => {
    expect(await replay(store([job('another-apply')]), identity())).toBeNull();
  });
  test('does not replay another parent, owner, tenant or release', async () => {
    await expect(replay(store([job('one-apply', { parent_revision_id: 'different-parent' })]), identity())).rejects.toMatchObject({ code: 'COMMAND_INTENT_PAYLOAD_MISMATCH' });
    for (const scope of [{ owner_user_id: 'foreign' }, { organization_id: 'foreign-tenant' }, { target_release_id: 'foreign-release' }])
      expect(await replay(store([job('one-apply', scope)]), identity())).toBeNull();
  });
  test('pending work is read back; a failed delivery with no revision does not masquerade as success', async () => {
    expect(await replay(store([job('one-apply', { status: 'running', result_revision_id: null })]), identity()))
      .toMatchObject({ job_status: 'running', created: false });
    expect(await replay(store([job('one-apply', { status: 'failed', result_revision_id: null })]), identity())).toBeNull();
  });
  test('unmarked candidate probes retain their existing isolated protocol and invalid markers fail closed', async () => {
    const input = identity();
    const database = store([job()]);
    delete input.payload.commandIntentV1;
    expect(await replay(database, input)).toBeNull(); expect(database.calls).toBe(0);
    input.payload.commandIntentV1 = { contractVersion: 'canonical-user-command-intent:v1', key: 'foreign-key' };
    await expect(replay(database, input)).rejects.toMatchObject({ code: 'COMMAND_INTENT_INVALID' });
  });
});
