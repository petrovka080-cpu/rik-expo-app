import { WORLD_50000_GOVERNED_TOTAL, buildWorld50000AllGovernedCases } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 shard no overlap", () => {
  it("uses unique case ids across the governed proof set", () => {
    const ids = buildWorld50000AllGovernedCases().map((item) => item.caseId);
    expect(new Set(ids).size).toBe(WORLD_50000_GOVERNED_TOTAL);
  });
});
