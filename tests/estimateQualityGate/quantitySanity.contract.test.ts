import { goodQualityGate } from "./estimateQualityGateTestHelpers";

describe("quantity sanity quality", () => {
  it("passes finite positive quantities and compatible units", () => {
    expect(goodQualityGate().checks.quantity_sanity_passed).toBe(true);
  });
});
