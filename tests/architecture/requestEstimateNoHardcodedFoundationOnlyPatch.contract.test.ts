import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate no hardcoded foundation-only UI patch", () => {
  it("implements strip foundation as backend template/parser policy, not a UI one-prompt patch", () => {
    expect(readFile("src/lib/ai/globalEstimate/globalEstimateSeedData.ts")).toContain("STRIP_FOUNDATION_TEMPLATE");
    expect(readFile("src/lib/ai/globalEstimate/stripFoundationDimensions.ts")).toContain("parseStripFoundationDimensions");
    const screen = readFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(screen).not.toContain("strip_foundation");
    expect(screen).not.toContain("32.64");
  });
});
