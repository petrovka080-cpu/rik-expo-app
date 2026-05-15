import {
  canRequestAiApprovalActionExecution,
  getAiApprovalActionRoute,
  listAiApprovalActionRoutes,
  routeAiApprovalRequiredAction,
  verifyAiApprovalActionRouter,
} from "../../src/features/ai/approvalRouter/aiApprovalActionRouter";

describe("AI approval action router from audit map", () => {
  it("routes every audited approval_required action through the action ledger boundary", () => {
    const routes = listAiApprovalActionRoutes();
    const summary = verifyAiApprovalActionRouter(routes);

    expect(summary).toMatchObject({
      finalStatus: "GREEN_AI_APPROVAL_ACTION_ROUTER_READY",
      auditedActions: 112,
      approvalRequiredActions: 28,
      routedActions: 28,
      submitRoutes: 27,
      ledgerDecisionRoutes: 1,
      ledgerRpcVisible: true,
      executeOnlyAfterApproved: true,
      redactionSafeActions: 28,
      noSecrets: true,
      noRawRows: true,
      noRawPrompts: true,
      noRawProviderPayloads: true,
      noDbWrites: true,
      noProviderCalls: true,
      noUiChanges: true,
      noFakeGreen: true,
    });
    expect(routes.every((route) => route.noDirectExecutePath)).toBe(true);
    expect(routes.every((route) => route.executionPolicy.requiresApprovedStatus)).toBe(true);
    expect(routes.every((route) => route.ledgerRoute.ledgerBacked)).toBe(true);
  });

  it("maps important domains to deterministic ledger action types", () => {
    expect(getAiApprovalActionRoute("buyer.request.detail.approval")).toMatchObject({
      actionType: "confirm_supplier",
      domain: "procurement",
      routeKind: "submit_for_approval",
    });
    expect(getAiApprovalActionRoute("warehouse.issue.approval")).toMatchObject({
      actionType: "change_warehouse_status",
      domain: "warehouse",
    });
    expect(getAiApprovalActionRoute("accountant.payment.approval")).toMatchObject({
      actionType: "change_payment_status",
      domain: "finance",
    });
    expect(getAiApprovalActionRoute("documents.main.approval")).toMatchObject({
      actionType: "send_document",
      domain: "documents",
    });
  });

  it("keeps approval inbox as a ledger decision route instead of a new fake submit payload", () => {
    const route = getAiApprovalActionRoute("approval.inbox.approval");

    expect(route).toMatchObject({
      routeKind: "ledger_decision",
      ledgerSubmitPayload: null,
      noDirectExecutePath: true,
      finalExecutionInRouter: false,
    });
    expect(route?.ledgerRoute).toMatchObject({
      approveEndpoint: "POST /agent/action/:actionId/approve",
      rejectEndpoint: "POST /agent/action/:actionId/reject",
      executeApprovedEndpoint: "POST /agent/action/:actionId/execute-approved",
      directExecuteAllowed: false,
    });
  });

  it("requires screen, action and role scope to resolve a route", () => {
    expect(
      routeAiApprovalRequiredAction({
        screenId: "buyer.main",
        actionId: "buyer.main.approval",
        role: "buyer",
      }),
    ).toMatchObject({
      screenId: "buyer.main",
      actionId: "buyer.main.approval",
    });
    expect(
      routeAiApprovalRequiredAction({
        screenId: "buyer.main",
        actionId: "buyer.main.approval",
        role: "warehouse",
      }),
    ).toBeNull();
    expect(getAiApprovalActionRoute("buyer.main.safe_read")).toBeNull();
  });

  it("allows execution requests only after approved ledger status", () => {
    expect(
      canRequestAiApprovalActionExecution({
        actionId: "buyer.main.approval",
        status: "pending",
      }),
    ).toMatchObject({
      allowed: false,
      directExecuteAllowed: false,
      requiresApprovedStatus: true,
    });
    expect(
      canRequestAiApprovalActionExecution({
        actionId: "buyer.main.approval",
        status: "approved",
      }),
    ).toMatchObject({
      allowed: true,
      directExecuteAllowed: false,
      requiresApprovedStatus: true,
    });
  });
});
