import type { AiRoleScreenAssistantPack } from "../realAssistants/aiRoleScreenAssistantTypes";

export type WarehouseTodayOpsEvidence = {
  id: string;
  title: string;
  linkedRequestId?: string;
  riskReason?: string;
  missingDocument?: string;
  evidence: string[];
};

export function buildWarehouseTodayOpsAssistant(params: {
  screenId?: string;
  role?: string;
  stockRiskCount?: number;
  incomingCount?: number;
  blockedIssueCount?: number;
  disputedCount?: number;
  items?: WarehouseTodayOpsEvidence[];
}): AiRoleScreenAssistantPack {
  const items = [...(params.items ?? [])];
  const risky = items.filter((item) => item.riskReason);
  const missing = items.filter((item) => item.missingDocument);
  const stockRiskCount = Number(params.stockRiskCount ?? risky.length) || 0;
  const incomingCount = Number(params.incomingCount ?? 0) || 0;
  const blockedIssueCount = Number(params.blockedIssueCount ?? 0) || 0;
  const disputedCount = Number(params.disputedCount ?? missing.length) || 0;

  return {
    screenId: params.screenId ?? "warehouse.main",
    role: params.role ?? "warehouse",
    domain: "warehouse",
    title: params.screenId === "warehouse.incoming" ? "Приход" : params.screenId === "warehouse.issue" ? "Выдача" : "Склад сегодня",
    summary: `Риски дефицита: ${stockRiskCount}. Ожидаемые приходы: ${incomingCount}. Заявки, которые склад не закроет: ${blockedIssueCount}. Спорные позиции: ${disputedCount}.`,
    today: {
      count: stockRiskCount + incomingCount + blockedIssueCount + disputedCount,
      criticalCount: stockRiskCount,
      overdueCount: blockedIssueCount,
    },
    readyItems: items.slice(0, 4).map((item) => ({
      id: `warehouse.item.${item.id}`,
      title: item.title,
      description: [
        item.linkedRequestId ? `Связано: заявка ${item.linkedRequestId}.` : null,
        item.riskReason ? `Риск: ${item.riskReason}.` : null,
        item.missingDocument ? `Не хватает: ${item.missingDocument}.` : null,
      ].filter(Boolean).join(" "),
      evidence: item.evidence,
      riskLevel: item.riskReason ? "high" : item.missingDocument ? "medium" : "low",
      actionKind: item.riskReason ? "approval_required" : item.missingDocument ? "draft_only" : "safe_read",
      primaryActionLabel: item.missingDocument ? "Запросить документ" : "Проверить складской риск",
      secondaryActionLabel: item.riskReason ? "Отправить на согласование" : undefined,
    })),
    risks: risky.map((item) => ({
      id: `warehouse.risk.${item.id}`,
      title: item.title,
      reason: item.riskReason || "Требуется проверка.",
      severity: "high",
      evidence: item.evidence,
    })),
    missingData: missing.map((item) => ({
      id: `warehouse.missing.${item.id}`,
      label: `${item.title}: ${item.missingDocument}`,
      blocksAction: true,
    })),
    nextActions: [
      { id: "warehouse.shortage", label: "Показать дефицит", kind: "review", requiresApproval: false, canExecuteDirectly: false },
      { id: "warehouse.discrepancy", label: "Список расхождений", kind: "review", requiresApproval: false, canExecuteDirectly: false },
      { id: "warehouse.draft", label: "Подготовить черновик выдачи/проверки", kind: "draft", requiresApproval: false, canExecuteDirectly: false },
      { id: "warehouse.approval", label: "Отправить спорные позиции на согласование", kind: "submit_for_approval", requiresApproval: true, canExecuteDirectly: false },
    ],
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
  };
}
