import { listProjectFiles, readProjectFile } from "./catalogBindingArchitectureTestHelpers";

describe("catalog binding no fake catalog items", () => {
  it("does not create fake catalog item factories in production source", () => {
    const offenders = listProjectFiles("src")
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => /fakeCatalogItem|const\s+fakeCatalog|FAKE_CATALOG|mockCatalogItem/i.test(readProjectFile(file)));
    expect(offenders).toEqual([]);
  });
});
