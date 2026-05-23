import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("built-in AI role context cannot override estimate", () => {
  it("locks estimate fallbacks away from role QA", () => {
    const policy = readRepoFile("src/lib/ai/builtInAi/builtInAiToolPolicyEngine.ts");
    expect(policy).toContain("estimate: [\"role_qa\"");
    expect(policy).toContain("calculate_global_estimate");
  });
});
