import {
  approveGlobalEstimateDataOpsChange,
  buildGlobalEstimateDataOpsImportPreview,
  createGlobalEstimateDataOpsApprovalRequest,
  type GlobalEstimateDataOpsActor,
} from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops approval workflow contract", () => {
  it("blocks self approval and requires reviewer/admin approval", () => {
    const actor: GlobalEstimateDataOpsActor = { userId: "same-user", role: "data_ops_admin" };
    const preview = buildGlobalEstimateDataOpsImportPreview({
      actor,
      rows: [{
        rowNumber: 1,
        entityType: "tax_rule",
        operation: "update",
        reason: "reviewable tax rule",
        payload: {
          countryCode: "DE",
          taxType: "vat",
          taxRate: 0.19,
          taxLabel: "VAT",
          sourceLabel: "Configured VAT reference",
          checkedAt: new Date().toISOString(),
        },
      }],
    });
    const request = createGlobalEstimateDataOpsApprovalRequest(preview.changes[0]!);

    expect(() => approveGlobalEstimateDataOpsChange({ request, reviewer: actor })).toThrow(
      "GLOBAL_ESTIMATE_DATA_OPS_SELF_APPROVAL_BLOCKED",
    );
  });
});
