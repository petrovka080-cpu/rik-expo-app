import { invariantInternalNoPublicWeb } from "../../../src/lib/ai/contractRuntime";
import { createContractRuntimeTraceFixture } from "./contractRuntimeTestFixtures";

describe("invariant internal no public web", () => {
  it("blocks public web for app-data questions", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(invariantInternalNoPublicWeb(trace).passed).toBe(true);
    expect(
      invariantInternalNoPublicWeb({
        ...trace,
        sources: {
          ...trace.sources,
          externalSources: [{ origin: "public_web", url: "https://example.com", checkedAt: "2026-05-21" }],
        },
      }).passed,
    ).toBe(false);
  });
});
