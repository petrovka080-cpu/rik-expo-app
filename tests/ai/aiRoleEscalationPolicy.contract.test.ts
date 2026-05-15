import {
  canExecuteApprovedAiActionThroughLedger,
  scanAiApprovedExecutionEscalation,
  scanAiRolePermissionEscalation,
} from "../../src/features/ai/security/aiRoleEscalationPolicy";

describe("AI role escalation policy", () => {
  it("finds no role escalation in the audited permission matrix", () => {
    expect(scanAiRolePermissionEscalation()).toEqual([]);
    expect(scanAiApprovedExecutionEscalation()).toEqual([]);
  });

  it("allows approved execution only for director/control through the ledger gate", () => {
    expect(
      canExecuteApprovedAiActionThroughLedger({
        actionId: "buyer.main.approval",
        role: "buyer",
        ledgerStatus: "approved",
        viaApprovalGate: true,
      }),
    ).toMatchObject({
      status: "denied",
      canExecuteApproved: false,
      directExecuteAllowed: false,
    });
    expect(
      canExecuteApprovedAiActionThroughLedger({
        actionId: "buyer.main.approval",
        role: "director",
        ledgerStatus: "pending",
        viaApprovalGate: true,
      }),
    ).toMatchObject({
      status: "denied",
      canExecuteApproved: false,
      requiresApprovedLedgerStatus: true,
    });
    expect(
      canExecuteApprovedAiActionThroughLedger({
        actionId: "buyer.main.approval",
        role: "director",
        ledgerStatus: "approved",
        viaApprovalGate: false,
      }),
    ).toMatchObject({
      status: "denied",
      canExecuteApproved: false,
      directExecuteAllowed: false,
    });
    expect(
      canExecuteApprovedAiActionThroughLedger({
        actionId: "buyer.main.approval",
        role: "director",
        ledgerStatus: "approved",
        viaApprovalGate: true,
      }),
    ).toMatchObject({
      status: "allowed_after_approved_ledger_status",
      canExecuteApproved: true,
      directExecuteAllowed: false,
      requiresApprovedLedgerStatus: true,
    });
  });
});
