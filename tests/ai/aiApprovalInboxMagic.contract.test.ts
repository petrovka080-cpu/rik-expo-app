import { getAiApprovalActionRoute } from "../../src/features/ai/approvalRouter/aiApprovalActionRouter";
import {
  AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS,
  buildAiFinanceApprovalMagicMatrix,
} from "../../scripts/ai/aiFinanceApprovalMagic";
import { getMagicPack } from "./aiScreenMagicTestHelpers";

describe("AI approval inbox magic", () => {
  it("keeps approve and reject human-led through the approval ledger", () => {
    const pack = getMagicPack("approval.inbox");
    const approve = pack.buttons.find((button) => button.label === "Approve");
    const reject = pack.buttons.find((button) => button.label === "Reject");
    const route = getAiApprovalActionRoute("approval.inbox.approval");

    expect(approve).toMatchObject({
      actionKind: "approval_required",
      expectedResult: "routes_to_approval_ledger",
      canExecuteDirectly: false,
    });
    expect(reject).toMatchObject({
      actionKind: "approval_required",
      expectedResult: "routes_to_approval_ledger",
      canExecuteDirectly: false,
    });
    expect(approve?.approvalRoute).toBeTruthy();
    expect(reject?.approvalRoute).toBeTruthy();
    expect(route).toMatchObject({
      routeKind: "ledger_decision",
      noDirectExecutePath: true,
      finalExecutionInRouter: false,
      dbWritesInRouter: false,
      providerCallsInRouter: false,
    });
    expect(route?.ledgerRoute.approveEndpoint).toBe("POST /agent/action/:actionId/approve");
    expect(route?.ledgerRoute.rejectEndpoint).toBe("POST /agent/action/:actionId/reject");
    expect(route?.executionPolicy.requiresApprovedStatus).toBe(true);
    expect(route?.executionPolicy.directExecuteAllowed).toBe(false);
  });

  it("reports no AI self-approval in the finance approval matrix", () => {
    const matrix = buildAiFinanceApprovalMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix.final_status).toBe(AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS);
    expect(matrix.approval_context_hydrated).toBe(true);
    expect(matrix.approval_required_routes_to_ledger).toBe(true);
    expect(matrix.ai_auto_approval).toBe(false);
    expect(matrix.direct_payment_paths_found).toBe(0);
  });
});
