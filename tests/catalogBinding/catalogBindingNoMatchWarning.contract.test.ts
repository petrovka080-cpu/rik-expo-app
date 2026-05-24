import { bindEstimateRowsToCatalogItems } from "../../src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import { estimateFor, FOUNDATION_PROMPT } from "./catalogBindingTestHelpers";

describe("catalog binding no match warning", () => {
  it("writes no_catalog_match warnings when catalog search returns nothing", async () => {
    const estimate = estimateFor(FOUNDATION_PROMPT);
    const binding = await bindEstimateRowsToCatalogItems({
      estimate,
      searchProvider: async () => [],
    });
    expect(binding.rows.some((row) => row.bindingStatus === "no_catalog_match")).toBe(true);
    expect(binding.warnings.some((warning) => warning.startsWith("NO_CATALOG_MATCH:"))).toBe(true);
  });
});
