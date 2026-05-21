import { invariantExternalSourcesHaveUrlDate } from "../../../src/lib/ai/contractRuntime";
import { createContractRuntimeTraceFixture } from "./contractRuntimeTestFixtures";

describe("invariant external sources have URL/date", () => {
  it("requires provenance for public web sources", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(
      invariantExternalSourcesHaveUrlDate({
        ...trace,
        sources: {
          ...trace.sources,
          externalSources: [{ origin: "public_web", url: "https://example.com", checkedAt: "2026-05-21" }],
        },
      }).passed,
    ).toBe(true);
    expect(
      invariantExternalSourcesHaveUrlDate({
        ...trace,
        sources: { ...trace.sources, externalSources: [{ origin: "public_web" }] },
      }).passed,
    ).toBe(false);
  });
});
