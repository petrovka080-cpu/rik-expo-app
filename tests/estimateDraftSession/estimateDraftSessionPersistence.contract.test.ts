import {
  __resetConsumerRepairRequestStoreForTests,
  beginConsumerRepairCanonicalRoadScopeSelection,
  bindConsumerRepairCanonicalRoadScopeChoice,
  createConsumerRepairRequestDraft,
  upsertConsumerRepairCanonicalBackendDraft,
} from "../../src/lib/consumerRequests";
import {
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../../src/lib/platform/compactConsumerRepairDurableState";
import { saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";
import {
  createEstimateDraftSession,
  selectEstimateDraftWork,
} from "../../src/lib/estimate/draftSession/estimateDraftSession";

function createScopeRequiredAuditBundle(input: {
  consumerUserId: string;
  problemText: string;
  lengthM: number;
  widthM: number;
}) {
  const createdAt = "2026-07-26T00:00:00.000Z";
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: input.consumerUserId,
    problemText: input.problemText,
    repairType: "road_construction",
    selectedWork: {
      selectedWorkKey: "asphalt_concrete_pavement",
      selectedWorkTitleRu: "Асфальтобетонное покрытие",
      selectedWorkCategoryKey: "road_construction",
      selectedWorkCategoryTitleRu: "Дорожные работы",
      selectedWorkRawInput: input.problemText,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    },
  });
  const parameters = {
    length_m: {
      value: input.lengthM,
      origin: "USER_ENTERED" as const,
      confirmedAt: createdAt,
      sourceText: String(input.lengthM),
    },
    width_m: {
      value: input.widthM,
      origin: "USER_ENTERED" as const,
      confirmedAt: createdAt,
      sourceText: String(input.widthM),
    },
    area_m2: {
      value: input.lengthM * input.widthM,
      origin: "PROJECT_DERIVED" as const,
      confirmedAt: createdAt,
      sourceText: "length_m * width_m",
      derivedFrom: ["length_m", "width_m"],
    },
  };
  const estimateDraftSession = selectEstimateDraftWork(
    createEstimateDraftSession({ draftId: bundle.draft.id }),
    {
      catalogWorkId: "asphalt_concrete_pavement",
      canonicalWorkKey: "asphalt_concrete_pavement",
      source: "EXPLICIT_SELECTION",
      scopeRequired: true,
      parameters,
      scopeRequirement: {
        originalUserText: input.problemText,
        requestedCatalogWorkId: "asphalt_concrete_pavement",
        offeredScopePresetIds: ["ROAD_SURFACING_ONLY", "FULL_ROAD_INFRASTRUCTURE"],
        resolverEvidence: ["scope_not_explicit"],
        resolverVersion: "road-scope-v4",
        createdAt,
      },
    },
  );
  return saveConsumerRepairBundle({
    ...bundle,
    estimateDraftSession,
  });
}

