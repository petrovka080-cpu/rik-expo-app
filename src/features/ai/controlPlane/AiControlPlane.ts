import { assertAiScreenAccess } from "../policy/aiScreenCapabilityRegistry";
import { assertAiActionAllowed } from "../policy/aiRiskPolicy";
import type { AiControlPlaneDecision, AiControlPlaneRequest } from "./AiControlPlaneTypes";

export function evaluateAiControlPlane(
  request: AiControlPlaneRequest,
): AiControlPlaneDecision {
  const screenDecision = assertAiScreenAccess(request.screenId, request.role);
  if (!screenDecision.allowed) {
    return {
      allowed: false,
      riskLevel: "forbidden",
      requiresApproval: false,
      reason: screenDecision.reason,
      redactionRequired: true,
      auditRequired: true,
      screenAllowed: false,
      role: request.role,
      screenId: request.screenId,
      domain: request.domain,
      actionType: request.actionType,
    };
  }

  const policyDecision = assertAiActionAllowed({
    actionType: request.actionType,
    role: request.role,
    domain: request.domain,
  });

  return {
    ...policyDecision,
    screenAllowed: true,
    role: request.role,
    screenId: request.screenId,
    domain: request.domain,
    actionType: request.actionType,
  };
}
