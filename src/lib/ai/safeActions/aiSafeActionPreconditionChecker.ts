import { getAiGoldenBusinessDataset } from "../evaluation/goldenBusinessDataset";
import { getAiSafeActionRegistryEntry } from "./aiSafeActionRegistry";
import type { AiSafeActionKind, AiSafeActionPrecondition } from "./aiSafeActionTypes";

function precondition(params: AiSafeActionPrecondition): AiSafeActionPrecondition {
  return params;
}

function hasAllRefs(sourceRefIds: readonly string[], required: readonly string[]): boolean {
  return required.every((refId) => sourceRefIds.includes(refId));
}

export function checkAiSafeActionPreconditions(params: {
  actionKind: AiSafeActionKind;
  sourceRefIds: readonly string[];
}): AiSafeActionPrecondition[] {
  const dataset = getAiGoldenBusinessDataset();
  const entry = getAiSafeActionRegistryEntry(params.actionKind);
  const requestRef = ["golden:procurement_request:req_124"];
  const gklRefs = [
    "golden:procurement_request:req_124",
    "golden:warehouse_issue:warehouse_issue_88",
    "golden:warehouse_stock:warehouse_stock_gkl",
  ];
  const paymentRefs = ["golden:payment:payment_77", "golden:pdf_document:pdf_invoice_45"];
  const common: AiSafeActionPrecondition[] = [
    precondition({
      id: `${params.actionKind}:source_refs`,
      labelRu: "Источник действия найден",
      status: hasAllRefs(params.sourceRefIds, entry.requiredSourceRefIds) ? "passed" : "missing",
      reasonRu: "Черновик должен ссылаться на реальные sourceRefs, а не на текстовый ответ AI.",
      sourceRefIds: [...params.sourceRefIds],
      requiredForFinalExecution: true,
    }),
  ];

  if (params.actionKind === "procurement_purchase_draft" || params.actionKind === "warehouse_deficit_request_draft") {
    return [
      ...common,
      precondition({
        id: `${params.actionKind}:request_approved`,
        labelRu: "Заявка утверждена",
        status: dataset.procurement.mainRequest.statusRu ? "passed" : "blocked",
        reasonRu: `Заявка №${dataset.procurement.mainRequest.number} имеет статус: ${dataset.procurement.mainRequest.statusRu}.`,
        sourceRefIds: requestRef,
        requiredForFinalExecution: true,
      }),
      precondition({
        id: `${params.actionKind}:warehouse_checked`,
        labelRu: "Склад проверен",
        status: "passed",
        reasonRu: `Выдано ${dataset.warehouse.gkl.issuedSheets}, остаток ${dataset.warehouse.gkl.remainingSheets}, дефицит ${dataset.warehouse.gkl.shortageSheets}.`,
        sourceRefIds: gklRefs,
        requiredForFinalExecution: true,
      }),
      precondition({
        id: `${params.actionKind}:supplier_selected`,
        labelRu: "Поставщик выбран",
        status: "missing",
        reasonRu: "AI не выбирает поставщика автоматически.",
        sourceRefIds: ["golden:marketplace_product:market_product_gkl_12_5"],
        requiredForFinalExecution: true,
      }),
      precondition({
        id: `${params.actionKind}:approval_route`,
        labelRu: "Маршрут согласования",
        status: "requires_review",
        reasonRu: "Финальная закупка требует согласования человеком.",
        sourceRefIds: requestRef,
        requiredForFinalExecution: true,
      }),
    ];
  }

  if (params.actionKind === "accountant_payment_checklist_draft") {
    return [
      ...common,
      precondition({
        id: "accountant_payment_checklist_draft:missing_docs_found",
        labelRu: "Платежи без документов найдены",
        status: "passed",
        reasonRu: `Найдено ${dataset.finance.paymentsMissingDocsCount} платежа на ${dataset.finance.paymentsMissingDocsSumKgs} KGS.`,
        sourceRefIds: paymentRefs,
        requiredForFinalExecution: true,
      }),
      precondition({
        id: "accountant_payment_checklist_draft:no_payment_post",
        labelRu: "Платежи не проводятся",
        status: "passed",
        reasonRu: "Чеклист только показывает недостающие документы.",
        sourceRefIds: paymentRefs,
        requiredForFinalExecution: true,
      }),
    ];
  }

  if (params.actionKind === "accounting_entry_reference_draft") {
    return [
      ...common,
      precondition({
        id: "accounting_entry_reference_draft:country",
        labelRu: "Страна учета указана",
        status: dataset.company.countryCode ? "passed" : "missing",
        reasonRu: `Страна учета: ${dataset.company.countryCode}.`,
        sourceRefIds: paymentRefs,
        requiredForFinalExecution: true,
      }),
      precondition({
        id: "accounting_entry_reference_draft:review",
        labelRu: "Требуется проверка бухгалтера",
        status: "requires_review",
        reasonRu: "Проводка остается справочной рекомендацией.",
        sourceRefIds: paymentRefs,
        requiredForFinalExecution: true,
      }),
    ];
  }

  if (params.actionKind === "foreman_act_draft" || params.actionKind === "work_closeout_checklist_draft") {
    return [
      ...common,
      precondition({
        id: `${params.actionKind}:work_exists`,
        labelRu: "Работа найдена",
        status: "passed",
        reasonRu: "Работа связана с объектом, этажом и evidence.",
        sourceRefIds: ["golden:work:work_32", "golden:work:work_31"],
        requiredForFinalExecution: true,
      }),
      precondition({
        id: `${params.actionKind}:missing_evidence`,
        labelRu: "Evidence проверен",
        status: "missing",
        reasonRu: "Для финального закрытия не хватает подтверждения/фото.",
        sourceRefIds: ["golden:work:work_32"],
        requiredForFinalExecution: true,
      }),
    ];
  }

  if (params.actionKind === "document_link_suggestion_draft") {
    return [
      ...common,
      precondition({
        id: "document_link_suggestion_draft:invoice_fields",
        labelRu: "Поля счета извлечены",
        status: "requires_review",
        reasonRu: `Сумма ${dataset.documents.pdfInvoice45.amountKgs} KGS и компания требуют проверки перед финальной связью.`,
        sourceRefIds: ["golden:pdf_document:pdf_invoice_45"],
        requiredForFinalExecution: true,
      }),
      precondition({
        id: "document_link_suggestion_draft:act_missing",
        labelRu: "Акт отсутствует",
        status: "missing",
        reasonRu: "Платеж нельзя считать закрытым без акта.",
        sourceRefIds: ["golden:payment:payment_77"],
        requiredForFinalExecution: true,
      }),
    ];
  }

  if (params.actionKind === "marketplace_product_card_draft") {
    return [
      ...common,
      precondition({
        id: "marketplace_product_card_draft:product_guess_review",
        labelRu: "Карточка требует модерации",
        status: "requires_review",
        reasonRu: "AI не придумывает цену, остаток, поставщика и точную модель.",
        sourceRefIds: ["golden:marketplace_product:market_product_gkl_12_5"],
        requiredForFinalExecution: true,
      }),
    ];
  }

  if (params.actionKind === "office_reminder_draft" || params.actionKind === "contractor_remark_response_draft") {
    return [
      ...common,
      precondition({
        id: `${params.actionKind}:draft_only`,
        labelRu: "Черновик не отправляется автоматически",
        status: "passed",
        reasonRu: "Отправка возможна только после действия человека.",
        sourceRefIds: [...params.sourceRefIds],
        requiredForFinalExecution: true,
      }),
    ];
  }

  return [
    ...common,
    precondition({
      id: `${params.actionKind}:human_review`,
      labelRu: "Требуется проверка человеком",
      status: "requires_review",
      reasonRu: "AI готовит только черновик и не выполняет финальное действие.",
      sourceRefIds: [...params.sourceRefIds],
      requiredForFinalExecution: true,
    }),
  ];
}
