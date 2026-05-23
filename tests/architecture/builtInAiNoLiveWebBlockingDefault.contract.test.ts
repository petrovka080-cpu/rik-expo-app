import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("built-in AI no live web blocking default", () => {
  it("uses cached source intelligence and keeps on-demand refresh out of normal runtime", () => {
    const registry = readRepoFile("src/lib/ai/sourceIntelligence/sourceRegistry.ts");
    const sourceRegistry = readRepoFile("src/lib/ai/globalEstimate/externalSources/globalExternalSourceRegistry.ts");
    expect(registry).toContain("GLOBAL_ESTIMATE_EXTERNAL_SOURCE_FLAGS");
    expect(sourceRegistry).toContain("GLOBAL_ESTIMATE_ON_DEMAND_SOURCE_REFRESH_ENABLED: false");
  });
});
