import { expectRepresentativePdfPayload } from "./aiEstimatePerformanceBudgetTestHelpers";

describe("PDF payload build latency budget", () => {
  it("builds structured PDF view model within budget", () => {
    expect(expectRepresentativePdfPayload().sections.length).toBeGreaterThan(0);
  });
});
