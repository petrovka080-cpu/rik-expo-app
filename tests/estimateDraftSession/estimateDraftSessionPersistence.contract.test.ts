import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import {
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../../src/lib/platform/compactConsumerRepairDurableState";
import { saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";

describe("estimate draft session durable persistence", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  test("round-trips the exact scope-required session and its derived compatibility view", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "session-persistence-user",
      problemText: "асфальт 5400 метров длина и 15 метров ширина",
      repairType: "road_construction",
      selectedWork: {
        selectedWorkKey: "asphalt_concrete_pavement",
        selectedWorkTitleRu: "Асфальтобетонное покрытие",
        selectedWorkCategoryKey: "road_construction",
        selectedWorkCategoryTitleRu: "Дорожные работы",
        selectedWorkRawInput: "асфальт 5400 метров длина и 15 метров ширина",
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      },
      pendingRoadScopeSelection: {
        pendingIntentId: "pending-a",
        originalUserText: "асфальт 5400 метров длина и 15 метров ширина",
        requestedCatalogWorkId: "asphalt_concrete_pavement",
        offeredScopes: ["ROAD_SURFACING_ONLY", "FULL_ROAD_INFRASTRUCTURE"],
        resolverEvidence: ["scope_not_explicit"],
        resolverVersion: "road-scope-v4",
        createdAt: "2026-07-26T00:00:00.000Z",
      },
    });

    const decoded = decodeConsumerRepairBundleFromDurableStorage(
      encodeConsumerRepairBundleForDurableStorage(bundle),
    );

    expect(decoded?.estimateDraftSession).toMatchObject({
      draftId: bundle.draft.id,
      status: "SCOPE_REQUIRED",
      parameters: {
        length_m: { value: 5400, origin: "USER_ENTERED" },
        width_m: { value: 15, origin: "USER_ENTERED" },
        area_m2: {
          value: 81000,
          origin: "PROJECT_DERIVED",
          sourceText: "length_m * width_m",
          derivedFrom: ["length_m", "width_m"],
        },
      },
    });
    expect(decoded?.pendingRoadScopeSelection).toMatchObject({
      requestId: bundle.draft.id,
      offeredScopes: ["ROAD_SURFACING_ONLY", "FULL_ROAD_INFRASTRUCTURE"],
    });
  });

  test("corrupted session fails closed without hydrating its partial active context", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "session-corruption-user",
      problemText: "asphalt",
      repairType: "road_construction",
    });
    const encoded = encodeConsumerRepairBundleForDurableStorage(bundle) as Record<string, unknown>;
    encoded.estimateDraftSession = {
      schemaVersion: "estimate_draft_session_v1",
      draftId: bundle.draft.id,
      workIntent: { catalogWorkId: "stale-asphalt" },
      parameters: { area_m2: { value: 128000 } },
    };
    encoded.pendingRoadScopeSelection = {
      requestId: bundle.draft.id,
      offeredScopes: ["FULL_ROAD_INFRASTRUCTURE"],
    };

    const decoded = decodeConsumerRepairBundleFromDurableStorage(encoded);

    expect(decoded?.estimateDraftSession).toMatchObject({
      draftId: bundle.draft.id,
      status: "LEGACY_REVIEW_REQUIRED",
      workIntent: null,
      parameters: {},
      activeRevisionId: null,
      rejectionReason: "corrupted_draft_session_snapshot",
    });
    expect(decoded?.pendingRoadScopeSelection).toBeNull();
  });

  test("repository overwrites a tampered compatibility projection from DraftSession", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "session-projection-user",
      problemText: "асфальт 2000 x 32",
      repairType: "road_construction",
      pendingRoadScopeSelection: {
        pendingIntentId: "canonical-pending",
        originalUserText: "асфальт 2000 x 32",
        requestedCatalogWorkId: "asphalt_concrete_pavement",
        offeredScopes: ["ROAD_SURFACING_ONLY", "FULL_ROAD_INFRASTRUCTURE"],
        resolverEvidence: ["scope_not_explicit"],
        resolverVersion: "road-scope-v4",
        createdAt: "2026-07-26T00:00:00.000Z",
      },
    });
    const saved = saveConsumerRepairBundle({
      ...bundle,
      pendingRoadScopeSelection: {
        ...bundle.pendingRoadScopeSelection!,
        originalUserText: "tampered",
        offeredScopes: ["NOT_A_REAL_SCOPE"],
      },
    });

    expect(saved.pendingRoadScopeSelection).toMatchObject({
      originalUserText: "асфальт 2000 x 32",
      offeredScopes: ["ROAD_SURFACING_ONLY", "FULL_ROAD_INFRASTRUCTURE"],
    });
  });
});
