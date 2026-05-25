import { loadRequiredMatrixEvidence } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

describe("request estimate release gate requires catalog binding matrix", () => {
  it("requires catalog_items binding proof before release green", () => {
    const matrix = loadRequiredMatrixEvidence().find((item) => item.key === "catalog_binding");
    expect(matrix).toBeDefined();
    expect(matrix?.present).toBe(true);
    expect(matrix?.green).toBe(true);
    expect(matrix?.finalStatus).toBe("GREEN_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_READY");
    expect(matrix?.fakeGreenClaimed).toBe(false);
  });
});
