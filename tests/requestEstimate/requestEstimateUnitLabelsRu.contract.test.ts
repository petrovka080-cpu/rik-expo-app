import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { addConsumerRepairRequestItem } from "../../src/lib/consumerRequests";
import { buildConsumerRepairPdfSummary } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  containsRawUnit,
  foundationDraftBundle,
  foundationSummaryText,
  foundationViewModel,
} from "./requestEstimateBoqCatalogTestHelpers";

describe("request estimate unit labels", () => {
  it("uses localized unit labels in the request draft view model", () => {
    const vm = foundationViewModel();
    const text = `${foundationSummaryText()}\n${vm?.sections.flatMap((section) => section.items.map((item) => item.unitLabel)).join("\n")}`;
    expect(text).toContain("\u043c\u00b3");
    expect(text).toContain("\u043c\u00b2");
    expect(containsRawUnit(text)).toBe(false);
  });

  it("normalizes persisted technical unit labels before rendering UI and PDF text", () => {
    let bundle = foundationDraftBundle();
    bundle = addConsumerRepairRequestItem({
      requestDraftId: bundle.draft.id,
      titleRu: "\u0413\u0440\u0443\u043d\u0442",
      itemType: "material",
      quantity: 500,
      unit: "sq_m",
      unitLabel: "sq_m",
      unitPrice: 360,
      currency: "KGS",
      source: "catalog_item",
      catalogItemId: "catalog_soil_sq_m",
      category: "material",
      sourceId: "catalog_items",
      sourceLabel: "catalog_items",
      confidence: "high",
      addedBy: "user",
    });

    const vm = buildRequestEstimateViewModel(bundle);
    const pdfSummary = buildConsumerRepairPdfSummary({
      draft: bundle.draft,
      items: bundle.items,
      media: bundle.media,
    });
    const text = [
      vm?.visibleLines.map((line) => line.text).join("\n"),
      vm?.manualCatalogItems.map((item) => item.unitLabel).join("\n"),
      pdfSummary,
    ].join("\n");

    expect(text).toContain("\u043c\u00b2");
    expect(text).not.toContain("sq_m");
    expect(containsRawUnit(text)).toBe(false);
  });
});
