import type { AssistantContext, AssistantRole } from "../assistant.types";
import type { AiScreenButtonActionKind } from "../screenAudit/aiScreenButtonRoleActionTypes";

export type AiScreenWorkflowRiskLevel = "low" | "medium" | "high" | "critical";
export type AiScreenWorkflowActionKind = Extract<
  AiScreenButtonActionKind,
  "safe_read" | "draft_only" | "approval_required" | "forbidden"
>;

export type AiScreenWorkflowReadyBlock = {
  id: string;
  title: string;
  body: string;
  evidence: string[];
  severity?: AiScreenWorkflowRiskLevel;
};

export type AiScreenWorkflowCriticalItem = {
  id: string;
  title: string;
  reason: string;
  evidence: string[];
  nextActionId: string;
};

export type AiScreenWorkflowReadyOption = {
  id: string;
  title: string;
  description: string;
  evidence: string[];
  riskLevel: AiScreenWorkflowRiskLevel;
  actionKind: AiScreenWorkflowActionKind;
  primaryActionId?: string;
};

export type AiScreenWorkflowMissingData = {
  id: string;
  label: string;
  blocksAction: boolean;
};

export type AiScreenWorkflowAction = {
  id: string;
  label: string;
  actionKind: AiScreenWorkflowActionKind;
  routeOrHandler?: string;
  approvalRoute?: string;
  forbiddenReason?: string;
  exactBlocker?: string;
  canExecuteDirectly: false;
};

export type AiScreenWorkflowQaExample = {
  question: string;
  expectedAnswerIntent: string;
};

export type AiScreenWorkflowPack = {
  screenId: string;
  roleScope: string[];
  domain: string;
  title: string;
  userGoal: string;
  summary: string;
  readyBlocks: AiScreenWorkflowReadyBlock[];
  criticalItems: AiScreenWorkflowCriticalItem[];
  readyOptions: AiScreenWorkflowReadyOption[];
  missingData: AiScreenWorkflowMissingData[];
  actions: AiScreenWorkflowAction[];
  qaExamples: AiScreenWorkflowQaExample[];
  safety: {
    fakeDataUsed: false;
    directDangerousMutationAllowed: false;
    providerRequired: false;
    dbWriteUsed: false;
    approvalBypassAllowed: false;
  };
};

export type AiScreenWorkflowRegistryEntry = {
  screenId: string;
  roleScope: string[];
  domain: string;
  title: string;
  userGoal: string;
  defaultSummary: string;
  preparedOutputLabels: string[];
  qaExamples: AiScreenWorkflowQaExample[];
  actionIds: string[];
};

export type AiScreenWorkflowHydrationRequest = {
  role: AssistantRole;
  context: AssistantContext;
  screenId?: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
  scopedFactsSummary?: string | null;
};

export type AiScreenWorkflowValidationIssue = {
  screenId: string;
  actionId?: string;
  code:
    | "missing_screen"
    | "missing_pack_work"
    | "missing_action"
    | "missing_button_label"
    | "missing_action_kind"
    | "missing_route_or_blocker"
    | "approval_route_missing"
    | "forbidden_reason_missing"
    | "direct_execution_allowed"
    | "qa_coverage_missing"
    | "debug_copy_exposed"
    | "fake_data_used";
  exactReason: string;
};
