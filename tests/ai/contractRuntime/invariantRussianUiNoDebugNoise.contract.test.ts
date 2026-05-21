import { invariantRussianUiNoDebugNoise } from "../../../src/lib/ai/contractRuntime";
import { createContractRuntimeTraceFixture } from "./contractRuntimeTestFixtures";

describe("invariant Russian UI no debug noise", () => {
  it("blocks provider/runtime/raw payload UI leakage", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(invariantRussianUiNoDebugNoise(trace).passed).toBe(true);
    expect(invariantRussianUiNoDebugNoise({ ...trace, ui: { ...trace.ui, runtimeNoiseVisible: true } }).passed).toBe(false);
  });
});
