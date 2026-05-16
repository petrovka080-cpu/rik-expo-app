import type { AssistantContext, AssistantRole } from "../assistant.types";
import type { ProcurementReadyBuyOptionBundle } from "../procurement/aiProcurementReadyBuyOptionTypes";

export type AiRoleScreenAssistantRiskLevel = "low" | "medium" | "high" | "critical";
export type AiRoleScreenAssistantActionKind =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiRoleScreenAssistantNextActionKind =
  | "open"
  | "review"
  | "compare"
  | "draft"
  | "request_more_data"
  | "submit_for_approval";

export type AiRoleScreenAssistantPack = {
  screenId: string;
  role: string;
  domain: string;

  title: string;
  summary: string;

  today?: {
    count: number;
    amountLabel?: string;
    criticalCount?: number;
    overdueCount?: number;
  };

  readyItems: {
    id: string;
    title: string;
    description: string;
    evidence: string[];
    riskLevel: AiRoleScreenAssistantRiskLevel;
    actionKind: AiRoleScreenAssistantActionKind;
    primaryActionLabel?: string;
    secondaryActionLabel?: string;
  }[];

  risks: {
    id: string;
    title: string;
    reason: string;
    severity: AiRoleScreenAssistantRiskLevel;
    evidence: string[];
  }[];

  missingData: {
    id: string;
    label: string;
    blocksAction?: boolean;
  }[];

  nextActions: {
    id: string;
    label: string;
    kind: AiRoleScreenAssistantNextActionKind;
    requiresApproval: boolean;
    canExecuteDirectly: false;
  }[];

  directMutationAllowed: false;
  providerRequired: false;
  dbWriteUsed: false;
};

export type AiRoleScreenAssistantHydrationRequest = {
  role: AssistantRole;
  context: AssistantContext;
  screenId?: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
  scopedFactsSummary?: string | null;
  readyBuyBundle?: ProcurementReadyBuyOptionBundle | null;
};

export type AiRoleScreenAssistantRegistryEntry = {
  screenId: string;
  role: string;
  domain: string;
  title: string;
  contexts: AssistantContext[];
};
