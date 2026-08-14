import {
  buildConsumerRepairExactCatalogLaunchSelectedWork,
  buildConsumerRepairSelectedWorkDraftBundle,
} from "../../src/features/consumerRepair/requestEstimateLegacyTestActions";

describe("request exact-catalog launch selection", () => {
  test("preserves an existing Roadworks V4 exact owner", () => {
    const selected = buildConsumerRepairExactCatalogLaunchSelectedWork({
      catalogWorkId: "paving_roads_landscape_interior_asphalt_compact_large_area",
      rawInput: "уплотнение асфальтового покрытия 120 м²",
    });

    expect(selected.selectedWorkKey).toBe(
      "paving_roads_landscape_interior_asphalt_compact_large_area",
    );
    expect(selected.selectedTitleRu).toContain("асфальт");
    expect(selected.source).toBe("user_selected");
    expect(selected.resolverReGuessed).toBe(false);
  });

  test("preserves the selected expanded-template alias instead of collapsing its identity", () => {
    const aliasId = "bridge_asphalt_tender_boq_expanded_complex_v1";
    const selected = buildConsumerRepairExactCatalogLaunchSelectedWork({
      catalogWorkId: aliasId,
      rawInput: "асфальтобетонное покрытие мостового сооружения 120 м²",
    });

    expect(selected.selectedWorkKey).toBe(aliasId);
    expect(selected.selectedTitleRu).toBe(
      "Асфальтобетонное покрытие мостового сооружения",
    );
    expect(selected.resolverReGuessed).toBe(false);
  });

  test("fails closed for an unknown exact catalog identifier", () => {
    expect(() => buildConsumerRepairExactCatalogLaunchSelectedWork({
      catalogWorkId: "unknown_asphalt_exact_owner",
      rawInput: "неизвестная асфальтовая работа",
    })).toThrow("UNSUPPORTED_EXACT_WORK_KEY:unknown_asphalt_exact_owner");
  });

  test("keeps an asphalt-concrete expanded alias on the established four-scope boundary", () => {
    const aliasId = "asphalt_concrete_pavement_tender_boq_expanded_complex_v1";
    const rawInput = "Устройство асфальтобетонного дорожного покрытия 120 м²";
    const selected = buildConsumerRepairExactCatalogLaunchSelectedWork({
      catalogWorkId: aliasId,
      rawInput,
    });
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "exact-catalog-scope-test",
      problemText: rawInput,
      repairType: "roadworks",
      city: "Бишкек",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: selected,
    });

    expect(bundle.pendingRoadScopeSelection?.offeredScopes).toEqual([
      "ROAD_SURFACING_ONLY",
      "FULL_PAVEMENT_STRUCTURE",
      "FULL_ROAD_INFRASTRUCTURE",
      "ROAD_REPAIR_REHABILITATION",
    ]);
    expect(bundle.draft.selectedCatalogWorkId).toBe(aliasId);
    expect(bundle.items).toHaveLength(0);
  });
});
