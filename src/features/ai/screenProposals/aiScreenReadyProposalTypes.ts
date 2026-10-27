import type { AiDomain } from "../policy/aiRolePolicy";

export type AiReadyProposalRiskLevel = "low" | "medium" | "high";
export type AiReadyProposalActionKind = "safe_read" | "draft_only" | "approval_required" | "forbidden";

export type AiReadyProposal = {
  id: string;
  screenId: string;
  domain: AiDomain | string;
  title: string;
  summary: string;
  evidence: string[];
  riskLevel: AiReadyProposalRiskLevel;
  actionKind: AiReadyProposalActionKind;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  forbiddenReason?: string;
  requiresApproval: boolean;
  canExecuteDirectly: false;
};
