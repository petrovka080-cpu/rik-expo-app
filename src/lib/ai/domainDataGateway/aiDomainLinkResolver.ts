import { AI_DOMAIN_GATEWAY_SOURCE_REFS } from "./aiDomainReadModel";
import type { AiDomainName } from "./aiDomainQueryTypes";

export type AiCrossDomainLink = {
  from: {
    domain: AiDomainName;
    entityType: string;
    entityId: string;
    sourceRefId: string;
  };
  relation:
    | "request_contains_material"
    | "request_for_work"
    | "request_for_floor"
    | "request_approved_by"
    | "request_to_purchase"
    | "purchase_to_supplier"
    | "purchase_to_warehouse_incoming"
    | "warehouse_issued_to_work"
    | "work_has_media"
    | "work_has_act"
    | "act_has_document"
    | "invoice_for_payment"
    | "payment_has_pdf"
    | "document_blocks_payment"
    | "media_supports_work"
    | "product_matches_request";
  to: {
    domain: AiDomainName;
    entityType: string;
    entityId: string;
    sourceRefId: string;
  };
  confidence: "high" | "medium" | "low";
  requiresReview: boolean;
};

function endpoint(domain: AiDomainName, entityType: string, entityId: string, sourceRefId: string) {
  return {
    domain,
    entityType,
    entityId,
    sourceRefId,
  };
}

export function buildAiGoldenCrossDomainLinks(): AiCrossDomainLink[] {
  const refs = AI_DOMAIN_GATEWAY_SOURCE_REFS;
  return [
    {
      from: endpoint("procurement", "procurement_request", "req_124", refs.request124.id),
      relation: "request_contains_material",
      to: endpoint("marketplace", "marketplace_product", "market_product_gkl_12_5", refs.marketplaceGkl.id),
      confidence: "high",
      requiresReview: false,
    },
    {
      from: endpoint("procurement", "procurement_request", "req_124", refs.request124.id),
      relation: "request_for_work",
      to: endpoint("field", "work", "work_31", refs.workGkl.id),
      confidence: "high",
      requiresReview: false,
    },
    {
      from: endpoint("warehouse", "warehouse_issue", "warehouse_issue_88", refs.warehouseIssue.id),
      relation: "warehouse_issued_to_work",
      to: endpoint("field", "work", "work_31", refs.workGkl.id),
      confidence: "high",
      requiresReview: false,
    },
    {
      from: endpoint("documents", "invoice", "invoice_45", refs.invoice45.id),
      relation: "invoice_for_payment",
      to: endpoint("finance", "payment", "payment_77", refs.payment77.id),
      confidence: "high",
      requiresReview: true,
    },
    {
      from: endpoint("finance", "payment", "payment_77", refs.payment77.id),
      relation: "payment_has_pdf",
      to: endpoint("documents", "pdf_document", "pdf_invoice_45", refs.pdfInvoice45.id),
      confidence: "high",
      requiresReview: true,
    },
    {
      from: endpoint("documents", "pdf_document", "pdf_invoice_45", refs.pdfInvoice45.id),
      relation: "document_blocks_payment",
      to: endpoint("finance", "payment", "payment_77", refs.payment77.id),
      confidence: "high",
      requiresReview: true,
    },
    {
      from: endpoint("marketplace", "marketplace_product", "market_product_gkl_12_5", refs.marketplaceGkl.id),
      relation: "product_matches_request",
      to: endpoint("procurement", "procurement_request", "req_124", refs.request124.id),
      confidence: "high",
      requiresReview: false,
    },
  ];
}

export function buildAiGatewayCrossDomainChain() {
  const refs = AI_DOMAIN_GATEWAY_SOURCE_REFS;
  return [
    {
      stepRu: "Заявка №124 создана и утверждена директором",
      domain: "procurement" as const,
      sourceRefIds: [refs.request124.id],
      status: "done" as const,
    },
    {
      stepRu: "Склад выдал 20 листов ГКЛ на работу",
      domain: "warehouse" as const,
      sourceRefIds: [refs.warehouseIssue.id, refs.workGkl.id],
      status: "done" as const,
    },
    {
      stepRu: "Остаток ГКЛ после выдачи: 0 листов",
      domain: "warehouse" as const,
      sourceRefIds: [refs.warehouseStockGkl.id],
      status: "blocked" as const,
    },
    {
      stepRu: "Недостача по заявке: 60 листов",
      domain: "warehouse" as const,
      sourceRefIds: [refs.request124.id, refs.warehouseStockGkl.id],
      status: "blocked" as const,
    },
    {
      stepRu: "PDF счета №45 связан с платежом №77",
      domain: "documents" as const,
      sourceRefIds: [refs.pdfInvoice45.id, refs.payment77.id],
      status: "done" as const,
    },
    {
      stepRu: "Акт по платежу №77 отсутствует",
      domain: "finance" as const,
      sourceRefIds: [refs.payment77.id],
      status: "missing" as const,
    },
  ];
}
