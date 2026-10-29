import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const REVISION_ID = "11111111-1111-4111-8111-111111111111";
const UPLOAD_ID = "22222222-2222-4222-8222-222222222222";
const ATTACHMENT_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_ATTACHMENT_ID = "44444444-4444-4444-8444-444444444444";
const OWNER_ID = "55555555-5555-4555-8555-555555555555";

const readSource = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

// Execute the actual declarations, as in the existing root startup contracts;
// do not boot Deno, a server, a provider session or a second implementation.
function sourceDeclarations(relative: string, names: string[]) {
  const parsed = ts.createSourceFile(relative, readSource(relative), ts.ScriptTarget.Latest, true);
  return names.map((name) => {
    const declaration = parsed.statements.find((statement) =>
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name?.text === name,
    );
    if (!declaration) throw new Error(`Missing actual photo declaration: ${name}`);
    return ts.createPrinter().printNode(ts.EmitHint.Unspecified, declaration, parsed);
  }).join("\n");
}

const apiGuards = sourceDeclarations("src/lib/estimate/backendPlatform/contracts.ts", ["CanonicalEstimateApiError", "assertUuid"]);
const edgeFunctions = sourceDeclarations("supabase/functions/canonical-estimate/index.ts", [
  "normalizeDbError", "photoAttachmentView", "listRevisionPhotoAttachments", "finalizeRevisionPhotoUpload",
]);
const localFinalizer = sourceDeclarations("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts", ["finalizeLocalRevisionPhotoUpload"]);
const clientFunctions = sourceDeclarations("src/lib/estimate/backendPlatform/canonicalEstimatePhotoAttachmentService.ts", ["assertCommittedAttachment", "commitCanonicalEstimateRowPhoto"]);

