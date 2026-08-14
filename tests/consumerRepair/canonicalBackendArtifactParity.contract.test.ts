import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";

describe("canonical backend artifact parity", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps PDF and procurement on the exact backend revision and release", () => {
    const userId = "canonical-artifact-owner";
    const revisionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const releaseId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
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
          },
        }],
        missingData: [],
        dangerousDiyBlocked: false,
      },
    });
    bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
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
        revisionId,
        releaseId,
        status: "ready",
        sha256: "2".repeat(64),
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
        }),
      }),
    ]));
  });
});
