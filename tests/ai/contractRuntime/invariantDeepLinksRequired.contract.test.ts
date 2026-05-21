import { invariantDeepLinksRequired } from "../../../src/lib/ai/contractRuntime";
import { createContractRuntimeTraceFixture } from "./contractRuntimeTestFixtures";

describe("invariant deep links required", () => {
  it("requires open links for internal app objects", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(invariantDeepLinksRequired(trace).passed).toBe(true);
    expect(invariantDeepLinksRequired({ ...trace, sources: { ...trace.sources, openLinkCount: 0 } }).passed).toBe(false);
  });
});
