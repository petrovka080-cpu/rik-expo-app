import {
  approveGlobalEstimateDataOpsChange,
  buildGlobalEstimateDataOpsImportPreview,
  buildGlobalEstimateDataOpsPublishPlan,
  buildGlobalEstimateDataOpsRollbackPlan,
  createGlobalEstimateDataOpsApprovalRequest,
  type GlobalEstimateDataOpsActor,
} from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops versioning and rollback contract", () => {
  it("creates immutable publish versions and rollback plans only after approval", () => {
    const actor: GlobalEstimateDataOpsActor = { userId: "editor", role: "data_ops_admin" };
    const reviewer: GlobalEstimateDataOpsActor = { userId: "reviewer", role: "reviewer" };
    const preview = buildGlobalEstimateDataOpsImportPreview({
      actor,
      rows: [{
        rowNumber: 1,
        entityType: "material_rate",
        operation: "update",
        reason: "versioned rate change",
        payload: {
          id: "rate_laminate_board_us_dallas_standard",
          materialKey: "laminate_board",
          countryCode: "US",
          unit: "sq_ft",
          priceMin: 2,
          priceMax: 5,
          priceDefault: 3,
          currency: "USD",
          sourceLabel: "Configured reference",
          checkedAt: new Date().toISOString(),
        },
      }],
    });
    const change = preview.changes[0];
    expect(change).toBeDefined();

    const approved = approveGlobalEstimateDataOpsChange({
      request: createGlobalEstimateDataOpsApprovalRequest(change!),
      reviewer,
    });
    const publishPlan = buildGlobalEstimateDataOpsPublishPlan(approved);
    const rollback = buildGlobalEstimateDataOpsRollbackPlan({ version: publishPlan.version, actor: reviewer });

    expect(publishPlan.requiresApprovedChange).toBe(true);
    expect(publishPlan.directUiWrite).toBe(false);
    expect(publishPlan.version.versionNumber).toBe(1);
    expect(rollback.rollbackReady).toBe(true);
    expect(rollback.destructiveSql).toBe(false);
  });
});
