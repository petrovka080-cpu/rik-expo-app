import { resolveAiSourceRefForRole, type AiContextGraphRole } from "./aiPermissionAwareLinkResolver";
import {
  createAiContextGraphNode,
  createUnresolvedAiSourceRef,
  type AiContextGraphEntityFactInput,
  type AiContextGraphEntityInput,
  type AiContextGraphNode,
} from "./aiSourceRef";

export type AiInvoiceRecord = {
  id: string;
  numberRu?: string;
  supplierId?: string;
  supplierRu?: string;
  amountRu?: string;
  statusRu?: string;
  requestId?: string;
  workId?: string;
  actId?: string;
  paymentIds?: string[];
  documentIds?: string[];
  pdfDocumentIds?: string[];
};

export type AiPaymentRecord = {
  id: string;
  numberRu?: string;
  amountRu?: string;
  statusRu?: string;
  invoiceId?: string;
  requestId?: string;
  workId?: string;
  supplierId?: string;
  documentIds?: string[];
  pdfDocumentIds?: string[];
  approvalId?: string;
};

export type AiActRecord = {
  id: string;
  titleRu: string;
  statusRu?: string;
  amountRu?: string;
  workId?: string;
  invoiceId?: string;
  paymentId?: string;
  documentIds?: string[];
  pdfDocumentIds?: string[];
};

export type AiContractRecord = {
  id: string;
  titleRu: string;
  supplierId?: string;
  contractorId?: string;
  documentIds?: string[];
  pdfDocumentIds?: string[];
};

export type AiFinanceGraphInput = {
  invoices?: AiInvoiceRecord[];
  payments?: AiPaymentRecord[];
  acts?: AiActRecord[];
  contracts?: AiContractRecord[];
};

function buildNode(input: AiContextGraphEntityInput, role: AiContextGraphRole): AiContextGraphNode {
  const ref = resolveAiSourceRefForRole(createUnresolvedAiSourceRef(input), role, input.routeParams);
  return createAiContextGraphNode(input, ref);
}

function fact(key: string, valueRu?: string | number | null): AiContextGraphEntityFactInput[] {
  if (valueRu === undefined || valueRu === null || String(valueRu).trim().length === 0) return [];
  return [{ key, valueRu: String(valueRu) }];
}

