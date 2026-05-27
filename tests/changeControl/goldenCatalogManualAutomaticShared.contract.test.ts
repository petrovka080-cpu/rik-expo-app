import { validatePayload, validCatalogPayload } from "./changeControlTestHelpers";

describe("golden change control - catalog sharing", () => {
  it("keeps manual and automatic catalog binding on catalog_items", () => {
    const { run } = validatePayload("CATALOG_BINDING_POLICY", "ai_material_rows", validCatalogPayload({
      usesCatalogItemsService: true,
      manualAndAutomaticShared: true,
    }));
    expect(run.status).toBe("passed");
  });
});
