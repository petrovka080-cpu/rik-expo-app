import type {
  AgentBffAuthContext,
  AgentTaskStreamCard,
  AgentTaskStreamDto,
  AgentTaskStreamPriority,
} from "../agent/agentBffRouteShell";
import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiCommandCenterAction =
  | "ask_why"
  | "open_source"
  | "preview_tool"
  | "create_draft"
  | "submit_for_approval";

export type AiCommandCenterSectionId =
  | "urgent"
  | "money"
  | "procurement"
  | "warehouse"
  | "documents"
  | "contractors"
  | "reports";

export type AiCommandCenterCard = {
  id: string;
  role: AiUserRole;
  domain: AiDomain;
  title: string;
  summary: string;
  priority: "critical" | "high" | "normal" | "low";
  evidenceRefs: string[];
  allowedActions: AiCommandCenterAction[];
  requiresApproval: boolean;
  sourceScreenId?: string;
  sourceEntityType?: string;
  sourceEntityIdHash?: string;
};

export type AiCommandCenterActionBoundary =
  | "local_explain"
  | "source_navigation"
  | "safe_tool_preview"
  | "draft_only"
  | "approval_gate";

export type AiCommandCenterActionView = {
  action: AiCommandCenterAction;
  label: string;
  testID: string;
  enabled: boolean;
  boundary: AiCommandCenterActionBoundary;
  toolName: AiToolName | null;
  disabledReason: string | null;
  mutationCount: 0;
  executed: false;
  finalMutation: false;
};

export type AiCommandCenterCardView = AiCommandCenterCard & {
  taskStreamCardId: string;
  taskStreamType: AgentTaskStreamCard["type"];
  sectionId: AiCommandCenterSectionId;
  priorityLabel: string;
  domainLabel: string;
  evidenceLabel: string;
  insufficientEvidence: boolean;
  recommendedToolName: AiToolName | null;
  actionViews: readonly AiCommandCenterActionView[];
};

export type AiCommandCenterSectionView = {
  id: AiCommandCenterSectionId;
  title: string;
  cards: readonly AiCommandCenterCardView[];
};

export type AiCommandCenterViewModel = {
  contractId: "ai_command_center_view_model_v1";
  documentType: "ai_command_center";
  endpoint: "GET /agent/task-stream";
  role: AiUserRole;
  roleScoped: true;
  readOnly: true;
  evidenceRequired: true;
  mutationCount: 0;
  directMutationAllowed: false;
  directSupabaseFromUi: false;
  modelProviderFromUi: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
  providerPayloadStored: false;
  denied: boolean;
  empty: boolean;
  status: "ready" | "denied" | "error";
  errorMessage: string | null;
  cards: readonly AiCommandCenterCardView[];
  sections: readonly AiCommandCenterSectionView[];
  source: AgentTaskStreamDto["source"] | "bff:agent_task_stream_unavailable";
};

export type BuildAiCommandCenterViewModelInput = {
  auth: AgentBffAuthContext | null;
  sourceCards?: readonly AgentTaskStreamCard[];
  page?: {
    limit?: number;
    cursor?: string | null;
  };
};

export type AiCommandCenterDataState = {
  loading: boolean;
  viewModel: AiCommandCenterViewModel;
  auth: AgentBffAuthContext | null;
};

export type AiCommandCenterRuntimeStatus =
  | "GREEN_AI_DAILY_COMMAND_CENTER_READY"
  | "BLOCKED_COMMAND_CENTER_ROUTE_NOT_REGISTERED"
  | "BLOCKED_TASK_STREAM_RUNTIME_NOT_EXPOSED"
  | "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS"
  | "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY"
  | "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY";

export const AI_COMMAND_CENTER_ACTION_TEST_IDS: Record<AiCommandCenterAction, string> = {
  ask_why: "ai.command.center.action.ask-why",
  open_source: "ai.command.center.action.open-source",
  preview_tool: "ai.command.center.action.preview-tool",
  create_draft: "ai.command.center.action.create-draft",
  submit_for_approval: "ai.command.center.action.submit-for-approval",
};

export const AI_COMMAND_CENTER_SUPPORTED_TOOL_NAMES: readonly AiToolName[] = [
  "search_catalog",
  "compare_suppliers",
  "get_warehouse_status",
  "draft_request",
  "draft_report",
  "draft_act",
  "submit_for_approval",
  "get_action_status",
];

export const AI_COMMAND_CENTER_FORBIDDEN_DIRECT_ACTIONS = [
  "submit_request",
  "confirm_supplier",
  "create_order",
  "change_warehouse_status",
  "send_document",
  "change_payment_status",
  "direct_supabase_query",
  "raw_db_export",
  "delete_data_by_ai",
  "bypass_approval",
] as const;

export type AiCommandCenterPriority = AgentTaskStreamPriority;
