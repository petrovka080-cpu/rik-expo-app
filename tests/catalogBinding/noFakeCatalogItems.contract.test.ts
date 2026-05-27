import { validateNoFakeCatalogData } from "../../src/lib/ai/catalogBinding";
import { bindCatalogWithNoProviderHits, buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("catalog item safety", () => {
  it("does not create fake catalog items when no candidates are found", async () => {
    const binding = await bindCatalogWithNoProviderHits(buildWorldEngineEstimate(WORLD_PROMPTS.hydroTurbine));
    expect(validateNoFakeCatalogData(binding)).toEqual({ passed: true, failures: [] });
  });
});
