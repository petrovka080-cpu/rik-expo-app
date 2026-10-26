import { resolveAiSourceRefForRole, type AiContextGraphRole } from "./aiPermissionAwareLinkResolver";
import {
  createAiContextGraphNode,
  createUnresolvedAiSourceRef,
  type AiContextGraphEntityFactInput,
  type AiContextGraphEntityInput,
  type AiContextGraphNode,
} from "./aiSourceRef";

export type AiWarehouseStockRecord = {
  id: string;
  materialId?: string;
  materialRu: string;
  qty: number;
  unit: string;
  warehouseRu?: string;
  objectId?: string;
  floorId?: string;
  workId?: string;
  requestId?: string;
};

export type AiWarehouseIncomingRecord = {
  id: string;
  materialId?: string;
  materialRu: string;
  qty: number;
  unit: string;
  supplierId?: string;
  requestId?: string;
  stockId?: string;
  invoiceId?: string;
  documentIds?: string[];
  pdfDocumentIds?: string[];
};

export type AiWarehouseIssueRecord = {
  id: string;
  materialId?: string;
  materialRu: string;
  qty: number;
  unit: string;
  recipientRu?: string;
  recipientUserId?: string;
  objectId?: string;
  floorId?: string;
  workId?: string;
  requestId?: string;
  stockId?: string;
  approvalId?: string;
  documentIds?: string[];
};

export type AiWarehouseReservationRecord = {
  id: string;
  materialId?: string;
  materialRu: string;
  qty: number;
  unit: string;
  objectId?: string;
  floorId?: string;
  workId?: string;
  requestId?: string;
  stockId?: string;
};

export type AiWarehouseGraphInput = {
  stock?: AiWarehouseStockRecord[];
  incoming?: AiWarehouseIncomingRecord[];
  issues?: AiWarehouseIssueRecord[];
  reservations?: AiWarehouseReservationRecord[];
};

function buildNode(input: AiContextGraphEntityInput, role: AiContextGraphRole): AiContextGraphNode {
  const ref = resolveAiSourceRefForRole(createUnresolvedAiSourceRef(input), role, input.routeParams);
  return createAiContextGraphNode(input, ref);
}

function fact(key: string, valueRu?: string | number | null): AiContextGraphEntityFactInput[] {
  if (valueRu === undefined || valueRu === null || String(valueRu).trim().length === 0) return [];
  return [{ key, valueRu: String(valueRu) }];
}

function qtyFact(qty: number, unit: string): AiContextGraphEntityFactInput[] {
  return [{ key: "quantity", valueRu: `${qty} ${unit}` }];
}

