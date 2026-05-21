import { invariantNumericFactsMatch } from "../../../src/lib/ai/contractRuntime";
import {
  createContractRuntimeTraceFixture,
  expectedContractRuntimeNumericFacts,
} from "./contractRuntimeTestFixtures";

describe("invariant numeric facts match", () => {
  it("compares expected numeric facts against observed trace facts", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(invariantNumericFactsMatch(trace, expectedContractRuntimeNumericFacts()).passed).toBe(true);
    expect(invariantNumericFactsMatch(trace, [{ key: "gkl_shortage", value: -1 }]).passed).toBe(false);
  });
});
