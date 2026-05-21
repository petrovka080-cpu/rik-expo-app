import {
  buildAiAppContextGraph,
  composeAiContextGraphAnswer,
  type AiAppContextGraphBuildInput,
  type AiContextGraphAnswer,
  type AiContextGraphBuildResult,
} from "../../src/lib/ai/appContextGraph";

export function createAiAppContextGraphFixtureInput(role = "director"): AiAppContextGraphBuildInput {
  return {
    role,
    screenId: "ai.context.graph.fixture",
    field: {
      objects: [{ id: "obj-dom-1", nameRu: "Дом 1" }],
      buildings: [{ id: "bld-dom-1", nameRu: "Здание Дом 1", objectId: "obj-dom-1" }],
      floors: [{ id: "floor-1", labelRu: "1 этаж", number: 1, objectId: "obj-dom-1", buildingId: "bld-dom-1" }],
      zones: [{ id: "zone-a", nameRu: "Зона А", objectId: "obj-dom-1", buildingId: "bld-dom-1", floorId: "floor-1" }],
      works: [{
        id: "work-gkl-1",
        nameRu: "ГКЛ перегородки",
        statusRu: "в работе",
        objectId: "obj-dom-1",
        buildingId: "bld-dom-1",
        floorId: "floor-1",
        zoneId: "zone-a",
        materialIds: ["mat-gkl", "mat-profile"],
        documentIds: ["doc-inv-45"],
        pdfDocumentIds: ["pdf-45"],
      }],
      users: [
        { id: "user-ivan", nameRu: "прораб Иван", roleRu: "прораб" },
        { id: "user-director", nameRu: "директор", roleRu: "директор" },
      ],
    },
    marketplace: {
      materials: [
        { id: "mat-gkl", nameRu: "ГКЛ", unit: "лист", categoryRu: "отделочные материалы" },
        { id: "mat-profile", nameRu: "Профиль", unit: "шт", categoryRu: "металл" },
      ],
      products: [{
        id: "mp-gkl",
        titleRu: "ГКЛ 12.5 мм",
        materialId: "mat-gkl",
        supplierId: "sup-gkl",
        priceRu: "550 KGS",
        availabilityRu: "в наличии",
      }],
      suppliers: [{ id: "sup-gkl", nameRu: "ОсОО ГКЛ Снаб", productIds: ["mp-gkl"], materialIds: ["mat-gkl"] }],
    },
    procurement: {
      requests: [
        {
          id: "req-124",
          numberRu: "№124",
          titleRu: "ГКЛ и профиль",
          statusRu: "утверждена директором",
          objectId: "obj-dom-1",
          buildingId: "bld-dom-1",
          floorId: "floor-1",
          floorRu: "1 этаж",
          zoneId: "zone-a",
          workId: "work-gkl-1",
          authorUserId: "user-ivan",
          approvedByUserId: "user-director",
          approvalId: "apr-124",
          purchaseOrderId: "po-124",
          supplierId: "sup-gkl",
          invoiceId: "inv-45",
          paymentId: "pay-77",
          documentIds: ["doc-inv-45"],
          pdfDocumentIds: ["pdf-45"],
          warehouseStockIds: ["stock-gkl"],
          warehouseIssueIds: ["issue-88"],
        },
        {
          id: "req-130",
          numberRu: "№130",
          titleRu: "Кабель",
          statusRu: "передана в закупку",
          objectId: "obj-dom-1",
          floorId: "floor-1",
          floorRu: "1 этаж",
          workId: "work-gkl-1",
        },
        {
          id: "req-no-floor",
          numberRu: "№404",
          titleRu: "Заявка без этажа",
          statusRu: "нужна привязка",
        },
      ],
      requestLines: [
        { id: "line-124-1", requestId: "req-124", itemRu: "ГКЛ", quantity: 80, unit: "лист", materialId: "mat-gkl", marketplaceProductId: "mp-gkl", warehouseStockId: "stock-gkl" },
        { id: "line-124-2", requestId: "req-124", itemRu: "Профиль", quantity: 40, unit: "шт", materialId: "mat-profile" },
      ],
      purchaseOrders: [{ id: "po-124", titleRu: "Закупка по заявке №124", requestId: "req-124", supplierId: "sup-gkl", statusRu: "частично закрыта" }],
    },
    warehouse: {
      stock: [{ id: "stock-gkl", materialId: "mat-gkl", materialRu: "ГКЛ", qty: 20, unit: "лист", warehouseRu: "Основной склад", objectId: "obj-dom-1", floorId: "floor-1", workId: "work-gkl-1", requestId: "req-124" }],
      incoming: [{ id: "inc-15", materialId: "mat-gkl", materialRu: "ГКЛ", qty: 100, unit: "лист", supplierId: "sup-gkl", requestId: "req-124", stockId: "stock-gkl", invoiceId: "inv-45", documentIds: ["doc-inv-45"], pdfDocumentIds: ["pdf-45"] }],
      issues: [{ id: "issue-88", materialId: "mat-gkl", materialRu: "ГКЛ", qty: 80, unit: "лист", recipientRu: "прораб Иван", recipientUserId: "user-ivan", objectId: "obj-dom-1", floorId: "floor-1", workId: "work-gkl-1", requestId: "req-124", stockId: "stock-gkl", approvalId: "apr-124" }],
    },
    finance: {
      invoices: [{ id: "inv-45", numberRu: "№45", supplierId: "sup-gkl", supplierRu: "ОсОО ГКЛ Снаб", amountRu: "125 000 KGS", statusRu: "получен", requestId: "req-124", workId: "work-gkl-1", paymentIds: ["pay-77"], documentIds: ["doc-inv-45"], pdfDocumentIds: ["pdf-45"] }],
      payments: [
        { id: "pay-77", numberRu: "№77", amountRu: "125 000 KGS", statusRu: "ожидает акта", invoiceId: "inv-45", requestId: "req-124", workId: "work-gkl-1", supplierId: "sup-gkl", documentIds: ["doc-inv-45"], pdfDocumentIds: ["pdf-45"], approvalId: "apr-124" },
        { id: "pay-no-doc", numberRu: "№88", amountRu: "42 000 KGS", statusRu: "blocked" },
      ],
      acts: [],
    },
    documents: {
      documents: [{ id: "doc-inv-45", titleRu: "Счет №45", documentTypeRu: "счет", statusRu: "получен", requestId: "req-124", workId: "work-gkl-1", invoiceId: "inv-45", paymentId: "pay-77", pdfDocumentId: "pdf-45" }],
      pdfDocuments: [{ id: "pdf-45", titleRu: "PDF счета №45", documentId: "doc-inv-45", documentTypeRu: "счет", page: 1, chunkId: "chunk-12", highlightText: "125 000 KGS", valuePreviewRu: "Сумма 125 000 KGS", requestId: "req-124", workId: "work-gkl-1", invoiceId: "inv-45", paymentId: "pay-77" }],
      approvals: [{ id: "apr-124", titleRu: "Approval директора по заявке №124", statusRu: "approved", approverUserId: "user-director", requestId: "req-124", paymentId: "pay-77", workId: "work-gkl-1" }],
    },
    externalSources: [{
      origin: "manufacturer_manual",
      titleRu: "Рекомендации производителя ГКЛ",
      url: "https://example.com/gkl-manual",
      domain: "example.com",
      checkedAt: "2026-05-20T00:00:00.000Z",
      topic: "construction",
      country: "KG",
      confidence: "medium",
      canBePresentedAsFact: true,
      requiresReview: true,
    }],
  };
}

export function buildAiAppContextGraphFixture(role = "director"): AiContextGraphBuildResult {
  return buildAiAppContextGraph(createAiAppContextGraphFixtureInput(role));
}

export function answerAiAppContextGraphFixture(questionRu: string, role = "director"): AiContextGraphAnswer {
  const graph = buildAiAppContextGraphFixture(role);
  return composeAiContextGraphAnswer({
    questionRu,
    role,
    screenId: "ai.context.graph.fixture",
    graph,
  });
}
