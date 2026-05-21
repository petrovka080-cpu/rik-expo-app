import { createAiApprovalAuditTrailForRequest, createAiApprovalLedgerEntry } from "../../../src/lib/ai/approvalExecutionBoundary";
import { createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("ai approval ledger", () => {
  it("writes immutable append-only entries", () => {
    const scenario = createPurchaseApprovalScenario();
    const trail = createAiApprovalAuditTrailForRequest({ request: scenario.request });
    const entry = createAiApprovalLedgerEntry({
      request: scenario.request,
      event: "approval_viewed",
      previousLedgerEntry: trail[0],
    });

    expect(trail[0].immutable).toBe(true);
    expect(Object.isFrozen(entry)).toBe(true);
    expect(entry.previousLedgerEntryId).toBe(trail[0].id);
  });
});
