import { listProjectFiles, readProjectFile } from "./catalogBindingArchitectureTestHelpers";

describe("catalog binding no duplicate catalog service", () => {
  it("routes picker and binding through the shared catalogItemsService facade", () => {
    const files = listProjectFiles("src")
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => /searchCatalogItemsForPicker|searchCatalogItemsForEstimateBinding/.test(readProjectFile(file)));
    expect(files.sort()).toEqual([
      "src/features/catalog/CatalogItemPicker.tsx",
      "src/lib/catalog/catalog.facade.ts",
      "src/lib/catalog/catalogItemsService.ts",
      "src/lib/catalog_api.ts",
      "src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems.ts",
    ].sort());
  });
});
