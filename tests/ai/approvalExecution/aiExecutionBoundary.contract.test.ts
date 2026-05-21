import { executeAiApprovalBoundary } from "../../../src/lib/ai/approvalExecutionBoundary";
import { createPurchaseApprovalScenario, executePurchaseWithResolvedPreconditions } from "./approvalExecutionTestFixtures";

describe("ai execution boundary", () => {
  it("blocks execution without approval and without ledger", () => {
    const scenario = createPurchaseApprovalScenario();
    expect(scenario.blockedWithoutApproval.status).toBe("blocked");

    const withoutLedger = executeAiApprovalBoundary({
      request: scenario.request,
      decision: scenario.decision,
      ledger: [],
      idempotency: scenario.idempotency,
    });
    expect(withoutLedger.result.status).toBe("blocked");
  });

  it("executes only through approved business service", () => {
    const { result } = executePurchaseWithResolvedPreconditions();
    expect(result.status).toBe("executed");
    expect(result.executedByService).toBe("procurement_service");
    expect(result.safety.usedApprovedBusinessService).toBe(true);
    expect(result.safety.directDbMutation).toBe(false);
  });
});
