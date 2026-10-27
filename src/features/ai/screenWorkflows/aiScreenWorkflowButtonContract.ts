import { getAiApprovalActionRoute } from "../approvalRouter/aiApprovalActionRouter";
import {
  listAiScreenButtonRoleActionEntriesForScreen,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import {
  listAiScreenWorkflowPacks,
} from "./aiScreenWorkflowEngine";
import { resolveAiScreenWorkflowButton } from "./aiScreenWorkflowButtonResolver";
import type { AiScreenWorkflowPack, AiScreenWorkflowValidationIssue } from "./aiScreenWorkflowTypes";

export type AiScreenWorkflowButtonContractSummary = {
  ok: boolean;
  screensChecked: number;
  buttonsChecked: number;
  safeReadButtons: number;
  draftOnlyButtons: number;
  approvalRequiredButtons: number;
  forbiddenButtons: number;
  clickableOrExactBlocked: boolean;
  approvalRequiredActionsRouteToLedger: boolean;
  forbiddenActionsHaveUserReason: boolean;
  directDangerousMutationPathsFound: number;
  issues: AiScreenWorkflowValidationIssue[];
};

function actionExistsInAudit(pack: AiScreenWorkflowPack, actionId: string): boolean {
  return listAiScreenButtonRoleActionEntriesForScreen(pack.screenId)
    .some((entry) => entry.actionId === actionId);
}

export function verifyAiScreenWorkflowButtonContract(
  packs: readonly AiScreenWorkflowPack[] = listAiScreenWorkflowPacks(),
): AiScreenWorkflowButtonContractSummary {
  const issues: AiScreenWorkflowValidationIssue[] = [];
  let buttonsChecked = 0;
  let safeReadButtons = 0;
  let draftOnlyButtons = 0;
  let approvalRequiredButtons = 0;
  let forbiddenButtons = 0;

  for (const pack of packs) {
    for (const action of pack.actions) {
      buttonsChecked += 1;
      if (!actionExistsInAudit(pack, action.id)) {
        issues.push({ screenId: pack.screenId, actionId: action.id, code: "missing_action", exactReason: "Action does not exist in audited registry." });
      }
      if (!action.label.trim()) issues.push({ screenId: pack.screenId, actionId: action.id, code: "missing_button_label", exactReason: "Button label is empty." });
      if (!action.actionKind) issues.push({ screenId: pack.screenId, actionId: action.id, code: "missing_action_kind", exactReason: "Action kind is missing." });
      if (action.canExecuteDirectly !== false) {
        issues.push({ screenId: pack.screenId, actionId: action.id, code: "direct_execution_allowed", exactReason: "Action can execute directly." });
      }
      if (action.actionKind === "safe_read") safeReadButtons += 1;
      if (action.actionKind === "draft_only") draftOnlyButtons += 1;
      if (action.actionKind === "approval_required") {
        approvalRequiredButtons += 1;
        const route = getAiApprovalActionRoute(action.id);
        if (!route || !action.approvalRoute || route.ledgerRoute.directExecuteAllowed) {
          issues.push({ screenId: pack.screenId, actionId: action.id, code: "approval_route_missing", exactReason: "Approval-required action is not ledger-routed." });
        }
      }
      if (action.actionKind === "forbidden") {
        forbiddenButtons += 1;
        if (!action.forbiddenReason) {
          issues.push({ screenId: pack.screenId, actionId: action.id, code: "forbidden_reason_missing", exactReason: "Forbidden action has no user-facing reason." });
        }
      }
      const resolution = resolveAiScreenWorkflowButton(action);
      if (
        !["clickable_safe_read", "clickable_draft_only", "routes_to_approval_ledger", "forbidden_with_reason", "exact_blocker"].includes(resolution.status)
      ) {
        issues.push({ screenId: pack.screenId, actionId: action.id, code: "missing_route_or_blocker", exactReason: "Button is neither clickable nor exact-blocked." });
      }
    }
  }

  const approvalRequiredActionsRouteToLedger = issues.every((issue) => issue.code !== "approval_route_missing");
  const forbiddenActionsHaveUserReason = issues.every((issue) => issue.code !== "forbidden_reason_missing");
  const directDangerousMutationPathsFound = issues.filter((issue) => issue.code === "direct_execution_allowed").length;

  return {
    ok: issues.length === 0,
    screensChecked: packs.length,
    buttonsChecked,
    safeReadButtons,
    draftOnlyButtons,
    approvalRequiredButtons,
    forbiddenButtons,
    clickableOrExactBlocked: issues.every((issue) => issue.code !== "missing_route_or_blocker"),
    approvalRequiredActionsRouteToLedger,
    forbiddenActionsHaveUserReason,
    directDangerousMutationPathsFound,
    issues,
  };
}
