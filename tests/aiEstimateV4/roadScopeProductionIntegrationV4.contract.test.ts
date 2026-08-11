import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { recalculateEstimateDraftRevisionBatch } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import {
  buildConsumerRepairExactCatalogLaunchSelectedWork,
  buildConsumerRepairSelectedWorkDraftBundle,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  __resetConsumerRepairRequestStoreForTests,
  applyConsumerRepairDraftRevisionParamBatchPatch,
  approveConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
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
    const result = buildEstimateFromInlineWorkPrompt({ rawInput: ambiguous, selectedWorkKey: "road_construction" });
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
      selectedWorkKey: "road_construction",
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

  test("/request preserves postfix dimensions and compiles the semantic full-road contract after explicit selection", () => {
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
    const revisionRows = selected.estimateDraftRevisionState?.revisions[0]?.boq.rows ?? [];
    const rowIds = revisionRows.map((row) => row.rowId);
    expect(revisionRows.length).toBeGreaterThan(0);
    expect(selected.items).toHaveLength(revisionRows.length);
    expect(rowIds).toEqual(expect.arrayContaining([
      "subgrade_compaction",
      "asphalt_layer_3_material",
      "storm_pipe",
      "lighting_pole",
      "sign_warning_panel",
    ]));
    expect(rowIds).not.toEqual(expect.arrayContaining(["geotextile_material", "geotextile_installation"]));
  });

  test.each([
    ["FULL_ROAD_INFRASTRUCTURE", ["storm_pipe", "lighting_pole", "sign_warning_panel"], []],
    ["ROAD_SURFACING_ONLY", ["base_emulsion_material", "asphalt_layer_1_material"], ["topsoil_stripping", "storm_pipe"]],
  ] as const)(
    "5400 × 15 preserves 81,000 m² and compiles the semantic %s contract",
    (selectedScope, requiredRows, forbiddenRows) => {
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
      const rowIds = selected.items.map((item) => item.sourceParameters?.rowCode);
      expect(selected.items.length).toBeGreaterThan(0);
      expect(rowIds).toEqual(expect.arrayContaining([...requiredRows]));
      expect(forbiddenRows.every((rowId) => !rowIds.includes(rowId))).toBe(true);
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

  test("batch recalculation preserves the exact selected Asphalt catalog record identity", () => {
    const exactCatalogRecordId = "asphalt_concrete_pavement_preliminary_boq_expanded_complex_v1";
    const initial = createEstimateDraftRevision({
      rawInput: ambiguous,
      selectedWorkKey: exactCatalogRecordId,
      paramOverrides: {
        selectedRoadScope: {
          value: "FULL_PAVEMENT_STRUCTURE",
          source: "user_input",
          lastChangedAt: "2026-08-10T00:00:00.000Z",
        },
      },
      createdAt: "2026-08-10T00:00:00.000Z",
    });
    expect(initial.resolvedIdentity?.requestedCatalogWorkId).toBe(exactCatalogRecordId);

    const recalculated = recalculateEstimateDraftRevisionBatch(initial, [
      {
        revisionId: initial.revisionId,
        selectedTemplateId: initial.selectedTemplateId,
        operation: "add_param",
        paramKey: "geometry_method",
        rawValue: "direct_area",
        parsedValue: "direct_area",
      },
      {
        revisionId: initial.revisionId,
        selectedTemplateId: initial.selectedTemplateId,
        operation: "add_param",
        paramKey: "length_m",
        rawValue: "12",
        parsedValue: 12,
        canonicalUnit: "m",
      },
      {
        revisionId: initial.revisionId,
        selectedTemplateId: initial.selectedTemplateId,
        operation: "add_param",
        paramKey: "width_m",
        rawValue: "10",
        parsedValue: 10,
        canonicalUnit: "m",
      },
    ], {
      createdAt: "2026-08-10T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(recalculated.revision.revisionId).not.toBe(initial.revisionId);
    expect(recalculated.revision.resolvedIdentity?.requestedCatalogWorkId).toBe(exactCatalogRecordId);
    expect(recalculated.revision.roadScopeBinding).toMatchObject({
      requestedCatalogWorkId: exactCatalogRecordId,
      selectedRoadScope: "FULL_PAVEMENT_STRUCTURE",
    });
    expect(recalculated.revision.boq.rows.length).toBeGreaterThan(0);
  });

  test("exact expanded Asphalt R3 with unconfirmed contract inputs cannot be approved", () => {
    const userId = "asphalt-expanded-approval-user";
    const exactCatalogRecordId = "asphalt_concrete_pavement_preliminary_boq_expanded_complex_v1";
    const rawInput = "Asphalt concrete pavement, area 120 m2";
    const selectedWork = buildConsumerRepairExactCatalogLaunchSelectedWork({
      catalogWorkId: exactCatalogRecordId,
      rawInput,
    });
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: userId,
      problemText: rawInput,
      repairType: "roadworks",
      city: "Bishkek",
      addressText: "Asphalt approval test address",
      preferredTimeText: "Any time",
      contactPhone: "+996 555 123 456",
      selectedWork,
    });
    const scoped = selectConsumerRepairRoadScopeV4({
      requestDraftId: bundle.draft.id,
      userId,
      selectedScope: "FULL_PAVEMENT_STRUCTURE",
      createdAt: "2026-08-10T00:00:00.000Z",
    });
    const created = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: scoped.draft.id,
      userId,
      createdAt: "2026-08-10T00:01:00.000Z",
      patches: [
        { operation: "add_param", paramKey: "geometry_method", rawValue: "direct_area" },
        { operation: "add_param", paramKey: "length_m", rawValue: "12" },
        { operation: "add_param", paramKey: "width_m", rawValue: "10" },
      ],
    });
    const edited = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      userId,
      createdAt: "2026-08-10T00:02:00.000Z",
      patches: [
        { operation: "update_param", paramKey: "area_m2", rawValue: "137" },
      ],
    });

    expect(edited.estimateDraftRevisionState?.revisions).toHaveLength(3);
    expect(edited.estimateDraftRevisionState?.revisions[2]?.resolvedIdentity?.requestedCatalogWorkId)
      .toBe(exactCatalogRecordId);

    expect(edited.estimateDraftRevisionState?.revisions[2]?.status)
      .toBe("needs_more_params_but_preliminary_available");
    expect(() => approveConsumerRepairRequestDraft({
      requestDraftId: edited.draft.id,
      userId,
      generatedAt: "2026-08-10T00:03:00.000Z",
    })).toThrow("Заполните обязательные параметры");
    expect(listConsumerRepairApprovedHistory(userId).totalApprovedCount).toBe(0);
  });
});
