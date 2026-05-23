import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("any estimate no screen-local calculation", () => {
  it("keeps any-work estimate routing in lib/backend-style modules", () => {
    const router = readRepoFile("src/lib/ai/estimateRouting/universalEstimateIntentRouter.ts");

    expect(router).toContain("buildGlobalEstimateInputFromRoute");
    expect(router).toContain("calculateGlobalConstructionEstimateSync");
    expect(router).not.toMatch(/useState|useEffect|tsx|screen/i);
  });
});
