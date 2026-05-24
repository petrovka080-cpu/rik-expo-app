import { bindWithFixtureCatalog, estimateFor, FOUNDATION_PROMPT, validateFixtureBinding } from "./catalogBindingTestHelpers";

describe("bind estimate rows to catalog_items", () => {
  it("attempts catalog binding for material rows and keeps validation green", async () => {
    const estimate = estimateFor(FOUNDATION_PROMPT);
    const binding = await bindWithFixtureCatalog(estimate);
    const validation = validateFixtureBinding(estimate, binding);

    expect(binding.estimateId).toBe(estimate.estimateId);
    expect(validation.ok).toBe(true);
    expect(validation.materialRowsTotal).toBeGreaterThanOrEqual(8);
    expect(validation.materialRowsWithRateKeys).toBe(validation.materialRowsTotal);
    expect(validation.materialRowsWithMaterialKeys).toBe(validation.materialRowsTotal);
    expect(validation.bindingAttemptedForMaterialRows).toBe(true);
  });
});
