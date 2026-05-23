import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("known work no generic rows architecture", () => {
  it("has hard validation for generic construction rows in live acceptance", () => {
    const helpers = readRepoFile("tests/liveAcceptance/liveAiEstimatePdfRealityTestHelpers.ts");
    const proof = readRepoFile("scripts/e2e/runLiveAiEstimatePdfRealityProof.ts");

    expect(helpers).toContain("FORBIDDEN_GENERIC_ROW_PATTERNS");
    expect(proof).toContain("generic_construction_rows_found_for_known_work");
    expect(helpers).toContain("Основной материал");
    expect(helpers).toContain("Строительные работы");
  });
});
