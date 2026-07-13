import { applyEstimateRevisionCatalogSelection } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("catalog selection revision", () => {
  it("creates a catalog verified revision", () => {
    const next = applyEstimateRevisionCatalogSelection(estimateRevisionState(), {
      row_key: "row_1",
      catalog_item_id: "catalog_laminate_42",
      source_id: "catalog_items",
      source_label: "catalog_items",
      unit_price: 640,
      actor_id: "consumer-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const row = currentRevision(next).editable_estimate_snapshot.rows[0];

    expect(currentRevision(next).source).toBe("CATALOG_SELECTED");
    expect(row.catalogItemId).toBe("catalog_laminate_42");
    expect(row.selectedCatalogItemId).toBe("catalog_laminate_42");
    expect(row.priceStatus).toBe("CATALOG_PRICE_VERIFIED");
    expect(row.priceSource).toBe("catalog_item");
    expect(row.priceSourceId).toBe("catalog_items");
  });
});
