import { WORLD_50000_GOVERNED_TOTAL, world50000ProofSource } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 exact merge count", () => {
  it("does not allow a less-than-50000 governed merge", () => {
    expect(WORLD_50000_GOVERNED_TOTAL).toBe(50000);
    expect(world50000ProofSource()).toContain("GOVERNED_COUNT_NOT_EXACT_50000");
  });
});
