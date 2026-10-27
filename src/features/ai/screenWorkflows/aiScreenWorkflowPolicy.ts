import type { AiScreenWorkflowPack, AiScreenWorkflowValidationIssue } from "./aiScreenWorkflowTypes";
import { containsForbiddenAiScreenWorkflowUserCopy } from "./aiScreenWorkflowUserCopy";

export type AiScreenWorkflowPolicyResult = {
  ok: boolean;
  issues: AiScreenWorkflowValidationIssue[];
};

export function validateAiScreenWorkflowPack(pack: AiScreenWorkflowPack): AiScreenWorkflowPolicyResult {
  const issues: AiScreenWorkflowValidationIssue[] = [];
  if (pack.readyBlocks.length === 0 || pack.readyOptions.length === 0 || pack.actions.length === 0) {
    issues.push({ screenId: pack.screenId, code: "missing_pack_work", exactReason: "Workflow pack must include prepared work, options and actions." });
  }
  if (pack.qaExamples.length < 5) {
    issues.push({ screenId: pack.screenId, code: "qa_coverage_missing", exactReason: "Workflow pack must include at least five QA examples." });
  }
  if (pack.safety.fakeDataUsed) issues.push({ screenId: pack.screenId, code: "fake_data_used", exactReason: "Workflow pack marked fake data usage." });
  if (pack.safety.directDangerousMutationAllowed || pack.safety.approvalBypassAllowed) {
    issues.push({ screenId: pack.screenId, code: "direct_execution_allowed", exactReason: "Dangerous mutation or approval bypass is allowed." });
  }
  for (const action of pack.actions) {
    if (!action.label.trim()) issues.push({ screenId: pack.screenId, actionId: action.id, code: "missing_button_label", exactReason: "Action label is empty." });
    if (!action.actionKind) issues.push({ screenId: pack.screenId, actionId: action.id, code: "missing_action_kind", exactReason: "Action kind is empty." });
    if (action.canExecuteDirectly !== false) issues.push({ screenId: pack.screenId, actionId: action.id, code: "direct_execution_allowed", exactReason: "Action can execute directly." });
    if (action.actionKind !== "forbidden" && !action.routeOrHandler && !action.exactBlocker) {
      issues.push({ screenId: pack.screenId, actionId: action.id, code: "missing_route_or_blocker", exactReason: "Action needs a safe route or exact blocker." });
    }
    if (action.actionKind === "approval_required" && !action.approvalRoute) {
      issues.push({ screenId: pack.screenId, actionId: action.id, code: "approval_route_missing", exactReason: "Approval action is not ledger-routed." });
    }
    if (action.actionKind === "forbidden" && !action.forbiddenReason) {
      issues.push({ screenId: pack.screenId, actionId: action.id, code: "forbidden_reason_missing", exactReason: "Forbidden action lacks a user-facing reason." });
    }
  }
  if (containsForbiddenAiScreenWorkflowUserCopy(JSON.stringify(pack))) {
    issues.push({ screenId: pack.screenId, code: "debug_copy_exposed", exactReason: "Workflow pack contains debug/provider/runtime copy." });
  }
  return { ok: issues.length === 0, issues };
}

export function enforceAiScreenWorkflowPolicy(pack: AiScreenWorkflowPack): AiScreenWorkflowPack {
  return {
    ...pack,
    actions: pack.actions.map((action) => ({
      ...action,
      canExecuteDirectly: false,
    })),
    safety: {
      fakeDataUsed: false,
      directDangerousMutationAllowed: false,
      providerRequired: false,
      dbWriteUsed: false,
      approvalBypassAllowed: false,
    },
  };
}

export function validateAiScreenWorkflowPacks(packs: readonly AiScreenWorkflowPack[]): AiScreenWorkflowPolicyResult {
  const issues = packs.flatMap((pack) => validateAiScreenWorkflowPack(pack).issues);
  return { ok: issues.length === 0, issues };
}
