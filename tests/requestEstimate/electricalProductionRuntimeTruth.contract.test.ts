import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { ELECTRICAL_CANONICAL_WORK_KEY } from "../../src/lib/estimate/v4/electrical/electricalCanonicalV1";

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
    expect(currentRevision?.boq.rows).toHaveLength(0);
    expect(viewModel?.rawItemCount).toBe(0);
    expect(viewModel?.totalLabel).toMatch(/не рассчитан|уточнить/i);
    expect(viewModel?.priceStatusLabel).not.toMatch(/^0\/0\b/);
    expect(viewModel?.trustLevelLabel).toBe(
      "Доверие: исходные данные не заполнены",
    );
    expect(bundle.projectExecutionDrafts).toHaveLength(0);
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
