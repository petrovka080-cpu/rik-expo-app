import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  buildConsumerRequestEstimateRuntimeTrace,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { ELECTRICAL_CANONICAL_WORK_KEY } from "../../src/lib/estimate/v4/electrical/electricalCanonicalV1";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";

const AREA_ONLY_PROMPT = "электрика под ключ 100 кв метров площадь";

describe("production /request electrical runtime truth", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("blocks an area-only turnkey prompt without legacy rows, hidden quantities, prices, or procurement", () => {
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-runtime-truth",
      problemText: AREA_ONLY_PROMPT,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    const viewModel = buildRequestEstimateViewModel(bundle);
    const parameterById = Object.fromEntries(
      bundle.canonicalParameterSession?.parameters.map((parameter) => [
        parameter.parameterId,
        parameter,
      ]) ?? [],
    );
    const currentRevision =
      bundle.estimateDraftRevisionState?.revisions.find(
        (revision) =>
          revision.revisionId ===
          bundle.estimateDraftRevisionState?.currentRevisionId,
      ) ?? null;
    expect(aiDraft.selectedWork?.selectedWorkKey).toBe(
      ELECTRICAL_CANONICAL_WORK_KEY,
    );
    expect(bundle.draft.selectedWorkKey).toBe(ELECTRICAL_CANONICAL_WORK_KEY);
    expect(parameterById.area_m2).toEqual(
      expect.objectContaining({
        value: 100,
        source: "TEXT_EXTRACTED",
      }),
    );
    expect(parameterById.package_mode).toEqual(
      expect.objectContaining({
        value: "turnkey",
        source: "TEXT_EXTRACTED",
      }),
    );
    expect(bundle.canonicalParameterSession?.assumptionParameterIds).toEqual([]);
    expect(bundle.canonicalParameterSession?.status).toBe("BLOCKING_REQUIRED");
    expect(
      bundle.canonicalParameterSession?.blockingMissingParameterIds.length,
    ).toBeGreaterThan(0);
    expect(bundle.items).toHaveLength(0);
    expect(aiDraft.items).toHaveLength(0);
    expect(aiDraft.structuredEstimatePayload).toBeUndefined();
    expect(currentRevision?.legacyRowsCount).toBe(0);
    expect(currentRevision?.resolvedIdentity).toEqual(
      expect.objectContaining({
        passportId: "ELECTRICAL_CANONICAL_V1",
        passportVersion: "1.0.0",
        parameterSchemaId:
          "electrical-area-installation-parameters:2026-07-28.v1",
        parameterSchemaVersion:
          "electrical-area-installation-parameters:2026-07-28.v1",
        calculationStrategyId:
          "electrical-area-installation:2026-07-28.v1",
        compilerVersion:
          "electrical-canonical-compiler:2026-07-28.v1",
        formulaGraphVersion:
          "electrical-canonical-formula-graph:2026-07-28.v1",
        semanticOwner: "ELECTRICAL_CANONICAL_V1",
        legacyFallbackUsed: false,
        fallbackReason: null,
        projectionOwner: "estimate_draft_revision",
        checksum: expect.any(String),
      }),
    );
    const exactSha = "0123456789abcdef0123456789abcdef01234567";
    const runtimeTrace = buildConsumerRequestEstimateRuntimeTrace({
      bundle,
      fullSha: exactSha,
      buildSha: exactSha,
    });
    expect(runtimeTrace).toEqual(expect.objectContaining({
      fullSha: exactSha,
      sourceSha: exactSha,
      buildSha: exactSha,
      selectedCatalogWorkId: ELECTRICAL_CANONICAL_WORK_KEY,
      selectedWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
      workIntentId: expect.stringMatching(/^estimate_work_intent_eh_/),
      scopeSessionId: bundle.canonicalParameterSession?.sessionId,
      passportId: "ELECTRICAL_CANONICAL_V1",
      parameterSchemaId:
        "electrical-area-installation-parameters:2026-07-28.v1",
      calculationStrategyId:
        "electrical-area-installation:2026-07-28.v1",
      formulaGraphVersion:
        "electrical-canonical-formula-graph:2026-07-28.v1",
      compilerVersion:
        "electrical-canonical-compiler:2026-07-28.v1",
      revisionId: currentRevision?.revisionId,
      legacyFallbackUsed: false,
      fallbackReason: null,
      projectionOwner: "estimate_draft_revision",
      checksum: expect.any(String),
      deterministicHash: expect.any(String),
    }));
    expect(runtimeTrace.deterministicHash).toBe(runtimeTrace.checksum);
    expect(buildConsumerRequestEstimateRuntimeTrace({
      bundle,
      fullSha: exactSha,
      buildSha: exactSha,
    })).toEqual(runtimeTrace);
    expect(JSON.stringify(runtimeTrace)).not.toMatch(
      /address|phone|consumerUserId|problemText|rawInput|summaryRu|items|token|secret/i,
    );
    expect(currentRevision?.boq.rows).toHaveLength(0);
    expect(viewModel?.rawItemCount).toBe(0);
    expect(viewModel?.totalLabel).toMatch(/не рассчитан|уточнить/i);
    expect(viewModel?.priceStatusLabel).not.toMatch(/^0\/0\b/);
    expect(viewModel?.trustLevelLabel).toBe(
      "Доверие: исходные данные не заполнены",
    );
    expect(bundle.projectExecutionDrafts).toHaveLength(0);
  });

  it("routes the shared runtime boundary through the same canonical electrical compiler", () => {
    const blocked = buildConsumerRepairDraftFromAiEstimateRuntime({
      rawInput: AREA_ONLY_PROMPT,
      city: "Bishkek",
      currency: "KGS",
    });
    const complete = buildConsumerRepairDraftFromAiEstimateRuntime({
      rawInput:
        "электрика под ключ квартира площадь 97 м2 трасса 300 м 40 розеток 20 выключателей 30 точек освещения",
      city: "Bishkek",
      currency: "KGS",
    });

    expect(blocked).toMatchObject({
      repairType: ELECTRICAL_CANONICAL_WORK_KEY,
      selectedWork: {
        selectedWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
      },
      items: [],
    });
    expect(complete).toMatchObject({
      repairType: ELECTRICAL_CANONICAL_WORK_KEY,
      selectedWork: {
        selectedWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
      },
    });
    expect(complete?.items.length).toBeGreaterThan(80);
    expect(
      complete?.items.every(
        (item) =>
          String(item.sourceParameters?.semanticOwner ?? "").startsWith(
            "electrical:",
          ),
      ),
    ).toBe(true);
  });

  it("cannot re-enable a legacy estimate through an explicit electrical catalog selection", () => {
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-runtime-selected-work-truth",
      problemText: AREA_ONLY_PROMPT,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: {
        selectedWorkKey: "electrical_turnkey_area_legacy_42",
        selectedTitleRu: "Электромонтаж",
        selectedCategoryKey: "electrical",
        selectedCategoryTitleRu: "Электромонтажные работы",
        rawInput: AREA_ONLY_PROMPT,
        source: "user_selected",
        resolverReGuessed: false,
      },
    });

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe(
      ELECTRICAL_CANONICAL_WORK_KEY,
    );
    expect(bundle.canonicalParameterSession?.status).toBe("BLOCKING_REQUIRED");
    expect(bundle.draft.selectedCatalogWorkId).toBe(
      "electrical_turnkey_area_legacy_42",
    );
    expect(bundle.draft.selectedWorkKey).toBe(ELECTRICAL_CANONICAL_WORK_KEY);
    expect(bundle.items).toHaveLength(0);
    expect(aiDraft.items).toHaveLength(0);
    expect(aiDraft.structuredEstimatePayload).toBeUndefined();
    expect(
      bundle.estimateDraftRevisionState?.revisions[0]?.legacyRowsCount,
    ).toBe(0);
  });

  it("invalidates a persisted legacy 42-row electrical draft on reload", () => {
    const legacyTitles = [
      "Кабель",
      "Кабельные линии",
      "Кабель силовой",
      ...Array.from({ length: 39 }, (_, index) => `Старая позиция ${index + 1}`),
    ];
    const legacy = createConsumerRepairRequestDraft({
      consumerUserId: "electrical-legacy-reload-migration",
      problemText: AREA_ONLY_PROMPT,
      repairType: "electrical",
      selectedWork: {
        selectedCatalogWorkId: "electrical_turnkey_area_legacy_42",
        selectedWorkKey: "electrical_turnkey_area_legacy_42",
        selectedWorkTitleRu: "Электрика под ключ",
        selectedWorkCategoryKey: "electrical",
        selectedWorkCategoryTitleRu: "Электромонтажные работы",
        selectedWorkRawInput: AREA_ONLY_PROMPT,
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      },
      aiDraft: {
        titleRu: "Электрика под ключ",
        summaryRu: "Старая недостоверная смета",
        repairType: "electrical",
        dangerousDiyBlocked: false,
        missingData: [],
        items: legacyTitles.map((titleRu) => ({
          itemType: "material" as const,
          titleRu,
          quantity: 100,
          unit: "linear_m",
          unitPrice: null,
          currency: "KGS",
          source: "reference_price_book" as const,
        })),
      },
    });

    expect(legacy.items).toHaveLength(42);
    const migrated = listConsumerRepairRequestHistory(
      legacy.draft.consumerUserId,
    ).find((bundle) => bundle.draft.id === legacy.draft.id);

    expect(migrated?.draft.selectedWorkKey).toBe(
      ELECTRICAL_CANONICAL_WORK_KEY,
    );
    expect(migrated?.draft.selectedCatalogWorkId).toBe(
      "electrical_turnkey_area_legacy_42",
    );
    expect(migrated?.canonicalParameterSession?.status).toBe(
      "BLOCKING_REQUIRED",
    );
    expect(migrated?.items).toHaveLength(0);
    expect(migrated?.structuredEstimatePayload).toBeNull();
    expect(
      migrated?.events.some(
        (event) =>
          event.eventType ===
          "legacy_electrical_42_row_draft_invalidated",
      ),
    ).toBe(true);
  });
});