export function buildAiWarehouseGraphNodes(
  input: AiWarehouseGraphInput | undefined,
  role: AiContextGraphRole,
): AiContextGraphNode[] {
  if (!input) return [];

  const stockNodes = (input.stock ?? []).map((item) =>
    buildNode({
      entityType: "warehouse_stock",
      entityId: item.id,
      origin: "warehouse",
      labelRu: `Остаток ${item.materialRu}`,
      facts: [
        ...fact("material", item.materialRu),
        ...qtyFact(item.qty, item.unit),
        ...fact("warehouse", item.warehouseRu),
      ],
      links: [
        ...(item.materialId ? [{ relation: "uses_material" as const, targetEntityType: "material" as const, targetEntityId: item.materialId, labelRu: "Материал" }] : []),
        ...(item.objectId ? [{ relation: "belongs_to_object" as const, targetEntityType: "object" as const, targetEntityId: item.objectId, labelRu: "Объект" }] : []),
        ...(item.floorId ? [{ relation: "belongs_to_floor" as const, targetEntityType: "floor" as const, targetEntityId: item.floorId, labelRu: "Этаж" }] : []),
        ...(item.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: item.workId, labelRu: "Работа" }] : []),
        ...(item.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: item.requestId, labelRu: "Заявка" }] : []),
      ],
    }, role),
  );

  const incomingNodes = (input.incoming ?? []).map((item) =>
    buildNode({
      entityType: "warehouse_incoming",
      entityId: item.id,
      origin: "warehouse",
      labelRu: `Приход ${item.id} — ${item.materialRu}`,
      facts: [
        ...fact("material", item.materialRu),
        ...qtyFact(item.qty, item.unit),
      ],
      links: [
        ...(item.materialId ? [{ relation: "uses_material" as const, targetEntityType: "material" as const, targetEntityId: item.materialId, labelRu: "Материал" }] : []),
        ...(item.supplierId ? [{ relation: "purchased_from_supplier" as const, targetEntityType: "supplier" as const, targetEntityId: item.supplierId, labelRu: "Поставщик" }] : []),
        ...(item.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: item.requestId, labelRu: "Заявка" }] : []),
        ...(item.stockId ? [{ relation: "reserved_from_stock" as const, targetEntityType: "warehouse_stock" as const, targetEntityId: item.stockId, labelRu: "Остаток склада" }] : []),
        ...(item.invoiceId ? [{ relation: "linked_invoice" as const, targetEntityType: "invoice" as const, targetEntityId: item.invoiceId, labelRu: "Счет" }] : []),
        ...(item.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
        ...(item.pdfDocumentIds ?? []).map((pdfId) => ({ relation: "linked_pdf" as const, targetEntityType: "pdf_document" as const, targetEntityId: pdfId, labelRu: "PDF" })),
      ],
      missingLinks: [
        ...(item.documentIds?.length || item.pdfDocumentIds?.length ? [] : [{ expected: "pdf" as const, reasonRu: "К приходу не привязан документ или PDF." }]),
      ],
    }, role),
  );

  const issueNodes = (input.issues ?? []).map((item) =>
    buildNode({
      entityType: "warehouse_issue",
      entityId: item.id,
      origin: "warehouse",
      labelRu: `Выдача ${item.id} — ${item.materialRu}`,
      facts: [
        ...fact("material", item.materialRu),
        ...qtyFact(item.qty, item.unit),
        ...fact("recipient", item.recipientRu),
      ],
      links: [
        ...(item.materialId ? [{ relation: "uses_material" as const, targetEntityType: "material" as const, targetEntityId: item.materialId, labelRu: "Материал" }] : []),
        ...(item.recipientUserId ? [{ relation: "created_by" as const, targetEntityType: "user" as const, targetEntityId: item.recipientUserId, labelRu: "Получатель" }] : []),
        ...(item.objectId ? [{ relation: "belongs_to_object" as const, targetEntityType: "object" as const, targetEntityId: item.objectId, labelRu: "Объект" }] : []),
        ...(item.floorId ? [{ relation: "belongs_to_floor" as const, targetEntityType: "floor" as const, targetEntityId: item.floorId, labelRu: "Этаж" }] : []),
        ...(item.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: item.workId, labelRu: "Работа" }] : []),
        ...(item.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: item.requestId, labelRu: "Заявка" }] : []),
        ...(item.stockId ? [{ relation: "issued_from_stock" as const, targetEntityType: "warehouse_stock" as const, targetEntityId: item.stockId, labelRu: "Остаток склада" }] : []),
        ...(item.approvalId ? [{ relation: "approved_by" as const, targetEntityType: "approval" as const, targetEntityId: item.approvalId, labelRu: "Approval" }] : []),
        ...(item.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
      ],
      missingLinks: [
        ...(item.workId ? [] : [{ expected: "work" as const, reasonRu: "Выдача не связана с работой." }]),
      ],
    }, role),
  );

  const reservationNodes = (input.reservations ?? []).map((item) =>
    buildNode({
      entityType: "warehouse_reservation",
      entityId: item.id,
      origin: "warehouse",
      labelRu: `Резерв ${item.id} — ${item.materialRu}`,
      facts: [
        ...fact("material", item.materialRu),
        ...qtyFact(item.qty, item.unit),
      ],
      links: [
        ...(item.materialId ? [{ relation: "uses_material" as const, targetEntityType: "material" as const, targetEntityId: item.materialId, labelRu: "Материал" }] : []),
        ...(item.objectId ? [{ relation: "belongs_to_object" as const, targetEntityType: "object" as const, targetEntityId: item.objectId, labelRu: "Объект" }] : []),
        ...(item.floorId ? [{ relation: "belongs_to_floor" as const, targetEntityType: "floor" as const, targetEntityId: item.floorId, labelRu: "Этаж" }] : []),
        ...(item.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: item.workId, labelRu: "Работа" }] : []),
        ...(item.requestId ? [{ relation: "contains" as const, targetEntityType: "procurement_request" as const, targetEntityId: item.requestId, labelRu: "Заявка" }] : []),
        ...(item.stockId ? [{ relation: "reserved_from_stock" as const, targetEntityType: "warehouse_stock" as const, targetEntityId: item.stockId, labelRu: "Остаток склада" }] : []),
      ],
    }, role),
  );

  return [...stockNodes, ...incomingNodes, ...issueNodes, ...reservationNodes];
}
