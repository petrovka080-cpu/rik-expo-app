import type { AiAppEntityType, AiSourceOrigin, AiSourceRef } from "../../appContextGraph";
import type { AiGoldenBusinessDataset } from "./aiGoldenBusinessDatasetTypes";
import { AI_GOLDEN_DOCUMENT_DATA } from "./aiGoldenDocumentData";
import { AI_GOLDEN_FIELD_DATA } from "./aiGoldenFieldData";
import { AI_GOLDEN_FINANCE_DATA } from "./aiGoldenFinanceData";
import { AI_GOLDEN_MARKETPLACE_DATA } from "./aiGoldenMarketplaceData";
import { AI_GOLDEN_PROCUREMENT_DATA } from "./aiGoldenProcurementData";
import { AI_GOLDEN_WAREHOUSE_DATA } from "./aiGoldenWarehouseData";

function sourceRef(input: {
  entityType: AiAppEntityType;
  entityId: string;
  labelRu: string;
  origin?: AiSourceOrigin;
  route: string;
  params: Record<string, string>;
  field?: string;
  valuePreviewRu?: string;
  page?: number;
  highlightText?: string;
}): AiSourceRef {
  return {
    id: `golden:${input.entityType}:${input.entityId}`,
    origin: input.origin ?? "app_data",
    entityType: input.entityType,
    entityId: input.entityId,
    labelRu: input.labelRu,
    appLink: {
      route: input.route,
      params: input.params,
      page: input.page,
      highlightText: input.highlightText,
    },
    permission: { canOpen: true },
    evidence: {
      field: input.field,
      valuePreviewRu: input.valuePreviewRu,
      documentPage: input.page,
      confidence: "high",
    },
    canBePresentedAsFact: true,
    requiresReview: false,
  };
}

