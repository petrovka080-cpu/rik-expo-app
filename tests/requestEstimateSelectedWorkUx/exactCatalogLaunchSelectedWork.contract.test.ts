import {
  buildConsumerRepairExactCatalogLaunchSelectedWork,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";

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
    expect(selected.selectedTitleRu).toBe("асфальтобетонное покрытие мостового сооружения");
    expect(selected.resolverReGuessed).toBe(false);
  });

  test("keeps a backend-only exact identity for admission without exposing it as the title", () => {
    const selected = buildConsumerRepairExactCatalogLaunchSelectedWork({
      catalogWorkId: "unknown_asphalt_exact_owner",
      rawInput: "неизвестная асфальтовая работа",
    });
    expect(selected.selectedWorkKey).toBe("unknown_asphalt_exact_owner");
    expect(selected.selectedTitleRu).toBe("неизвестная асфальтовая работа");
    expect(selected.selectedTitleRu).not.toContain(selected.selectedWorkKey);
  });

  test("keeps an asphalt-concrete expanded alias exact until backend scope admission", () => {
    const aliasId = "asphalt_concrete_pavement_tender_boq_expanded_complex_v1";
    const rawInput = "Устройство асфальтобетонного дорожного покрытия 120 м²";
    const selected = buildConsumerRepairExactCatalogLaunchSelectedWork({
      catalogWorkId: aliasId,
      rawInput,
    });
    expect(selected.selectedWorkKey).toBe(aliasId);
    expect(selected.rawInput).toBe(rawInput);
    expect(selected.selectedTitleRu).toBe("Устройство асфальтобетонного дорожного покрытия");
    expect(selected.resolverReGuessed).toBe(false);
  });
});
