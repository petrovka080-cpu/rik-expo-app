import { validatePayload, validCatalogPayload } from "./changeControlTestHelpers";

describe("change control - catalog binding validation", () => {
  it("requires AI material binding to use catalog_items", () => {
    const { run } = validatePayload("CATALOG_BINDING_POLICY", "ai_material_rows", validCatalogPayload({
      usesCatalogItemsService: false,
    }));
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toContain("CATALOG_ITEMS_SERVICE_REQUIRED");
  });
});
