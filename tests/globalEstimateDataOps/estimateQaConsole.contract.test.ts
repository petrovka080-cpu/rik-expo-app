import { runGlobalEstimateDataOpsEstimateQa } from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops QA console contract", () => {
  it("samples estimates and proves rows, source IDs and tax evidence", async () => {
    const qa = await runGlobalEstimateDataOpsEstimateQa();

    expect(qa.qaPassed).toBe(true);
    expect(qa.backendResultsUsed).toBe(true);
    expect(qa.noPriceWithoutSource).toBe(true);
    expect(qa.noTaxWithoutRule).toBe(true);
    expect(qa.professionalRowsPresent).toBe(true);
  });
});
