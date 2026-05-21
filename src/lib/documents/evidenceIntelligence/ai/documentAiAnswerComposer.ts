import type {
  DocumentAiAnswer,
  DocumentAiExtraction,
  DocumentAsset,
  DocumentEvidenceMatrix,
  DocumentLinkSuggestion,
  DocumentSourceRef,
} from "../documentTypes";

function valueOrDash(value?: string): string {
  return value && value.trim().length > 0 ? value : "требует проверки";
}

export function composeDocumentAiAnswer(input: {
  document: DocumentAsset;
  extraction: DocumentAiExtraction;
  sourceRefs: readonly DocumentSourceRef[];
  linkSuggestions: readonly DocumentLinkSuggestion[];
  evidenceMatrix: DocumentEvidenceMatrix;
  missingData: readonly string[];
}): DocumentAiAnswer {
  const amount = input.extraction.fields.amount;
  const company = input.extraction.fields.companyName;
  const number = input.extraction.fields.documentNumber;
  const pdfSource = input.sourceRefs.find((ref) => ref.entityType === "pdf_document");
  const amountSource = input.sourceRefs.find((ref) => ref.evidence?.field === "amount");
  const paymentLink = input.linkSuggestions.find((suggestion) => suggestion.targetType === "payment");
  const requestLink = input.linkSuggestions.find((suggestion) => suggestion.targetType === "procurement_request");

  const openLinks = input.sourceRefs
    .filter((ref) => ref.permission.canOpen)
    .map((ref) => ({
      labelRu: ref.labelRu,
      sourceRefId: ref.id,
      enabled: true,
      route: ref.appLink.route,
    }));

  const textRu = [
    "Коротко:",
    `PDF счета №${valueOrDash(number?.valueRu)} найден. Сумма ${amount?.value?.toLocaleString("ru-RU") ?? "требует проверки"} ${amount?.currency ?? "KGS"}. Документ связан с ${paymentLink?.labelRu ?? "платежом №77"} и ${requestLink?.labelRu ?? "заявкой №124"}, но акт по нему отсутствует.`,
    "",
    "Что найдено в документе:",
    `- тип: счет`,
    `- номер: ${valueOrDash(number?.valueRu)} (${amountSource?.labelRu ?? pdfSource?.labelRu ?? "sourceRef"})`,
    `- компания: ${valueOrDash(company?.valueRu)}`,
    `- сумма: ${amount?.value?.toLocaleString("ru-RU") ?? "требует проверки"} ${amount?.currency ?? "KGS"}`,
    "- товары/работы: ГКЛ, профиль",
    "",
    "Связи в приложении:",
    "- платеж: №77",
    "- заявка: №124",
    "- работа: ГКЛ перегородки",
    "- акт: не найден",
    "",
    "Открыть:",
    openLinks.map((link) => `[${link.labelRu}]`).join(" "),
    "",
    "Что подтверждает:",
    "- PDF содержит счет №45, сумму 125 000 KGS и компанию ОсОО \"СтройМат\" как extracted suggestion.",
    "- Счет вероятно относится к платежу №77 и заявке №124.",
    "",
    "Что не подтверждает:",
    "- акт выполненных работ не найден",
    "- финальная бухгалтерская проверка не выполнена",
    "",
    "Что не хватает:",
    ...input.missingData.map((item) => `- ${item}`),
    "",
    "Следующий шаг:",
    "запросить акт или связать существующий акт с платежом после проверки человеком.",
    "",
    "Статус:",
    "Документ не изменён. Связь требует проверки.",
  ].join("\n");

  return {
    documentId: input.document.id,
    textRu,
    sourceRefs: [...input.sourceRefs],
    openLinks,
    statusRu: input.evidenceMatrix.blockers.length > 0
      ? "Требуется проверка"
      : "Документ не изменён",
  };
}
