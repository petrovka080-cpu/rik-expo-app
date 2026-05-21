import { resolveAiSourceRefForRole, type AiContextGraphRole } from "./aiPermissionAwareLinkResolver";
import {
  createAiContextGraphNode,
  createUnresolvedAiSourceRef,
  type AiContextGraphEntityFactInput,
  type AiContextGraphEntityInput,
  type AiContextGraphNode,
} from "./aiSourceRef";

export type AiDocumentRecord = {
  id: string;
  titleRu: string;
  documentTypeRu?: string;
  statusRu?: string;
  requestId?: string;
  workId?: string;
  invoiceId?: string;
  actId?: string;
  paymentId?: string;
  pdfDocumentId?: string;
};

export type AiPdfDocumentRecord = {
  id: string;
  titleRu: string;
  documentId?: string;
  documentTypeRu?: string;
  page?: number;
  chunkId?: string;
  highlightText?: string;
  valuePreviewRu?: string;
  requestId?: string;
  workId?: string;
  invoiceId?: string;
  actId?: string;
  paymentId?: string;
};

export type AiReportRecord = {
  id: string;
  titleRu: string;
  periodRu?: string;
  documentIds?: string[];
  pdfDocumentIds?: string[];
};

export type AiApprovalRecord = {
  id: string;
  titleRu: string;
  statusRu?: string;
  approverUserId?: string;
  requestId?: string;
  paymentId?: string;
  workId?: string;
};

export type AiDocumentGraphInput = {
  documents?: AiDocumentRecord[];
  pdfDocuments?: AiPdfDocumentRecord[];
  reports?: AiReportRecord[];
  approvals?: AiApprovalRecord[];
};

function buildNode(input: AiContextGraphEntityInput, role: AiContextGraphRole): AiContextGraphNode {
  const ref = resolveAiSourceRefForRole(createUnresolvedAiSourceRef(input), role, input.routeParams);
  return createAiContextGraphNode(input, ref);
}

function fact(key: string, valueRu?: string | number | null): AiContextGraphEntityFactInput[] {
  if (valueRu === undefined || valueRu === null || String(valueRu).trim().length === 0) return [];
  return [{ key, valueRu: String(valueRu) }];
}

export function buildAiDocumentGraphNodes(
  input: AiDocumentGraphInput | undefined,
  role: AiContextGraphRole,
): AiContextGraphNode[] {
  if (!input) return [];

  const documentNodes = (input.documents ?? []).map((document) =>
    buildNode({
      entityType: "document",
      entityId: document.id,
      origin: "documents",
      labelRu: document.titleRu,
      facts: [
        ...fact("document_type", document.documentTypeRu),
        ...fact("status", document.statusRu),
      ],
      links: [
        ...(document.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: document.requestId, labelRu: "Заявка" }] : []),
        ...(document.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: document.workId, labelRu: "Работа" }] : []),
        ...(document.invoiceId ? [{ relation: "linked_invoice" as const, targetEntityType: "invoice" as const, targetEntityId: document.invoiceId, labelRu: "Счет" }] : []),
        ...(document.actId ? [{ relation: "linked_act" as const, targetEntityType: "act" as const, targetEntityId: document.actId, labelRu: "Акт" }] : []),
        ...(document.paymentId ? [{ relation: "linked_payment" as const, targetEntityType: "payment" as const, targetEntityId: document.paymentId, labelRu: "Платеж" }] : []),
        ...(document.pdfDocumentId ? [{ relation: "linked_pdf" as const, targetEntityType: "pdf_document" as const, targetEntityId: document.pdfDocumentId, labelRu: "PDF" }] : []),
      ],
      missingLinks: [
        ...(document.requestId || document.workId || document.invoiceId || document.actId || document.paymentId
          ? []
          : [{ expected: "work" as const, reasonRu: "Документ не связан с объектом приложения." }]),
      ],
    }, role),
  );

  const pdfNodes = (input.pdfDocuments ?? []).map((pdf) =>
    buildNode({
      entityType: "pdf_document",
      entityId: pdf.id,
      origin: "pdf_document",
      labelRu: pdf.titleRu,
      routeParams: { documentId: pdf.documentId ?? pdf.id },
      appLink: {
        route: "/pdf-viewer",
        params: { entityId: pdf.id, documentId: pdf.documentId ?? pdf.id },
        page: pdf.page,
        highlightText: pdf.highlightText,
      },
      evidence: {
        field: pdf.documentTypeRu ? "document_type" : undefined,
        valuePreviewRu: pdf.valuePreviewRu,
        documentPage: pdf.page,
        documentChunkId: pdf.chunkId,
        confidence: "high",
      },
      facts: [
        ...fact("document_type", pdf.documentTypeRu),
        ...fact("document_page", pdf.page),
        ...fact("value_preview", pdf.valuePreviewRu),
      ],
      links: [
        ...(pdf.documentId ? [{ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: pdf.documentId, labelRu: "Документ" }] : []),
        ...(pdf.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: pdf.requestId, labelRu: "Заявка" }] : []),
        ...(pdf.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: pdf.workId, labelRu: "Работа" }] : []),
        ...(pdf.invoiceId ? [{ relation: "linked_invoice" as const, targetEntityType: "invoice" as const, targetEntityId: pdf.invoiceId, labelRu: "Счет" }] : []),
        ...(pdf.actId ? [{ relation: "linked_act" as const, targetEntityType: "act" as const, targetEntityId: pdf.actId, labelRu: "Акт" }] : []),
        ...(pdf.paymentId ? [{ relation: "linked_payment" as const, targetEntityType: "payment" as const, targetEntityId: pdf.paymentId, labelRu: "Платеж" }] : []),
      ],
      missingLinks: [
        ...(pdf.actId ? [] : [{ expected: "act" as const, reasonRu: "Акт для PDF не найден." }]),
      ],
    }, role),
  );

  const reportNodes = (input.reports ?? []).map((report) =>
    buildNode({
      entityType: "report",
      entityId: report.id,
      origin: "reports",
      labelRu: report.titleRu,
      facts: [...fact("report", report.titleRu), ...fact("period", report.periodRu)],
      links: [
        ...(report.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
        ...(report.pdfDocumentIds ?? []).map((pdfId) => ({ relation: "linked_pdf" as const, targetEntityType: "pdf_document" as const, targetEntityId: pdfId, labelRu: "PDF" })),
      ],
    }, role),
  );

  const approvalNodes = (input.approvals ?? []).map((approval) =>
    buildNode({
      entityType: "approval",
      entityId: approval.id,
      origin: "app_data",
      labelRu: approval.titleRu,
      facts: [...fact("approval", approval.titleRu), ...fact("status", approval.statusRu)],
      links: [
        ...(approval.approverUserId ? [{ relation: "approved_by" as const, targetEntityType: "user" as const, targetEntityId: approval.approverUserId, labelRu: "Согласующий" }] : []),
        ...(approval.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: approval.requestId, labelRu: "Заявка" }] : []),
        ...(approval.paymentId ? [{ relation: "linked_payment" as const, targetEntityType: "payment" as const, targetEntityId: approval.paymentId, labelRu: "Платеж" }] : []),
        ...(approval.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: approval.workId, labelRu: "Работа" }] : []),
      ],
    }, role),
  );

  return [...documentNodes, ...pdfNodes, ...reportNodes, ...approvalNodes];
}
