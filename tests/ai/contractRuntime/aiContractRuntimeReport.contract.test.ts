import {
  buildAiContractRuntimeReport,
  validateAiContractRuntimeTrace,
} from "../../../src/lib/ai/contractRuntime";
import {
  cleanContractRuntimePatchScan,
  createContractRuntimeTraceFixture,
  expectedContractRuntimeNumericFacts,
} from "./contractRuntimeTestFixtures";

describe("AI contract runtime report", () => {
  it("binds trace, validation, scan, and root cause reports into one release artifact", async () => {
    const trace = await createContractRuntimeTraceFixture();
    const validation = validateAiContractRuntimeTrace({
      trace,
      expectedNumericFacts: expectedContractRuntimeNumericFacts(),
      patchScan: cleanContractRuntimePatchScan,
    });
    const report = buildAiContractRuntimeReport({
      trace,
      validation,
      patchScan: cleanContractRuntimePatchScan,
    });

    expect(report.releaseGateRequired).toBe(true);
    expect(report.trace.traceId).toBe(trace.traceId);
    expect(report.validation.passed).toBe(true);
    expect(report.rootCauseReports).toEqual([]);
  });
});
