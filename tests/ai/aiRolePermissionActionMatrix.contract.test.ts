import {
  findAiRolePermissionBoundaryCompletenessIssues,
  getAiRolePermissionActionMatrixEntry,
  listAiRolePermissionActionMatrixEntries,
} from "../../src/features/ai/security/aiRolePermissionActionMatrix";
import { isAiBffAuthorizationContractSafe } from "../../src/features/ai/security/aiBffAuthorizationContract";

describe("AI role permission action matrix", () => {
  it("maps every audited AI action to role scope, evidence, mutation risk, and BFF authorization", () => {
    const entries = listAiRolePermissionActionMatrixEntries();
    const completeness = findAiRolePermissionBoundaryCompletenessIssues(entries);

    expect(entries).toHaveLength(112);
    expect(entries.filter((entry) => entry.actionKind === "safe_read")).toHaveLength(28);
    expect(entries.filter((entry) => entry.actionKind === "draft_only")).toHaveLength(28);
    expect(entries.filter((entry) => entry.actionKind === "approval_required")).toHaveLength(28);
    expect(entries.filter((entry) => entry.actionKind === "forbidden")).toHaveLength(28);
    expect(completeness).toMatchObject({
      roleScopeMissingActions: [],
      mutationRiskMissingActions: [],
      evidenceMissingActions: [],
      approvalRouteMissingActions: [],
      forbiddenPolicyMissingActions: [],
      bffAuthorizationUnsafeActions: [],
      bffCoverageMissingActions: [],
    });
    expect(entries.every((entry) => isAiBffAuthorizationContractSafe(entry.bffAuthorization))).toBe(true);
  });

  it("preserves least privilege for domain-scoped role decisions", () => {
    const buyerRead = getAiRolePermissionActionMatrixEntry("buyer.main.safe_read");
    const warehouseRead = getAiRolePermissionActionMatrixEntry("warehouse.main.safe_read");
    const commandCenterDraft = getAiRolePermissionActionMatrixEntry("ai.command_center.draft");

    expect(buyerRead).toMatchObject({
      domain: "procurement",
      requiredCapability: "read_context",
      availableRoles: expect.arrayContaining(["director", "control", "buyer"]),
    });
    expect(buyerRead?.availableRoles).not.toContain("warehouse");
    expect(warehouseRead?.availableRoles).toEqual(expect.arrayContaining(["director", "control", "warehouse"]));
    expect(warehouseRead?.availableRoles).not.toContain("buyer");
    expect(commandCenterDraft?.roleDecisions.find((decision) => decision.role === "buyer")).toMatchObject({
      status: "denied_by_capability_policy",
      canDraft: false,
    });
  });

  it("denies forbidden actions for every role while retaining the audit reason", () => {
    const forbidden = getAiRolePermissionActionMatrixEntry("security.screen.forbidden");

    expect(forbidden).toMatchObject({
      actionKind: "forbidden",
      mutationRisk: "forbidden_direct_mutation",
      forbiddenBoundary: {
        forbidden: true,
        forbiddenForAllRoles: true,
        directExecutionAllowed: false,
      },
      availableRoles: [],
    });
    expect(forbidden?.forbiddenBoundary.reason).toContain("Auth/security factor changes");
    expect(forbidden?.roleDecisions.every((decision) => decision.canExecuteApproved === false)).toBe(true);
  });
});
