import type { AiRunInput } from "../kernel/AiRuntimeKernelContract";
import type { AiPlatformToolDefinition, AiPlatformToolPlan } from "./AiToolContract";

export function planAiPlatformTool(input: AiRunInput, tool: AiPlatformToolDefinition | null): AiPlatformToolPlan {
  if (!tool) {
    return {
      toolName: "unregistered",
      mode: "forbidden",
      allowed: false,
      approvalRequired: false,
      directExecutionEnabled: false,
      mutationAllowed: false,
      reason: "AI tool is not registered",
    };
  }
  if (tool.kind === "forbidden" || input.mode === "forbidden") {
    return {
      toolName: tool.name,
      mode: "forbidden",
      allowed: false,
      approvalRequired: false,
      directExecutionEnabled: false,
      mutationAllowed: false,
      reason: "AI tool is forbidden by platform policy",
    };
  }
  if (!tool.requiredRoles.includes(input.role)) {
    return {
      toolName: tool.name,
      mode: "forbidden",
      allowed: false,
      approvalRequired: false,
      directExecutionEnabled: false,
      mutationAllowed: false,
      reason: `AI role ${input.role} is not allowed for ${tool.name}`,
    };
  }
  if (tool.kind === "approval_required" || input.mode === "approval_required") {
    return {
      toolName: tool.name,
      mode: "approval_required",
      allowed: true,
      approvalRequired: true,
      directExecutionEnabled: false,
      mutationAllowed: false,
      reason: "AI tool can only create an approval gate plan",
    };
  }
  if (tool.kind === "draft_only" || input.mode === "draft_only") {
    return {
      toolName: tool.name,
      mode: "draft_only",
      allowed: true,
      approvalRequired: false,
      directExecutionEnabled: false,
      mutationAllowed: false,
      reason: "AI tool can create drafts only",
    };
  }
  return {
    toolName: tool.name,
    mode: "safe_read",
    allowed: true,
    approvalRequired: false,
    directExecutionEnabled: false,
    mutationAllowed: false,
    reason: "AI tool can read scoped context only",
  };
}
