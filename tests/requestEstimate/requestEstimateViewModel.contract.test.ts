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

  it("keeps a required non-payable composition row visible without making it costed", () => {
    const source = foundationDraftWithManualCatalogItem();
    const component = source.items[0]!;
    const bundle = {
      ...source,
      items: source.items.map((item) => item.id === component.id
        ? {
          ...item,
          sourceParameters: {
            ...(item.sourceParameters ?? {}),
            includedInEstimate: false,
            includedInProcurement: false,
            payable: false,
            canonicalCostTreatment: "INCLUDED_IN_RESOURCE_ROWS",
          },
        }
        : item),
    };

    const vm = buildRequestEstimateViewModel(bundle);
    const visibleIds = vm?.sections.flatMap((section) => section.items.map((item) => item.id)) ?? [];

    expect(visibleIds).toContain(component.id);
    expect(vm?.rawItemCount).toBe(source.items.length);
    expect(vm?.priceStatusLabel).toContain(`/${source.items.length - 1} `);
  });

  it("keeps a quantified preliminary material in the calculated and procurement scope", () => {
    const source = foundationDraftWithManualCatalogItem();
    const material = source.items.find((item) => item.itemType === "material")!;
    const bundle = {
      ...source,
      items: source.items.map((item) => item.id === material.id
        ? {
          ...item,
          quantity: 32.1,
          sourceParameters: {
            ...(item.sourceParameters ?? {}),
            canonicalPreliminaryNeed: true,
            canonicalPreliminaryNeedState: "CONDITION_REQUIRED",
            includedInEstimate: true,
            includedInProcurement: true,
            procurementEligible: true,
            payable: false,
          },
        }
        : item),
    };

    const vm = buildRequestEstimateViewModel(bundle);

    expect(vm?.calculatedItemCount).toBe(source.items.length);
    expect(vm?.preliminaryNeedCount).toBe(1);
    expect(vm?.priceStatusLabel).toContain("1 с предварительным количеством");
    expect(vm?.priceStatusLabel).not.toContain("1 без количества");
    expect(vm?.procurementApplicabilityLabel).toBeNull();
    expect(vm?.previewSections.flatMap((section) => section.rows)).toContainEqual(
      expect.objectContaining({
        calculationLabel: "Предварительное количество рассчитано; уточните характеристики или условия",
      }),
    );
  });
});
