import type { AiRoleScreenAssistantPack } from "../realAssistants/aiRoleScreenAssistantTypes";

export type DocumentReadySummaryEvidence = {
  id: string;
  title: string;
  linkedRequestId?: string;
  linkedPaymentLabel?: string;
  importantFields?: string[];
  missingEvidence?: string[];
  risks?: string[];
  evidence: string[];
};

export function buildDocumentReadySummaryAssistant(params: {
  screenId?: string;
  role?: string;
  document?: DocumentReadySummaryEvidence | null;
}): AiRoleScreenAssistantPack {
  const document = params.document ?? null;
  const missing = document?.missingEvidence ?? [];
  const risks = document?.risks ?? [];

  return {
    screenId: params.screenId ?? "documents.main",
    role: params.role ?? "office",
    domain: "documents",
    title: "Документ готов к разбору",
    summary: document
      ? `Документ: ${document.title}. ${document.linkedRequestId ? `Связан с заявкой ${document.linkedRequestId}. ` : ""}${document.linkedPaymentLabel ? `Связан с платежом ${document.linkedPaymentLabel}.` : ""}`
      : "Нет выбранного документа в read-only срезе. Я не выдумываю документ, сумму или evidence.",
    today: document ? { count: 1, criticalCount: risks.length, overdueCount: missing.length } : undefined,
    readyItems: document
      ? [{
        id: `document.summary.${document.id}`,
        title: document.title,
        description: [
          document.importantFields?.length ? `Важное: ${document.importantFields.join(", ")}.` : null,
          missing.length ? `Missing evidence: ${missing.join(", ")}.` : null,
        ].filter(Boolean).join(" "),
        evidence: document.evidence,
        riskLevel: risks.length ? "medium" : "low",
        actionKind: "draft_only",
        primaryActionLabel: "Подготовить резюме",
        secondaryActionLabel: missing.length ? "Запросить missing evidence" : "Подготовить комментарий",
      }]
      : [],
    risks: risks.map((risk, index) => ({
      id: `document.risk.${index}`,
      title: document?.title ?? "Документ",
      reason: risk,
      severity: "medium",
      evidence: document?.evidence ?? [],
    })),
    missingData: missing.map((label, index) => ({
      id: `document.missing.${index}`,
      label,
      blocksAction: true,
    })),
    nextActions: [
      { id: "document.summary", label: "Подготовить резюме", kind: "draft", requiresApproval: false, canExecuteDirectly: false },
      { id: "document.evidence", label: "Запросить missing evidence", kind: "request_more_data", requiresApproval: false, canExecuteDirectly: false },
      { id: "document.comment", label: "Подготовить комментарий", kind: "draft", requiresApproval: false, canExecuteDirectly: false },
    ],
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
  };
}
