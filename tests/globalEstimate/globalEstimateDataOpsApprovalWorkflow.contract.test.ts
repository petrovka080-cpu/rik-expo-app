import {
  approveGlobalEstimateDataOpsChange,
  buildGlobalEstimateDataOpsPublishPlan,
  buildGlobalEstimateDataOpsRollbackPlan,
  createGlobalEstimateDataOpsApprovalRequest,
  type GlobalEstimateDataOpsActor,
  type GlobalEstimateDataOpsChange,
} from "../../src/lib/ai/globalEstimate";

const author: GlobalEstimateDataOpsActor = { userId: "author", role: "data_ops_admin" };
const reviewer: GlobalEstimateDataOpsActor = { userId: "reviewer", role: "reviewer" };

const change: GlobalEstimateDataOpsChange = {
  id: "change_1",
  entityType: "labor_rate",
  operation: "update",
  draft: {
    workKey: "laminate_install",
    unit: "sq_m",
    countryCode: "KG",
    priceMin: 250,
    priceMax: 400,
    priceDefault: 320,
    currency: "KGS",
    sourceLabel: "Approved labor source",
    checkedAt: new Date().toISOString(),
  },
  before: { priceDefault: 300 },
  reason: "approved data ops refresh",
  author,
  createdAt: new Date().toISOString(),
  status: "draft",
};

describe("global estimate data ops approval workflow", () => {
  it("blocks self-approval and creates backend-only publish plus rollback plans", () => {
    const request = createGlobalEstimateDataOpsApprovalRequest(change);
    expect(() => approveGlobalEstimateDataOpsChange({ request, reviewer: author })).toThrow(
      /SELF_APPROVAL_BLOCKED/,
    );

    const approved = approveGlobalEstimateDataOpsChange({ request, reviewer });
    const publishPlan = buildGlobalEstimateDataOpsPublishPlan(approved);
    const rollbackPlan = buildGlobalEstimateDataOpsRollbackPlan({ version: publishPlan.version, actor: reviewer });

    expect(publishPlan).toMatchObject({
      directUiWrite: false,
      requiresBackendService: true,
      requiresApprovedChange: true,
      sqlStatements: [],
    });
    expect(rollbackPlan).toMatchObject({
      rollbackReady: true,
      directDelete: false,
      destructiveSql: false,
      requiresApproval: true,
    });
  });
});
