import {
  assertAiActionLedgerApprovePolicy,
  canTransitionAiActionStatus,
} from "../../src/features/ai/actionLedger/aiActionLedgerPolicy";

describe("AI action ledger lifecycle contract", () => {
  it("allows only the production status lifecycle", () => {
    expect(canTransitionAiActionStatus("draft", "pending")).toBe(true);
    expect(canTransitionAiActionStatus("pending", "approved")).toBe(true);
    expect(canTransitionAiActionStatus("pending", "rejected")).toBe(true);
    expect(canTransitionAiActionStatus("approved", "executed")).toBe(true);
    expect(canTransitionAiActionStatus("pending", "executed")).toBe(false);
    expect(canTransitionAiActionStatus("rejected", "executed")).toBe(false);
    expect(canTransitionAiActionStatus("expired", "executed")).toBe(false);
    expect(canTransitionAiActionStatus("blocked", "executed")).toBe(false);
  });

  it("forbids non-control approval and forbidden transitions", () => {
    expect(
      assertAiActionLedgerApprovePolicy({
        status: "pending",
        actionType: "submit_request",
        approverRole: "buyer",
        domain: "procurement",
      }),
    ).toMatchObject({ allowed: false });
    expect(
      assertAiActionLedgerApprovePolicy({
        status: "rejected",
        actionType: "submit_request",
        approverRole: "director",
        domain: "procurement",
      }),
    ).toMatchObject({ allowed: false });
  });
});
