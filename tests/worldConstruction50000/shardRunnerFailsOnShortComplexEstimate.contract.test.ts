import { buildWorld50000DangerousCase, validateWorld50000Case } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 shard runner short complex estimate gate", () => {
  it("requires infrastructure and complex cases to meet BOQ depth", () => {
    const result = validateWorld50000Case(buildWorld50000DangerousCase(0));
    expect(result.passed).toBe(true);
    expect(result.shortEstimateFound).toBe(false);
    expect(result.boqRowsCount).toBeGreaterThanOrEqual(45);
  });
});
