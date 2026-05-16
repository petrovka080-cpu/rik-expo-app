import { getAiApprovalActionRoute } from "../approvalRouter/aiApprovalActionRouter";
import {
  listAiScreenButtonRoleActionEntriesForScreen,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type { AiScreenButtonActionKind } from "../screenAudit/aiScreenButtonRoleActionTypes";
import {
  listAiRoleMagicButtonCoveragePlans,
  type AiRoleMagicButtonActionPlan,
} from "./aiRoleMagicButtonCoveragePlanner";
import type { AiRoleMagicValidationIssue } from "./aiRoleMagicBlueprintTypes";

const ACTION_BUCKETS: readonly {
  key: "safeReadActions" | "draftOnlyActions" | "approvalRequiredActions" | "forbiddenActions";
  kind: AiScreenButtonActionKind;
}[] = [
  { key: "safeReadActions", kind: "safe_read" },
  { key: "draftOnlyActions", kind: "draft_only" },
  { key: "approvalRequiredActions", kind: "approval_required" },
  { key: "forbiddenActions", kind: "forbidden" },
];

function hasRouteOrBlocker(action: AiRoleMagicButtonActionPlan): boolean {
  return action.mountedRoutes.length > 0 ||
    action.documentedMissingRoutes.length > 0 ||
    action.forbiddenRouteSentinels.length > 0 ||
    action.routeDisposition === "forbidden_no_route_allowed";
}

export function validateAiRoleMagicScreenActionBuckets(params: {
  roleId: AiRoleMagicValidationIssue["roleId"];
  screenId: string;
  safeReadActions: readonly string[];
  draftOnlyActions: readonly string[];
  approvalRequiredActions: readonly string[];
  forbiddenActions: readonly string[];
}): AiRoleMagicValidationIssue[] {
  const issues: AiRoleMagicValidationIssue[] = [];
  const auditedById = new Map(
    listAiScreenButtonRoleActionEntriesForScreen(params.screenId).map((entry) => [entry.actionId, entry]),
  );

  for (const bucket of ACTION_BUCKETS) {
    for (const actionId of params[bucket.key]) {
      const entry = auditedById.get(actionId);
      if (!entry) {
        issues.push({
          roleId: params.roleId,
          screenId: params.screenId,
          code: "unknown_audited_action",
          exactReason: `${params.screenId}:${actionId} is not present in the audited button/action registry.`,
        });
      } else if (entry.actionKind !== bucket.kind) {
        issues.push({
          roleId: params.roleId,
          screenId: params.screenId,
          code: "unsafe_direct_mutation",
          exactReason: `${actionId} is listed as ${bucket.kind}, but audit registry marks ${entry.actionKind}.`,
        });
      }
    }
  }

  return issues;
}

export function validateAiRoleMagicButtonClickContract(
  plans = listAiRoleMagicButtonCoveragePlans(),
): { ok: boolean; issues: AiRoleMagicValidationIssue[]; actionsChecked: number; approvalActionsChecked: number } {
  const issues: AiRoleMagicValidationIssue[] = [];
  let actionsChecked = 0;
  let approvalActionsChecked = 0;

  for (const plan of plans) {
    for (const missing of plan.missingActionIds) {
      issues.push({
        roleId: plan.roleId,
        code: "unknown_audited_action",
        exactReason: missing,
      });
    }

    for (const action of plan.actions) {
      actionsChecked += 1;
      if (!action.label.trim()) {
        issues.push({
          roleId: plan.roleId,
          screenId: action.screenId,
          code: "unknown_audited_action",
          exactReason: `${action.actionId} has no user-facing label.`,
        });
      }
      if (!hasRouteOrBlocker(action)) {
        issues.push({
          roleId: plan.roleId,
          screenId: action.screenId,
          code: "unknown_audited_action",
          exactReason: `${action.actionId} has neither a mounted route nor a documented blocker.`,
        });
      }
      if (action.actionKind === "approval_required") {
        approvalActionsChecked += 1;
        const route = getAiApprovalActionRoute(action.actionId);
        if (!route || !route.ledgerRoute.ledgerBacked || route.ledgerRoute.directExecuteAllowed) {
          issues.push({
            roleId: plan.roleId,
            screenId: action.screenId,
            code: "approval_route_missing",
            exactReason: `${action.actionId} is approval-required but is not ledger-backed.`,
          });
        }
      }
      if (action.actionKind === "forbidden" && !action.userFacingBlockedReason) {
        issues.push({
          roleId: plan.roleId,
          screenId: action.screenId,
          code: "forbidden_reason_missing",
          exactReason: `${action.actionId} is forbidden without a user-facing reason.`,
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    actionsChecked,
    approvalActionsChecked,
  };
}
