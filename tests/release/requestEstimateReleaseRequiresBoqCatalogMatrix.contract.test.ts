import { loadRequiredMatrixEvidence } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

describe("request estimate release gate requires BOQ/catalog matrix", () => {
  it("requires the request AI estimate BOQ catalog matrix to be present and green", () => {
    const matrix = loadRequiredMatrixEvidence().find((item) => item.key === "boq_catalog");
    expect(matrix).toBeDefined();
    expect(matrix?.present).toBe(true);
    expect(matrix?.green).toBe(true);
    expect(matrix?.finalStatus).toBe("GREEN_REQUEST_AI_ESTIMATE_BOQ_CATALOG_READY");
    expect(matrix?.fakeGreenClaimed).toBe(false);
  });
});
