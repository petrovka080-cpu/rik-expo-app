import { evaluateAiApprovalInboxRuntimeGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("Approval Inbox architecture contract", () => {
  it("keeps inbox backed by persistent ledger, review panel, and execute gate", () => {
    const result = evaluateAiApprovalInboxRuntimeGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_approval_inbox_runtime",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      inboxFilesPresent: true,
      bffRoutesPresent: true,
      persistentLedgerReadRequired: true,
      fakeLocalApprovalAbsent: true,
      roleScoped: true,
      evidenceRequired: true,
      auditRequired: true,
      idempotencyRequired: true,
      reviewPanelRequired: true,
      approveWithoutReviewAllowed: true,
      pendingCannotExecute: true,
      executeApprovedRequiresGate: true,
      noDirectMutation: true,
      noUiSupabaseImport: true,
      noUiModelProviderImport: true,
      noRawPayloadFields: true,
      e2eRunnerPresent: true,
    });
  });
});
