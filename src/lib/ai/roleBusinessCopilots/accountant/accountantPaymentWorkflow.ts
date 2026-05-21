import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildAccountantPaymentWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;
  const [payment77, payment78, payment79] = dataset.finance.payments;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "accountant",
    shortAnswerRu: `Найдено ${dataset.finance.paymentsMissingDocsCount} платежа без полного пакета документов на сумму ${dataset.finance.paymentsMissingDocsSumKgs} KGS.`,
    businessState: {
      currentStatusRu: "Платежи требуют проверки документов.",
      blockerRu: "Не хватает акта, договора и подтверждающего PDF.",
      riskRu: "Проводка и оплата возможны только как справочная проверка с участием бухгалтера.",
      priorityRu: "Сначала документы, затем бухгалтерская проверка.",
    },
    facts: [
      {
        textRu: `Платеж №${payment77?.number} - ${payment77?.amountKgs} KGS, компания ${payment77?.companyRu}, есть PDF счета №45, не хватает акта.`,
        sourceRefIds: [sourceRefIds.payment77, sourceRefIds.pdfInvoice45, sourceRefIds.request124, sourceRefIds.workGkl],
        numericFacts: [
          { key: "payments_missing_docs_count", value: dataset.finance.paymentsMissingDocsCount },
          { key: "payments_missing_docs_sum", value: dataset.finance.paymentsMissingDocsSumKgs, unit: "KGS" },
          { key: "payment_77_sum", value: payment77?.amountKgs ?? 0, unit: "KGS" },
        ],
      },
      {
        textRu: `Платеж №${payment78?.number} - ${payment78?.amountKgs} KGS, частично оплачено ${payment78?.partialPaidKgs} KGS, не хватает договора.`,
        sourceRefIds: [sourceRefIds.payment78],
        numericFacts: [
          { key: "payment_78_sum", value: payment78?.amountKgs ?? 0, unit: "KGS" },
          { key: "payment_78_partial_paid", value: payment78?.partialPaidKgs ?? 0, unit: "KGS" },
        ],
      },
      {
        textRu: `Платеж №${payment79?.number} - ${payment79?.amountKgs} KGS, не хватает подтверждающего PDF.`,
        sourceRefIds: [sourceRefIds.payment79],
        numericFacts: [{ key: "payment_79_sum", value: payment79?.amountKgs ?? 0, unit: "KGS" }],
      },
      {
        textRu: `Страна учета: ${dataset.company.countryCode}. Проводка - только справочная рекомендация, требуется проверка бухгалтером.`,
        sourceRefIds: [sourceRefIds.invoice45, sourceRefIds.payment77],
        numericFacts: [{ key: "accounting_review_required", value: 1 }],
      },
    ],
    chain: [
      { stepRu: "Счет №45 найден", sourceRefIds: [sourceRefIds.invoice45], status: "done" },
      { stepRu: "PDF счета связан с платежом №77", sourceRefIds: [sourceRefIds.pdfInvoice45, sourceRefIds.payment77], status: "done" },
      { stepRu: "Заявка №124 и работа ГКЛ связаны с платежом", sourceRefIds: [sourceRefIds.request124, sourceRefIds.workGkl], status: "done" },
      { stepRu: "Акт по платежу №77 отсутствует", sourceRefIds: [sourceRefIds.payment77], status: "blocked" },
      { stepRu: "Договор по платежу №78 отсутствует", sourceRefIds: [sourceRefIds.payment78], status: "blocked" },
      { stepRu: "PDF по платежу №79 отсутствует", sourceRefIds: [sourceRefIds.payment79], status: "blocked" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.payment77,
      sourceRefIds.pdfInvoice45,
      sourceRefIds.request124,
      sourceRefIds.workGkl,
      sourceRefIds.payment78,
      sourceRefIds.payment79,
    ]),
    draft: {
      titleRu: "Чеклист документов к оплате",
      bodyRu: "Запросить акт по платежу №77, договор по платежу №78 и подтверждающий PDF по платежу №79. Проводка требует проверки бухгалтером.",
      draftType: "payment_checklist",
      finalSubmitAllowed: false,
    },
    missingData: ["акт по платежу №77", "договор по платежу №78", "подтверждающий PDF по платежу №79", "учетная политика"],
    nextStepRu: "Запросить недостающие документы и проверить справочную проводку бухгалтером до оплаты.",
    statusRu: "Данные не изменены",
    approvalRequired: true,
  });
}
