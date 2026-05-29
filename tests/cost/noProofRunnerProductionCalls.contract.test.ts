import { assertProofRunnerIsolation } from "../../src/lib/ai/cost";

describe("no proof runner production calls", () => {
  it("fails if a proof runner can touch production", () => {
    const report = assertProofRunnerIsolation({
      fixtureMode: true,
      stagingDataApproved: false,
      productionSupabaseWrite: true,
      productionSourceRefresh: false,
      productionCatalogMutation: false,
      productionPdfStorageUpload: false,
      liveSupplierStockCalls: false,
      userSessionMutation: false,
    });
    expect(report.proof_runner_production_calls_found).toBe(true);
    expect(report.failures).toContain("production_supabase_write");
  });
});
