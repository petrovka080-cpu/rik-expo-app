import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

const MASTER_SHA256 = "554a9c4d2480c70ce2592a302a04e47f11ed7cc35353fb22fd15396f6fb91f27";
const REVISION_ID = "a7fc530d-7b3c-4013-9bb5-f561da7e00c2";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const TENANT_ID = "22222222-2222-4222-8222-222222222222";
const FOREIGN_OWNER_ID = "99999999-9999-4999-8999-999999999999";
const BASE_URL = String(
  process.env.CANONICAL_ESTIMATE_PHOTO_PROOF_URL
    ?? "http://127.0.0.1:8768/canonical-estimate",
).replace(/\/+$/u, "");
const DATABASE_URL = String(process.env.CANONICAL_ESTIMATE_PHOTO_PROOF_DATABASE_URL ?? "").trim();
const OUTPUT_DIRECTORY = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002/runtime/raw-photo-backend-r55",
);
const PHOTO_OBJECT_ROOT = resolve(
  ".release-runtime/master11610-backend-canonical-r1/05-runtime/local-photo-objects",
);

type JsonRecord = Record<string, unknown>;
type Assertion = { name: string; passed: boolean; details?: unknown };

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function unsignedJwt(subject: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: subject, role: "authenticated" })).toString("base64url");
  return `${header}.${payload}.proof`;
}

function photoFile(storageKey: string): string {
  if (!/^estimate-photo\/r55\/(?:staged|committed)\/[0-9a-f]{2}\/[0-9a-f]{64}\.(?:jpg|png)$/u.test(storageKey)) {
    throw new Error("unsafe photo storage key returned by backend");
  }
  return resolve(PHOTO_OBJECT_ROOT, storageKey);
}

async function requestJson(input: {
  pathOrUrl: string;
  method?: string;
  body?: JsonRecord;
  token?: string | null;
}) {
  const url = /^https?:\/\//u.test(input.pathOrUrl)
    ? input.pathOrUrl
    : `${BASE_URL}/${input.pathOrUrl.replace(/^\/+/, "")}`;
  const headers: Record<string, string> = {};
  if (input.token !== null) headers.Authorization = `Bearer ${input.token ?? "local-dev-runtime-token"}`;
  if (input.body) headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method: input.method ?? "GET",
    headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  const text = await response.text();
  let json: JsonRecord = {};
  try { json = text ? JSON.parse(text) as JsonRecord : {}; } catch { json = { raw: text }; }
  return { status: response.status, json };
}

async function uploadBytes(input: {
  uploadUrl: string;
  bytes: Buffer;
  mimeType: string;
}) {
  const body = input.bytes.buffer.slice(
    input.bytes.byteOffset,
    input.bytes.byteOffset + input.bytes.byteLength,
  ) as ArrayBuffer;
  const response = await fetch(input.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": input.mimeType },
    body,
  });
  const text = await response.text();
  let json: JsonRecord = {};
  try { json = text ? JSON.parse(text) as JsonRecord : {}; } catch { json = { raw: text }; }
  return { status: response.status, json };
}

async function withDatabase<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try { return await operation(client); } finally { await client.end(); }
}

function errorView(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownError", message: String(error) };
}

