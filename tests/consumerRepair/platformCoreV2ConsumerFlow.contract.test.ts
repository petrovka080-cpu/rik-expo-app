import {
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  ConsumerRepairValidationError,
  createConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";

describe("platform core v2 consumer repair flow", () => {
  afterEach(() => __resetConsumerRepairRequestStoreForTests());

  it("rejects legacy mutation and approves an exact canonical-backend revision", () => {
    const legacyAiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      estimateDraftId: "consumer-platform-core-v2",
      rawInput: "демонтаж плитки 98 м2",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    expect(legacyAiDraft?.items.length).toBeGreaterThan(0);
    expect(() => createConsumerRepairRequestDraft({
      consumerUserId: "platform-core-v2-consumer",
      problemText: "демонтаж плитки 98 м2",
      city: "Bishkek",
      addressText: "Test street 10",
      contactPhone: "+996 555 123 456",
      aiDraft: legacyAiDraft,
    })).toThrow(ConsumerRepairValidationError);

    const revisionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const releaseId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "platform-core-v2-consumer",
      problemText: "Canonical backend estimate",
      city: "Bishkek",
      addressText: "Test street 10",
      contactPhone: "+996 555 123 456",
      aiDraft: {
        titleRu: "Canonical estimate",
        summaryRu: "Exact immutable backend revision",
        repairType: "canonical_backend",
        items: [{
          itemType: "material",
          titleRu: "Canonical material row",
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
    approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: "platform-core-v2-consumer",
      canonicalArtifact: {
        artifactId: "platform-core-v2-pdf",
        revisionId,
        releaseId,
        status: "ready",
        sha256: "1".repeat(64),
      },
    });
    const history = listConsumerRepairApprovedHistory("platform-core-v2-consumer", { limit: 20 });

    expect(history.totalApprovedCount).toBe(1);
    expect(history.items[0]?.items[0]?.sourceParameters).toEqual(expect.objectContaining({
      canonicalBackendRevisionId: revisionId,
      canonicalBackendReleaseId: releaseId,
    }));
    expect(history.items[0]?.estimateDraftRevisionState).toBeNull();
  });
});
