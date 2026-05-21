import { validateAiContractRuntimeTrace } from "../../../src/lib/ai/contractRuntime";
import {
  cleanContractRuntimePatchScan,
  createContractRuntimeTraceFixture,
  expectedContractRuntimeNumericFacts,
} from "./contractRuntimeTestFixtures";

describe("AI contract runtime validator", () => {
  it("passes a gateway-backed trace and writes root causes for blockers", async () => {
    const trace = await createContractRuntimeTraceFixture();
    const result = validateAiContractRuntimeTrace({
      trace,
      expectedNumericFacts: expectedContractRuntimeNumericFacts(),
      patchScan: cleanContractRuntimePatchScan,
    });

    expect(result.passed).toBe(true);
    expect(result.blockers).toEqual([]);

    const failed = validateAiContractRuntimeTrace({
      trace: { ...trace, numericFacts: [] },
      expectedNumericFacts: expectedContractRuntimeNumericFacts(),
      patchScan: cleanContractRuntimePatchScan,
    });
    expect(failed.passed).toBe(false);
    expect(failed.blockers.every((blocker) => Boolean(blocker.rootCause))).toBe(true);
  });
});
