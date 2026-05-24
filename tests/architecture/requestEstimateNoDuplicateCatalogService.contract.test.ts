import { listFilesRecursively, readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate no duplicate catalog service", () => {
  it("routes manual material picking through the shared catalogItemsService", () => {
    const files = listFilesRecursively("src")
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => readFile(file).includes("searchCatalogItemsForPicker"));
    expect(files.sort()).toEqual([
      "src/features/catalog/CatalogItemPicker.tsx",
      "src/lib/catalog/catalog.facade.ts",
      "src/lib/catalog/catalogItemsService.ts",
      "src/lib/catalog_api.ts",
    ].sort());
  });
});
