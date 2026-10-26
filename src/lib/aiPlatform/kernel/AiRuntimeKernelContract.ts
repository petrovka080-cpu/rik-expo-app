export type AiPlatformRole = "consumer" | "foreman" | "director" | "buyer" | "office" | "admin";

export type AiPlatformSurface =
  | "estimate"
  | "chat"
  | "document"
  | "report"
  | "procurement"
  | "foreman"
  | "director"
  | "office";

export type AiRunMode =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden"
  | "diagnostic_only";

export type AiRunStatus =
  | "completed"
  | "needs_approval"
  | "forbidden"
  | "needs_more_input"
  | "failed";

export type AiContextRef = {
  screenId?: string;
  requestId?: string;
  estimateId?: string;
  revisionId?: string;
  ledgerId?: string;
  objectId?: string;
};

export type AiRunInput = {
  flowId: string;
  userId?: string;
  role: AiPlatformRole;
  surface: AiPlatformSurface;
  intent: string;
  userText?: string;
  contextRef?: AiContextRef;
  mode: AiRunMode;
  sourceSha: string;
  runtimeVersion: string;
};

export type AiToolPlan = {
  toolName: string;
  mode: AiRunMode;
  allowed: boolean;
  approvalRequired: boolean;
  mutationAllowed: false;
  directExecutionEnabled: false;
  reason: string;
};

export type AiApprovalRequest = {
  approvalId: string;
  flowId: string;
  surface: AiPlatformSurface;
  intent: string;
  reason: string;
  requiredRole: AiPlatformRole | "human_owner";
  sourceSha: string;
};

export type AiRedactedDiagnostics = {
  providerKey?: string;
  modelKey?: string;
  contextSources: string[];
  redactionPassed: boolean;
  budgetUsed: {
    inputChars: number;
    maxInputChars: number;
  };
  ledgerRecordId?: string;
};

export type AiRunResult = {
  flowId: string;
  status: AiRunStatus;
  userVisibleAnswerRu?: string;
  draft?: unknown;
  toolPlan?: AiToolPlan;
  requiredApproval?: AiApprovalRequest;
  diagnostics?: AiRedactedDiagnostics;
};

export type AiRunValidationResult = {
  ok: boolean;
  blockingReasons: string[];
  modeAllowed: boolean;
  redactionRequired: true;
  ledgerRequired: true;
  approvalPolicyRequired: boolean;
};

export type AiRunStreamEvent = {
  flowId: string;
  type: "text" | "tool_plan" | "diagnostic" | "done";
  text?: string;
  toolPlan?: AiToolPlan;
  diagnostics?: AiRedactedDiagnostics;
};

export type AiRuntimeKernel = {
  run(input: AiRunInput): Promise<AiRunResult>;
  stream?(input: AiRunInput): AsyncIterable<AiRunStreamEvent>;
  validate(input: AiRunInput): Promise<AiRunValidationResult>;
};

export const AI_RUNTIME_KERNEL_VERSION = "ai-platform-kernel-v1";

export const AI_PLATFORM_SURFACES: readonly AiPlatformSurface[] = [
  "estimate",
  "chat",
  "document",
  "report",
  "procurement",
  "foreman",
  "director",
  "office",
];

export const AI_RUN_MODES: readonly AiRunMode[] = [
  "safe_read",
  "draft_only",
  "approval_required",
  "forbidden",
  "diagnostic_only",
];
