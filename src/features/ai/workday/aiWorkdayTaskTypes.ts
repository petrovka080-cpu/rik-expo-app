import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiTaskStreamRuntimeEvidenceInput } from "../taskStream/aiTaskStreamRuntimeTypes";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiWorkdayTaskStatus = "loaded" | "empty" | "blocked";

export type AiWorkdayTaskRiskLevel = "low" | "medium" | "high" | "critical";

export type AiWorkdayTaskUrgency = "now" | "today" | "this_week" | "monitor";

export type AiWorkdayTaskSafeMode =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiWorkdayTaskNextAction =
  | "preview"
  | "draft_request"
  | "draft_report"
  | "draft_act"
  | "submit_for_approval"
  | "open_status"
  | "forbidden";

export type AiWorkdayTaskClassification =
  | "SAFE_READ_RECOMMENDATION"
  | "DRAFT_ONLY_RECOMMENDATION"
  | "APPROVAL_REQUIRED_RECOMMENDATION"
  | "FORBIDDEN_RECOMMENDATION_BLOCKED"
  | "INSUFFICIENT_EVIDENCE_BLOCKED"
  | "UNKNOWN_TOOL_BLOCKED";

export type AiWorkdayTaskBlockCode =
  | "NONE"
  | "FORBIDDEN_TOOL_OR_ROLE"
  | "INSUFFICIENT_EVIDENCE"
  | "UNKNOWN_TOOL"
  | "HIGH_RISK_WITHOUT_APPROVAL";

export type AiWorkdayTaskEvidenceType =
  | "request"
  | "supplier"
  | "warehouse"
  | "finance"
  | "report"
  | "act"
  | "approval"
  | "screen"
  | "task_stream";

export type AiWorkdayTaskEvidenceRef = {
  type: AiWorkdayTaskEvidenceType;
  ref: string;
  source:
    | "procurement_request_context"
    | "marketplace_supplier_compare"
    | "warehouse_status"
    | "finance_summary"
    | "draft_report_readiness"
    | "draft_act_readiness"
    | "approval_inbox"
    | "command_center_task_stream"
    | "screen_runtime_registry";
  redacted: true;
  rawPayloadStored: false;
  rawRowsReturned: false;
  rawPromptStored: false;
};

export type AiWorkdayTaskScope =
  | {
      kind: "cross_domain";
    }
  | {
      kind: "role_domain";
      allowedRoles: readonly AiUserRole[];
    }
  | {
      kind: "own_record";
      ownerUserIdHash: string;
    };

export type AiWorkdayTaskSourceCard = {
  id: string;
  type: string;
  title: string;
  summary: string;
  domain: AiDomain;
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string;
  evidenceRefs: readonly string[];
  scope: AiWorkdayTaskScope;
  recommendedToolName?: string;
  nextActionLabel?: string;
  sourceScreenId?: string;
  sourceEntityType?: string;
  sourceEntityIdHash?: string;
  requiresApproval?: boolean;
};

export type AiWorkdayTaskCard = {
  taskId: string;
  sourceCardId: string;
  roleScope: readonly AiUserRole[];
  domain: AiDomain;
  source: string;
  title: string;
  summary: string;
  riskLevel: AiWorkdayTaskRiskLevel;
  urgency: AiWorkdayTaskUrgency;
  evidenceRefs: readonly AiWorkdayTaskEvidenceRef[];
  suggestedToolId: AiToolName;
  suggestedMode: AiWorkdayTaskSafeMode;
  nextAction: AiWorkdayTaskNextAction;
  approvalRequired: boolean;
  safeMode: true;
  classification: AiWorkdayTaskClassification;
  blockCode: AiWorkdayTaskBlockCode;
  policyReason: string;
  mutationCount: 0;
};

export type AiWorkdayTaskEmptyState = {
  reason: string;
  honest: true;
  fakeCards: false;
  mutationCount: 0;
};

export type AiWorkdayTaskEngineInput = {
  auth: {
    userId: string;
    role: AiUserRole;
  } | null;
  screenId?: string;
  limit?: number;
  sourceCards?: readonly AiWorkdayTaskSourceCard[];
  runtimeEvidence?: AiTaskStreamRuntimeEvidenceInput;
  nowIso?: string;
};

export type AiWorkdayTaskEngineResult = {
  status: AiWorkdayTaskStatus;
  screenId: string;
  role: AiUserRole;
  cards: readonly AiWorkdayTaskCard[];
  emptyState: AiWorkdayTaskEmptyState | null;
  blockedReason: string | null;
  taskStreamStatus: "loaded" | "empty" | "blocked";
  roleScoped: true;
  developerControlFullAccess: boolean;
  roleIsolationE2eClaimed: false;
  evidenceRequired: true;
  allCardsHaveEvidence: boolean;
  allCardsHaveRiskPolicy: boolean;
  allCardsHaveKnownTool: boolean;
  highRiskRequiresApproval: boolean;
  forbiddenActionsBlocked: true;
  internalFirst: true;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  directSupabaseFromUi: false;
  mobileExternalFetch: false;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  fakeCards: false;
  hardcodedAiAnswer: false;
  source: "runtime:ai_workday_task_intelligence_v1";
};

export type AiWorkdayTaskPreview = {
  status: "preview" | "empty" | "blocked";
  taskId: string | null;
  title: string;
  summary: string;
  deterministic: true;
  evidenceRefs: readonly AiWorkdayTaskEvidenceRef[];
  suggestedToolId: AiToolName | null;
  suggestedMode: AiWorkdayTaskSafeMode;
  approvalRequired: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
};

export type AiWorkdayTaskActionPlan = {
  status: "planned" | "empty" | "blocked";
  taskId: string | null;
  planMode: AiWorkdayTaskSafeMode;
  classification: AiWorkdayTaskClassification;
  suggestedToolId: AiToolName | null;
  executable: false;
  approvalRequired: boolean;
  evidenceRefs: readonly AiWorkdayTaskEvidenceRef[];
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  reason: string;
};
