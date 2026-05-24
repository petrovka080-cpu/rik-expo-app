import { createAiEstimatePdf } from "../../src/lib/aiEstimatePdf";
import { buildSafeIntegrationEstimate } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF input contract", () => {
  it("requires a structured GlobalEstimateResult", () => {
    const estimate = buildSafeIntegrationEstimate();
    expect(() =>
      createAiEstimatePdf({
        estimate,
        runtimeTraceId: "input-contract",
        route: "/chat",
        generatedAt: "2026-05-24T00:00:00.000Z",
        documentMode: "estimate",
      }),
    ).not.toThrow();
    expect(() =>
      createAiEstimatePdf({
        estimate: { ...estimate, outputContract: { ...estimate.outputContract, format: "markdown" as never } },
        runtimeTraceId: "input-contract-invalid",
        route: "/chat",
        generatedAt: "2026-05-24T00:00:00.000Z",
        documentMode: "estimate",
      }),
    ).toThrow(/GlobalEstimateResult/);
  });
});
