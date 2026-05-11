import {
  AI_FORBIDDEN_ACTIONS,
  getAiRiskLevel,
  type AiActionType,
  type AiRiskLevel,
} from "../policy/aiRiskPolicy";

export const AI_ACTION_TYPES: readonly AiActionType[] = [
  "search_catalog",
  "compare_suppliers",
  "summarize_project",
  "summarize_finance",
  "summarize_warehouse",
  "explain_status",
  "draft_request",
  "draft_report",
  "draft_act",
  "draft_supplier_message",
  "submit_request",
  "confirm_supplier",
  "create_order",
  "change_warehouse_status",
  "send_document",
  "change_payment_status",
  "generate_final_pdf_if_it_changes_status",
  "delete_data",
  "delete_data_by_ai",
  "direct_supabase_query",
  "raw_db_export",
  "expose_secrets",
  "expose_raw_tokens",
  "bypass_approval",
];

export const AI_RISK_LEVELS: readonly AiRiskLevel[] = [
  "safe_read",
  "draft_only",
  "approval_required",
  "forbidden",
];

export { AI_FORBIDDEN_ACTIONS };

const aiActionTypeValues: readonly string[] = AI_ACTION_TYPES;

export function isAiActionType(value: string): value is AiActionType {
  return aiActionTypeValues.includes(value);
}

export function isForbiddenAiAction(value: AiActionType): boolean {
  return getAiRiskLevel(value) === "forbidden";
}
