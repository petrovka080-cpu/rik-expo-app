import { bindWithFixtureCatalog, estimateFor, FOUNDATION_PROMPT, validateFixtureBinding } from "./catalogBindingTestHelpers";

describe("catalog binding no fake availability", () => {
  it("keeps availability explicit and unknown unless backed by catalog source data", async () => {
    const estimate = estimateFor(FOUNDATION_PROMPT);
    const binding = await bindWithFixtureCatalog(estimate);
    const validation = validateFixtureBinding(estimate, binding);
    expect(validation.fakeAvailabilityFound).toBe(false);
    expect(binding.rows.flatMap((row) => row.catalogCandidates).every((candidate) => candidate.availabilityStatus === "unknown")).toBe(true);
  });
});
