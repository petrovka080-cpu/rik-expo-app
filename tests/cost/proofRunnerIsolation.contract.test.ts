import { assertProofRunnerIsolation } from "../../src/lib/ai/cost";

describe("proof runner isolation", () => {
  it("allows fixture-only proof runs", () => {
    const report = assertProofRunnerIsolation({
      fixtureMode: true,
      stagingDataApproved: false,
      productionSupabaseWrite: false,
      productionSourceRefresh: false,
      productionCatalogMutation: false,
      productionPdfStorageUpload: false,
      liveSupplierStockCalls: false,
      userSessionMutation: false,
    });
    expect(report.proof_runner_isolation_ready).toBe(true);
    expect(report.failures).toEqual([]);
  });
});
