import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { foundationDraftWithManualCatalogItem } from "./requestEstimateBoqCatalogTestHelpers";

describe("canonical primary title authority", () => {
  it("projects the known legacy PVC field name while preserving the persisted revision title and input", () => {
    const source = foundationDraftWithManualCatalogItem();
    if (!source.structuredEstimatePayload) throw new Error("structured estimate fixture is missing");
    source.draft.problemText = "LOGICROOF 100 m2";
    const legacyTitle = "Поле ПВХ-кровли1.2мм по готовому утеплителю и бетонному основанию: крепление и сварка — 101 м²";
    source.structuredEstimatePayload.workTitle = legacyTitle;
    expect(buildRequestEstimateViewModel(source)?.title)
      .toBe("Укладка и крепление ПВХ-мембраны толщиной 1,2 мм — 101 м²");
    expect(source.structuredEstimatePayload.workTitle).toBe(legacyTitle);
    expect(source.draft.problemText).toBe("LOGICROOF 100 m2");
  });
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

  it("localizes a legacy raw piece code in a persisted canonical title", () => {
    const source = foundationDraftWithManualCatalogItem();
    if (!source.structuredEstimatePayload) throw new Error("structured estimate fixture is missing");
    const bundle = {
      ...source,
      structuredEstimatePayload: {
        ...source.structuredEstimatePayload,
        workTitle: "Монтаж закладных — 28 piece",
      },
    };

    const viewModel = buildRequestEstimateViewModel(bundle);

    expect(viewModel?.title).toBe("Монтаж закладных — 28 шт.");
    expect(viewModel?.summary).not.toMatch(/\bpiece\b/u);
  });
});
