import { getAiApprovalActionRoute } from "../approvalRouter/aiApprovalActionRouter";
import { getAiBffRouteCoverageEntry } from "../bffCoverage/aiBffRouteCoverageRegistry";
import {
  listAiScreenButtonRoleActionEntriesForScreen,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type { AiScreenButtonActionEntry } from "../screenAudit/aiScreenButtonRoleActionTypes";
import type { AiScreenWorkflowAction } from "./aiScreenWorkflowTypes";

function blockerForEntry(entry: AiScreenButtonActionEntry): string | undefined {
  const bff = getAiBffRouteCoverageEntry(entry.actionId);
  const missing = bff?.documentedMissingBffRoutes[0]
    ?? entry.missingBffRoutes.find((route) => !route.startsWith("NO_ROUTE_ALLOWED:"));
  const forbidden = bff?.forbiddenRouteSentinels[0]
    ?? entry.missingBffRoutes.find((route) => route.startsWith("NO_ROUTE_ALLOWED:"));
  if (entry.actionKind === "forbidden") return forbidden ?? `NO_ROUTE_ALLOWED:${entry.screenId}:${entry.actionId}`;
  if (missing) return `BLOCKED_AI_SCREEN_WORKFLOW_REAL_DATA_ROUTE_MISSING:${missing}`;
  return undefined;
}

function routeForEntry(entry: AiScreenButtonActionEntry): string | undefined {
  const bff = getAiBffRouteCoverageEntry(entry.actionId);
  return bff?.mountedBffRoutes[0] ?? entry.existingBffRoutes[0];
}

export function buildAiScreenWorkflowAction(entry: AiScreenButtonActionEntry): AiScreenWorkflowAction {
  const approvalRoute = entry.actionKind === "approval_required"
    ? getAiApprovalActionRoute(entry.actionId)
    : null;
  const exactBlocker = blockerForEntry(entry);
  const routeOrHandler = entry.actionKind === "forbidden"
    ? undefined
    : approvalRoute?.ledgerRoute.submitEndpoint ?? routeForEntry(entry);

  return {
    id: entry.actionId,
    label: entry.label,
    actionKind: entry.actionKind === "unknown_needs_audit" ? "forbidden" : entry.actionKind,
    routeOrHandler,
    approvalRoute: approvalRoute?.ledgerRoute.submitEndpoint,
    forbiddenReason: entry.actionKind === "forbidden" ? entry.forbiddenReason : undefined,
    exactBlocker,
    canExecuteDirectly: false,
  };
}

export function listAiScreenWorkflowActionsForScreen(screenId: string): AiScreenWorkflowAction[] {
  return listAiScreenButtonRoleActionEntriesForScreen(screenId)
    .filter((entry) => entry.actionKind !== "unknown_needs_audit")
    .map(buildAiScreenWorkflowAction);
}

export type AiScreenWorkflowButtonResolution = {
  action: AiScreenWorkflowAction;
  status: "clickable_safe_read" | "clickable_draft_only" | "routes_to_approval_ledger" | "forbidden_with_reason" | "exact_blocker";
  userFacingReason: string;
  canExecuteDirectly: false;
};

export function resolveAiScreenWorkflowButton(action: AiScreenWorkflowAction): AiScreenWorkflowButtonResolution {
  if (action.actionKind === "forbidden") {
    return {
      action,
      status: "forbidden_with_reason",
      userFacingReason: action.forbiddenReason ?? action.exactBlocker ?? "This action is forbidden for AI direct execution.",
      canExecuteDirectly: false,
    };
  }
  if (action.actionKind === "approval_required") {
    if (action.approvalRoute) {
      return {
        action,
        status: "routes_to_approval_ledger",
        userFacingReason: "This action opens the approval ledger path and does not execute directly.",
        canExecuteDirectly: false,
      };
    }
    return {
      action,
      status: "exact_blocker",
      userFacingReason: action.exactBlocker ?? "Approval route is missing.",
      canExecuteDirectly: false,
    };
  }
  if (action.routeOrHandler) {
    return {
      action,
      status: action.actionKind === "safe_read" ? "clickable_safe_read" : "clickable_draft_only",
      userFacingReason: action.actionKind === "safe_read"
        ? "Safe read action opens or explains hydrated screen data."
        : "Draft-only action prepares a client-safe draft and does not write business state.",
      canExecuteDirectly: false,
    };
  }
  return {
    action,
    status: "exact_blocker",
    userFacingReason: action.exactBlocker ?? "No safe route is mounted yet.",
    canExecuteDirectly: false,
  };
}
