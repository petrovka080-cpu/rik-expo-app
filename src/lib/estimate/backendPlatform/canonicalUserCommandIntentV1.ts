import { createHash } from 'node:crypto';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';

type Json = Record<string, any>;
type QueryClient = { query(text: string, values?: any[]): Promise<{ rows: Json[] }> };
export type CanonicalUserCommandReplayIdentity = {
  ownerUserId: string; organizationId: string | null; targetReleaseId: string;
  operation: string; catalogId: string; parentRevisionId: string | null;
  clientIdempotencyKey: string; persistenceIdempotencyKey: string; payload: Json;
};

/** Build admission remains candidate-specific. Only an explicitly marked
 * interactive intent may read back a prior delivery across candidate builds.
 * Equality is of the command, parent, release and payload, never BOQ checksum. */
export function canonicalUserCommandSemanticPayloadV1(payload: Json): Json {
  // Admission RPCs add releaseAdmission/cumulativeManifest/run metadata. The
  // typed command fields below, plus the separately bound release/principal,
  // define the business operation independently of those dispatch envelopes.
  return { parameters: payload.parameters ?? {}, currencyCode: payload.currencyCode,
    priceSnapshotIds: payload.priceSnapshotIds ?? [], requestIdentity: payload.requestIdentity ?? null,
    rowOverrides: payload.rowOverrides ?? {}, customRows: payload.customRows ?? [], releaseMigration: payload.releaseMigration ?? null,
    ...(payload.derivedQuantityClearV1 == null ? {} : { derivedQuantityClearV1: payload.derivedQuantityClearV1 }) };
}
function digest(identity: CanonicalUserCommandReplayIdentity, payload = identity.payload): string {
  return createHash('sha256').update(canonicalEstimateStableJson({
    operation: identity.operation, catalogId: identity.catalogId, parentRevisionId: identity.parentRevisionId,
    ownerUserId: identity.ownerUserId, organizationId: identity.organizationId, targetReleaseId: identity.targetReleaseId,
    payload: canonicalUserCommandSemanticPayloadV1(payload),
  })).digest('hex');
}
export async function readCanonicalUserCommandReplayV1(client: QueryClient, identity: CanonicalUserCommandReplayIdentity): Promise<Json | null> {
  const intent = identity.payload.commandIntentV1;
  if (intent == null) return null;
  if (intent.contractVersion !== 'canonical-user-command-intent:v1' || intent.key !== identity.clientIdempotencyKey
    || Object.keys(intent).some(key => !['contractVersion', 'key'].includes(key))) {
    throw Object.assign(new Error('Идентификатор сохранения не соответствует команде.'), { code: 'COMMAND_INTENT_INVALID', httpStatus: 400 });
  }
  const lockKey = canonicalEstimateStableJson([identity.ownerUserId, identity.organizationId, identity.clientIdempotencyKey]);
  await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [lockKey]);
  const suffixIndex = identity.persistenceIdempotencyKey.lastIndexOf(':candidate:');
  const candidatePrefix = suffixIndex < 0 ? null : identity.persistenceIdempotencyKey.slice(0, suffixIndex + ':candidate:'.length);
  const existing = await client.query(`select * from public.estimate_compile_job
    where owner_user_id=$1 and organization_id is not distinct from $2::uuid and target_release_id=$3
      and (input_payload #>> '{commandIntentV1,key}'=$4 or idempotency_key=$4
        or ($5::text is not null and left(idempotency_key,length($5))=$5))
    order by created_at,id for update`, [identity.ownerUserId, identity.organizationId, identity.targetReleaseId, identity.clientIdempotencyKey, candidatePrefix]);
  const expected = digest(identity);
  for (const job of existing.rows) {
    // Scope is checked again so an adapter can never replay a foreign result.
    if (job.owner_user_id !== identity.ownerUserId || (job.organization_id ?? null) !== identity.organizationId
      || job.target_release_id !== identity.targetReleaseId) continue;
    if (job.operation !== identity.operation || job.catalog_id !== identity.catalogId
      || (job.parent_revision_id ?? null) !== identity.parentRevisionId || digest(identity, job.input_payload ?? {}) !== expected) {
      throw Object.assign(new Error('Повтор сохранения содержит другие изменения. Исходная смета сохранена.'), { code: 'COMMAND_INTENT_PAYLOAD_MISMATCH', httpStatus: 409 });
    }
    if ((job.status === 'succeeded' && job.result_revision_id)
      || ['queued', 'running', 'claimed', 'retry_wait'].includes(job.status)) {
      return { job_id: job.id, job_status: job.status, created: false };
    }
  }
  return null;
}