describe("estimate draft session durable persistence", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  test("round-trips the exact scope-required session and its derived compatibility view", () => {
    const bundle = createScopeRequiredAuditBundle({
      consumerUserId: "session-persistence-user",
      problemText: "асфальт 5400 метров длина и 15 метров ширина",
      lengthM: 5400,
      widthM: 15,
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
    const bundle = createScopeRequiredAuditBundle({
      consumerUserId: "session-projection-user",
      problemText: "асфальт 2000 x 32",
      lengthM: 2000,
      widthM: 32,
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

  test("R6 keeps 15 km through pending, durable reload data and the saved canonical scope choice", () => {
    const userId = "r6-road-scope-user";
    const originalUserText = "Построить автомобильную дорогу — 15 000 м";
    const initial = createConsumerRepairRequestDraft({
      consumerUserId: userId,
      problemText: originalUserText,
      selectedWork: {
        selectedCatalogWorkId: "canonical-work:expanded:asphalt_concrete_pavement",
        selectedWorkKey: "canonical-work:expanded:asphalt_concrete_pavement",
        selectedWorkTitleRu: "Устройство асфальтобетонного дорожного покрытия",
        selectedWorkCategoryKey: "roadworks",
        selectedWorkCategoryTitleRu: "Дорожные работы",
        selectedWorkRawInput: originalUserText,
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      },
    });
    const pending = beginConsumerRepairCanonicalRoadScopeSelection({
      requestDraftId: initial.draft.id,
      userId,
      originalUserText,
      requestedCatalogWorkId: "canonical-work:expanded:asphalt_concrete_pavement",
      offeredScopes: [
        "ROAD_SURFACING_ONLY",
        "FULL_PAVEMENT_STRUCTURE",
        "FULL_ROAD_INFRASTRUCTURE",
        "ROAD_REPAIR_REHABILITATION",
      ],
      resolverEvidence: ["road_intent_present", "scope_not_explicit"],
      resolverVersion: "road-scope-resolver-v4.1.0",
      createdAt: "2026-09-10T06:00:00.000Z",
    });
    const reloaded = decodeConsumerRepairBundleFromDurableStorage(
      encodeConsumerRepairBundleForDurableStorage(pending),
    );

    expect(reloaded?.draft.id).toBe(initial.draft.id);
    expect(reloaded?.draft.problemText).toBe(originalUserText);
    expect(reloaded?.estimateDraftSession).toMatchObject({
      status: "SCOPE_REQUIRED",
      workIntent: {
        catalogWorkId: "canonical-work:expanded:asphalt_concrete_pavement",
      },
      parameters: {
        length_m: { value: 15_000, unit: "m", origin: "USER_ENTERED" },
      },
    });
    expect(reloaded?.estimateDraftSession?.parameters).not.toHaveProperty("width_m");
    expect(reloaded?.estimateDraftSession?.parameters).not.toHaveProperty("area_m2");

    const selected = bindConsumerRepairCanonicalRoadScopeChoice({
      requestDraftId: initial.draft.id,
      userId,
      selectedScope: "FULL_PAVEMENT_STRUCTURE",
      createdAt: "2026-09-10T06:01:00.000Z",
    });
    expect(selected.draft.id).toBe(initial.draft.id);
    expect(selected.estimateDraftSession).toMatchObject({
      status: "PARAMETERS_REQUIRED",
      scopePresetId: "FULL_PAVEMENT_STRUCTURE",
      parameters: {
        length_m: { value: 15_000, origin: "USER_ENTERED" },
      },
    });
    expect(selected.pendingRoadScopeSelection).toBeNull();
    expect(selected.draft.missingData).toEqual([
      "Укажите площадь либо подтверждённые длину и ширину.",
    ]);

    const canonicalRevisionId = "11111111-1111-4111-8111-111111111116";
    const canonicalReleaseId = "22222222-2222-4222-8222-222222222226";
    const compiled = upsertConsumerRepairCanonicalBackendDraft({
      requestDraftId: initial.draft.id,
      consumerUserId: userId,
      problemText: originalUserText,
      aiDraft: {
        titleRu: "Устройство асфальтобетонного дорожного покрытия",
        summaryRu: "Серверная ревизия",
        repairType: "asphalt_concrete_pavement",
        missingData: [],
        dangerousDiyBlocked: false,
        selectedWork: {
          selectedCatalogWorkId: "canonical-work:expanded:asphalt_concrete_pavement",
          selectedWorkKey: "canonical-work:expanded:asphalt_concrete_pavement",
          selectedWorkTitleRu: "Устройство асфальтобетонного дорожного покрытия",
          selectedWorkCategoryKey: "roadworks",
          selectedWorkCategoryTitleRu: "Дорожные работы",
          selectedWorkRawInput: originalUserText,
          selectedWorkSource: "user_selected",
          selectedWorkResolverReGuessed: false,
        },
        items: [{
          itemType: "material",
          titleRu: "Щебень",
          quantity: 1,
          unit: "t",
          source: "ai_suggested",
          sourceParameters: {
            canonicalBackendRevisionId: canonicalRevisionId,
            canonicalBackendReleaseId: canonicalReleaseId,
          },
        }],
      },
    });
    const compiledReloaded = decodeConsumerRepairBundleFromDurableStorage(
      encodeConsumerRepairBundleForDurableStorage(compiled),
    );
    expect(compiledReloaded?.estimateDraftSession).toMatchObject({
      status: "REVIEW",
      scopePresetId: "FULL_PAVEMENT_STRUCTURE",
      activeRevisionId: canonicalRevisionId,
      parameters: {
        length_m: { value: 15_000, unit: "m", origin: "USER_ENTERED" },
      },
    });
    expect(compiledReloaded?.draft.problemText).toBe(originalUserText);
  });
});
