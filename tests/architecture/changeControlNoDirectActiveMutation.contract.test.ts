import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - no direct active mutation", () => {
  it("routes active version changes through publish or rollback helpers", () => {
    const source = changeControlSource();
    expect(source).toContain("publishEstimateConfigChange");
    expect(source).toContain("rollbackEstimateConfigChange");
    expect(source).toContain("assertNoDirectActiveMutation");
    expect(source).not.toContain("DIRECT_ACTIVE_MUTATION_ALLOWED");
  });
});
