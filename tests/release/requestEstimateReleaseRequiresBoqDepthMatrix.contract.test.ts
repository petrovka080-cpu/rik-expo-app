import { loadRequiredMatrixEvidence } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

describe("request estimate release gate requires BOQ depth matrix", () => {
  it("requires professional BOQ depth/formula quality before release green", () => {
    const matrix = loadRequiredMatrixEvidence().find((item) => item.key === "professional_boq_depth");
    expect(matrix).toBeDefined();
    expect(matrix?.present).toBe(true);
    expect(matrix?.green).toBe(true);
    expect(matrix?.finalStatus).toBe("GREEN_GLOBAL_ESTIMATE_PROFESSIONAL_BOQ_DEPTH_READY");
    expect(matrix?.fakeGreenClaimed).toBe(false);
  });
});
