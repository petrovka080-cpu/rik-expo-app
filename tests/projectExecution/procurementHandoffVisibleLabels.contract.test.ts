import {
  PROJECT_EXECUTION_FORBIDDEN_VISIBLE_PATTERN,
  buildProjectExecutionFixture,
} from "./projectExecutionTestHelpers";

describe("project execution procurement handoff visible labels", () => {
  it("uses human material names and visible catalog queries", () => {
    const { draft } = buildProjectExecutionFixture();

    for (const item of draft.procurementItems) {
      expect(item.materialVisibleName).toMatch(/[\u0400-\u04ff]/u);
      expect(item.catalogSearchQuery).toBe(item.materialVisibleName);
      expect(item.materialVisibleName).not.toMatch(PROJECT_EXECUTION_FORBIDDEN_VISIBLE_PATTERN);
      expect(item.catalogSearchQuery).not.toMatch(PROJECT_EXECUTION_FORBIDDEN_VISIBLE_PATTERN);
      if (item.priceStatus === "known_catalog_price") {
        expect(item.selectedPriceSource?.price_status).toBe("priced");
        expect(item.selectedPriceSource?.price_source_id).toBeTruthy();
        expect(item.unitPrice).toBeGreaterThan(0);
        expect(item.amount).toBe(item.selectedPriceSource?.selected_amount);
        expect(item.missingPrice).toBe(false);
      } else {
        expect(item.unitPrice).toBeNull();
        expect(item.amount).toBeNull();
        expect(item.missingPrice).toBe(true);
      }
      expect(item).not.toHaveProperty("supplierPrice");
    }
  });
});
