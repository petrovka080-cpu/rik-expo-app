import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - no fake catalog bypass", () => {
  it("validates catalog_items and fake catalog fields", () => {
    const source = changeControlSource();
    expect(source).toContain("usesCatalogItemsService");
    expect(source).toContain("catalogItemIsSynthetic");
    expect(source).toContain("fakeSupplier");
    expect(source).toContain("fakeAvailability");
  });
});
