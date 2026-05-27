import { validateNoFakeCatalogData } from "../../src/lib/ai/catalogBinding";
import { bindCatalogWithNoProviderHits, buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("catalog stock/supplier safety", () => {
  it("does not invent stock, supplier, or availability for AI-bound material rows", async () => {
    const binding = await bindCatalogWithNoProviderHits(buildWorldEngineEstimate(WORLD_PROMPTS.roofWaterproofing));
    expect(validateNoFakeCatalogData(binding).passed).toBe(true);
    expect(binding.rows.flatMap((row) => row.catalogCandidates)).toEqual([]);
  });
});
