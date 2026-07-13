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
      expect(item.priceStatus).toBe(item.catalogItemId ? "known_catalog_price" : "price_required");
      expect(item).not.toHaveProperty("unitPrice");
      expect(item).not.toHaveProperty("supplierPrice");
    }
  });
});
