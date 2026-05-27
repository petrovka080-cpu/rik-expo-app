import { WORLD_50000_GOVERNED_TOTAL, buildWorld50000AllGovernedCases } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 shard no missing cases", () => {
  it("covers the exact governed 50000 case range", () => {
    const cases = buildWorld50000AllGovernedCases();
    expect(cases).toHaveLength(WORLD_50000_GOVERNED_TOTAL);
    expect(cases[0].caseId).toBe("governed_00000");
    expect(cases[cases.length - 1].caseId).toBe("governed_49999");
  });
});
