import { validateCatalogItemBinding } from "../../src/lib/ai/catalogBinding";
import { bindCatalogWithNoProviderHits, buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("AI estimate catalog binding", () => {
  it("runs material rows through the shared catalog binding path and records catalog gaps", async () => {
    const binding = await bindCatalogWithNoProviderHits(buildWorldEngineEstimate(WORLD_PROMPTS.roofWaterproofing));
    const validation = validateCatalogItemBinding(binding);

    expect(validation.passed).toBe(true);
    expect(binding.rows.some((row) => row.bindingStatus === "no_catalog_match")).toBe(true);
    expect(binding.warnings.some((warning) => warning.startsWith("NO_CATALOG_MATCH"))).toBe(true);
  });
});
