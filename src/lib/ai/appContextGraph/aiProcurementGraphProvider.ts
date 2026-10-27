import { resolveAiSourceRefForRole, type AiContextGraphRole } from "./aiPermissionAwareLinkResolver";
import {
  createAiContextGraphNode,
  createUnresolvedAiSourceRef,
  type AiContextGraphEntityFactInput,
  type AiContextGraphEntityInput,
  type AiContextGraphNode,
} from "./aiSourceRef";

export type AiProcurementRequestRecord = {
  id: string;
  numberRu?: string;
  titleRu: string;
  statusRu?: string;
  objectId?: string;
  buildingId?: string;
  floorId?: string;
  floorRu?: string;
  zoneId?: string;
  workId?: string;
  authorUserId?: string;
  approvedByUserId?: string;
  approvalId?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  invoiceId?: string;
  paymentId?: string;
  actId?: string;
  documentIds?: string[];
  pdfDocumentIds?: string[];
  warehouseStockIds?: string[];
  warehouseIssueIds?: string[];
};

export type AiProcurementRequestLineRecord = {
  id: string;
  requestId: string;
  itemRu: string;
  quantity?: number;
  unit?: string;
  materialId?: string;
  marketplaceProductId?: string;
  warehouseStockId?: string;
};

export type AiPurchaseOrderRecord = {
  id: string;
  titleRu?: string;
  requestId?: string;
  supplierId?: string;
  statusRu?: string;
  amountRu?: string;
};

export type AiProcurementGraphInput = {
  requests?: AiProcurementRequestRecord[];
  requestLines?: AiProcurementRequestLineRecord[];
  purchaseOrders?: AiPurchaseOrderRecord[];
};

function buildNode(input: AiContextGraphEntityInput, role: AiContextGraphRole): AiContextGraphNode {
  const ref = resolveAiSourceRefForRole(createUnresolvedAiSourceRef(input), role, input.routeParams);
  return createAiContextGraphNode(input, ref);
}

function fact(key: string, valueRu?: string | number | null): AiContextGraphEntityFactInput[] {
  if (valueRu === undefined || valueRu === null || String(valueRu).trim().length === 0) return [];
  return [{ key, valueRu: String(valueRu) }];
}

function qtyFact(line: AiProcurementRequestLineRecord): AiContextGraphEntityFactInput[] {
  if (line.quantity === undefined || !line.unit) return [];
  return [{ key: "quantity", valueRu: `${line.quantity} ${line.unit}` }];
}

