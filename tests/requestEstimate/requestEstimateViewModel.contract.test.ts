import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  foundationDraftWithManualCatalogItem,
  foundationViewModel,
} from "./requestEstimateBoqCatalogTestHelpers";

describe("request estimate view model", () => {
  it("groups request draft positions into localized professional sections", () => {
    const vm = foundationViewModel();
    expect(vm?.title).toBe("ленточный фундамент");
    expect(vm?.summary).toContain("Ленточный фундамент");
    expect(vm?.sections.map((section) => section.title)).toEqual(expect.arrayContaining(["Материалы", "Работы", "Услуги / логистика"]));
  });
  it("hides a backend-excluded row while preserving it in the restorable bundle", () => {
    const source = foundationDraftWithManualCatalogItem();
    const removed = source.items[0]!;
    const bundle = {
      ...source,
      items: source.items.map((item) => item.id === removed.id
        ? {
          ...item,
          sourceParameters: {
            ...(item.sourceParameters ?? {}),
            includedInEstimate: false,
          },
        }
        : item),
    };

    const vm = buildRequestEstimateViewModel(bundle);
    const visibleIds = vm?.sections.flatMap((section) => section.items.map((item) => item.id)) ?? [];

    expect(bundle.items).toHaveLength(source.items.length);
    expect(visibleIds).not.toContain(removed.id);
    expect(vm?.rawItemCount).toBe(source.items.length - 1);
  });
});
