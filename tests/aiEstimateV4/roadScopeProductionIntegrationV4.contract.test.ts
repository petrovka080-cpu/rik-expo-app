import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  __resetConsumerRepairRequestStoreForTests,
  selectConsumerRepairRoadScopeV4,
} from "../../src/lib/consumerRequests";
import {
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../../src/lib/platform/compactConsumerRepairDurableState";
import {
  compileEstimateFromResolvedRoadIntentV4,
  createResolvedRoadEstimateIntentV4,
  resolveRoadEstimateScopeV4,
} from "../../src/lib/estimate/v4/asphalt";

const ambiguous = "Асфальтировать дорогу 1000 метров, ширина 32 метра";

describe("Road Scope Truth V4 production integration", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());
  test("ambiguous asphalt cannot compile or create a revision", () => {
    const result = buildEstimateFromInlineWorkPrompt({ rawInput: ambiguous, selectedWorkKey: "asphalt_paving" });
    expect(result).toMatchObject({
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: "road_scope_selection_required",
      roadScopeResolution: {
        resolverStatus: "NEEDS_SCOPE_SELECTION",
        originalText: ambiguous,
        selectedScopeId: null,
      },
    });
    expect(() => createEstimateDraftRevision({
      rawInput: ambiguous,
      selectedWorkKey: "asphalt_paving",
      createdAt: "2026-07-24T00:00:00.000Z",
    })).toThrow("road_scope_selection_required");
  });

  test.each([
    ["Asphalt Demolition 34 m2 in Almaty request 2", "asphalt_demolition"],
    ["Asphalt Milling 338 m2 in Bishkek request 1433", "asphalt_milling"],
    ["Road Compaction 312 m2 in Bishkek request 1469", "road_compaction"],
  ])("exact component work bypasses broad road scope selection: %s", (prompt, expectedWorkKey) => {
    const result = buildEstimateFromInlineWorkPrompt({ rawInput: prompt });

    expect(result.blockingReason).not.toBe("road_scope_selection_required");
    expect(result.draft?.selectedWork?.selectedWorkKey).toBe(expectedWorkKey);
    expect(result.draft?.items.length).toBeGreaterThan(0);
    expect(result.roadScopeResolution?.resolverStatus).toBe("NOT_ROAD");
  });

  test("/request preserves the prompt and exposes exactly four scope choices without a revision", () => {
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "road-scope-user",
      problemText: ambiguous,
      repairType: "road_construction",
      city: "Бишкек",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    expect(bundle.draft.problemText).toBe(ambiguous);
    expect(bundle.estimateDraftRevisionState).toBeNull();
    expect(bundle.pendingRoadScopeSelection).toMatchObject({
      originalUserText: ambiguous,
      offeredScopes: [
        "ROAD_SURFACING_ONLY",
        "FULL_PAVEMENT_STRUCTURE",
        "FULL_ROAD_INFRASTRUCTURE",
        "ROAD_REPAIR_REHABILITATION",
      ],
    });
    expect(aiDraft.titleRu).toBe("Что требуется рассчитать?");
    expect(aiDraft.missingData).toEqual([
      "Только асфальт по готовому основанию",
      "Полную дорожную одежду с основанием",
      "Полное строительство дороги и инфраструктуры",
      "Ремонт существующей дороги",
    ]);
  });

  test("pending selection survives reload and one selection creates exactly one revision", () => {
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "road-scope-reload-user",
      problemText: ambiguous,
      repairType: "road_construction",
      city: "Бишкек",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    const reloaded = decodeConsumerRepairBundleFromDurableStorage(encodeConsumerRepairBundleForDurableStorage(bundle));
    expect(reloaded?.pendingRoadScopeSelection?.originalUserText).toBe(ambiguous);
    const selected = selectConsumerRepairRoadScopeV4({
      requestDraftId: bundle.draft.id,
      userId: "road-scope-reload-user",
      selectedScope: "ROAD_SURFACING_ONLY",
      createdAt: "2026-07-24T01:00:00.000Z",
    });
    expect(selected.pendingRoadScopeSelection).toBeNull();
    expect(selected.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(selected.estimateDraftRevisionState?.revisions[0]?.roadScopeBinding?.selectedRoadScope).toBe("ROAD_SURFACING_ONLY");
    const repeated = selectConsumerRepairRoadScopeV4({
      requestDraftId: bundle.draft.id,
      userId: "road-scope-reload-user",
      selectedScope: "ROAD_SURFACING_ONLY",
      createdAt: "2026-07-24T01:00:00.001Z",
    });
    expect(repeated.estimateDraftRevisionState?.revisions).toHaveLength(1);
  });

  test("explicit and user-selected full-road intents dispatch to the same canonical BOQ", () => {
    const explicitResolution = resolveRoadEstimateScopeV4({
      originalText: "Полное строительство дороги с водоотводом, освещением, знаками и ограждением, площадь 1000 м²",
      requestedCatalogWorkId: "asphalt_paving",
    });
    const selectedResolution = resolveRoadEstimateScopeV4({
      originalText: ambiguous,
      requestedCatalogWorkId: "asphalt_paving",
      selectedScopeId: "FULL_ROAD_INFRASTRUCTURE",
    });
    const explicit = compileEstimateFromResolvedRoadIntentV4({
      resolvedIntent: createResolvedRoadEstimateIntentV4({
        resolution: explicitResolution,
        requestId: "explicit",
        resolutionOrigin: "EXPLICIT_PROMPT",
        resolverVersion: "road-scope-resolver-v4.1.0",
      }),
      parameterOverrides: { area_m2: { value: 1000, source: "user_input" } },
    });
    const selected = compileEstimateFromResolvedRoadIntentV4({
      resolvedIntent: createResolvedRoadEstimateIntentV4({
        resolution: selectedResolution,
        requestId: "selected",
        resolutionOrigin: "USER_SELECTION",
        resolverVersion: "road-scope-resolver-v4.1.0",
      }),
      parameterOverrides: { area_m2: { value: 1000, source: "user_input" } },
    });
    const fingerprint = (rows: typeof explicit.compiled_rows) => rows.map((row) => [
      row.definition.row_id, row.definition.wbs_code, row.quantity, row.definition.formula_id,
    ]);
    expect(explicit.preliminary_assembly_policy.profile_id).toBe("new_full_road_infrastructure");
    expect(selected.preliminary_assembly_policy.profile_id).toBe("new_full_road_infrastructure");
    expect(fingerprint(explicit.compiled_rows)).toEqual(fingerprint(selected.compiled_rows));
  });

  test.each([
    ["ROAD_SURFACING_ONLY", "surfacing_on_prepared_base"],
    ["FULL_PAVEMENT_STRUCTURE", "new_full_road_pavement"],
    ["FULL_ROAD_INFRASTRUCTURE", "new_full_road_infrastructure"],
    ["ROAD_REPAIR_REHABILITATION", "rehabilitation_with_milling"],
  ] as const)("selected scope %s is canonical in draft and revision", (selectedRoadScope, expectedProfile) => {
    const revision = createEstimateDraftRevision({
      rawInput: ambiguous,
      selectedWorkKey: "asphalt_paving",
      paramOverrides: {
        selectedRoadScope: {
          value: selectedRoadScope,
          source: "user_input",
          lastChangedAt: "2026-07-24T00:00:00.000Z",
        },
      },
      createdAt: "2026-07-24T00:00:00.000Z",
    });
    expect(revision.workAssemblyId).toBe(`${expectedProfile}_preliminary_v1`);
    expect(revision.roadScopeBinding).toMatchObject({
      originalUserText: ambiguous,
      requestedCatalogWorkId: "asphalt_paving",
      selectedRoadScope,
      resolverVersion: "road-scope-resolver-v4.1.0",
    });
    expect(revision.boq.rows.length).toBeGreaterThan(0);
  });
});
