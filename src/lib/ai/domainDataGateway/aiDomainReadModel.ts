import { getAiGoldenBusinessDataset } from "../evaluation/goldenBusinessDataset";
import { createAiDomainSafeStatus, type AiDomainOpenLink, type AiDomainQueryResult, type AiDomainSourceRef } from "./aiDomainContextBundle";
import { getAiDomainFreshness } from "./aiDomainFreshnessPolicy";
import { createAiDomainNumericFact, type AiDomainNumericFact } from "./aiDomainNumericFacts";
import type { AiDomainName } from "./aiDomainQueryTypes";

export const AI_DOMAIN_GATEWAY_SOURCE_REFS = {
  request124: {
    id: "domain:procurement:req_124",
    origin: "procurement",
    entityType: "procurement_request",
    entityId: "req_124",
    labelRu: "Заявка №124",
    appLink: { route: "/procurement/requests/[id]", params: { id: "req_124" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
  workGkl: {
    id: "domain:field:work_31",
    origin: "field",
    entityType: "work",
    entityId: "work_31",
    labelRu: "Работа ГКЛ перегородки",
    appLink: { route: "/field/works/[id]", params: { id: "work_31" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
  warehouseIssue: {
    id: "domain:warehouse:warehouse_issue_88",
    origin: "warehouse",
    entityType: "warehouse_issue",
    entityId: "warehouse_issue_88",
    labelRu: "Складская выдача №88",
    appLink: { route: "/warehouse/issues/[id]", params: { id: "warehouse_issue_88" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
  warehouseStockGkl: {
    id: "domain:warehouse:warehouse_stock_gkl",
    origin: "warehouse",
    entityType: "warehouse_stock",
    entityId: "warehouse_stock_gkl",
    labelRu: "Остаток ГКЛ 12.5 мм",
    appLink: { route: "/warehouse/stock/[id]", params: { id: "warehouse_stock_gkl" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
  payment77: {
    id: "domain:finance:payment_77",
    origin: "finance",
    entityType: "payment",
    entityId: "payment_77",
    labelRu: "Платеж №77",
    appLink: { route: "/finance/payments/[id]", params: { id: "payment_77" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
  invoice45: {
    id: "domain:documents:invoice_45",
    origin: "documents",
    entityType: "invoice",
    entityId: "invoice_45",
    labelRu: "Счет №45",
    appLink: { route: "/finance/invoices/[id]", params: { id: "invoice_45" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: true,
  },
  pdfInvoice45: {
    id: "domain:documents:pdf_invoice_45",
    origin: "pdf_document",
    entityType: "pdf_document",
    entityId: "pdf_invoice_45",
    labelRu: "PDF счета №45",
    appLink: {
      route: "/documents/pdf/[id]",
      params: { id: "pdf_invoice_45" },
      page: 1,
      highlightText: "125 000 KGS",
    },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: true,
  },
  marketplaceGkl: {
    id: "domain:marketplace:market_product_gkl_12_5",
    origin: "marketplace",
    entityType: "marketplace_product",
    entityId: "market_product_gkl_12_5",
    labelRu: "Товар ГКЛ 12.5 мм",
    appLink: { route: "/market/products/[id]", params: { id: "market_product_gkl_12_5" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
  supplierStroymat: {
    id: "domain:marketplace:supplier_stroymat",
    origin: "marketplace",
    entityType: "supplier",
    entityId: "supplier_stroymat",
    labelRu: "Поставщик СтройМат",
    appLink: { route: "/market/suppliers/[id]", params: { id: "supplier_stroymat" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
  contractorScope: {
    id: "domain:contractors:contractor_golden",
    origin: "field",
    entityType: "contractor",
    entityId: "contractor_golden",
    labelRu: "Scope подрядчика",
    appLink: { route: "/contractor/me", params: { id: "contractor_golden" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
  clientReport: {
    id: "domain:client:client_weekly_report",
    origin: "office",
    entityType: "report",
    entityId: "client_weekly_report",
    labelRu: "Клиентский отчет за неделю",
    appLink: { route: "/client/reports/[id]", params: { id: "client_weekly_report" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
  approvalQueue: {
    id: "domain:approvals:director_today",
    origin: "approval",
    entityType: "approval",
    entityId: "director_today",
    labelRu: "Очередь решений директора",
    appLink: { route: "/ai-approval-inbox", params: { approvalId: "director_today" } },
    permission: { canOpen: true },
    canBePresentedAsFact: true,
    requiresReview: false,
  },
} satisfies Record<string, AiDomainSourceRef>;

export function getAiDomainGatewayDataset() {
  return getAiGoldenBusinessDataset();
}

export function refs(...refs: AiDomainSourceRef[]): AiDomainSourceRef[] {
  return refs;
}

export function openLinksFor(sourceRefs: readonly AiDomainSourceRef[]): AiDomainOpenLink[] {
  return sourceRefs.map((sourceRef) => ({
    labelRu: sourceRef.labelRu,
    sourceRefId: sourceRef.id,
    enabled: sourceRef.permission.canOpen,
    route: sourceRef.appLink?.route,
    disabledReasonRu: sourceRef.permission.reasonRu,
  }));
}

export function fact(
  key: string,
  value: number,
  labelRu: string,
  sourceRefIds: string[],
  unit?: string,
): AiDomainNumericFact {
  return createAiDomainNumericFact({ key, value, unit, labelRu, sourceRefIds });
}

export function createFoundAiDomainResult(input: {
  queryId: string;
  domain: AiDomainName;
  summaryRu: string;
  sourceRefs: AiDomainSourceRef[];
  numericFacts?: AiDomainNumericFact[];
  factsRu?: {
    textRu: string;
    sourceRefIds: string[];
    status?: "found" | "missing" | "risk" | "blocked" | "draft" | "checked_empty";
  }[];
  linkedObjectRefs?: string[];
  missingData?: string[];
  checkedSources?: {
    sourceRu: string;
    status: "used" | "checked_empty" | "permission_limited";
  }[];
}): AiDomainQueryResult {
  return {
    queryId: input.queryId,
    domain: input.domain,
    status: "found",
    summaryRu: input.summaryRu,
    numericFacts: input.numericFacts ?? [],
    facts: (input.factsRu ?? []).map((item) => ({
      ...item,
      status: item.status ?? "found",
    })),
    sourceRefs: input.sourceRefs,
    openLinks: openLinksFor(input.sourceRefs),
    linkedObjectRefs: input.linkedObjectRefs ?? input.sourceRefs.map((ref) => ref.id),
    missingData: input.missingData ?? [],
    permissionLimits: [],
    checkedSources: input.checkedSources ?? [{ sourceRu: input.domain, status: "used" }],
    freshness: getAiDomainFreshness(input.domain),
    safety: createAiDomainSafeStatus(),
  };
}

export function createPermissionLimitedAiDomainResult(input: {
  queryId: string;
  domain: AiDomainName;
  hiddenSourceType: string;
  reasonRu: string;
}): AiDomainQueryResult {
  return {
    queryId: input.queryId,
    domain: input.domain,
    status: "permission_limited",
    summaryRu: input.reasonRu,
    numericFacts: [],
    facts: [],
    sourceRefs: [],
    openLinks: [],
    linkedObjectRefs: [],
    missingData: [],
    permissionLimits: [
      {
        hiddenSourceType: input.hiddenSourceType,
        reasonRu: input.reasonRu,
      },
    ],
    checkedSources: [{ sourceRu: input.domain, status: "permission_limited" }],
    freshness: getAiDomainFreshness(input.domain),
    safety: createAiDomainSafeStatus(),
  };
}
