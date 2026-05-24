import { readAi50000Phase1Audit } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: document layer does not calculate estimates", () => {
  it("keeps calculation in GlobalEstimateResult/backend path", () => {
    expect(readAi50000Phase1Audit().document_layer_calculates_estimate).toBe(false);
  });
});
