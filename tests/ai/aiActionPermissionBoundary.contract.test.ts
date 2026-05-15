import {
  resolveAiActionPermissionBoundary,
  verifyAiRolePermissionActionBoundary,
} from "../../src/features/ai/security/aiActionPermissionBoundary";

describe("AI action permission boundary", () => {
  it("verifies the complete audited action boundary as green", () => {
    expect(verifyAiRolePermissionActionBoundary()).toMatchObject({
      finalStatus: "GREEN_AI_ROLE_PERMISSION_ACTION_BOUNDARY_READY",
      auditedActions: 112,
      matrixActions: 112,
      safeReadActions: 28,
      draftOnlyActions: 28,
      approvalRequiredActions: 28,
      forbiddenActions: 28,
      roleScopeMissingActions: [],
      roleEscalationFindings: [],
      servicePrivilegeFindings: [],
      bffAuthorizationContracts: 112,
      noSecrets: true,
      noRawRows: true,
      noRawPrompts: true,
      noRawProviderPayloads: true,
      noDbWrites: true,
      noProviderCalls: true,
      noUiChanges: true,
      noFakeGreen: true,
    });
  });

  it("resolves read, draft, and approval decisions without granting direct execution", () => {
    expect(
      resolveAiActionPermissionBoundary({
        actionId: "buyer.main.safe_read",
        role: "buyer",
      }),
    ).toMatchObject({
      status: "allowed",
      canRead: true,
      canDraft: false,
      canSubmitForApproval: false,
      directExecuteAllowed: false,
    });
    expect(
      resolveAiActionPermissionBoundary({
        actionId: "buyer.main.draft",
        role: "buyer",
      }),
    ).toMatchObject({
      status: "allowed",
      canRead: false,
      canDraft: true,
      canSubmitForApproval: false,
      directExecuteAllowed: false,
    });
    expect(
      resolveAiActionPermissionBoundary({
        actionId: "buyer.main.approval",
        role: "buyer",
      }),
    ).toMatchObject({
      status: "allowed",
      canRead: false,
      canDraft: false,
      canSubmitForApproval: true,
      canExecuteApproved: false,
      directExecuteAllowed: false,
    });
  });

  it("denies unknown roles and roles outside the audited scope", () => {
    expect(
      resolveAiActionPermissionBoundary({
        actionId: "buyer.main.safe_read",
        role: "unknown",
      }),
    ).toMatchObject({
      status: "denied_unknown_role",
      canRead: false,
      directExecuteAllowed: false,
    });
    expect(
      resolveAiActionPermissionBoundary({
        actionId: "buyer.main.safe_read",
        role: "warehouse",
      }),
    ).toMatchObject({
      status: "denied_not_in_role_scope",
      canRead: false,
      directExecuteAllowed: false,
    });
  });
});