export function buildAiProcurementGraphNodes(
  input: AiProcurementGraphInput | undefined,
  role: AiContextGraphRole,
): AiContextGraphNode[] {
  if (!input) return [];

  const requestNodes = (input.requests ?? []).map((request) =>
    buildNode({
      entityType: "procurement_request",
      entityId: request.id,
      origin: "procurement",
      labelRu: request.numberRu ? `Заявка ${request.numberRu} — ${request.titleRu}` : `Заявка ${request.id} — ${request.titleRu}`,
      facts: [
        ...fact("request_title", request.titleRu),
        ...fact("request_number", request.numberRu),
        ...fact("status", request.statusRu),
        ...fact("floor", request.floorRu),
      ],
      links: [
        ...(request.authorUserId ? [{ relation: "created_by" as const, targetEntityType: "user" as const, targetEntityId: request.authorUserId, labelRu: "Автор заявки" }] : []),
        ...(request.approvedByUserId ? [{ relation: "approved_by" as const, targetEntityType: "user" as const, targetEntityId: request.approvedByUserId, labelRu: "Утвердил" }] : []),
        ...(request.approvalId ? [{ relation: "approved_by" as const, targetEntityType: "approval" as const, targetEntityId: request.approvalId, labelRu: "Approval" }] : []),
        ...(request.objectId ? [{ relation: "belongs_to_object" as const, targetEntityType: "object" as const, targetEntityId: request.objectId, labelRu: "Объект" }] : []),
        ...(request.buildingId ? [{ relation: "contains" as const, targetEntityType: "building" as const, targetEntityId: request.buildingId, labelRu: "Здание" }] : []),
        ...(request.floorId ? [{ relation: "belongs_to_floor" as const, targetEntityType: "floor" as const, targetEntityId: request.floorId, labelRu: "Этаж" }] : []),
        ...(request.zoneId ? [{ relation: "contains" as const, targetEntityType: "zone" as const, targetEntityId: request.zoneId, labelRu: "Зона" }] : []),
        ...(request.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: request.workId, labelRu: "Работа" }] : []),
        ...(request.purchaseOrderId ? [{ relation: "contains" as const, targetEntityType: "purchase_order" as const, targetEntityId: request.purchaseOrderId, labelRu: "Закупка" }] : []),
        ...(request.supplierId ? [{ relation: "purchased_from_supplier" as const, targetEntityType: "supplier" as const, targetEntityId: request.supplierId, labelRu: "Поставщик" }] : []),
        ...(request.invoiceId ? [{ relation: "linked_invoice" as const, targetEntityType: "invoice" as const, targetEntityId: request.invoiceId, labelRu: "Счет" }] : []),
        ...(request.paymentId ? [{ relation: "linked_payment" as const, targetEntityType: "payment" as const, targetEntityId: request.paymentId, labelRu: "Платеж" }] : []),
        ...(request.actId ? [{ relation: "linked_act" as const, targetEntityType: "act" as const, targetEntityId: request.actId, labelRu: "Акт" }] : []),
        ...(request.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
        ...(request.pdfDocumentIds ?? []).map((pdfId) => ({ relation: "linked_pdf" as const, targetEntityType: "pdf_document" as const, targetEntityId: pdfId, labelRu: "PDF" })),
        ...(request.warehouseStockIds ?? []).map((stockId) => ({ relation: "reserved_from_stock" as const, targetEntityType: "warehouse_stock" as const, targetEntityId: stockId, labelRu: "Остаток склада" })),
        ...(request.warehouseIssueIds ?? []).map((issueId) => ({ relation: "issued_from_stock" as const, targetEntityType: "warehouse_issue" as const, targetEntityId: issueId, labelRu: "Выдача склада" })),
      ],
      missingLinks: [
        ...(request.floorId ? [] : [{ expected: "floor" as const, reasonRu: "Заявка не связана с этажом." }]),
        ...(request.workId ? [] : [{ expected: "work" as const, reasonRu: "Заявка не связана с работой." }]),
        ...(request.supplierId ? [] : [{ expected: "supplier" as const, reasonRu: "Поставщик не выбран." }]),
        ...(request.warehouseIssueIds?.length ? [] : [{ expected: "warehouse_issue" as const, reasonRu: "Выдача со склада не найдена." }]),
      ],
    }, role),
  );

  const lineNodes = (input.requestLines ?? []).map((line) =>
    buildNode({
      entityType: "procurement_request_line",
      entityId: line.id,
      origin: "procurement",
      labelRu: `Строка заявки — ${line.itemRu}`,
      routeParams: { requestId: line.requestId },
      facts: [
        ...fact("item", line.itemRu),
        ...qtyFact(line),
      ],
      links: [
        { relation: "contains", targetEntityType: "procurement_request", targetEntityId: line.requestId, labelRu: "Заявка" },
        ...(line.materialId ? [{ relation: "uses_material" as const, targetEntityType: "material" as const, targetEntityId: line.materialId, labelRu: "Материал" }] : []),
        ...(line.marketplaceProductId ? [{ relation: "uses_material" as const, targetEntityType: "marketplace_product" as const, targetEntityId: line.marketplaceProductId, labelRu: "Товар marketplace" }] : []),
        ...(line.warehouseStockId ? [{ relation: "reserved_from_stock" as const, targetEntityType: "warehouse_stock" as const, targetEntityId: line.warehouseStockId, labelRu: "Остаток склада" }] : []),
      ],
    }, role),
  );

  const purchaseOrderNodes = (input.purchaseOrders ?? []).map((order) =>
    buildNode({
      entityType: "purchase_order",
      entityId: order.id,
      origin: "procurement",
      labelRu: order.titleRu ?? `Закупка ${order.id}`,
      facts: [...fact("status", order.statusRu), ...fact("amount", order.amountRu)],
      links: [
        ...(order.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: order.requestId, labelRu: "Заявка" }] : []),
        ...(order.supplierId ? [{ relation: "purchased_from_supplier" as const, targetEntityType: "supplier" as const, targetEntityId: order.supplierId, labelRu: "Поставщик" }] : []),
      ],
      missingLinks: [
        ...(order.supplierId ? [] : [{ expected: "supplier" as const, reasonRu: "Закупка без поставщика." }]),
      ],
    }, role),
  );

  return [...requestNodes, ...lineNodes, ...purchaseOrderNodes];
}
