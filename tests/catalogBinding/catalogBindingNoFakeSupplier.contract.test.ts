import { bindWithFixtureCatalog, estimateFor, FOUNDATION_PROMPT, validateFixtureBinding } from "./catalogBindingTestHelpers";

describe("catalog binding no fake supplier", () => {
  it("does not label candidates with fake supplier names", async () => {
    const estimate = estimateFor(FOUNDATION_PROMPT);
    const binding = await bindWithFixtureCatalog(estimate);
    const validation = validateFixtureBinding(estimate, binding);
    expect(validation.fakeSupplierFound).toBe(false);
    expect(binding.rows.flatMap((row) => row.catalogCandidates).every((candidate) => candidate.sourceLabel === "catalog_items")).toBe(true);
  });
});