export function buildAiFinanceGraphNodes(
  input: AiFinanceGraphInput | undefined,
  role: AiContextGraphRole,
): AiContextGraphNode[] {
  if (!input) return [];

  const invoiceNodes = (input.invoices ?? []).map((invoice) =>
    buildNode({
      entityType: "invoice",
      entityId: invoice.id,
      origin: "finance",
      labelRu: invoice.numberRu ? `Счет ${invoice.numberRu}` : `Счет ${invoice.id}`,
      facts: [
        ...fact("invoice_number", invoice.numberRu),
        ...fact("supplier", invoice.supplierRu),
        ...fact("amount", invoice.amountRu),
        ...fact("status", invoice.statusRu),
      ],
      links: [
        ...(invoice.supplierId ? [{ relation: "purchased_from_supplier" as const, targetEntityType: "supplier" as const, targetEntityId: invoice.supplierId, labelRu: "Поставщик" }] : []),
        ...(invoice.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: invoice.requestId, labelRu: "Заявка" }] : []),
        ...(invoice.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: invoice.workId, labelRu: "Работа" }] : []),
        ...(invoice.actId ? [{ relation: "linked_act" as const, targetEntityType: "act" as const, targetEntityId: invoice.actId, labelRu: "Акт" }] : []),
        ...(invoice.paymentIds ?? []).map((paymentId) => ({ relation: "linked_payment" as const, targetEntityType: "payment" as const, targetEntityId: paymentId, labelRu: "Платеж" })),
        ...(invoice.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
        ...(invoice.pdfDocumentIds ?? []).map((pdfId) => ({ relation: "linked_pdf" as const, targetEntityType: "pdf_document" as const, targetEntityId: pdfId, labelRu: "PDF счета" })),
      ],
      missingLinks: [
        ...(invoice.actId ? [] : [{ expected: "act" as const, reasonRu: "К счету не найден акт." }]),
        ...(invoice.paymentIds?.length ? [] : [{ expected: "payment" as const, reasonRu: "К счету не найден платеж." }]),
        ...(invoice.documentIds?.length || invoice.pdfDocumentIds?.length ? [] : [{ expected: "pdf" as const, reasonRu: "К счету не найден документ или PDF." }]),
      ],
    }, role),
  );

  const paymentNodes = (input.payments ?? []).map((payment) =>
    buildNode({
      entityType: "payment",
      entityId: payment.id,
      origin: "finance",
      labelRu: payment.numberRu ? `Платеж ${payment.numberRu}` : `Платеж ${payment.id}`,
      facts: [
        ...fact("payment_number", payment.numberRu),
        ...fact("amount", payment.amountRu),
        ...fact("status", payment.statusRu),
      ],
      links: [
        ...(payment.invoiceId ? [{ relation: "linked_invoice" as const, targetEntityType: "invoice" as const, targetEntityId: payment.invoiceId, labelRu: "Счет" }] : []),
        ...(payment.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: payment.requestId, labelRu: "Заявка" }] : []),
        ...(payment.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: payment.workId, labelRu: "Работа" }] : []),
        ...(payment.supplierId ? [{ relation: "purchased_from_supplier" as const, targetEntityType: "supplier" as const, targetEntityId: payment.supplierId, labelRu: "Поставщик" }] : []),
        ...(payment.approvalId ? [{ relation: "approved_by" as const, targetEntityType: "approval" as const, targetEntityId: payment.approvalId, labelRu: "Approval" }] : []),
        ...(payment.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
        ...(payment.pdfDocumentIds ?? []).map((pdfId) => ({ relation: "linked_pdf" as const, targetEntityType: "pdf_document" as const, targetEntityId: pdfId, labelRu: "PDF" })),
      ],
      missingLinks: [
        ...(payment.invoiceId ? [] : [{ expected: "invoice" as const, reasonRu: "Платеж не связан со счетом." }]),
        ...(payment.documentIds?.length || payment.pdfDocumentIds?.length ? [] : [{ expected: "pdf" as const, reasonRu: "Платеж без привязанного документа." }]),
        ...(payment.approvalId ? [] : [{ expected: "approval" as const, reasonRu: "Approval для платежа не найден." }]),
      ],
    }, role),
  );

  const actNodes = (input.acts ?? []).map((act) =>
    buildNode({
      entityType: "act",
      entityId: act.id,
      origin: "finance",
      labelRu: act.titleRu,
      facts: [
        ...fact("act", act.titleRu),
        ...fact("amount", act.amountRu),
        ...fact("status", act.statusRu),
      ],
      links: [
        ...(act.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: act.workId, labelRu: "Работа" }] : []),
        ...(act.invoiceId ? [{ relation: "linked_invoice" as const, targetEntityType: "invoice" as const, targetEntityId: act.invoiceId, labelRu: "Счет" }] : []),
        ...(act.paymentId ? [{ relation: "linked_payment" as const, targetEntityType: "payment" as const, targetEntityId: act.paymentId, labelRu: "Платеж" }] : []),
        ...(act.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
        ...(act.pdfDocumentIds ?? []).map((pdfId) => ({ relation: "linked_pdf" as const, targetEntityType: "pdf_document" as const, targetEntityId: pdfId, labelRu: "PDF" })),
      ],
    }, role),
  );

  const contractNodes = (input.contracts ?? []).map((contract) =>
    buildNode({
      entityType: "contract",
      entityId: contract.id,
      origin: "documents",
      labelRu: contract.titleRu,
      facts: fact("contract", contract.titleRu),
      links: [
        ...(contract.supplierId ? [{ relation: "purchased_from_supplier" as const, targetEntityType: "supplier" as const, targetEntityId: contract.supplierId, labelRu: "Поставщик" }] : []),
        ...(contract.contractorId ? [{ relation: "created_by" as const, targetEntityType: "contractor" as const, targetEntityId: contract.contractorId, labelRu: "Подрядчик" }] : []),
        ...(contract.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
        ...(contract.pdfDocumentIds ?? []).map((pdfId) => ({ relation: "linked_pdf" as const, targetEntityType: "pdf_document" as const, targetEntityId: pdfId, labelRu: "PDF" })),
      ],
    }, role),
  );

  return [...invoiceNodes, ...paymentNodes, ...actNodes, ...contractNodes];
}
