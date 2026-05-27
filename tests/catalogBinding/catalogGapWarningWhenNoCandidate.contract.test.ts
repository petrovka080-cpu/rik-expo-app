import { bindCatalogWithNoProviderHits, buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("catalog gap warning", () => {
  it("emits catalog gap warnings for material rows without candidates", async () => {
    const binding = await bindCatalogWithNoProviderHits(buildWorldEngineEstimate(WORLD_PROMPTS.roofWaterproofing));
    const materialRowsWithoutCandidates = binding.rows.filter((row) => row.bindingStatus === "no_catalog_match");

    expect(materialRowsWithoutCandidates.length).toBeGreaterThan(0);
    for (const row of materialRowsWithoutCandidates) {
      expect(binding.warnings.some((warning) => warning.includes(row.rowId))).toBe(true);
    }
  });
});
