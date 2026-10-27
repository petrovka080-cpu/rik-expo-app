import type { AssistantContext, AssistantRole } from "../assistant.types";
import type { ProcurementReadyBuyOptionBundle } from "../procurement/aiProcurementReadyBuyOptionTypes";

export type AiScreenNativeRiskLevel = "low" | "medium" | "high" | "critical";
export type AiScreenNativeActionKind = "safe_read" | "draft_only" | "approval_required" | "forbidden";

export type AiScreenCriticalItem = {
  id: string;
  title: string;
  reason: string;
  severity: AiScreenNativeRiskLevel;
  evidence: string[];
};

export type AiScreenReadyOption = {
  id: string;
  title: string;
  description: string;
  evidence: string[];
  riskLevel: AiScreenNativeRiskLevel;
  actionKind: AiScreenNativeActionKind;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  requiresApproval: boolean;
  canExecuteDirectly: false;
};

export type AiScreenRisk = {
  id: string;
  title: string;
  reason: string;
  severity: AiScreenNativeRiskLevel;
  evidence: string[];
};

export type AiScreenMissingData = {
  id: string;
  label: string;
  blocksAction?: boolean;
};

export type AiScreenEvidence = {
  id: string;
  label: string;
  source: "screen" | "read_route" | "internal" | "approval" | "document" | "cited_preview";
};

export type AiScreenNextAction = {
  id: string;
  label: string;
  kind: "open" | "review" | "compare" | "draft" | "request_more_data" | "submit_for_approval";
  requiresApproval: boolean;
  canExecuteDirectly: false;
};

export type AiScreenNativeAssistantPack = {
  screenId: string;
  roleScope: string[];
  domain: string;
  title: string;
  summary: string;
  today?: {
    count?: number;
    amountLabel?: string;
    criticalCount?: number;
    overdueCount?: number;
    pendingApprovalCount?: number;
  };
  criticalItems: AiScreenCriticalItem[];
  readyOptions: AiScreenReadyOption[];
  risks: AiScreenRisk[];
  missingData: AiScreenMissingData[];
  evidence: AiScreenEvidence[];
  nextActions: AiScreenNextAction[];
  chatStarterQuestions: string[];
  directMutationAllowed: false;
  providerRequired: false;
  dbWriteUsed: false;
  fakeDataUsed: false;
};

export type AiScreenNativeAssistantRegistryEntry = {
  screenId: string;
  coverageGroup: string;
  roleScope: string[];
  domain: string;
  title: string;
  defaultSummary: string;
  defaultReadyOptionTitle: string;
  defaultReadyOptionDescription: string;
  defaultNextActions: string[];
  chatStarterQuestions: string[];
  contexts: AssistantContext[];
};

export type AiScreenNativeAssistantHydrationRequest = {
  role: AssistantRole;
  context: AssistantContext;
  screenId?: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
  scopedFactsSummary?: string | null;
  readyBuyBundle?: ProcurementReadyBuyOptionBundle | null;
};
