import { invariantGatewayOnlyRetrieval } from "../../../src/lib/ai/contractRuntime";
import { createContractRuntimeTraceFixture } from "./contractRuntimeTestFixtures";

describe("invariant gateway-only retrieval", () => {
  it("requires Domain Data Gateway traces for internal answers", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(invariantGatewayOnlyRetrieval(trace).passed).toBe(true);
    expect(invariantGatewayOnlyRetrieval({ ...trace, gateway: { used: false, queries: [] } }).passed).toBe(false);
  });
});
