import type { AiToolName } from "../tools/aiToolTypes";
import type { AiUserRole } from "../policy/aiRolePolicy";

export type AiAppActionDomain =
  | "control"
  | "procurement"
  | "marketplace"
  | "warehouse"
  | "finance"
  | "reports"
  | "documents"
  | "subcontracts"
  | "contractors"
  | "real_estate"
  | "chat"
  | "office";

export type AiAppActionIntent =
  | "read"
  | "search"
  | "compare"
  | "explain"
  | "draft"
  | "submit_for_approval"
  | "approve"
  | "execute_approved"
  | "navigate";

export type AiAppActionRiskLevel =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiAppBusinessEntity =
  | "project"
  | "request"
  | "supplier"
  | "material"
  | "warehouse_item"
  | "stock_movement"
  | "payment"
  | "company_debt"
  | "accounting_posting"
  | "report"
  | "pdf_document"
  | "act"
  | "subcontract"
  | "contractor"
  | "chat_thread"
  | "real_estate_object"
  | "land_plot"
  | "commercial_space"
  | "map_object"
  | "office_member";

export type AiScreenActionEntry = {
  screenId: string;
  domain: AiAppActionDomain;
  allowedRoles: readonly AiUserRole[];
  businessEntities: readonly AiAppBusinessEntity[];
  allowedIntents: readonly AiAppActionIntent[];
  blockedIntents: readonly AiAppActionIntent[];
  approvalBoundary: "none" | "draft_only" | "approval_required";
  evidenceRequired: boolean;
  source: "app_action_graph_registry_v1";
};

export type AiButtonActionEntry = {
  screenId: string;
  buttonId: string;
  testId: string;
  label: string;
  domain: AiAppActionDomain;
  intent: AiAppActionIntent;
  riskLevel: AiAppActionRiskLevel;
  allowedRoles: readonly AiUserRole[];
  requiredTool?: AiToolName;
  approvalRequired: boolean;
  evidenceRequired: boolean;
  sourceEntities: readonly AiAppBusinessEntity[];
};

export type AiActionGraphBlockedReason =
  | "unknown_role"
  | "unknown_screen"
  | "unknown_button"
  | "screen_role_denied"
  | "button_role_denied"
  | "button_screen_mismatch"
  | "forbidden_action"
  | "missing_evidence";

export type AiActionGraphResolveInput = {
  role: AiUserRole;
  screenId: string;
  buttonId?: string;
  evidenceRefs?: readonly string[];
};

export type AiActionGraphResolveResult = {
  status: "allowed" | "blocked";
  role: AiUserRole;
  screenId: string;
  buttonId: string | null;
  screen: AiScreenActionEntry | null;
  button: AiButtonActionEntry | null;
  domain: AiAppActionDomain | "unknown";
  intent: AiAppActionIntent | null;
  riskLevel: AiAppActionRiskLevel;
  evidenceRefs: readonly string[];
  approvalRequired: boolean;
  directExecutionAllowed: false;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
  rawRowsExposed: false;
  rawPromptStored: false;
  reason: string;
  blockedReason: AiActionGraphBlockedReason | null;
};

export type AiAppGraphScreenDto = {
  screen: AiScreenActionEntry;
  buttons: readonly AiButtonActionEntry[];
  evidenceRefs: readonly string[];
  mutationCount: 0;
  readOnly: true;
};

export type AiAppGraphActionDto = {
  action: AiButtonActionEntry;
  evidenceRefs: readonly string[];
  mutationCount: 0;
  readOnly: true;
};

export const AI_APP_ACTION_GRAPH_CONTRACT = Object.freeze({
  contractId: "ai_app_action_graph_v1",
  source: "app_action_graph_registry_v1",
  roleScoped: true,
  evidenceRequired: true,
  mutationCount: 0,
  directExecutionAllowed: false,
  providerCalled: false,
  dbAccessedDirectly: false,
  externalLiveFetchEnabled: false,
} as const);
