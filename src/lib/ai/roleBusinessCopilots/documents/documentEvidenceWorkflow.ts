import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildDocumentEvidenceWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;
  const pdf = dataset.documents.pdfInvoice45;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "documents",
    shortAnswerRu: `PDF счета №${pdf.invoiceNumber} связан с платежом №77 и заявкой №${dataset.procurement.mainRequest.number}, но акт по нему отсутствует.`,
    businessState: {
      currentStatusRu: "Документ прочитан и сопоставлен по существующим связям.",
      blockerRu: "Оплату блокирует отсутствующий акт и подтверждение приемки.",
      priorityRu: "Не создавать финальную связь без проверки.",
    },
    facts: [
      {
        textRu: `Тип документа: счет №${pdf.invoiceNumber}, сумма ${pdf.amountKgs} KGS, компания ${pdf.companyRu}.`,
        sourceRefIds: [sourceRefIds.pdfInvoice45, sourceRefIds.invoice45],
        numericFacts: [
          { key: "invoice_number", value: pdf.invoiceNumber },
          { key: "invoice_amount", value: pdf.amountKgs, unit: "KGS" },
          { key: "pdf_page", value: pdf.page },
        ],
      },
      {
        textRu: `Товары в PDF: ${pdf.goodsRu.join(", ")}; связь: платеж №77, заявка №${dataset.procurement.mainRequest.number}, работа "${dataset.procurement.mainRequest.workRu}".`,
        sourceRefIds: [sourceRefIds.pdfInvoice45, sourceRefIds.payment77, sourceRefIds.request124, sourceRefIds.workGkl],
        numericFacts: [{ key: "linked_internal_objects", value: 4 }],
      },
      {
        textRu: `Акт не найден: missing link = ${pdf.missingLinkRu}.`,
        sourceRefIds: [sourceRefIds.payment77, sourceRefIds.pdfInvoice45],
        numericFacts: [{ key: "missing_act", value: 1 }],
      },
    ],
    chain: [
      { stepRu: "PDF счета №45 найден", sourceRefIds: [sourceRefIds.pdfInvoice45], status: "done" },
      { stepRu: "Платеж №77 связан с PDF", sourceRefIds: [sourceRefIds.payment77, sourceRefIds.pdfInvoice45], status: "done" },
      { stepRu: "Заявка №124 и работа ГКЛ найдены", sourceRefIds: [sourceRefIds.request124, sourceRefIds.workGkl], status: "done" },
      { stepRu: "Акт отсутствует", sourceRefIds: [sourceRefIds.payment77], status: "missing" },
      { stepRu: "Связать акт можно только после review", sourceRefIds: [sourceRefIds.invoice45], status: "pending" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.pdfInvoice45,
      sourceRefIds.payment77,
      sourceRefIds.request124,
      sourceRefIds.workGkl,
      sourceRefIds.invoice45,
    ]),
    missingData: ["акт", "подтверждение приемки"],
    nextStepRu: "Запросить акт или связать существующий акт с платежом только после проверки.",
    statusRu: "Данные не изменены",
    approvalRequired: true,
  });
}
