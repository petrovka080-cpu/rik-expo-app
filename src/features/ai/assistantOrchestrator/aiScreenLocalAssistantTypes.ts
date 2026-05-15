import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiScreenActionDefinition,
  AiScreenActionEvidenceSource,
  AiScreenActionIntent,
  AiScreenActionMode,
  AiScreenActionRiskLevel,
} from "../screenActions/aiScreenActionTypes";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiScreenLocalAssistantStatus =
  | "ready"
  | "answered"
  | "planned"
  | "blocked"
  | "handoff_plan_only";

export type AiScreenLocalAssistantBlockerCode =
  | "AI_SCREEN_ASSISTANT_AUTH_REQUIRED"
  | "AI_SCREEN_ASSISTANT_INVALID_INPUT"
  | "AI_SCREEN_ASSISTANT_SCREEN_NOT_REGISTERED"
  | "AI_SCREEN_ASSISTANT_ROLE_SCREEN_FORBIDDEN"
  | "FORBIDDEN_CROSS_SCREEN_ACTION"
  | "HANDOFF_PLAN_ONLY"
  | "AI_SCREEN_ASSISTANT_ACTION_NOT_AVAILABLE"
  | "AI_SCREEN_ASSISTANT_DRAFT_NOT_AVAILABLE"
  | "AI_SCREEN_ASSISTANT_APPROVAL_NOT_AVAILABLE";

export type AiScreenLocalAssistantAuth = {
  userId: string;
  role: AiUserRole;
};

export type AiScreenLocalAssistantScreenProfile = {
  screenId: string;
  domain: AiDomain;
  defaultRoleScope: readonly AiUserRole[];
  localWorkKinds: readonly string[];
  sameScreenTools: readonly AiToolName[];
  source: "ai_screen_local_assistant_profile_v1";
};

export type AiScreenLocalAssistantEvidenceRef = {
  id: string;
  source:
    | "screen_state"
    | "role_policy"
    | "tool_contract"
    | "approval_policy"
    | "runtime_policy"
    | "screen_action_map";
  screenId: string;
  label: string;
  redacted: true;
  rawContentReturned: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
};

export type AiScreenLocalAssistantEvidencePlan = {
  screenId: string;
  role: AiUserRole;
  evidenceRefs: readonly AiScreenLocalAssistantEvidenceRef[];
  citationsRequired: false;
  internalFirst: true;
  rawContentReturned: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
  evidenceBacked: true;
};

export type AiRoleScreenBoundaryDecision =
  | "SAME_SCREEN_ALLOWED"
  | "FORBIDDEN_CROSS_SCREEN_ACTION"
  | "HANDOFF_PLAN_ONLY"
  | "SCREEN_NOT_REGISTERED"
  | "ROLE_SCREEN_FORBIDDEN"
  | "AUTH_REQUIRED";

