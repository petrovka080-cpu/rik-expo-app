import { readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - no fake catalog service", () => {
  it("uses the shared catalog binding service and does not create an AI-only fake catalog", () => {
    const binding = readRepoFile("src/lib/ai/catalogBinding/bindBoqRowsToCatalogItems.ts");
    const resolver = readRepoFile("src/lib/ai/catalogBinding/resolveCatalogCandidatesForMaterial.ts");

    expect(binding).toContain("bindEstimateRowsToCatalogItems");
    expect(resolver).toContain("rankCatalogCandidatesForEstimateRow");
    expect(`${binding}\n${resolver}`).not.toMatch(/fakeCatalog|mockCatalog|aiOnlyCatalog|supplier.*fake/i);
  });
});
