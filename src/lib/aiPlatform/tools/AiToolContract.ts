import type { AiRunMode, AiPlatformRole } from "../kernel/AiRuntimeKernelContract";

export type AiPlatformToolKind = "safe_read" | "draft_only" | "approval_required" | "forbidden";

export type AiPlatformToolDefinition = {
  name: string;
  kind: AiPlatformToolKind;
  requiredRoles: readonly AiPlatformRole[];
  description: string;
};

export type AiPlatformToolPlan = {
  toolName: string;
  mode: AiRunMode;
  allowed: boolean;
  approvalRequired: boolean;
  directExecutionEnabled: false;
  mutationAllowed: false;
  reason: string;
};
