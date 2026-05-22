import {
  buildGlobalEstimateDataOpsImportPreview,
  resolveGlobalEstimateDataOpsFeatureFlags,
  type GlobalEstimateDataOpsActor,
} from "../../src/lib/ai/globalEstimate";

describe("architecture: Global Estimate Data Ops no consumer write", () => {
  it("keeps admin feature flags off and blocks non-admin authors from reference changes", () => {
    expect(resolveGlobalEstimateDataOpsFeatureFlags({})).toEqual({
      adminEnabled: false,
      importEnabled: false,
      approvalEnabled: false,
      publishEnabled: false,
      rollbackEnabled: false,
    });

    const consumerActor: GlobalEstimateDataOpsActor = { userId: "consumer", role: "consumer" };
    const preview = buildGlobalEstimateDataOpsImportPreview({
      actor: consumerActor,
      rows: [{
        rowNumber: 1,
        entityType: "material_rate",
        operation: "update",
        reason: "consumer write should fail",
        payload: { materialKey: "x", unit: "sq_m", priceMin: 1, priceMax: 2, priceDefault: 1, currency: "USD" },
      }],
    });

    expect(preview.blockedRows).toBe(1);
    expect(preview.validations[0]?.blockers).toContain("GLOBAL_ESTIMATE_DATA_OPS_AUTHOR_ROLE_BLOCKED");
  });
});