export type AiRoleScreenBoundaryResult = {
  status: "allowed" | "blocked" | "handoff_plan_only";
  decision: AiRoleScreenBoundaryDecision;
  screenId: string;
  normalizedScreenId: string;
  role: AiUserRole;
  targetScreenId: string | null;
  normalizedTargetScreenId: string | null;
  sameScreenOnly: true;
  directorControlMayHandoff: boolean;
  actionMayExecuteHere: false;
  reason: string;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AiScreenLocalAssistantContext = {
  status: "ready" | "blocked";
  blockerCode: AiScreenLocalAssistantBlockerCode | null;
  blockedReason: string | null;
  screenId: string;
  role: AiUserRole;
  domain: AiDomain;
  roleScope: readonly AiUserRole[];
  localWorkKinds: readonly string[];
  availableIntents: readonly string[];
  toolCandidates: readonly AiToolName[];
  visibleActionIds: readonly string[];
  safeReadActionIds: readonly string[];
  draftActionIds: readonly string[];
  approvalRequiredActionIds: readonly string[];
  forbiddenActionIds: readonly string[];
  evidencePlan: AiScreenLocalAssistantEvidencePlan;
  boundary: AiRoleScreenBoundaryResult;
  runtimeScreenKnown: boolean;
  actionMapKnown: boolean;
  sameScreenOnly: true;
  roleScoped: true;
  evidenceBacked: true;
  internalFirst: true;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  finalExecution: 0;
  directMutationAllowed: false;
  providerCalled: false;
  externalLiveFetch: false;
  rawContentReturned: false;
  rawDbRowsExposed: false;
  fakeAiAnswer: false;
  hardcodedAiResponse: false;
  source: "runtime:ai_screen_local_role_assistant_orchestrator_v1";
};

export type AiScreenLocalAssistantAskInput = {
  auth: AiScreenLocalAssistantAuth | null;
  screenId: string;
  message?: string;
  targetScreenId?: string | null;
  evidenceRefs?: readonly string[];
};

export type AiScreenLocalAssistantActionPlanInput = {
  auth: AiScreenLocalAssistantAuth | null;
  screenId: string;
  actionId?: string | null;
  intent?: AiScreenActionIntent | string | null;
  targetScreenId?: string | null;
  evidenceRefs?: readonly string[];
};

export type AiScreenLocalAssistantDraftPreviewInput =
  AiScreenLocalAssistantActionPlanInput & {
    draftKind?: "request" | "report" | "act" | "screen_note" | null;
  };

export type AiScreenLocalAssistantSubmitForApprovalInput =
  AiScreenLocalAssistantActionPlanInput & {
    idempotencyKey?: string | null;
  };

export type AiScreenLocalAssistantHandoffPlan = {
  fromScreenId: string;
  targetScreenId: string;
  mode: "handoff_plan_only";
  allowedForRole: "director_or_control";
  directExecutionAllowed: false;
  mutationCount: 0;
};

export type AiScreenLocalAssistantAskOutput = {
  status: "answered" | "blocked" | "handoff_plan_only";
  screenId: string;
  role: AiUserRole;
  answerMode: "screen_local_context" | "blocked" | "handoff_plan_only";
  localWorkKinds: readonly string[];
  suggestedIntents: readonly string[];
  safeNextActionIds: readonly string[];
  draftActionIds: readonly string[];
  approvalRequiredActionIds: readonly string[];
  forbiddenActionIds: readonly string[];
  evidenceRefs: readonly string[];
  boundary: AiRoleScreenBoundaryResult;
  handoffPlan: AiScreenLocalAssistantHandoffPlan | null;
  sameScreenOnly: true;
  roleScoped: true;
  evidenceBacked: true;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  finalExecution: 0;
  directMutationAllowed: false;
  providerCalled: false;
  externalLiveFetch: false;
  rawContentReturned: false;
  rawDbRowsExposed: false;
  fakeAiAnswer: false;
  hardcodedAiResponse: false;
  reason: string;
};

export type AiScreenLocalAssistantActionPlanOutput = {
  status: "planned" | "blocked" | "handoff_plan_only";
  screenId: string;
  role: AiUserRole;
  actionId: string | null;
  intent: string | null;
  planMode: AiScreenActionMode | "handoff_plan_only";
  riskLevel: AiScreenActionRiskLevel | "handoff";
  aiTool: AiToolName | null;
  requiresApproval: boolean;
  evidenceRefs: readonly string[];
  evidenceSources: readonly AiScreenActionEvidenceSource[];
  boundary: AiRoleScreenBoundaryResult;
  handoffPlan: AiScreenLocalAssistantHandoffPlan | null;
  executable: false;
  sameScreenOnly: true;
  roleScoped: true;
  evidenceBacked: true;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  finalExecution: 0;
  directMutationAllowed: false;
  providerCalled: false;
  externalLiveFetch: false;
  reason: string;
};

export type AiScreenLocalAssistantDraftPreviewOutput = {
  status: "draft_preview" | "blocked" | "handoff_plan_only";
  screenId: string;
  role: AiUserRole;
  draftKind: "request" | "report" | "act" | "screen_note";
  actionId: string | null;
  previewAvailable: boolean;
  persisted: false;
  submitted: false;
  approvalRequired: boolean;
  evidenceRefs: readonly string[];
  boundary: AiRoleScreenBoundaryResult;
  handoffPlan: AiScreenLocalAssistantHandoffPlan | null;
  sameScreenOnly: true;
  roleScoped: true;
  evidenceBacked: true;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  finalExecution: 0;
  providerCalled: false;
  externalLiveFetch: false;
  fakeAiAnswer: false;
  hardcodedAiResponse: false;
  reason: string;
};

export type AiScreenLocalAssistantSubmitPreviewOutput = {
  status: "submit_for_approval_preview" | "blocked" | "handoff_plan_only";
  screenId: string;
  role: AiUserRole;
  actionId: string | null;
  approvalRequired: true;
  idempotencyRequired: true;
  auditRequired: true;
  redactedPayloadOnly: true;
  persisted: false;
  submitted: false;
  executed: false;
  evidenceRefs: readonly string[];
  boundary: AiRoleScreenBoundaryResult;
  handoffPlan: AiScreenLocalAssistantHandoffPlan | null;
  sameScreenOnly: true;
  roleScoped: true;
  evidenceBacked: true;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  finalExecution: 0;
  providerCalled: false;
  externalLiveFetch: false;
  reason: string;
};

export type AiScreenLocalAssistantVisibleAction = Pick<
  AiScreenActionDefinition,
  | "actionId"
  | "intent"
  | "mode"
  | "riskLevel"
  | "aiTool"
  | "requiresApproval"
  | "evidenceSources"
>;

export const AI_SCREEN_LOCAL_ASSISTANT_CONTRACT = Object.freeze({
  contractId: "ai_screen_local_role_assistant_orchestrator_v1",
  sameScreenOnly: true,
  roleScoped: true,
  evidenceRequired: true,
  internalFirst: true,
  approvalRequiredForHighRisk: true,
  readOnly: true,
  mutationCount: 0,
  dbWrites: 0,
  finalExecution: 0,
  directMutationAllowed: false,
  providerCalled: false,
  externalLiveFetch: false,
  rawContentReturned: false,
  rawDbRowsExposed: false,
  fakeAiAnswer: false,
  hardcodedAiResponse: false,
} as const);
