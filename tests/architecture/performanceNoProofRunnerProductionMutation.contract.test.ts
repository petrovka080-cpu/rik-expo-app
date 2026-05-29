import { read } from "./performanceGuardTestHelpers";

describe("performance no proof runner production mutation", () => {
  it("has explicit production mutation blockers", () => {
    const source = read("src/lib/ai/cost/assertProofRunnerIsolation.ts");
    expect(source).toContain("productionSupabaseWrite");
    expect(source).toContain("productionCatalogMutation");
    expect(source).toContain("productionPdfStorageUpload");
  });
});
