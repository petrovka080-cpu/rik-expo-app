import type { DocumentAsset, DocumentAiExtraction, DocumentLinkSuggestion } from "../documentTypes";

export function suggestDocumentLinks(input: {
  document: DocumentAsset;
  extraction: DocumentAiExtraction;
}): DocumentLinkSuggestion[] {
  if (input.document.id !== "pdf_invoice_45") {
    return [];
  }

  const amount = input.extraction.fields.amount;
  const company = input.extraction.fields.companyName;
  const documentNumber = input.extraction.fields.documentNumber;

  return [
    {
      id: "suggest-link-invoice-45-payment-77",
      documentId: input.document.id,
      targetType: "payment",
      targetId: "payment_77",
      labelRu: "Платеж №77",
      reasonRu: "Сумма счета 125 000 KGS совпадает с платежом №77.",
      confidence: "high",
      matchedFields: [
        {
          documentField: "amount",
          documentValueRu: `${amount?.value ?? 125000} ${amount?.currency ?? "KGS"}`,
          appEntityField: "payment.amount",
          appEntityValueRu: "125 000 KGS",
          sourceChunkId: amount?.sourceChunkId,
        },
        {
          documentField: "company",
          documentValueRu: company?.valueRu ?? "ОсОО \"СтройМат\"",
          appEntityField: "payment.company",
          appEntityValueRu: "ОсОО \"СтройМат\"",
          sourceChunkId: company?.sourceChunkId,
        },
      ],
      finalLinkAllowed: false,
      requiresHumanConfirm: true,
    },
    {
      id: "suggest-link-invoice-45-request-124",
      documentId: input.document.id,
      targetType: "procurement_request",
      targetId: "req_124",
      labelRu: "Заявка №124",
      reasonRu: "Позиции ГКЛ и профиль совпадают с заявкой №124.",
      confidence: "high",
      matchedFields: [
        {
          documentField: "document_number",
          documentValueRu: documentNumber?.valueRu ?? "45",
          appEntityField: "request.linkedInvoice",
          appEntityValueRu: "Счет №45",
          sourceChunkId: documentNumber?.sourceChunkId,
        },
      ],
      finalLinkAllowed: false,
      requiresHumanConfirm: true,
    },
    {
      id: "suggest-link-invoice-45-work-31",
      documentId: input.document.id,
      targetType: "work",
      targetId: "work_31",
      labelRu: "Работа ГКЛ перегородки",
      reasonRu: "Товары счета относятся к работе по ГКЛ на первом этаже.",
      confidence: "medium",
      matchedFields: [
        {
          documentField: "line_item",
          documentValueRu: "ГКЛ, профиль",
          appEntityField: "work.materials",
          appEntityValueRu: "ГКЛ перегородки",
          sourceChunkId: input.extraction.fields.lineItems[0]?.sourceChunkId,
        },
      ],
      finalLinkAllowed: false,
      requiresHumanConfirm: true,
    },
  ];
}
