import { createEstimatePdf } from "../../src/lib/estimatePdf";

describe("estimate PDF markdown rejection", () => {
  it("rejects markdown or visible answer text as source of truth", () => {
    expect(() =>
      createEstimatePdf({
        estimate: "## markdown table" as never,
        runtimeTrace: {},
        generatedAt: "2026-05-23T00:00:00.000Z",
        language: "ru",
      }),
    ).toThrow(/structured GlobalEstimateResult/);
  });
});
