import {
  canUseAiCapability,
  type AiCapability,
  type AiDomain,
  type AiUserRole,
} from "./aiRolePolicy";

export type AiRiskLevel =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiActionType =
  | "search_catalog"
  | "compare_suppliers"
  | "summarize_project"
  | "summarize_finance"
  | "summarize_warehouse"
  | "explain_status"
  | "draft_request"
  | "draft_report"
  | "draft_act"
  | "draft_supplier_message"
  | "submit_request"
  | "confirm_supplier"
  | "create_order"
  | "change_warehouse_status"
  | "send_document"
  | "change_payment_status"
  | "generate_final_pdf_if_it_changes_status"
  | "delete_data"
  | "delete_data_by_ai"
  | "direct_supabase_query"
  | "raw_db_export"
  | "expose_secrets"
  | "expose_raw_tokens"
  | "bypass_approval";

export type AiPolicyDecision = {
  allowed: boolean;
  riskLevel: AiRiskLevel;
  requiresApproval: boolean;
  reason: string;
  redactionRequired: true;
  auditRequired: true;
};

export type AssertAiActionAllowedParams = {
  actionType: AiActionType;
  role: AiUserRole;
  domain: AiDomain;
  capability?: AiCapability;
};

const riskByAction: Record<AiActionType, AiRiskLevel> = {
  search_catalog: "safe_read",
  compare_suppliers: "safe_read",
  summarize_project: "safe_read",
  summarize_finance: "safe_read",
  summarize_warehouse: "safe_read",
  explain_status: "safe_read",
  draft_request: "draft_only",
  draft_report: "draft_only",
  draft_act: "draft_only",
  draft_supplier_message: "draft_only",
  submit_request: "approval_required",
  confirm_supplier: "approval_required",
  create_order: "approval_required",
  change_warehouse_status: "approval_required",
  send_document: "approval_required",
  change_payment_status: "approval_required",
  generate_final_pdf_if_it_changes_status: "approval_required",
  delete_data: "forbidden",
  delete_data_by_ai: "forbidden",
  direct_supabase_query: "forbidden",
  raw_db_export: "forbidden",
  expose_secrets: "forbidden",
  expose_raw_tokens: "forbidden",
  bypass_approval: "forbidden",
};

function decision(params: {
  allowed: boolean;
  riskLevel: AiRiskLevel;
  requiresApproval?: boolean;
  reason: string;
}): AiPolicyDecision {
  return {
    allowed: params.allowed,
    riskLevel: params.riskLevel,
    requiresApproval: params.requiresApproval ?? params.riskLevel === "approval_required",
    reason: params.reason,
    redactionRequired: true,
    auditRequired: true,
  };
}

export function getAiRiskLevel(actionType: AiActionType): AiRiskLevel {
  return riskByAction[actionType] ?? "forbidden";
}

export function requiresAiApproval(actionType: AiActionType): boolean {
  return getAiRiskLevel(actionType) === "approval_required";
}

export function assertAiActionAllowed(params: AssertAiActionAllowedParams): AiPolicyDecision {
  const riskLevel = getAiRiskLevel(params.actionType);
  if (riskLevel === "forbidden") {
    return decision({
      allowed: false,
      riskLevel,
      requiresApproval: false,
      reason: `AI action is forbidden: ${params.actionType}`,
    });
  }

  const capability: AiCapability =
    params.capability ??
    (riskLevel === "safe_read"
      ? "read_context"
      : riskLevel === "draft_only"
        ? "draft"
        : "submit_for_approval");

  if (!canUseAiCapability({
    role: params.role,
    domain: params.domain,
    capability,
    viaApprovalGate: capability === "execute_approved_action",
  })) {
    return decision({
      allowed: false,
      riskLevel,
      reason: `AI role ${params.role} cannot use ${capability} in ${params.domain}`,
    });
  }

  if (riskLevel === "approval_required") {
    return decision({
      allowed: true,
      riskLevel,
      requiresApproval: true,
      reason: "AI action can only be submitted for explicit approval",
    });
  }

  return decision({
    allowed: true,
    riskLevel,
    requiresApproval: false,
    reason: "AI action allowed within read or draft policy",
  });
}

export const AI_FORBIDDEN_ACTIONS: readonly AiActionType[] = [
  "delete_data",
  "delete_data_by_ai",
  "direct_supabase_query",
  "raw_db_export",
  "expose_secrets",
  "expose_raw_tokens",
  "bypass_approval",
];
