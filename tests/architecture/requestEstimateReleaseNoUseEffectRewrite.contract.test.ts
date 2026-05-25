import { readRequestEstimateRuntimeSource } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate release no useEffect rewrite", () => {
  it("does not rewrite estimate answers or draft payload after render", () => {
    expect(readRequestEstimateRuntimeSource()).not.toMatch(/useEffect\s*\(\s*\(\s*\)\s*=>\s*set(?:Answer|Messages|Estimate|Draft)/);
  });
});
