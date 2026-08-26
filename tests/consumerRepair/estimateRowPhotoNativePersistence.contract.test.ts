import { Platform } from "react-native";

import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  attachConsumerRepairEstimateRowPhoto,
  createConsumerRepairRequestDraft,
  synchronizeConsumerRepairAuthoritativePhotoAttachments,
} from "../../src/lib/consumerRequests";
import {
  awaitConsumerRepairBundleDurableCommit,
  getConsumerRepairBundle,
  hydrateTransactionalConsumerRepairRequestStore,
  listConsumerRepairBundlesForUser,
  setConsumerRepairTransactionalDurableStoreForTests,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import { InMemoryEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore";

describe("estimate row photo native persistence", () => {
  const originalPlatformOs = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { product: "ReactNative" },
    });
    __resetConsumerRepairRequestStoreForTests();
    setConsumerRepairTransactionalDurableStoreForTests(
      new InMemoryEstimateRevisionDurableStore(),
    );
  });

  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
    Reflect.deleteProperty(globalThis, "navigator");
  });

  it("restores one exact row/revision attachment without changing its parent or PDF set", async () => {
    const ownerUserId = "photo-owner-user";
    const revisionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const releaseId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const rowId = "canonical-material-row";
    const catalogId = "canonical-photo-work";
    const tenantId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const attachmentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const attachmentEventId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const created = createConsumerRepairRequestDraft({
      consumerUserId: ownerUserId,
      problemText: "Native row photo persistence proof",
      city: "Bishkek",
      aiDraft: {
        titleRu: "Canonical estimate",
        summaryRu: "Canonical estimate",
        repairType: "canonical_backend",
        items: [{
          itemType: "material",
          titleRu: "Canonical material",
          quantity: 1,
          unit: "m3",
          source: "ai_suggested",
          sourceParameters: {
            rowCode: rowId,
            canonicalBackendRevisionId: revisionId,
            canonicalBackendReleaseId: releaseId,
            canonicalBackendCatalogId: catalogId,
          },
        }],
        missingData: [],
        dangerousDiyBlocked: false,
      },
    });
    const requestItemId = created.items[0]!.id;
    const parentBefore = created.items[0]!.sourceParameters?.canonicalBackendRevisionId;
    const pdfsBefore = created.pdfs;

    const attached = attachConsumerRepairEstimateRowPhoto({
      requestDraftId: created.draft.id,
      ownerUserId,
      revisionId,
      releaseId,
      requestItemId,
      rowId,
      fileName: "capture-safe.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 19_763,
      contentHash: "c".repeat(64),
      storageReference: "estimate-photo/r55/committed/cc/" + "c".repeat(64) + ".jpg",
      thumbnailReference: "https://private.invalid/initial-signed-url?signature=secret",
      authoritativeAttachmentId: attachmentId,
      authoritativeAttachmentEventId: attachmentEventId,
      authoritativeTenantId: tenantId,
      authoritativeOwnerUserId: ownerUserId,
      authoritativeRequestId: created.draft.id,
      authoritativeCatalogId: catalogId,
      authoritativeStorageBucket: "private-media",
      signedUrlExpiresAt: "2026-08-19T16:00:00.000Z",
    });
    await awaitConsumerRepairBundleDurableCommit({
      requestDraftId: attached.draft.id,
      expectedStatus: attached.draft.status,
      expectedRevisionId: attached.estimateDraftRevisionState?.currentRevisionId ?? null,
    });

    __simulateConsumerRepairRequestStoreReloadForTests();
    await hydrateTransactionalConsumerRepairRequestStore(attached.draft.id);
    const reopened = getConsumerRepairBundle(attached.draft.id);

    expect(reopened.estimateAttachments).toHaveLength(1);
    expect(reopened.estimateAttachments?.[0]).toMatchObject({
      ownerScope: "row",
      revisionId,
      rowId,
      contentHash: "c".repeat(64),
      deleted: false,
      serverCommitted: true,
      authoritativeAttachmentEventId: attachmentEventId,
      thumbnailReference: null,
    });
    expect(reopened.estimateAttachments?.[0]?.storageReference)
      .toBe("estimate-photo/r55/committed/cc/" + "c".repeat(64) + ".jpg");

    const refreshed = synchronizeConsumerRepairAuthoritativePhotoAttachments({
      requestDraftId: reopened.draft.id,
      ownerUserId,
      revisionId,
      attachments: [{
        attachmentId,
        attachmentEventId,
        tenantId,
        ownerUserId,
        requestId: reopened.draft.id,
        catalogId,
        rowId,
        parentRevisionId: revisionId,
        childRevisionId: null,
        storageBucket: "private-media",
        storageObjectKey: "estimate-photo/r55/committed/cc/" + "c".repeat(64) + ".jpg",
        contentSha256: "c".repeat(64),
        mimeType: "image/jpeg",
        sizeBytes: 19_763,
        status: "committed",
        createdAt: "2026-08-19T15:00:00.000Z",
        createdBy: ownerUserId,
        signedUrl: "https://private.invalid/refreshed-signed-url",
        signedUrlExpiresAt: "2026-08-19T16:15:00.000Z",
      }],
    });
    expect(refreshed.estimateAttachments?.[0]).toMatchObject({
      id: attachmentId,
      authoritativeRequestId: reopened.draft.id,
      authoritativeCatalogId: catalogId,
      authoritativeTenantId: tenantId,
      storageReference: "estimate-photo/r55/committed/cc/" + "c".repeat(64) + ".jpg",
      thumbnailReference: "https://private.invalid/refreshed-signed-url",
      serverCommitted: true,
    });
    expect(reopened.items[0]?.sourceParameters?.canonicalBackendRevisionId).toBe(parentBefore);
    expect(reopened.pdfs).toEqual(pdfsBefore);
    expect(listConsumerRepairBundlesForUser(ownerUserId)).toHaveLength(1);
    expect(listConsumerRepairBundlesForUser("other-tenant-user")).toHaveLength(0);
    expect(() => synchronizeConsumerRepairAuthoritativePhotoAttachments({
      requestDraftId: reopened.draft.id,
      ownerUserId: "other-tenant-user",
      revisionId,
      attachments: [],
    })).toThrow("CONSUMER_ESTIMATE_PHOTO_PROJECTION_OWNER_MISMATCH");
    expect(() => attachConsumerRepairEstimateRowPhoto({
      requestDraftId: reopened.draft.id,
      ownerUserId: "other-tenant-user",
      revisionId,
      releaseId,
      requestItemId,
      rowId,
      fileName: "denied.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1,
      contentHash: "d".repeat(64),
      storageReference: "private-media/denied.jpg",
    })).toThrow("CONSUMER_ESTIMATE_PHOTO_OWNER_MISMATCH");
  });
});
