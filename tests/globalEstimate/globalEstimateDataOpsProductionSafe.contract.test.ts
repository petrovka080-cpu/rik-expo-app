import {
  assertGlobalEstimateDataOpsFeatureFlagsDefaultOff,
  buildGlobalEstimateDataOpsInventory,
  resolveGlobalEstimateDataOpsFeatureFlags,
} from "../../src/lib/ai/globalEstimate";

describe("global estimate data ops production-safe contract", () => {
  it("keeps admin/import/publish flags default-off and uses the existing estimate engine", () => {
    expect(() => assertGlobalEstimateDataOpsFeatureFlagsDefaultOff(
      resolveGlobalEstimateDataOpsFeatureFlags({}),
    )).not.toThrow();

    expect(buildGlobalEstimateDataOpsInventory()).toMatchObject({
      noSecondEstimateFramework: true,
      noScreenLocalCalculation: true,
      directUiWriteAllowed: false,
      migrationRequired: false,
    });
  });
});
