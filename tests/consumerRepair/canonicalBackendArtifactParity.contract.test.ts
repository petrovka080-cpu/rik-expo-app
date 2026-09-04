import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairEstimateRowPhoto,
  createConsumerRepairRequestDraft,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";

describe("canonical backend artifact parity", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps PDF and procurement on the exact backend revision and release", () => {
    const userId = "canonical-artifact-owner";
    const revisionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const releaseId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const catalogId = "canonical-work:test:artifact-parity";
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: userId,
      problemText: "Canonical backend estimate with exact immutable release identity.",
      repairType: "asphalt:global:work-001",
      city: "Bishkek",
      addressText: "64 Malikova Street",
      contactPhone: "+996 555 123 456",
      aiDraft: {
        titleRu: "Canonical estimate",
        summaryRu: "Canonical estimate",
        repairType: "asphalt:global:work-001",
        items: [{
          itemType: "material",
          titleRu: "Canonical resource row",
          quantity: 2,
          unit: "kg",
          unitPrice: 100,
          source: "ai_suggested",
          sourceParameters: {
            canonicalBackendRevisionId: revisionId,
            canonicalBackendReleaseId: releaseId,
            canonicalBackendRowId: "row-001",
            canonicalBackendCatalogId: catalogId,
          },
        }],
        missingData: [],
        dangerousDiyBlocked: false,
      },
    });
    bundle = attachConsumerRepairEstimateRowPhoto({
      requestDraftId: bundle.draft.id,
      ownerUserId: userId,
      revisionId,
      releaseId,
      requestItemId: bundle.items[0].id,
      rowId: "row-001",
      fileName: "artifact-parity.png",
      mimeType: "image/png",
      sizeBytes: 68,
      contentHash: "2".repeat(64),
      storageReference: `estimate-photo/r55/committed/22/${"2".repeat(64)}.png`,
      authoritativeAttachmentId: "backend-photo-attachment",
      authoritativeAttachmentEventId: "backend-photo-event",
      authoritativeTenantId: "canonical-test-tenant",
      authoritativeOwnerUserId: userId,
      authoritativeRequestId: bundle.draft.id,
      authoritativeCatalogId: catalogId,
      authoritativeStorageBucket: "private-media",
    });
    bundle = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId,
      canonicalArtifact: {
        artifactId: "backend-pdf-artifact",
        revisionId,
        releaseId,
        status: "ready",
        sha256: "1".repeat(64),
      },
    });
    bundle = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId,
      canonicalArtifact: {
        artifactId: "backend-procurement-artifact",
        kind: "procurement",
        revisionId,
        releaseId,
        status: "ready",
        sha256: "1".repeat(64),
      },
    });

    expect(bundle.draft.status).toBe("sent_to_marketplace");
    expect(bundle.pdfs).toEqual([]);
    expect(bundle.estimateRevisionState).toBeUndefined();
    expect(bundle.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventType: "consumer_approved_canonical_backend_pdf",
        payload: expect.objectContaining({ revisionId, releaseId, artifactId: "backend-pdf-artifact" }),
      }),
      expect.objectContaining({
        eventType: "sent_to_marketplace",
        payload: expect.objectContaining({
          canonicalRevisionId: revisionId,
          canonicalReleaseId: releaseId,
          procurementArtifactId: "backend-procurement-artifact",
          procurementArtifactKind: "procurement",
        }),
      }),
    ]));
  });
});