async function main(): Promise<void> {
  if (!DATABASE_URL) throw new Error("CANONICAL_ESTIMATE_PHOTO_PROOF_DATABASE_URL is required");
  const recordedAt = new Date().toISOString();
  const runId = sha256(`${recordedAt}:${process.pid}`).slice(0, 16);
  const assertions: Assertion[] = [];
  const identifiers: JsonRecord = { revisionId: REVISION_ID, runId };
  const observation: JsonRecord = {};

  const check = (name: string, passed: boolean, details?: unknown) => {
    assertions.push({ name, passed, ...(details === undefined ? {} : { details }) });
    if (!passed) throw new Error(`assertion failed: ${name}`);
  };

  let terminalError: ReturnType<typeof errorView> | null = null;
  try {
    const fixture = await withDatabase(async (client) => {
      const revision = (await client.query(
        "select id,catalog_id,checksum_sha256,row_count,totals from public.estimate_revision where id=$1 and owner_user_id=$2",
        [REVISION_ID, OWNER_ID],
      )).rows[0];
      const rows = (await client.query(
        "select row_id,row_sha256 from public.estimate_revision_row where revision_id=$1 order by ordinal limit 2",
        [REVISION_ID],
      )).rows;
      const artifacts = (await client.query(
        "select id,artifact_kind,status,sha256,storage_key from public.estimate_revision_artifact where revision_id=$1 order by artifact_kind,id",
        [REVISION_ID],
      )).rows;
      return { revision, rows, artifacts };
    });
    check("fixture_revision_exists", Boolean(fixture.revision?.id));
    check("fixture_has_two_rows", fixture.rows.length === 2);
    const catalogId = String(fixture.revision.catalog_id);
    const firstRowId = String(fixture.rows[0].row_id);
    const secondRowId = String(fixture.rows[1].row_id);
    const requestId = `r55-photo-proof:${REVISION_ID}:${runId}`;
    Object.assign(identifiers, { requestId, catalogId, firstRowId, secondRowId });

    const pngBase = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const pngReplacement = Buffer.concat([pngBase, Buffer.from(`r55:${runId}`, "utf8")]);
    const hashBase = sha256(pngBase);
    const hashReplacement = sha256(pngReplacement);

    const authAbsent = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments`,
      token: null,
    });
    check("auth_required", authAbsent.status === 401, { status: authAbsent.status });
    const foreign = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments`,
      token: unsignedJwt(FOREIGN_OWNER_ID),
    });
    check("cross_tenant_user_denied", foreign.status === 403, { status: foreign.status });

    const oversized = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: {
        idempotencyKey: `oversized:${runId}`,
        requestId,
        catalogId,
        rowId: firstRowId,
        contentSha256: hashBase,
        mimeType: "image/png",
        sizeBytes: 20 * 1024 * 1024 + 1,
      },
    });
    check("oversized_reservation_rejected", oversized.status === 400, { status: oversized.status });
    const zero = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: {
        idempotencyKey: `zero:${runId}`,
        requestId,
        catalogId,
        rowId: firstRowId,
        contentSha256: hashBase,
        mimeType: "image/png",
        sizeBytes: 0,
      },
    });
    check("zero_byte_reservation_rejected", zero.status === 400, { status: zero.status });
    const wrongCatalog = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: {
        idempotencyKey: `wrong-catalog:${runId}`,
        requestId,
        catalogId: `${catalogId}:wrong`,
        rowId: firstRowId,
        contentSha256: hashBase,
        mimeType: "image/png",
        sizeBytes: pngBase.length,
      },
    });
    check("wrong_catalog_rejected", wrongCatalog.status === 400, { status: wrongCatalog.status });
    const wrongRow = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: {
        idempotencyKey: `wrong-row:${runId}`,
        requestId,
        catalogId,
        rowId: `missing:${runId}`,
        contentSha256: hashBase,
        mimeType: "image/png",
        sizeBytes: pngBase.length,
      },
    });
    check("wrong_row_rejected", wrongRow.status === 400, { status: wrongRow.status });
    const reservedKey = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: {
        idempotencyKey: `system:${runId}`,
        requestId,
        catalogId,
        rowId: firstRowId,
        contentSha256: hashBase,
        mimeType: "image/png",
        sizeBytes: pngBase.length,
      },
    });
    check("system_idempotency_namespace_reserved", reservedKey.status === 400, { status: reservedKey.status });

    const firstKey = `attach-first:${runId}`;
    const firstPayload = {
      idempotencyKey: firstKey,
      requestId,
      catalogId,
      rowId: firstRowId,
      contentSha256: hashBase,
      mimeType: "image/png",
      sizeBytes: pngBase.length,
    };
    const first = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`, method: "POST", body: firstPayload,
    });
    check("reservation_created", first.status === 201 && first.json.created === true, { status: first.status });
    const firstUploadId = String(first.json.uploadId);
    const firstAttachmentId = String(first.json.attachmentId);
    const firstUploadUrl = String(first.json.uploadUrl);
    check("bounded_content_addressed_staging_key", /^estimate-photo\/r55\/staged\/[0-9a-f]{2}\/[0-9a-f]{64}\.png$/u.test(String(first.json.storageObjectKey)));
    const firstRetry = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`, method: "POST", body: firstPayload,
    });
    check("reservation_retry_same_identity", firstRetry.status === 201
      && firstRetry.json.created === false
      && firstRetry.json.uploadId === firstUploadId
      && firstRetry.json.attachmentId === firstAttachmentId);
    const firstConflict = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: { ...firstPayload, contentSha256: hashReplacement, sizeBytes: pngReplacement.length },
    });
    check("idempotency_payload_conflict", firstConflict.status === 409, { status: firstConflict.status });
    const mimeMismatch = await uploadBytes({ uploadUrl: firstUploadUrl, bytes: pngBase, mimeType: "image/jpeg" });
    check("declared_mime_mismatch_rejected", mimeMismatch.status === 422, { status: mimeMismatch.status });
    const firstUpload = await uploadBytes({ uploadUrl: firstUploadUrl, bytes: pngBase, mimeType: "image/png" });
    check("verified_binary_uploaded", firstUpload.status === 201, { status: firstUpload.status });
    const wrongFinalize = await requestJson({
      pathOrUrl: `revisions/00000000-0000-4000-8000-000000000010/attachments/photo/uploads/${firstUploadId}/finalize`,
      method: "POST",
    });
    check("finalize_revision_path_mismatch_rejected", wrongFinalize.status === 404, { status: wrongFinalize.status });
    const firstFinalize = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads/${firstUploadId}/finalize`, method: "POST",
    });
    const firstFinalizedAttachment = firstFinalize.json.attachment as JsonRecord;
    check("attachment_finalized_with_complete_authoritative_identity", firstFinalize.status === 200
      && firstFinalize.json.created === true
      && firstFinalizedAttachment?.attachmentId === firstAttachmentId
      && typeof firstFinalizedAttachment?.attachmentEventId === "string"
      && firstFinalizedAttachment?.tenantId === TENANT_ID
      && firstFinalizedAttachment?.ownerUserId === OWNER_ID
      && firstFinalizedAttachment?.requestId === requestId
      && firstFinalizedAttachment?.catalogId === catalogId
      && firstFinalizedAttachment?.parentRevisionId === REVISION_ID
      && firstFinalizedAttachment?.rowId === firstRowId
      && firstFinalizedAttachment?.storageBucket === "private-media"
      && firstFinalizedAttachment?.contentSha256 === hashBase
      && firstFinalizedAttachment?.mimeType === "image/png"
      && Number(firstFinalizedAttachment?.sizeBytes) === pngBase.length
      && firstFinalizedAttachment?.status === "committed"
      && typeof firstFinalizedAttachment?.createdBy === "string"
      && typeof firstFinalizedAttachment?.signedUrl === "string");
    const firstFinalRetry = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads/${firstUploadId}/finalize`, method: "POST",
    });
    check("finalize_retry_same_complete_identity", firstFinalRetry.status === 200
      && firstFinalRetry.json.created === false
      && (firstFinalRetry.json.attachment as JsonRecord)?.attachmentId === firstAttachmentId
      && (firstFinalRetry.json.attachment as JsonRecord)?.tenantId === TENANT_ID
      && (firstFinalRetry.json.attachment as JsonRecord)?.ownerUserId === OWNER_ID
      && (firstFinalRetry.json.attachment as JsonRecord)?.requestId === requestId
      && (firstFinalRetry.json.attachment as JsonRecord)?.catalogId === catalogId
      && (firstFinalRetry.json.attachment as JsonRecord)?.parentRevisionId === REVISION_ID
      && (firstFinalRetry.json.attachment as JsonRecord)?.rowId === firstRowId);

    const firstList = await requestJson({ pathOrUrl: `revisions/${REVISION_ID}/attachments` });
    const firstListed = (firstList.json.attachments as JsonRecord[] | undefined)?.find(
      (candidate) => candidate.attachmentId === firstAttachmentId,
    );
    check("authoritative_projection_lists_attachment", firstList.status === 200
      && firstListed?.status === "committed"
      && firstListed?.requestId === requestId
      && firstListed?.rowId === firstRowId
      && firstListed?.contentSha256 === hashBase);
    const signedUrl = String(firstListed?.signedUrl ?? "");
    const signedDownload = await fetch(signedUrl);
    const signedBytes = Buffer.from(await signedDownload.arrayBuffer());
    check("signed_download_exact_bytes", signedDownload.status === 200 && sha256(signedBytes) === hashBase);
    const expiredUrl = new URL(signedUrl);
    expiredUrl.searchParams.set("expires", "1");
    const expiredDownload = await fetch(expiredUrl);
    check("expired_or_tampered_signed_url_denied", expiredDownload.status === 401, { status: expiredDownload.status });

    const replacementKey = `replace:${runId}`;
    const replacementPayload = {
      idempotencyKey: replacementKey,
      requestId,
      catalogId,
      rowId: firstRowId,
      contentSha256: hashReplacement,
      mimeType: "image/png",
      sizeBytes: pngReplacement.length,
      replacesAttachmentId: firstAttachmentId,
    };
    const replacement = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`, method: "POST", body: replacementPayload,
    });
    check("replacement_reservation_created", replacement.status === 201 && replacement.json.created === true);
    const replacementUpload = await uploadBytes({
      uploadUrl: String(replacement.json.uploadUrl), bytes: pngReplacement, mimeType: "image/png",
    });
    check("replacement_binary_uploaded", replacementUpload.status === 201);
    const replacementFinalize = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads/${String(replacement.json.uploadId)}/finalize`, method: "POST",
    });
    const replacementAttachment = replacementFinalize.json.attachment as JsonRecord;
    const replacementAttachmentId = String(replacementAttachment?.attachmentId ?? "");
    check("replacement_finalized", replacementFinalize.status === 200
      && replacementAttachmentId !== firstAttachmentId
      && replacementAttachment?.status === "committed");
    const activeAfterReplacement = await requestJson({ pathOrUrl: `revisions/${REVISION_ID}/attachments` });
    const activeReplacement = activeAfterReplacement.json.attachments as JsonRecord[];
    check("replacement_tombstones_previous_projection", activeReplacement.length === 1
      && activeReplacement[0]?.attachmentId === replacementAttachmentId);
    const allAfterReplacement = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments?includeDeleted=true`,
    });
    const allReplacement = allAfterReplacement.json.attachments as JsonRecord[];
    check("historical_attachment_retained", allReplacement.length === 2
      && allReplacement.some((row) => row.attachmentId === firstAttachmentId && row.status === "deleted")
      && allReplacement.some((row) => row.attachmentId === replacementAttachmentId && row.status === "committed"));

    const sameContentOtherRow = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: {
        idempotencyKey: `same-content-other-row:${runId}`,
        requestId,
        catalogId,
        rowId: secondRowId,
        contentSha256: hashBase,
        mimeType: "image/png",
        sizeBytes: pngBase.length,
      },
    });
    check("same_content_different_row_reserved", sameContentOtherRow.status === 201);
    check("same_content_different_row_has_distinct_key", sameContentOtherRow.json.storageObjectKey !== first.json.storageObjectKey);
    check("same_content_other_row_uploaded", (await uploadBytes({
      uploadUrl: String(sameContentOtherRow.json.uploadUrl), bytes: pngBase, mimeType: "image/png",
    })).status === 201);
    const otherRowFinalize = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads/${String(sameContentOtherRow.json.uploadId)}/finalize`, method: "POST",
    });
    check("same_content_bound_to_exact_other_row", otherRowFinalize.status === 200
      && (otherRowFinalize.json.attachment as JsonRecord)?.rowId === secondRowId
      && (otherRowFinalize.json.attachment as JsonRecord)?.attachmentId !== firstAttachmentId);

    const missingObject = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: {
        idempotencyKey: `missing-object:${runId}`,
        requestId,
        catalogId,
        rowId: secondRowId,
        contentSha256: hashReplacement,
        mimeType: "image/png",
        sizeBytes: pngReplacement.length,
      },
    });
    const missingFinalize = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads/${String(missingObject.json.uploadId)}/finalize`, method: "POST",
    });
    check("reservation_without_upload_has_no_attachment", missingFinalize.status === 409);

    const recoverable = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: {
        idempotencyKey: `recover-after-kill:${runId}`,
        requestId,
        catalogId,
        rowId: secondRowId,
        contentSha256: hashReplacement,
        mimeType: "image/png",
        sizeBytes: pngReplacement.length,
      },
    });
    check("recoverable_reservation_created", recoverable.status === 201);
    check("recoverable_upload_completed", (await uploadBytes({
      uploadUrl: String(recoverable.json.uploadUrl), bytes: pngReplacement, mimeType: "image/png",
    })).status === 201);
    const beforeRecovery = await withDatabase(async (client) => (await client.query(
      "select u.status,(select count(*)::integer from public.estimate_revision_photo_attachment a where a.attachment_id=u.attachment_id) attachment_count from public.estimate_revision_photo_upload u where u.id=$1",
      [recoverable.json.uploadId],
    )).rows[0]);
    check("app_kill_window_is_staged_without_attachment", beforeRecovery.status === "staged"
      && Number(beforeRecovery.attachment_count) === 0);
    const recovered = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads/${String(recoverable.json.uploadId)}/finalize`, method: "POST",
    });
    check("retry_after_app_kill_finalizes", recovered.status === 200 && recovered.json.created === true);

    const rollback = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads`,
      method: "POST",
      body: {
        idempotencyKey: `rollback:${runId}`,
        requestId,
        catalogId,
        rowId: secondRowId,
        contentSha256: hashReplacement,
        mimeType: "image/png",
        sizeBytes: pngReplacement.length,
      },
    });
    check("rollback_reservation_created", rollback.status === 201);
    check("rollback_upload_completed", (await uploadBytes({
      uploadUrl: String(rollback.json.uploadUrl), bytes: pngReplacement, mimeType: "image/png",
    })).status === 201);
    await withDatabase(async (client) => {
      await client.query("update public.estimate_revision_photo_upload set expires_at=now()-interval '1 minute' where id=$1", [rollback.json.uploadId]);
    });
    const rollbackFinalize = await requestJson({
      pathOrUrl: `revisions/${REVISION_ID}/attachments/photo/uploads/${String(rollback.json.uploadId)}/finalize`, method: "POST",
    });
    check("db_failure_after_upload_reported", rollbackFinalize.status === 400, { status: rollbackFinalize.status });
    const rollbackState = await withDatabase(async (client) => (await client.query(
      "select * from public.estimate_revision_photo_upload where id=$1",
      [rollback.json.uploadId],
    )).rows[0]);
    check("db_failure_rolls_object_back_to_staged", existsSync(photoFile(String(rollbackState.staging_storage_key)))
      && !existsSync(photoFile(String(rollbackState.committed_storage_key))));
    const danglingAfterRollback = await withDatabase(async (client) => Number((await client.query(
      "select count(*)::integer value from public.estimate_revision_photo_attachment where attachment_id=$1",
      [rollbackState.attachment_id],
    )).rows[0].value));
    check("db_failure_created_no_dangling_attachment", danglingAfterRollback === 0);

    const tombstone = await requestJson({
      pathOrUrl: `attachments/${replacementAttachmentId}/tombstone`,
      method: "POST",
      body: { idempotencyKey: `delete:${runId}` },
    });
    check("explicit_tombstone_created", tombstone.status === 200 && tombstone.json.status === "deleted");
    const tombstoneRetry = await requestJson({
      pathOrUrl: `attachments/${replacementAttachmentId}/tombstone`,
      method: "POST",
      body: { idempotencyKey: `delete:${runId}` },
    });
    check("explicit_tombstone_retry_same_event", tombstoneRetry.status === 200
      && tombstoneRetry.json.attachmentEventId === tombstone.json.attachmentEventId);

    const after = await withDatabase(async (client) => {
      const revision = (await client.query(
        "select id,catalog_id,checksum_sha256,row_count,totals from public.estimate_revision where id=$1",
        [REVISION_ID],
      )).rows[0];
      const artifacts = (await client.query(
        "select id,artifact_kind,status,sha256,storage_key from public.estimate_revision_artifact where revision_id=$1 order by artifact_kind,id",
        [REVISION_ID],
      )).rows;
      const attachments = (await client.query(
        "select attachment_id,row_id,parent_revision_id,content_sha256,storage_object_key,replaces_attachment_id from public.estimate_revision_photo_attachment where request_id=$1 order by created_at,attachment_id",
        [requestId],
      )).rows;
      const events = (await client.query(
        "select event_id,attachment_id,event_kind,status,supersedes_event_id,idempotency_key from public.estimate_revision_photo_attachment_event where request_id=$1 order by created_at,event_id",
        [requestId],
      )).rows;
      return { revision, artifacts, attachments, events };
    });
    check("parent_revision_unchanged", stableJson(after.revision) === stableJson(fixture.revision));
    check("old_pdf_and_procurement_unchanged", stableJson(after.artifacts) === stableJson(fixture.artifacts));
    check("replacement_lineage_persisted", after.attachments.some((row) =>
      row.attachment_id === replacementAttachmentId && row.replaces_attachment_id === firstAttachmentId));
    check("immutable_attach_and_tombstone_events_persisted", after.events.some((row) =>
      row.attachment_id === firstAttachmentId && row.event_kind === "tombstoned" && row.status === "deleted"));
    check("cleanup_did_not_delete_historical_user_objects", after.attachments.every((row) =>
      existsSync(photoFile(String(row.storage_object_key)))));
    let immutableMutationDenied = false;
    try {
      await withDatabase(async (client) => {
        await client.query("update public.estimate_revision_photo_attachment set row_id=row_id where attachment_id=$1", [firstAttachmentId]);
      });
    } catch { immutableMutationDenied = true; }
    check("attachment_metadata_is_immutable", immutableMutationDenied);
    observation.database = {
      attachmentCount: after.attachments.length,
      eventCount: after.events.length,
      attachmentIdentitySha256: sha256(stableJson(after.attachments)),
      eventIdentitySha256: sha256(stableJson(after.events)),
      parentRevisionSha256: sha256(stableJson(after.revision)),
      artifactIdentitySha256: sha256(stableJson(after.artifacts)),
    };
  } catch (error) {
    terminalError = errorView(error);
  }

  const status = terminalError == null && assertions.length > 0 && assertions.every((item) => item.passed)
    ? "GREEN"
    : "RED";
  const result = {
    schemaVersion: "batch002-r55-photo-backend-contract-proof.v1",
    masterSha256: MASTER_SHA256,
    recordedAt,
    scope: "LOCAL_ISOLATED_BACKEND_PHOTO_CONTRACT_ONLY_NO_ANDROID_GREEN",
    backendUrl: BASE_URL,
    identifiers,
    assertions,
    observation,
    terminalError,
    status,
  };
  const bytes = `${JSON.stringify(result, null, 2)}\n`;
  const digest = sha256(bytes);
  const outputPath = resolve(OUTPUT_DIRECTORY, `BATCH002_R55_PHOTO_BACKEND_CONTRACT_PROOF_${digest}.json`);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, bytes, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({ status, assertions: assertions.length, passed: assertions.filter((item) => item.passed).length, sha256: digest, outputPath })}\n`);
  if (status !== "GREEN") process.exitCode = 1;
}

void main().catch((error) => {
  process.stderr.write(`${JSON.stringify(errorView(error))}\n`);
  process.exitCode = 1;
});
