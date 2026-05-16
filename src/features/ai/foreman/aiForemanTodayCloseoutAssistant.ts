import type { AiRoleScreenAssistantPack } from "../realAssistants/aiRoleScreenAssistantTypes";

export type ForemanCloseoutEvidence = {
  id: string;
  title: string;
  missingEvidence?: string;
  riskReason?: string;
  evidence: string[];
};

export function buildForemanTodayCloseoutAssistant(params: {
  screenId?: string;
  role?: string;
  items?: ForemanCloseoutEvidence[];
  closeoutReadyCount?: number;
  missingEvidenceCount?: number;
}): AiRoleScreenAssistantPack {
  const items = [...(params.items ?? [])];
  const missing = items.filter((item) => item.missingEvidence);
  const risky = items.filter((item) => item.riskReason);
  const closeoutReadyCount = Number(params.closeoutReadyCount ?? items.length) || 0;
  const missingEvidenceCount = Number(params.missingEvidenceCount ?? missing.length) || 0;

  return {
    screenId: params.screenId ?? "foreman.main",
    role: params.role ?? "foreman",
    domain: "projects",
    title: params.screenId === "foreman.ai.quick_modal" ? "Быстрый workbench" : "Работы сегодня",
    summary: `Можно закрыть: ${closeoutReadyCount}. Missing evidence: ${missingEvidenceCount}. Риски по работам: ${risky.length}.`,
    today: {
      count: closeoutReadyCount,
      criticalCount: risky.length,
      overdueCount: missingEvidenceCount,
    },
    readyItems: items.slice(0, 4).map((item) => ({
      id: `foreman.item.${item.id}`,
      title: item.title,
      description: [
        item.missingEvidence ? `Не хватает: ${item.missingEvidence}.` : null,
        item.riskReason ? `Риск: ${item.riskReason}.` : null,
      ].filter(Boolean).join(" "),
      evidence: item.evidence,
      riskLevel: item.riskReason ? "high" : item.missingEvidence ? "medium" : "low",
      actionKind: item.riskReason ? "approval_required" : "draft_only",
      primaryActionLabel: item.missingEvidence ? "Проверить missing evidence" : "Подготовить акт/отчёт",
      secondaryActionLabel: item.riskReason ? "Отправить на согласование" : "Написать подрядчику",
    })),
    risks: risky.map((item) => ({
      id: `foreman.risk.${item.id}`,
      title: item.title,
      reason: item.riskReason || "Нужна проверка.",
      severity: "high",
      evidence: item.evidence,
    })),
    missingData: missing.map((item) => ({
      id: `foreman.missing.${item.id}`,
      label: `${item.title}: ${item.missingEvidence}`,
      blocksAction: true,
    })),
    nextActions: [
      { id: "foreman.act", label: "Подготовить акт", kind: "draft", requiresApproval: false, canExecuteDirectly: false },
      { id: "foreman.report", label: "Подготовить отчёт", kind: "draft", requiresApproval: false, canExecuteDirectly: false },
      { id: "foreman.evidence", label: "Проверить missing evidence", kind: "request_more_data", requiresApproval: false, canExecuteDirectly: false },
      { id: "foreman.approval", label: "Отправить на согласование", kind: "submit_for_approval", requiresApproval: true, canExecuteDirectly: false },
    ],
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
  };
}
