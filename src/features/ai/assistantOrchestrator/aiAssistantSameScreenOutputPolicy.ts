import type {
  AiRoleScreenBoundaryResult,
  AiScreenLocalAssistantBlockerCode,
  AiScreenLocalAssistantHandoffPlan,
} from "./aiScreenLocalAssistantTypes";

export type AiAssistantSameScreenPolicyResult = {
  status: "allowed" | "blocked" | "handoff_plan_only";
  blockerCode: AiScreenLocalAssistantBlockerCode | null;
  reason: string;
  handoffPlan: AiScreenLocalAssistantHandoffPlan | null;
  sameScreenOnly: true;
  mutationCount: 0;
  finalExecution: 0;
};

export function createAiAssistantHandoffPlan(
  boundary: AiRoleScreenBoundaryResult,
): AiScreenLocalAssistantHandoffPlan | null {
  if (
    boundary.status !== "handoff_plan_only" ||
    boundary.normalizedTargetScreenId === null
  ) {
    return null;
  }

  return {
    fromScreenId: boundary.normalizedScreenId,
    targetScreenId: boundary.normalizedTargetScreenId,
    mode: "handoff_plan_only",
    allowedForRole: "director_or_control",
    directExecutionAllowed: false,
    mutationCount: 0,
  };
}

export function enforceAiAssistantSameScreenOutputPolicy(
  boundary: AiRoleScreenBoundaryResult,
): AiAssistantSameScreenPolicyResult {
  if (boundary.status === "allowed") {
    return {
      status: "allowed",
      blockerCode: null,
      reason: boundary.reason,
      handoffPlan: null,
      sameScreenOnly: true,
      mutationCount: 0,
      finalExecution: 0,
    };
  }

  if (boundary.status === "handoff_plan_only") {
    return {
      status: "handoff_plan_only",
      blockerCode: "HANDOFF_PLAN_ONLY",
      reason: boundary.reason,
      handoffPlan: createAiAssistantHandoffPlan(boundary),
      sameScreenOnly: true,
      mutationCount: 0,
      finalExecution: 0,
    };
  }

  const blockerCode: AiScreenLocalAssistantBlockerCode =
    boundary.decision === "FORBIDDEN_CROSS_SCREEN_ACTION"
      ? "FORBIDDEN_CROSS_SCREEN_ACTION"
      : boundary.decision === "SCREEN_NOT_REGISTERED"
        ? "AI_SCREEN_ASSISTANT_SCREEN_NOT_REGISTERED"
        : boundary.decision === "AUTH_REQUIRED"
          ? "AI_SCREEN_ASSISTANT_AUTH_REQUIRED"
          : "AI_SCREEN_ASSISTANT_ROLE_SCREEN_FORBIDDEN";

  return {
    status: "blocked",
    blockerCode,
    reason: boundary.reason,
    handoffPlan: null,
    sameScreenOnly: true,
    mutationCount: 0,
    finalExecution: 0,
  };
}