function clientCommit(attachment: Record<string, unknown>, retargetIntentDuringFinalize = false) {
  const intent = {
    apiVersion: "2026-08-14.r2", uploadId: UPLOAD_ID, attachmentId: ATTACHMENT_ID, status: "committed",
    storageBucket: "private-media", storageObjectKey: "staging/test-owned-photo",
    uploadUrl: null, uploadToken: null, expiresAt: "2099-01-01T00:00:00Z", created: false,
  };
  const input = {
    requestId: "saved-request", catalogId: "saved-catalog", revisionId: REVISION_ID, rowId: "material-row",
    asset: {
      metadataStripped: true, orientationNormalized: true,
      captureId: "capture-1", scanId: "scan-1", kind: "OTHER", localUri: "file:///owned-photo.png",
      contentSha256: "a".repeat(64), mimeType: "image/png", byteSize: 123, width: 10, height: 20,
    },
  };
  const createUpload = jest.fn(async () => intent);
  const finalizeUpload = jest.fn(async () => {
    if (retargetIntentDuringFinalize) intent.attachmentId = OTHER_ATTACHMENT_ID;
    return { attachment, created: false };
  });
  const upload = jest.fn();
  const readAsset = jest.fn();
  const compiled = ts.transpileModule(apiGuards + "\n" + clientFunctions, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const commit = vm.runInNewContext(compiled + "\ncommitCanonicalEstimateRowPhoto", {
    exports: {}, canonicalEstimatePhotoIdempotencyKey: () => "test-owned-photo-intent",
    createCanonicalEstimatePhotoUpload: createUpload, finalizeCanonicalEstimatePhotoUpload: finalizeUpload,
    uploadCanonicalEstimatePhotoObject: upload, readAndVerifyLocalAsset: readAsset,
  }) as (value: unknown) => Promise<{ attachment: Record<string, unknown>; storedImage: Record<string, unknown>; created: boolean }>;
  return { invoke: () => commit(input), intent, input, createUpload, finalizeUpload, upload, readAsset };
}

function photoRow(attachmentId = ATTACHMENT_ID, rowId = "material-row") {
  return {
    attachment_id: attachmentId,
    attachment_event_id: attachmentId === ATTACHMENT_ID
      ? "88888888-8888-4888-8888-888888888888"
      : "99999999-9999-4999-8999-999999999999",
    tenant_id: "77777777-7777-4777-8777-777777777777",
    owner_user_id: OWNER_ID,
    request_id: "saved-request",
    catalog_id: "saved-catalog",
    parent_revision_id: REVISION_ID,
    row_id: rowId,
    storage_bucket: "private-media",
    storage_object_key: `${REVISION_ID}/${attachmentId}.png`,
    content_sha256: "a".repeat(64),
    mime_type: "image/png",
    size_bytes: 123,
    attachment_status: "committed",
    created_at: "2026-10-29T00:00:00Z",
    created_by: OWNER_ID,
  };
}

function committedReplay(adapter: "edge" | "local", rows: ReturnType<typeof photoRow>[], errorAt?: "reservation" | "projection") {
  const reservation = { attachment_id: ATTACHMENT_ID, parent_revision_id: REVISION_ID, status: "committed" };
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(async () => ({ data: errorAt === "reservation" ? null : reservation, error: errorAt === "reservation" ? { code: "42501" } : null })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const requester = {
    from: jest.fn(() => query),
    rpc: jest.fn(async () => ({ data: rows, error: errorAt === "projection" ? { code: "42501" } : null })),
  };
  const bucket = {
    createSignedUrl: jest.fn(async (key: string) => ({ data: { signedUrl: `https://signed.example/${key}` }, error: null })),
    download: jest.fn(), move: jest.fn(), remove: jest.fn(),
  };
  const admin = { storage: { from: jest.fn(() => bucket) }, rpc: jest.fn() };
  const localReservation = jest.fn(async () => reservation);
  const localProjection = jest.fn(async () => ({
    attachments: rows.map((row) => ({
      attachmentId: row.attachment_id, parentRevisionId: row.parent_revision_id,
      rowId: row.row_id, contentSha256: row.content_sha256, status: row.attachment_status,
    })),
  }));
  const compiled = ts.transpileModule(apiGuards + "\n" + (adapter === "edge" ? edgeFunctions : localFinalizer), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const finalize = vm.runInNewContext(compiled + "\n" + (adapter === "edge" ? "finalizeRevisionPhotoUpload" : "finalizeLocalRevisionPhotoUpload"), {
    exports: {}, ESTIMATE_PLATFORM_API_VERSION: "unit-test-api", API_VERSION: "unit-test-api",
    PHOTO_SIGNED_URL_TTL_SECONDS: 900, requireAdmin: () => admin,
    localPhotoUploadReservation: localReservation, listLocalRevisionPhotoAttachments: localProjection,
  }) as (...args: unknown[]) => Promise<{ attachment: Record<string, unknown>; created: boolean }>;
  return {
    invoke: () => adapter === "edge" ? finalize(requester, OWNER_ID, REVISION_ID, UPLOAD_ID) : finalize(REVISION_ID, UPLOAD_ID, "unit.test"),
    requester, query, admin, bucket, localReservation, localProjection,
  };
}

describe("R5.5 estimate row photo finalize identity", () => {
  it("returns the complete authoritative attachment identity from finalization", () => {
    const migration = fs.readFileSync(path.join(
      process.cwd(),
      "supabase/migrations/20260819223000_estimate_revision_photo_finalize_identity_r55.sql",
    ), "utf8");
    const edge = fs.readFileSync(path.join(
      process.cwd(),
      "supabase/functions/canonical-estimate/index.ts",
    ), "utf8");
    const localBackend = fs.readFileSync(path.join(
      process.cwd(),
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    ), "utf8");
    const backendManager = fs.readFileSync(path.join(
      process.cwd(),
      "scripts/dev/ensureLocalDeveloperCanonicalBackend.ts",
    ), "utf8");

    for (const field of [
      "attachment_event_id uuid",
      "tenant_id uuid",
      "owner_user_id uuid",
      "request_id text",
      "catalog_id text",
      "parent_revision_id uuid",
      "row_id text",
      "storage_bucket text",
      "storage_object_key text",
      "content_sha256 text",
      "mime_type text",
      "size_bytes bigint",
      "attachment_status text",
      "created_by uuid",
    ]) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain(
      "v_attachment.tenant_id, v_attachment.owner_user_id, v_attachment.request_id",
    );
    expect(migration).toContain(
      "v_attachment.catalog_id, v_attachment.parent_revision_id, v_attachment.row_id",
    );
    expect(edge).toContain("tenantId: row.tenant_id");
    expect(edge).toContain("ownerUserId: row.owner_user_id");
    expect(edge).toContain("requestId: row.request_id");
    expect(edge).toContain("catalogId: row.catalog_id");
    expect(localBackend).toContain("tenantId: row.tenant_id");
    expect(localBackend).toContain("ownerUserId: row.owner_user_id");
    expect(localBackend).toContain("requestId: row.request_id");
    expect(localBackend).toContain("catalogId: row.catalog_id");
    expect(localBackend).toContain("x-idempotency-key,x-upsert");
    expect(localBackend).toContain("backendRuntimeSourceSha256: CANONICAL_ESTIMATE_RUNTIME_SOURCE_SHA256");
    expect(backendManager).toContain("tuple.backendRuntimeSourceSha256 === desired.backendRuntimeSourceSha256");
    expect(backendManager).toContain("backendRuntimeSourceSha256: backendRuntimeClosureSha256(BACKEND_SOURCE)");
    expect(backendManager).toContain("function backendRuntimeClosureSha256");
  });

  it.each(["edge", "local"] as const)("%s committed retries return the reserved ID even when a neighbor is first", async (adapter) => {
    const exact = photoRow();
    const neighbor = photoRow(OTHER_ATTACHMENT_ID);
    const scenario = committedReplay(adapter, [neighbor, exact]);

    expect(await scenario.invoke()).toEqual(expect.objectContaining({
      attachment: expect.objectContaining({ attachmentId: ATTACHMENT_ID, parentRevisionId: REVISION_ID, rowId: exact.row_id, contentSha256: exact.content_sha256 }),
      created: false,
    }));
    expect(await scenario.invoke()).toEqual(expect.objectContaining({ attachment: expect.objectContaining({ attachmentId: ATTACHMENT_ID }), created: false }));
    expect(scenario.admin.rpc).not.toHaveBeenCalled();
    expect(scenario.bucket.download).not.toHaveBeenCalled();
    expect(scenario.bucket.move).not.toHaveBeenCalled();
    expect(scenario.bucket.remove).not.toHaveBeenCalled();
    if (adapter === "edge") {
      expect(scenario.requester.from).toHaveBeenCalledWith("estimate_revision_photo_upload");
      expect(scenario.query.eq).toHaveBeenCalledWith("id", UPLOAD_ID);
      expect(scenario.query.eq).toHaveBeenCalledWith("parent_revision_id", REVISION_ID);
      expect(scenario.requester.rpc).toHaveBeenCalledWith("estimate_list_revision_photo_attachments_r55", { p_revision_id: REVISION_ID, p_include_deleted: false });
      expect((await scenario.invoke()).attachment).toEqual(expect.objectContaining({ tenantId: exact.tenant_id, ownerUserId: OWNER_ID, requestId: exact.request_id, catalogId: exact.catalog_id }));
    } else {
      expect(scenario.localReservation).toHaveBeenCalledWith(UPLOAD_ID);
      expect(scenario.localProjection).toHaveBeenCalledWith(REVISION_ID, false, "unit.test");
    }
  });

  it.each([
    ["edge", "another-row"], ["edge", "material-row"],
    ["local", "another-row"], ["local", "material-row"],
  ] as const)("%s cannot replace a tombstoned reserved ID with a live neighbor on %s", async (adapter, rowId) => {
    // The live projection excludes deleted A. B may have the same row/hash/MIME/
    // bytes, so those values cannot replace the reservation's attachment ID.
    const neighbor = photoRow(OTHER_ATTACHMENT_ID, rowId);
    const scenario = committedReplay(adapter, [neighbor]);
    const before = JSON.stringify(neighbor);

    await expect(scenario.invoke()).rejects.toMatchObject({ code: "PHOTO_ATTACHMENT_PROJECTION_MISSING", httpStatus: 409 });
    expect(JSON.stringify(neighbor)).toBe(before);
    expect(scenario.admin.rpc).not.toHaveBeenCalled();
    expect(scenario.bucket.move).not.toHaveBeenCalled();
    expect(scenario.bucket.remove).not.toHaveBeenCalled();
  });

  it.each(["edge", "local"] as const)("%s preserves the missing exact projection conflict for an empty live set", async (adapter) => {
    await expect(committedReplay(adapter, []).invoke()).rejects.toMatchObject({ code: "PHOTO_ATTACHMENT_PROJECTION_MISSING", httpStatus: 409 });
  });

  it.each(["reservation", "projection"] as const)("Edge preserves %s access denial before returning a photo", async (errorAt) => {
    const scenario = committedReplay("edge", [photoRow(OTHER_ATTACHMENT_ID)], errorAt);

    await expect(scenario.invoke()).rejects.toMatchObject({ code: "ACCESS_DENIED", httpStatus: 403 });
    expect(scenario.admin.storage.from).not.toHaveBeenCalled();
    expect(scenario.admin.rpc).not.toHaveBeenCalled();
    if (errorAt === "reservation") expect(scenario.requester.rpc).not.toHaveBeenCalled();
  });

  it("client committed retry preserves the exact reservation attachment and stored-image identity", async () => {
    const { attachment } = await committedReplay("edge", [photoRow()]).invoke();
    const scenario = clientCommit(attachment);

    const result = await scenario.invoke();

    expect(result.attachment).toBe(attachment);
    expect(result.created).toBe(false);
    expect(result.storedImage).toEqual(expect.objectContaining({
      imageId: ATTACHMENT_ID, contentSha256: scenario.input.asset.contentSha256,
      storagePath: photoRow().storage_object_key, privateObject: true, signedUrlExposed: false,
    }));
    expect(scenario.createUpload).toHaveBeenCalledWith(expect.objectContaining({
      revisionId: REVISION_ID, requestId: scenario.input.requestId, catalogId: scenario.input.catalogId,
      rowId: scenario.input.rowId, contentSha256: scenario.input.asset.contentSha256,
    }));
    expect(scenario.finalizeUpload).toHaveBeenCalledWith({ revisionId: REVISION_ID, uploadId: UPLOAD_ID, signal: undefined });
    expect(scenario.upload).not.toHaveBeenCalled();
    expect(scenario.readAsset).not.toHaveBeenCalled();
  });

  it("client rejects a neighboring ID with identical row/content even if the intent object retargets during finalize", async () => {
    const { attachment } = await committedReplay("edge", [photoRow()]).invoke();
    const neighbor = {
      ...attachment, attachmentId: OTHER_ATTACHMENT_ID,
      attachmentEventId: photoRow(OTHER_ATTACHMENT_ID).attachment_event_id,
      storageObjectKey: photoRow(OTHER_ATTACHMENT_ID).storage_object_key,
    };
    const scenario = clientCommit(neighbor, true);

    await expect(scenario.invoke()).rejects.toMatchObject({ code: "PHOTO_ATTACHMENT_IDENTITY_MISMATCH", httpStatus: 409 });
    expect(scenario.intent.attachmentId).toBe(OTHER_ATTACHMENT_ID);
    expect(scenario.finalizeUpload).toHaveBeenCalledWith({ revisionId: REVISION_ID, uploadId: UPLOAD_ID, signal: undefined });
    expect(scenario.upload).not.toHaveBeenCalled();
    expect(scenario.readAsset).not.toHaveBeenCalled();
  });
});
