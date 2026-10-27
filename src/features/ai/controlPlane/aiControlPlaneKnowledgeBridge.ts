import { evaluateAiControlPlane } from "./AiControlPlane";
import type { AiControlPlaneDecision } from "./AiControlPlaneTypes";
import type { AiUserRole } from "../policy/aiRolePolicy";
import type { AiActionType, AiRiskLevel } from "../policy/aiRiskPolicy";
import type { AiIntent } from "../knowledge/aiKnowledgeTypes";
import {
  buildAiKnowledgePromptBlock,
  resolveAiScreenKnowledge,
} from "../knowledge/aiKnowledgeResolver";
import { getAiIntentKnowledge } from "../knowledge/aiIntentRegistry";

export type AiControlPlaneKnowledgeBridgeRequest = {
  role: AiUserRole;
  screenId: string;
  requestedIntent: AiIntent;
};

export type AiControlPlaneKnowledgeBridgeDecision = {
  allowed: boolean;
  blocked: boolean;
  requiresApproval: boolean;
  riskLevel: AiRiskLevel;
  reason: string;
  role: AiUserRole;
  screenId: string;
  requestedIntent: AiIntent;
  actionTypes: readonly AiActionType[];
  promptSafeKnowledgeBlock: string;
  controlPlaneDecision: AiControlPlaneDecision | null;
};

export function evaluateAiControlPlaneKnowledgeBridge(
  request: AiControlPlaneKnowledgeBridgeRequest,
): AiControlPlaneKnowledgeBridgeDecision {
  const screenKnowledge = resolveAiScreenKnowledge({
    role: request.role,
    screenId: request.screenId,
  });
  const intentKnowledge = getAiIntentKnowledge(request.requestedIntent);
  const promptSafeKnowledgeBlock = buildAiKnowledgePromptBlock({
    role: request.role,
    screenId: request.screenId,
  });
  const resolvedIntent = [...screenKnowledge.allowedIntents, ...screenKnowledge.blockedIntents]
    .find((entry) => entry.intent === request.requestedIntent);

  if (!intentKnowledge || !resolvedIntent || !resolvedIntent.allowed) {
    return {
      allowed: false,
      blocked: true,
      requiresApproval: resolvedIntent?.requiresApproval ?? true,
      riskLevel: resolvedIntent?.riskLevel ?? "forbidden",
      reason: resolvedIntent?.reason ?? "Requested intent is not registered or not available for this screen",
      role: request.role,
      screenId: request.screenId,
      requestedIntent: request.requestedIntent,
      actionTypes: intentKnowledge?.mapsToActionTypes ?? [],
      promptSafeKnowledgeBlock,
      controlPlaneDecision: null,
    };
  }

  const primaryActionType = intentKnowledge.mapsToActionTypes[0] ?? "explain_status";
  const controlPlaneDecision = evaluateAiControlPlane({
    role: request.role,
    screenId: request.screenId,
    domain:
      screenKnowledge.domain === "contractors"
        ? "subcontracts"
        : screenKnowledge.domain === "office"
          ? "control"
          : screenKnowledge.domain === "projects"
            ? "projects"
            : screenKnowledge.domain,
    actionType: primaryActionType,
  });

  return {
    allowed: controlPlaneDecision.allowed,
    blocked: !controlPlaneDecision.allowed,
    requiresApproval: controlPlaneDecision.requiresApproval || intentKnowledge.requiresApproval,
    riskLevel: controlPlaneDecision.riskLevel,
    reason:
      request.requestedIntent === "execute_approved" && intentKnowledge.executionBoundary === "aiApprovalGate"
        ? "execute_approved intent is allowed only through aiApprovalGate; direct execution is blocked"
        : controlPlaneDecision.reason,
    role: request.role,
    screenId: request.screenId,
    requestedIntent: request.requestedIntent,
    actionTypes: intentKnowledge.mapsToActionTypes,
    promptSafeKnowledgeBlock,
    controlPlaneDecision,
  };
}
