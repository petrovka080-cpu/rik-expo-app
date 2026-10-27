import type { AiRoleScreenAssistantPack } from "../realAssistants/aiRoleScreenAssistantTypes";

export type DirectorDecisionEvidence = {
  id: string;
  title: string;
  reason: string;
  severity?: "medium" | "high" | "critical";
  evidence: string[];
};

export function buildDirectorTodayDecisionAssistant(params: {
  screenId?: string;
  role?: string;
  decisions?: DirectorDecisionEvidence[];
  approvalCount?: number;
  blocksWorkCount?: number;
}): AiRoleScreenAssistantPack {
  const decisions = [...(params.decisions ?? [])];
  const critical = decisions.filter((item) => item.severity === "critical" || item.severity === "high");
  const approvalCount = Number(params.approvalCount ?? decisions.length) || 0;
  const blocksWorkCount = Number(params.blocksWorkCount ?? critical.length) || 0;

  return {
    screenId: params.screenId ?? "director.dashboard",
    role: params.role ?? "director",
    domain: "control",
    title: params.screenId === "approval.inbox" ? "На согласовании" : "Решения на сегодня",
    summary: `Критические: ${critical.length}. Ждут согласования: ${approvalCount}. Блокируют работы: ${blocksWorkCount}.`,
    today: {
      count: decisions.length,
      criticalCount: critical.length,
      overdueCount: approvalCount,
    },
    readyItems: decisions.slice(0, 5).map((decision) => ({
      id: `director.decision.${decision.id}`,
      title: decision.title,
      description: decision.reason,
      evidence: decision.evidence,
      riskLevel: decision.severity ?? "medium",
      actionKind: "approval_required",
      primaryActionLabel: "Открыть evidence",
      secondaryActionLabel: "Запросить данные",
    })),
    risks: decisions.map((decision) => ({
      id: `director.risk.${decision.id}`,
      title: decision.title,
      reason: decision.reason,
      severity: decision.severity ?? "medium",
      evidence: decision.evidence,
    })),
    missingData: decisions.length
      ? []
      : [{ id: "director.missing.readonly", label: "Нет загруженной очереди согласований для текущего среза.", blocksAction: false }],
    nextActions: [
      { id: "director.approvals", label: "Открыть approval inbox", kind: "open", requiresApproval: false, canExecuteDirectly: false },
      { id: "director.risks", label: "Показать риски", kind: "review", requiresApproval: false, canExecuteDirectly: false },
      { id: "director.evidence", label: "Открыть evidence", kind: "review", requiresApproval: false, canExecuteDirectly: false },
      { id: "director.request_data", label: "Запросить данные", kind: "request_more_data", requiresApproval: false, canExecuteDirectly: false },
    ],
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
  };
}
