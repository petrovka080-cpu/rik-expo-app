import { loadRequiredMatrixEvidence } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

describe("request estimate release gate requires source governance matrix", () => {
  it("requires ratebook/catalog source governance before release green", () => {
    const matrix = loadRequiredMatrixEvidence().find((item) => item.key === "source_governance");
    expect(matrix).toBeDefined();
    expect(matrix?.present).toBe(true);
    expect(matrix?.green).toBe(true);
    expect(matrix?.finalStatus).toBe("GREEN_RATEBOOK_CATALOG_SOURCE_GOVERNANCE_READY");
    expect(matrix?.fakeGreenClaimed).toBe(false);
  });
});
