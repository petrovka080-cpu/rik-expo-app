import { planAiToolUse } from "../tools/aiToolPlanPolicy";
import { AI_TOOL_NAMES, getAiToolDefinition } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import type {
  AiWorkdayTaskBlockCode,
  AiWorkdayTaskClassification,
  AiWorkdayTaskEvidenceRef,
  AiWorkdayTaskRiskLevel,
  AiWorkdayTaskSafeMode,
} from "./aiWorkdayTaskTypes";
import type { AiUserRole } from "../policy/aiRolePolicy";

export const AI_WORKDAY_ALLOWED_TOOL_NAMES: readonly AiToolName[] = [
  "search_catalog",
  "compare_suppliers",
  "get_warehouse_status",
  "get_finance_summary",
  "draft_request",
  "draft_report",
  "draft_act",
  "submit_for_approval",
  "get_action_status",
];

export type AiWorkdayTaskPolicyInput = {
  role: AiUserRole;
  toolName: string | undefined;
  riskLevel: AiWorkdayTaskRiskLevel;
  evidenceRefs: readonly AiWorkdayTaskEvidenceRef[];
  approvalRequired: boolean;
};

export type AiWorkdayTaskPolicyDecision = {
  allowed: boolean;
  knownTool: boolean;
  suggestedToolId: AiToolName | null;
  suggestedMode: AiWorkdayTaskSafeMode;
  classification: AiWorkdayTaskClassification;
  blockCode: AiWorkdayTaskBlockCode;
  approvalRequired: boolean;
  evidenceRequired: true;
  riskPolicyPresent: true;
  reason: string;
};

export function isKnownAiWorkdayToolName(value: string | undefined): value is AiToolName {
  return Boolean(
    value &&
      AI_WORKDAY_ALLOWED_TOOL_NAMES.some((toolName) => toolName === value) &&
      AI_TOOL_NAMES.some((toolName) => toolName === value),
  );
}

function modeForKnownTool(toolName: AiToolName, role: AiUserRole): AiWorkdayTaskSafeMode {
  const plan = planAiToolUse({ toolName, role });
  if (!plan.allowed) return "forbidden";
  if (plan.mode === "read_contract_plan") return "safe_read";
  if (plan.mode === "draft_only_plan") return "draft_only";
  if (plan.mode === "approval_gate_plan") return "approval_required";
  return "forbidden";
}

function classificationForMode(mode: AiWorkdayTaskSafeMode): AiWorkdayTaskClassification {
  if (mode === "safe_read") return "SAFE_READ_RECOMMENDATION";
  if (mode === "draft_only") return "DRAFT_ONLY_RECOMMENDATION";
  if (mode === "approval_required") return "APPROVAL_REQUIRED_RECOMMENDATION";
  return "FORBIDDEN_RECOMMENDATION_BLOCKED";
}

export function evaluateAiWorkdayTaskPolicy(
  input: AiWorkdayTaskPolicyInput,
): AiWorkdayTaskPolicyDecision {
  if (input.evidenceRefs.length === 0) {
    return {
      allowed: false,
      knownTool: isKnownAiWorkdayToolName(input.toolName),
      suggestedToolId: isKnownAiWorkdayToolName(input.toolName) ? input.toolName : null,
      suggestedMode: "forbidden",
      classification: "INSUFFICIENT_EVIDENCE_BLOCKED",
      blockCode: "INSUFFICIENT_EVIDENCE",
      approvalRequired: input.approvalRequired,
      evidenceRequired: true,
      riskPolicyPresent: true,
      reason: "Workday task requires at least one redacted evidence reference.",
    };
  }

  if (!isKnownAiWorkdayToolName(input.toolName)) {
    return {
      allowed: false,
      knownTool: false,
      suggestedToolId: null,
      suggestedMode: "forbidden",
      classification: "UNKNOWN_TOOL_BLOCKED",
      blockCode: "UNKNOWN_TOOL",
      approvalRequired: input.approvalRequired,
      evidenceRequired: true,
      riskPolicyPresent: true,
      reason: "Workday task references an unknown AI tool.",
    };
  }

  const tool = getAiToolDefinition(input.toolName);
  const mode = modeForKnownTool(input.toolName, input.role);
  if (!tool || mode === "forbidden") {
    return {
      allowed: false,
      knownTool: true,
      suggestedToolId: input.toolName,
      suggestedMode: "forbidden",
      classification: "FORBIDDEN_RECOMMENDATION_BLOCKED",
      blockCode: "FORBIDDEN_TOOL_OR_ROLE",
      approvalRequired: input.approvalRequired,
      evidenceRequired: true,
      riskPolicyPresent: true,
      reason: "Workday task is blocked by tool role or risk policy.",
    };
  }

  const approvalRequired = input.approvalRequired || mode === "approval_required";
  if ((input.riskLevel === "high" || input.riskLevel === "critical") && !approvalRequired) {
    return {
      allowed: false,
      knownTool: true,
      suggestedToolId: input.toolName,
      suggestedMode: "forbidden",
      classification: "FORBIDDEN_RECOMMENDATION_BLOCKED",
      blockCode: "HIGH_RISK_WITHOUT_APPROVAL",
      approvalRequired: false,
      evidenceRequired: true,
      riskPolicyPresent: true,
      reason: "High-risk workday task must route through approval.",
    };
  }

  return {
    allowed: true,
    knownTool: true,
    suggestedToolId: input.toolName,
    suggestedMode: mode,
    classification: classificationForMode(mode),
    blockCode: "NONE",
    approvalRequired,
    evidenceRequired: true,
    riskPolicyPresent: true,
    reason: "Workday task can be shown as a role-scoped recommendation only.",
  };
}
