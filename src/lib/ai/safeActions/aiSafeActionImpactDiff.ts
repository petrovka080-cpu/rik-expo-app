import { getAiGoldenBusinessDataset } from "../evaluation/goldenBusinessDataset";
import { getAiSafeActionRegistryEntry } from "./aiSafeActionRegistry";
import type { AiSafeActionImpactDiff, AiSafeActionKind } from "./aiSafeActionTypes";

function field(fieldRu: string, valueRu: string, sourceRefIds: string[]) {
  return { fieldRu, valueRu, sourceRefIds };
}

function kgs(value: number): string {
  return `${value.toLocaleString("ru-RU")} KGS`;
}

export function buildAiSafeActionImpactDiff(actionKind: AiSafeActionKind): AiSafeActionImpactDiff {
  const dataset = getAiGoldenBusinessDataset();
  const entry = getAiSafeActionRegistryEntry(actionKind);
  const requestRef = ["golden:procurement_request:req_124"];
  const gklRefs = [
    "golden:procurement_request:req_124",
    "golden:warehouse_issue:warehouse_issue_88",
    "golden:warehouse_stock:warehouse_stock_gkl",
  ];
  const paymentRefs = ["golden:payment:payment_77", "golden:payment:payment_78", "golden:payment:payment_79"];
  const invoiceRefs = ["golden:pdf_document:pdf_invoice_45", "golden:invoice:invoice_45"];
  const requiresApproval = entry.mode === "approval_required";

  if (actionKind === "procurement_purchase_draft" || actionKind === "warehouse_deficit_request_draft") {
    return {
      actionKind,
      willCreateDrafts: [
        {
          draftType: "purchase_request",
          labelRu: `Черновик на ${dataset.warehouse.gkl.shortageSheets} листов ${dataset.procurement.mainRequest.materialRu}`,
          fieldsRu: [
            field("товар", dataset.procurement.mainRequest.materialRu, requestRef),
            field("требуется", `${dataset.warehouse.gkl.requiredSheets} листов`, gklRefs),
            field("выдано", `${dataset.warehouse.gkl.issuedSheets} листов`, gklRefs),
            field("остаток", `${dataset.warehouse.gkl.remainingSheets} листов`, gklRefs),
            field("докупить", `${dataset.warehouse.gkl.shortageSheets} листов`, gklRefs),
            field("основание", `заявка №${dataset.procurement.mainRequest.number}`, requestRef),
          ],
        },
      ],
      willNotDo: [...entry.forbiddenFinalActionsRu],
      requiresApproval,
      approvalReasonRu: "Финальная закупка влияет на деньги и требует согласования.",
      businessMutationBlocked: true,
    };
  }

  if (actionKind === "accountant_payment_checklist_draft") {
    return {
      actionKind,
      willCreateDrafts: [
        {
          draftType: "payment_checklist",
          labelRu: `Чеклист по ${dataset.finance.paymentsMissingDocsCount} платежам без документов`,
          fieldsRu: [
            field("количество платежей", String(dataset.finance.paymentsMissingDocsCount), paymentRefs),
            field("сумма", kgs(dataset.finance.paymentsMissingDocsSumKgs), paymentRefs),
            field("платеж №77", kgs(dataset.finance.payments[0]?.amountKgs ?? 0), ["golden:payment:payment_77"]),
            field("PDF счета", "PDF счета №45 есть, акт отсутствует", ["golden:pdf_document:pdf_invoice_45"]),
          ],
        },
      ],
      willNotDo: [...entry.forbiddenFinalActionsRu],
      requiresApproval,
      businessMutationBlocked: true,
    };
  }

  if (actionKind === "accounting_entry_reference_draft") {
    return {
      actionKind,
      willCreateDrafts: [
        {
          draftType: "payment_checklist",
          labelRu: "Справка по возможной проводке",
          fieldsRu: [
            field("страна учета", dataset.company.countryCode, ["golden:payment:payment_77"]),
            field("требует проверки", "да, бухгалтером", ["golden:payment:payment_77"]),
          ],
        },
      ],
      willNotDo: [...entry.forbiddenFinalActionsRu],
      requiresApproval,
      businessMutationBlocked: true,
    };
  }

  if (actionKind === "foreman_act_draft" || actionKind === "work_closeout_checklist_draft") {
    return {
      actionKind,
      willCreateDrafts: [
        {
          draftType: "act_draft",
          labelRu: "Черновик акта/чеклиста по работе",
          fieldsRu: [
            field("работа", "Электрика / ГКЛ перегородки", ["golden:work:work_32", "golden:work:work_31"]),
            field("не хватает", "1 фото или подтверждение evidence", ["golden:work:work_32"]),
          ],
        },
      ],
      willNotDo: [...entry.forbiddenFinalActionsRu],
      requiresApproval,
      approvalReasonRu: requiresApproval ? "Акт и закрытие работы требуют проверки человеком." : undefined,
      businessMutationBlocked: true,
    };
  }

  if (actionKind === "document_link_suggestion_draft") {
    return {
      actionKind,
      willCreateDrafts: [
        {
          draftType: "document_link",
          labelRu: "Черновик связи PDF счета №45",
          fieldsRu: [
            field("сумма", kgs(dataset.documents.pdfInvoice45.amountKgs), invoiceRefs),
            field("компания", dataset.documents.pdfInvoice45.companyRu, invoiceRefs),
            field("платеж", "№77", ["golden:payment:payment_77"]),
            field("заявка", "№124", requestRef),
            field("не хватает", "акт", ["golden:payment:payment_77"]),
          ],
        },
      ],
      willNotDo: [...entry.forbiddenFinalActionsRu],
      requiresApproval,
      approvalReasonRu: "Финальная связь документа требует проверки.",
      businessMutationBlocked: true,
    };
  }

  if (actionKind === "marketplace_product_card_draft") {
    return {
      actionKind,
      willCreateDrafts: [
        {
          draftType: "marketplace_product",
          labelRu: "Черновик карточки товара",
          fieldsRu: [
            field("название", "Профиль металлический для ГКЛ", ["golden:marketplace_product:market_product_gkl_12_5"]),
            field("категория", "Строительные материалы", ["golden:marketplace_product:market_product_gkl_12_5"]),
            field("что уточнить", "цена, остаток, поставщик, размер, толщина, производитель", ["golden:marketplace_product:market_product_gkl_12_5"]),
          ],
        },
      ],
      willNotDo: [...entry.forbiddenFinalActionsRu],
      requiresApproval,
      approvalReasonRu: "Публикация товара требует модерации.",
      businessMutationBlocked: true,
    };
  }

  if (actionKind === "office_reminder_draft") {
    return {
      actionKind,
      willCreateDrafts: [
        {
          draftType: "reminder",
          labelRu: "Черновик напоминания по зависшим документам",
          fieldsRu: [
            field("бухгалтеру", "проверить платеж №77", ["golden:payment:payment_77"]),
            field("прорабу", "загрузить фото/evidence", ["golden:work:work_31"]),
            field("директору", "рассмотреть заявку №124", requestRef),
          ],
        },
      ],
      willNotDo: [...entry.forbiddenFinalActionsRu],
      requiresApproval,
      businessMutationBlocked: true,
    };
  }

  if (actionKind === "client_progress_report_draft") {
    return {
      actionKind,
      willCreateDrafts: [
        {
          draftType: "client_report",
          labelRu: "Черновик клиентского отчета",
          fieldsRu: [
            field("выполнено", "5 задач за неделю", ["golden:report:client_weekly_report"]),
            field("задерживается", `${dataset.warehouse.gkl.shortageSheets} листов ГКЛ и акт по электрике`, ["golden:work:work_31", "golden:work:work_32"]),
          ],
        },
      ],
      willNotDo: [...entry.forbiddenFinalActionsRu],
      requiresApproval,
      approvalReasonRu: "Клиентский отчет требует проверки перед публикацией.",
      businessMutationBlocked: true,
    };
  }

  return {
    actionKind,
    willCreateDrafts: [
      {
        draftType: entry.draftType,
        labelRu: entry.titleRu,
        fieldsRu: [field("статус", "черновик", entry.requiredSourceRefIds)],
      },
    ],
    willNotDo: [...entry.forbiddenFinalActionsRu],
    requiresApproval,
    businessMutationBlocked: true,
  };
}
