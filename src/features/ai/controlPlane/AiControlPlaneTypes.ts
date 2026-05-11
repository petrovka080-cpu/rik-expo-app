import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiActionType, AiPolicyDecision } from "../policy/aiRiskPolicy";

export type AiControlPlaneRequest = {
  role: AiUserRole;
  screenId: string;
  domain: AiDomain;
  actionType: AiActionType;
};

export type AiControlPlaneDecision = AiPolicyDecision & {
  screenAllowed: boolean;
  role: AiUserRole;
  screenId: string;
  domain: AiDomain;
  actionType: AiActionType;
};
