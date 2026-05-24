import { bindWithFixtureCatalog, estimateFor, FOUNDATION_PROMPT, validateFixtureBinding } from "./catalogBindingTestHelpers";

describe("catalog binding no fake stock", () => {
  it("does not invent stock status for catalog candidates", async () => {
    const estimate = estimateFor(FOUNDATION_PROMPT);
    const binding = await bindWithFixtureCatalog(estimate);
    const validation = validateFixtureBinding(estimate, binding);
    expect(validation.fakeStockFound).toBe(false);
    expect(binding.rows.flatMap((row) => row.catalogCandidates).every((candidate) => candidate.stockStatus === "unknown")).toBe(true);
  });
});
