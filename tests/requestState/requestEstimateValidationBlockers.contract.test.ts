import { validateRequestEstimateDraft } from "../../src/features/consumerRepair/validateRequestEstimateDraft";
import { makeRequestEstimateDraft } from "./requestEstimateStateTestHelpers";

describe("request estimate validation blockers", () => {
  it("blocks missing rows and catalog items masquerading as catalog-backed", () => {
    const empty = makeRequestEstimateDraft({ items: [] });
    expect(validateRequestEstimateDraft(empty).blockers).toContain("ITEMS_REQUIRED");

    const invalidCatalog = makeRequestEstimateDraft({
      items: [{
        rowId: "bad_catalog",
        source: "catalog_item",
        name: "Catalog row without id",
        quantity: 1,
        unit: "pcs",
        unitLabel: "pcs",
        confidence: "high",
      }],
    });
    expect(validateRequestEstimateDraft(invalidCatalog).blockers).toContain("CATALOG_ITEM_ID_REQUIRED:bad_catalog");
  });
});
