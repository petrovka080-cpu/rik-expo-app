import { invariantSourceRefsRequired } from "../../../src/lib/ai/contractRuntime";
import { createContractRuntimeTraceFixture } from "./contractRuntimeTestFixtures";

describe("invariant source refs required", () => {
  it("passes only when internal numeric facts carry source refs", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(invariantSourceRefsRequired(trace).passed).toBe(true);
    expect(invariantSourceRefsRequired({ ...trace, sources: { ...trace.sources, sourceRefIds: [] } }).passed).toBe(false);
  });
});
