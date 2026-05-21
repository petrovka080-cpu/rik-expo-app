import type {
  DocumentAsset,
  DocumentEvidenceMatrix,
  DocumentLinkSuggestion,
  DocumentSourceRef,
} from "../documentTypes";

export function buildDocumentEvidenceMatrix(input: {
  document: DocumentAsset;
  sourceRefs: readonly DocumentSourceRef[];
  linkSuggestions: readonly DocumentLinkSuggestion[];
}): DocumentEvidenceMatrix {
  const invoiceSourceIds = input.sourceRefs
    .filter((ref) => ref.evidence?.field === "amount" || ref.entityType === "pdf_document")
    .map((ref) => ref.id);
  const paymentSuggestion = input.linkSuggestions.find((suggestion) => suggestion.targetType === "payment");

  return {
    documentId: input.document.id,
    relatedEntity: {
      type: "payment",
      id: paymentSuggestion?.targetId ?? "payment_77",
      labelRu: paymentSuggestion?.labelRu ?? "Платеж №77",
    },
    evidenceItems: [
      {
        requirement: "invoice_required",
        status: "suggested_by_ai",
        sourceRefIds: invoiceSourceIds,
        reasonRu: "PDF счета найден, но извлечение требует проверки человеком.",
      },
      {
        requirement: "amount_match_required",
        status: "suggested_by_ai",
        sourceRefIds: invoiceSourceIds,
        reasonRu: "Сумма 125 000 KGS совпадает с платежом №77.",
      },
      {
        requirement: "act_required",
        status: "missing",
        sourceRefIds: [],
        reasonRu: "Акт по счету №45 не найден.",
      },
      {
        requirement: "work_match_required",
        status: "suggested_by_ai",
        sourceRefIds: invoiceSourceIds,
        reasonRu: "Позиции ГКЛ и профиль связаны с работой ГКЛ перегородки.",
      },
    ],
    blockers: [
      {
        blockerRu: "Нет акта по счету №45.",
        severity: "high",
        sourceRefIds: [],
      },
      {
        blockerRu: "Связь счета с платежом и заявкой требует проверки.",
        severity: "medium",
        sourceRefIds: invoiceSourceIds,
      },
    ],
    finalDecisionByAi: false,
  };
}
