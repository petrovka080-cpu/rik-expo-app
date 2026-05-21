import { invariantPositiveQuestionsNotEmpty } from "../../../src/lib/ai/contractRuntime";
import { createContractRuntimeTraceFixture } from "./contractRuntimeTestFixtures";

describe("invariant positive questions not empty", () => {
  it("fails checked_empty positive traces", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(invariantPositiveQuestionsNotEmpty(trace).passed).toBe(true);
    expect(
      invariantPositiveQuestionsNotEmpty({
        ...trace,
        gateway: { ...trace.gateway, queries: [{ ...trace.gateway.queries[0], resultStatus: "checked_empty" }] },
      }).passed,
    ).toBe(false);
  });
});
