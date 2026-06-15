import { goodQualityGate } from "./estimateQualityGateTestHelpers";

describe("material compatibility quality", () => {
  it("uses material master compatibility for material rows", () => {
    expect(goodQualityGate().checks.material_compatibility_passed).toBe(true);
  });
});
