import {
  AI_ACTION_LEDGER_ACTION_TYPES,
  AI_ACTION_LEDGER_STATUSES,
  getAiActionLedgerRiskLevel,
} from "../../src/features/ai/actionLedger/aiActionLedgerPolicy";

describe("AI action ledger types contract", () => {
  it("defines the permanent action statuses and production action types", () => {
    expect(AI_ACTION_LEDGER_STATUSES).toEqual([
      "draft",
      "pending",
      "approved",
      "rejected",
      "executed",
      "expired",
      "blocked",
    ]);
    expect(AI_ACTION_LEDGER_ACTION_TYPES).toEqual(
      expect.arrayContaining([
        "draft_request",
        "draft_report",
        "draft_act",
        "submit_request",
        "confirm_supplier",
        "create_order",
        "change_warehouse_status",
        "send_document",
        "change_payment_status",
      ]),
    );
    expect(getAiActionLedgerRiskLevel("draft_request")).toBe("draft_only");
    expect(getAiActionLedgerRiskLevel("submit_request")).toBe("approval_required");
  });
});
