import type { ConstructionKnowledgeSource } from "../../src/lib/ai/constructionKnowledgeCore";
import type { WarehouseStockContext } from "../../src/lib/ai/warehouseStock";

function sources(): ConstructionKnowledgeSource[] {
  return [
    {
      id: "src:stock:MAT-1",
      type: "warehouse_stock",
      labelRu: "Stock MAT-1 source",
      linkedMaterialId: "MAT-1",
      linkedObjectId: "OBJ-12",
      linkedWorkId: "WRK-300",
      confidence: "high",
    },
    {
      id: "src:material:MAT-1",
      type: "material",
      labelRu: "Material MAT-1 concrete M300",
      linkedMaterialId: "MAT-1",
      confidence: "high",
    },
    {
      id: "src:spec:DOC-17",
      type: "specification",
      labelRu: "Specification DOC-17 page 4",
      documentId: "DOC-17",
      fileName: "spec_concrete.pdf",
      page: 4,
      linkedMaterialId: "MAT-1",
      confidence: "high",
    },
    {
      id: "src:request:MR-300",
      type: "procurement_request",
      labelRu: "Request MR-300",
      linkedMaterialId: "MAT-1",
      linkedObjectId: "OBJ-12",
      linkedWorkId: "WRK-300",
      confidence: "high",
    },
    {
      id: "src:work:WRK-300",
      type: "work",
      labelRu: "Work WRK-300",
      linkedObjectId: "OBJ-12",
      linkedWorkId: "WRK-300",
      confidence: "high",
    },
    {
      id: "src:object:OBJ-12",
      type: "object",
      labelRu: "Object OBJ-12",
      linkedObjectId: "OBJ-12",
      confidence: "high",
    },
    {
      id: "src:approval:WH-9",
      type: "approval",
      labelRu: "Approval WH-9",
      confidence: "high",
    },
    {
      id: "src:payment:hidden",
      type: "payment",
      labelRu: "full cashflow and runtime secret must be hidden",
      confidence: "high",
    },
  ];
}

export function buildWarehouseRealStockFixture(): WarehouseStockContext {
  return {
    screenId: "warehouse.main",
    role: "warehouse",
    selectedMaterialId: "MAT-1",
    selectedObjectId: "OBJ-12",
    selectedIssueId: "ISS-30",
    selectedIncomingId: "INC-55",
    unitConversionConfigured: true,
    documentsProviderConnected: true,
    stockItems: [
      {
        id: "STK-1",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        specificationText: "M300, m3",
        availableQty: 8,
        reservedQty: 2,
        incomingQty: 12,
        unit: "m3",
        warehouseNameRu: "Main warehouse",
        objectId: "OBJ-12",
        objectNameRu: "Block A",
        workId: "WRK-300",
        workNameRu: "Slab concreting",
        requestId: "MR-300",
        sourceRefs: ["src:stock:MAT-1"],
      },
    ],
    incoming: [
      {
        id: "INC-55",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        quantity: 12,
        unit: "m3",
        supplierNameRu: "Beton Plus",
        status: "needs_documents",
        documentRefs: [],
        sourceRefs: ["src:request:MR-300"],
      },
    ],
    issues: [
      {
        id: "ISS-30",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        requestedQty: 15,
        issuedQty: 0,
        unit: "m3",
        objectId: "OBJ-12",
        objectNameRu: "Block A",
        workId: "WRK-300",
        workNameRu: "Slab concreting",
        requestId: "MR-300",
        status: "blocked",
        sourceRefs: ["src:request:MR-300", "src:work:WRK-300"],
      },
    ],
    sources: sources(),
  };
}
