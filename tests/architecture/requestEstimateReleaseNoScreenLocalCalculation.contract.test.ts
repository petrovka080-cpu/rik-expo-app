import { readRequestEstimateRuntimeSource } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate release no screen-local calculation", () => {
  it("keeps estimate calculations out of request screens", () => {
    expect(readRequestEstimateRuntimeSource()).not.toMatch(/\bcalculateEstimateInScreen\b|\bscreenLocal(?:Estimate|Calculation)\b/);
  });
});
