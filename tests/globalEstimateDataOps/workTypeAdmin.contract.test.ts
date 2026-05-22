import {
  buildGlobalEstimateDataOpsCoverageMatrix,
  buildGlobalEstimateDataOpsInventory,
} from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops work type admin contract", () => {
  it("exposes work type governance without creating another estimate engine", () => {
    const inventory = buildGlobalEstimateDataOpsInventory();
    const coverage = buildGlobalEstimateDataOpsCoverageMatrix();

    expect(inventory.adminCapabilities).toContain("work_types_admin_contract");
    expect(inventory.noSecondEstimateFramework).toBe(true);
    expect(coverage.workTypesTotal).toBeGreaterThan(0);
    expect(coverage.templatesCovered).toBe(true);
  });
});
