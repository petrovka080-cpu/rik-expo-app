import type { AiAppEntityType, AiSourceRef } from "./aiSourceRef";

export type AiAppPermission =
  | "procurement.read"
  | "warehouse.read"
  | "finance.read"
  | "field.read"
  | "documents.read"
  | "marketplace.read"
  | "reports.read"
  | "admin.read";

export type AiDeepLinkDefinition = {
  entityType: AiAppEntityType;
  buildRoute: (entityId: string, params?: Record<string, string>) => {
    route: string;
    params: Record<string, string>;
    anchor?: string;
  };
  requiredPermission: AiAppPermission;
};

function route(
  routePath: string,
  params: Record<string, string>,
  anchor?: string,
): ReturnType<AiDeepLinkDefinition["buildRoute"]> {
  return { route: routePath, params, anchor };
}

export const AI_DEEP_LINK_REGISTRY: Readonly<Record<AiAppEntityType, AiDeepLinkDefinition>> = Object.freeze({
  procurement_request: {
    entityType: "procurement_request",
    buildRoute: (entityId) => route("/request/[id]", { id: entityId }),
    requiredPermission: "procurement.read",
  },
  procurement_request_line: {
    entityType: "procurement_request_line",
    buildRoute: (entityId, params = {}) =>
      route("/request/[id]", { id: params.requestId ?? params.procurementRequestId ?? entityId, lineId: entityId }, `line-${entityId}`),
    requiredPermission: "procurement.read",
  },
  purchase_order: {
    entityType: "purchase_order",
    buildRoute: (entityId) => route("/office/buyer", { purchaseOrderId: entityId }, `purchase-order-${entityId}`),
    requiredPermission: "procurement.read",
  },
  warehouse_stock: {
    entityType: "warehouse_stock",
    buildRoute: (entityId) => route("/office/warehouse", { stockId: entityId }, `stock-${entityId}`),
    requiredPermission: "warehouse.read",
  },
  warehouse_incoming: {
    entityType: "warehouse_incoming",
    buildRoute: (entityId) => route("/office/warehouse", { incomingId: entityId }, `incoming-${entityId}`),
    requiredPermission: "warehouse.read",
  },
  warehouse_issue: {
    entityType: "warehouse_issue",
    buildRoute: (entityId) => route("/office/warehouse", { issueId: entityId }, `issue-${entityId}`),
    requiredPermission: "warehouse.read",
  },
  warehouse_reservation: {
    entityType: "warehouse_reservation",
    buildRoute: (entityId) => route("/office/warehouse", { reservationId: entityId }, `reservation-${entityId}`),
    requiredPermission: "warehouse.read",
  },
  work: {
    entityType: "work",
    buildRoute: (entityId) => route("/office/foreman", { workId: entityId }, `work-${entityId}`),
    requiredPermission: "field.read",
  },
  task: {
    entityType: "task",
    buildRoute: (entityId) => route("/office/foreman", { taskId: entityId }, `task-${entityId}`),
    requiredPermission: "field.read",
  },
  object: {
    entityType: "object",
    buildRoute: (entityId) => route("/office/foreman", { objectId: entityId }, `object-${entityId}`),
    requiredPermission: "field.read",
  },
  building: {
    entityType: "building",
    buildRoute: (entityId) => route("/office/foreman", { buildingId: entityId }, `building-${entityId}`),
    requiredPermission: "field.read",
  },
  floor: {
    entityType: "floor",
    buildRoute: (entityId) => route("/office/foreman", { floorId: entityId }, `floor-${entityId}`),
    requiredPermission: "field.read",
  },
  zone: {
    entityType: "zone",
    buildRoute: (entityId) => route("/office/foreman", { zoneId: entityId }, `zone-${entityId}`),
    requiredPermission: "field.read",
  },
  material: {
    entityType: "material",
    buildRoute: (entityId) => route("/office/warehouse", { materialId: entityId }, `material-${entityId}`),
    requiredPermission: "warehouse.read",
  },
  marketplace_product: {
    entityType: "marketplace_product",
    buildRoute: (entityId) => route("/product/[id]", { id: entityId }),
    requiredPermission: "marketplace.read",
  },
  supplier: {
    entityType: "supplier",
    buildRoute: (entityId) => route("/supplierShowcase", { supplierId: entityId }, `supplier-${entityId}`),
    requiredPermission: "marketplace.read",
  },
  contractor: {
    entityType: "contractor",
    buildRoute: (entityId) => route("/office/contractor", { contractorId: entityId }, `contractor-${entityId}`),
    requiredPermission: "field.read",
  },
  payment: {
    entityType: "payment",
    buildRoute: (entityId) => route("/office/accountant", { paymentId: entityId }, `payment-${entityId}`),
    requiredPermission: "finance.read",
  },
  invoice: {
    entityType: "invoice",
    buildRoute: (entityId) => route("/office/accountant", { invoiceId: entityId }, `invoice-${entityId}`),
    requiredPermission: "finance.read",
  },
  act: {
    entityType: "act",
    buildRoute: (entityId) => route("/office/accountant", { actId: entityId }, `act-${entityId}`),
    requiredPermission: "finance.read",
  },
  contract: {
    entityType: "contract",
    buildRoute: (entityId) => route("/office/contractor", { contractId: entityId }, `contract-${entityId}`),
    requiredPermission: "documents.read",
  },
  document: {
    entityType: "document",
    buildRoute: (entityId) => route("/reports/ai-assistant", { documentId: entityId }, `document-${entityId}`),
    requiredPermission: "documents.read",
  },
  pdf_document: {
    entityType: "pdf_document",
    buildRoute: (entityId, params = {}) =>
      route("/pdf-viewer", {
        entityId,
        id: entityId,
        documentId: params.documentId ?? entityId,
        sourceKind: params.sourceKind ?? "ai_source_ref",
      }),
    requiredPermission: "documents.read",
  },
  document_chunk: {
    entityType: "document_chunk",
    buildRoute: (entityId, params = {}) => {
      const documentId = params.documentId ?? params.id ?? entityId;
      return route(
        "/pdf-viewer",
        {
          entityId: documentId,
          id: documentId,
          documentId,
          chunkId: entityId,
          sourceKind: params.sourceKind ?? "document_evidence",
        },
        `chunk-${entityId}`,
      );
    },
    requiredPermission: "documents.read",
  },
  report: {
    entityType: "report",
    buildRoute: (entityId) => route("/reports/dashboard", { reportId: entityId }, `report-${entityId}`),
    requiredPermission: "reports.read",
  },
  approval: {
    entityType: "approval",
    buildRoute: (entityId) => route("/ai-approval-inbox", { approvalId: entityId }, `approval-${entityId}`),
    requiredPermission: "admin.read",
  },
  photo: {
    entityType: "photo",
    buildRoute: (entityId) => route("/office/foreman", { photoId: entityId }, `photo-${entityId}`),
    requiredPermission: "field.read",
  },
  video: {
    entityType: "video",
    buildRoute: (entityId) => route("/office/foreman", { videoId: entityId }, `video-${entityId}`),
    requiredPermission: "field.read",
  },
  media_asset: {
    entityType: "media_asset",
    buildRoute: (entityId) => route("/media/viewer", { mediaAssetId: entityId }, `media-${entityId}`),
    requiredPermission: "field.read",
  },
  media_group: {
    entityType: "media_group",
    buildRoute: (entityId) => route("/media/viewer", { mediaAssetGroupId: entityId }, `media-group-${entityId}`),
    requiredPermission: "field.read",
  },
  user: {
    entityType: "user",
    buildRoute: (entityId) => route("/office/security", { userId: entityId }, `user-${entityId}`),
    requiredPermission: "admin.read",
  },
  company: {
    entityType: "company",
    buildRoute: (entityId) => route("/office/director", { companyId: entityId }, `company-${entityId}`),
    requiredPermission: "admin.read",
  },
});

export function listAiDeepLinkDefinitions(): AiDeepLinkDefinition[] {
  return Object.values(AI_DEEP_LINK_REGISTRY);
}

export function getAiDeepLinkDefinition(entityType: AiAppEntityType): AiDeepLinkDefinition {
  return AI_DEEP_LINK_REGISTRY[entityType];
}

export function buildAiDeepLink(
  ref: Pick<AiSourceRef, "entityType" | "entityId" | "appLink">,
  params?: Record<string, string>,
): AiSourceRef["appLink"] {
  const built = getAiDeepLinkDefinition(ref.entityType).buildRoute(ref.entityId, params);
  return {
    ...built,
    page: ref.appLink?.page,
    highlightText: ref.appLink?.highlightText,
  };
}