export function getAiGoldenBusinessSourceRefs(): AiSourceRef[] {
  return [
    sourceRef({
      entityType: "procurement_request",
      entityId: "req_124",
      labelRu: "Заявка №124",
      origin: "procurement",
      route: "/procurement/requests/[id]",
      params: { id: "req_124" },
      field: "requiredSheets",
      valuePreviewRu: "80 листов ГКЛ 12.5 мм",
    }),
    sourceRef({
      entityType: "work",
      entityId: "work_31",
      labelRu: "Работа ГКЛ перегородки",
      origin: "field",
      route: "/field/works/[id]",
      params: { id: "work_31" },
      field: "floor",
      valuePreviewRu: "Дом 1, этаж 1",
    }),
    sourceRef({
      entityType: "work",
      entityId: "work_32",
      labelRu: "Работа Электрика",
      origin: "field",
      route: "/field/works/[id]",
      params: { id: "work_32" },
      field: "blocker",
      valuePreviewRu: "нужен акт скрытых работ",
    }),
    sourceRef({
      entityType: "work",
      entityId: "work_33",
      labelRu: "Работа Штукатурка",
      origin: "field",
      route: "/field/works/[id]",
      params: { id: "work_33" },
      field: "blocker",
      valuePreviewRu: "нужно фото",
    }),
    sourceRef({
      entityType: "work",
      entityId: "work_34",
      labelRu: "Работа Гидроизоляция",
      origin: "field",
      route: "/field/works/[id]",
      params: { id: "work_34" },
      field: "blocker",
      valuePreviewRu: "требуется фото подтверждения",
    }),
    sourceRef({
      entityType: "warehouse_issue",
      entityId: "warehouse_issue_88",
      labelRu: "Складская выдача №88",
      origin: "warehouse",
      route: "/warehouse/issues/[id]",
      params: { id: "warehouse_issue_88" },
      field: "issuedSheets",
      valuePreviewRu: "20 листов",
    }),
    sourceRef({
      entityType: "warehouse_stock",
      entityId: "warehouse_stock_gkl",
      labelRu: "Остаток ГКЛ",
      origin: "warehouse",
      route: "/warehouse/stock/[id]",
      params: { id: "warehouse_stock_gkl" },
      field: "remainingSheets",
      valuePreviewRu: "0 листов",
    }),
    sourceRef({
      entityType: "payment",
      entityId: "payment_77",
      labelRu: "Платеж №77",
      origin: "finance",
      route: "/finance/payments/[id]",
      params: { id: "payment_77" },
      field: "amountKgs",
      valuePreviewRu: "125 000 KGS",
    }),
    sourceRef({
      entityType: "payment",
      entityId: "payment_78",
      labelRu: "Платеж №78",
      origin: "finance",
      route: "/finance/payments/[id]",
      params: { id: "payment_78" },
      field: "amountKgs",
      valuePreviewRu: "80 000 KGS",
    }),
    sourceRef({
      entityType: "payment",
      entityId: "payment_79",
      labelRu: "Платеж №79",
      origin: "finance",
      route: "/finance/payments/[id]",
      params: { id: "payment_79" },
      field: "amountKgs",
      valuePreviewRu: "40 000 KGS",
    }),
    sourceRef({
      entityType: "pdf_document",
      entityId: "pdf_invoice_45",
      labelRu: "PDF счета №45",
      origin: "pdf_document",
      route: "/documents/pdf/[id]",
      params: { id: "pdf_invoice_45" },
      field: "amountKgs",
      valuePreviewRu: "125 000 KGS",
      page: 1,
      highlightText: "125 000 KGS",
    }),
    sourceRef({
      entityType: "invoice",
      entityId: "invoice_45",
      labelRu: "Счет №45",
      origin: "documents",
      route: "/finance/invoices/[id]",
      params: { id: "invoice_45" },
      field: "company",
      valuePreviewRu: "ОсОО \"СтройМат\"",
    }),
    sourceRef({
      entityType: "marketplace_product",
      entityId: "market_product_gkl_12_5",
      labelRu: "Товар ГКЛ 12.5 мм",
      origin: "internal_marketplace",
      route: "/market/products/[id]",
      params: { id: "market_product_gkl_12_5" },
      field: "options",
      valuePreviewRu: "2 внутренних варианта",
    }),
    sourceRef({
      entityType: "supplier",
      entityId: "supplier_stroymat",
      labelRu: "Поставщик СтройМат",
      origin: "supplier_history",
      route: "/market/suppliers/[id]",
      params: { id: "supplier_stroymat" },
      field: "historyOptions",
      valuePreviewRu: "1 поставщик из истории закупок",
    }),
    sourceRef({
      entityType: "report",
      entityId: "client_weekly_report",
      labelRu: "Клиентский отчет за неделю",
      origin: "reports",
      route: "/client/reports/[id]",
      params: { id: "client_weekly_report" },
      field: "completedTasks",
      valuePreviewRu: "5 задач выполнено",
    }),
    sourceRef({
      entityType: "contractor",
      entityId: "contractor_golden",
      labelRu: "Подрядчик: мой scope",
      origin: "field",
      route: "/contractor/me",
      params: { id: "contractor_golden" },
      field: "openWorks",
      valuePreviewRu: "4 открытые работы",
    }),
  ];
}

export function getAiGoldenBusinessDataset(): AiGoldenBusinessDataset {
  return {
    datasetId: "golden-business-dataset-v1",
    purpose: "deterministic_evaluation_only_not_production_user_data",
    company: {
      id: "company_golden",
      nameRu: "Golden Evaluation Company",
      countryCode: "KG",
      currency: "KGS",
    },
    objects: [...AI_GOLDEN_FIELD_DATA.objects],
    works: [...AI_GOLDEN_FIELD_DATA.works],
    procurement: AI_GOLDEN_PROCUREMENT_DATA,
    warehouse: AI_GOLDEN_WAREHOUSE_DATA,
    finance: AI_GOLDEN_FINANCE_DATA,
    documents: AI_GOLDEN_DOCUMENT_DATA,
    marketplace: AI_GOLDEN_MARKETPLACE_DATA,
    contractor: {
      openWorks: 4,
      needsPhoto: 2,
      needsAct: 1,
      openRemarks: 1,
    },
    sourceRefs: getAiGoldenBusinessSourceRefs(),
  };
}

export function findAiGoldenSourceRef(
  dataset: AiGoldenBusinessDataset,
  entityType: AiAppEntityType,
  entityId?: string,
): AiSourceRef | undefined {
  return dataset.sourceRefs.find((ref) =>
    ref.entityType === entityType && (entityId ? ref.entityId === entityId : true),
  );
}
