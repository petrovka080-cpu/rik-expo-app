import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiScreenActionMode =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiScreenActionRiskLevel = "low" | "medium" | "high" | "forbidden";

export type AiScreenActionIntent =
  | "read_context"
  | "find"
  | "search"
  | "compare"
  | "explain_status"
  | "check_status"
  | "draft"
  | "draft_report"
  | "draft_act"
  | "submit_for_approval"
  | "forbidden";

export type AiScreenActionEvidenceSource =
  | "screen_state"
  | "role_policy"
  | "tool_contract"
  | "approval_policy"
  | "ledger_status"
  | "document_metadata"
  | "procurement_context"
  | "warehouse_status"
  | "finance_summary"
  | "report_summary";

export type AiScreenActionDefinition = {
  actionId: string;
  label: string;
  intent: AiScreenActionIntent;
  riskLevel: AiScreenActionRiskLevel;
  aiTool?: AiToolName;
  mode: AiScreenActionMode;
  roleScope: readonly AiUserRole[];
  requiresApproval: boolean;
  evidenceRequired: true;
  evidenceSources: readonly AiScreenActionEvidenceSource[];
  forbiddenReason?: string;
  source: "ai_screen_button_action_registry_v1";
};

export type AiScreenActionRegistryEntry = {
  screenId: string;
  domain: AiDomain;
  allowedRoles: readonly AiUserRole[];
  directorControlFullAccess: true;
  nonDirectorScopedAccess: true;
  evidenceSources: readonly AiScreenActionEvidenceSource[];
  visibleActions: readonly AiScreenActionDefinition[];
  source: "ai_screen_button_action_registry_v1";
};

export type AiScreenActionBlockerCode =
  | "BLOCKED_UNKNOWN_AI_TOOL_REFERENCE"
  | "BLOCKED_HIGH_RISK_ACTION_WITHOUT_APPROVAL"
  | "BLOCKED_ACTION_WITHOUT_EVIDENCE_SOURCE"
  | "BLOCKED_ACTION_WITHOUT_ROLE_SCOPE"
  | "BLOCKED_REQUIRED_SCREEN_NOT_REGISTERED"
  | "BLOCKED_FORBIDDEN_ACTION_EXECUTABLE";

export type AiScreenActionRegistryValidation = {
  ok: boolean;
  blockers: readonly AiScreenActionBlockerCode[];
  screensRegistered: number;
  buttonsOrActionsRegistered: number;
  requiredScreensRegistered: boolean;
  allActionsHaveRoleScope: boolean;
  allActionsHaveRiskPolicy: boolean;
  allActionsHaveEvidenceSource: boolean;
  allHighRiskActionsRequireApproval: boolean;
  forbiddenActionsExecutable: false;
  unknownToolReferences: readonly string[];
};

export type AiScreenActionResolverAuth = {
  userId: string;
  role: AiUserRole;
};

export type AiScreenActionRequest = {
  screenId: string;
};

export type AiScreenActionIntentPreviewInput = AiScreenActionRequest & {
  intent?: AiScreenActionIntent | string;
};

export type AiScreenActionPlanInput = AiScreenActionRequest & {
  actionId?: string;
  intent?: AiScreenActionIntent | string;
};

export type AiScreenActionMapOutput = {
  status: "ready" | "blocked";
  screenId: string;
  role: AiUserRole;
  domain: AiDomain;
  allowedRoles: readonly AiUserRole[];
  visibleActions: readonly AiScreenActionDefinition[];
  availableIntents: readonly AiScreenActionIntent[];
  availableTools: readonly AiToolName[];
  safeReadActions: readonly AiScreenActionDefinition[];
  draftActions: readonly AiScreenActionDefinition[];
  approvalRequiredActions: readonly AiScreenActionDefinition[];
  forbiddenActions: readonly AiScreenActionDefinition[];
  evidenceSources: readonly AiScreenActionEvidenceSource[];
  developerControlFullAccess: boolean;
  roleIsolationE2eClaimed: false;
  roleIsolationContractProof: true;
  roleScoped: true;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  fakeAiAnswer: false;
  hardcodedAiResponse: false;
  roleLeakageObserved: false;
  blocker: string | null;
  source: "runtime:ai_screen_button_action_intelligence_map_v1";
};

export type AiScreenActionIntentPreviewOutput = {
  status: "preview" | "blocked";
  screenId: string;
  role: AiUserRole;
  intent: string;
  allowedModes: readonly AiScreenActionMode[];
  safeReadActions: number;
  draftActions: number;
  approvalRequiredActions: number;
  forbiddenActions: number;
  deterministic: true;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  reason: string;
};

export type AiScreenActionPlanOutput = {
  status: "planned" | "blocked";
  screenId: string;
  role: AiUserRole;
  actionId: string;
  planMode: AiScreenActionMode;
  riskLevel: AiScreenActionRiskLevel;
  aiTool: AiToolName | null;
  requiresApproval: boolean;
  evidenceSources: readonly AiScreenActionEvidenceSource[];
  executable: boolean;
  deterministic: true;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  reason: string;
};

export type AiScreenActionPreviewSummary = {
  screenId: string;
  role: AiUserRole;
  safeReadCount: number;
  draftCount: number;
  approvalRequiredCount: number;
  forbiddenCount: number;
  safeReadLabels: readonly string[];
  draftLabels: readonly string[];
  approvalRequiredLabels: readonly string[];
  mutationCount: 0;
};

export const AI_SCREEN_ACTION_CONTRACT = Object.freeze({
  contractId: "ai_screen_button_action_intelligence_map_v1",
  source: "runtime:ai_screen_button_action_intelligence_map_v1",
  roleScoped: true,
  evidenceRequired: true,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  finalExecution: 0,
  providerCalled: false,
  fakeAiAnswer: false,
  hardcodedAiResponse: false,
} as const);
