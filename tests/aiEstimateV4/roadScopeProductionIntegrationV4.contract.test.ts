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
const explicitAsphaltSurface =
  "Дороги, транспорт и площадки: асфальтобетон бетонный покрытие 2000 метров длина и 32 метра ширина";
const exactAsphaltReferenceInput =
  "Дороги, транспорт и площадки: асфальтобетон бетонный покрытие 5400 метров длина и 15 метров ширина";

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

  test("/request preserves postfix dimensions and compiles the 702-row benchmark after explicit full-road selection", () => {
    const selectedWork = {
      selectedWorkKey: "asphalt_concrete_pavement",
      selectedTitleRu: "Дороги, транспорт и площадки: асфальтобетон бетонный покрытие",
      selectedCategoryKey: "roadworks" as const,
      selectedCategoryTitleRu: "Дороги, транспорт и площадки",
      rawInput: explicitAsphaltSurface,
      source: "user_selected" as const,
      resolverReGuessed: false as const,
    };
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "road-surface-user",
      problemText: explicitAsphaltSurface,
      repairType: "road_construction",
      city: "Бишкек",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork,
    });

    expect(bundle.estimateDraftRevisionState).toBeNull();
    expect(bundle.pendingRoadScopeSelection).toMatchObject({
      originalUserText: explicitAsphaltSurface,
      offeredScopes: expect.arrayContaining(["FULL_ROAD_INFRASTRUCTURE"]),
    });
    expect(aiDraft.items).toHaveLength(0);

    const selected = selectConsumerRepairRoadScopeV4({
      requestDraftId: bundle.draft.id,
      userId: "road-surface-user",
      selectedScope: "FULL_ROAD_INFRASTRUCTURE",
      createdAt: "2026-07-26T00:00:00.000Z",
    });
    expect(selected.pendingRoadScopeSelection).toBeNull();
    expect(selected.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(selected.estimateDraftRevisionState?.revisions[0]?.params).toMatchObject({
      length_m: { value: 2000 },
      width_m: { value: 32 },
    });
    expect(selected.estimateDraftRevisionState?.revisions[0]?.quantityBasis).toMatchObject({
      basisType: "project",
      area_m2: 64000,
    });
    expect(selected.estimateDraftRevisionState?.revisions[0]?.boq.rows).toHaveLength(702);
    expect(selected.items).toHaveLength(702);
  });

  test.each([
    ["FULL_ROAD_INFRASTRUCTURE", 702],
    ["ROAD_SURFACING_ONLY", 54],
  ] as const)(
    "5400 × 15 preserves 81,000 m² and compiles the versioned %s golden",
    (selectedScope, expectedRows) => {
      const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
        consumerUserId: `asphalt-reference-${selectedScope}`,
        problemText: exactAsphaltReferenceInput,
        repairType: "road_construction",
        city: "Бишкек",
        addressText: "",
        preferredTimeText: "",
        contactPhone: "",
        selectedWork: null,
      });

      expect(bundle.estimateDraftSession).toMatchObject({
        status: "SCOPE_REQUIRED",
        scopePresetId: null,
        parameters: {
          length_m: { value: 5400, unit: "m", origin: "USER_ENTERED" },
          width_m: { value: 15, unit: "m", origin: "USER_ENTERED" },
          area_m2: {
            value: 81000,
            unit: "m2",
            origin: "PROJECT_DERIVED",
            derivedFrom: ["length_m", "width_m"],
          },
        },
      });
      expect(bundle.pendingRoadScopeSelection?.offeredScopes).toHaveLength(4);
      expect(bundle.items).toHaveLength(0);
      expect(bundle.estimateDraftRevisionState).toBeNull();

      const selected = selectConsumerRepairRoadScopeV4({
        requestDraftId: bundle.draft.id,
        userId: `asphalt-reference-${selectedScope}`,
        selectedScope,
        createdAt: "2026-07-26T00:00:00.000Z",
      });
      expect(selected.estimateDraftSession).toMatchObject({
        status: "REVIEW",
        scopePresetId: selectedScope,
        activeRevisionId: selected.estimateDraftRevisionState?.currentRevisionId,
      });
      expect(selected.estimateDraftRevisionState?.revisions).toHaveLength(1);
      expect(selected.estimateDraftRevisionState?.revisions[0]?.quantityBasis?.area_m2).toBe(81000);
      expect(selected.items).toHaveLength(expectedRows);
    },
  );

  test("conflicting explicit and derived geometry blocks compilation until confirmation", () => {
    const input = "асфальт площадь 128000 м2, длина 2000 м, ширина 32 м";
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "road-geometry-conflict-user",
      problemText: input,
      repairType: "road_construction",
      city: "Бишкек",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(bundle.estimateDraftSession?.parameters).toMatchObject({
      area_m2: { value: 128000, confirmedAt: null, requiresConfirmation: true },
      length_m: { value: 2000, confirmedAt: null, requiresConfirmation: true },
      width_m: { value: 32, confirmedAt: null, requiresConfirmation: true },
    });
    const selected = selectConsumerRepairRoadScopeV4({
      requestDraftId: bundle.draft.id,
      userId: "road-geometry-conflict-user",
      selectedScope: "FULL_ROAD_INFRASTRUCTURE",
      createdAt: "2026-07-26T00:00:00.000Z",
    });
    expect(selected.estimateDraftSession?.status).toBe("PARAMETERS_REQUIRED");
    expect(selected.estimateDraftRevisionState).toBeNull();
    expect(selected.items).toHaveLength(0);
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
