import { readRequestEstimateRuntimeSource } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate payload parity no screen-local calculation", () => {
  it("keeps request payload parity in services instead of screen math", () => {
    const source = readRequestEstimateRuntimeSource();
    expect(source).toContain("buildConsumerRepairCanonicalDraftPayload");
    expect(source).not.toMatch(/calculateEstimateInScreen|screenLocalEstimate|setMessages\(prev\s*=>\s*rewrite/i);
  });
});
