import { goodQualityGate } from "./estimateQualityGateTestHelpers";

describe("work resolution quality", () => {
  it("passes resolved work when snapshot and resolution agree", () => {
    const gate = goodQualityGate();

    expect(gate.checks.work_resolution_passed).toBe(true);
    expect(gate.blocking_failures.find((failure) => failure.code === "WRONG_WORK_MATCH")).toBeUndefined();
  });
});
