import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { foundationDraftWithManualCatalogItem } from "./requestEstimateBoqCatalogTestHelpers";

describe("canonical primary title authority", () => {
  it("does not let a stale catalog-selection title override the compiled revision title", () => {
    const source = foundationDraftWithManualCatalogItem();
    if (!source.structuredEstimatePayload) throw new Error("structured estimate fixture is missing");
    const bundle = {
      ...source,
      draft: {
        ...source.draft,
        selectedWorkTitleRu: "Кровельные работы — 100 м²",
      },
      structuredEstimatePayload: {
        ...source.structuredEstimatePayload,
        workTitle: "Кровельные работы — 200 м²",
      },
    };

    const viewModel = buildRequestEstimateViewModel(bundle);

    expect(viewModel?.title).toBe("Кровельные работы — 200 м²");
    expect(viewModel?.summary).toContain("Кровельные работы — 200 м²");
  });
});
