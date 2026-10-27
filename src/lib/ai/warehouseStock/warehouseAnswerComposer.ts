import { normalizeWarehouseIntent } from "./warehouseIntentRouter";
import type {
  WarehouseInventoryCount,
  WarehouseLocationRef,
  WarehouseReservationItem,
  WarehouseStockAnswer,
  WarehouseStockContext,
  WarehouseStockEvent,
  WarehouseStockIntent,
  WarehouseStockItem,
  WarehouseStockSourceType,
  WarehouseTransferItem,
} from "./warehouseStockTypes";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function inStockQty(item: WarehouseStockItem): number {
  return item.inStockQty ?? item.availableQty + item.reservedQty;
}

function availableQty(item: WarehouseStockItem): number {
  return Math.max(0, inStockQty(item) - item.reservedQty);
}

function stockFor(context: WarehouseStockContext, materialId: string): WarehouseStockItem | undefined {
  return context.stockItems.find((item) => item.materialId === materialId);
}

function locationToEvent(location?: WarehouseLocationRef): WarehouseStockEvent["location"] | undefined {
  if (!location) return undefined;
  return {
    warehouseId: location.warehouseId,
    warehouseNameRu: location.warehouseNameRu,
    zone: location.zone,
    shelf: location.shelf,
    objectId: location.objectId,
    objectNameRu: location.objectNameRu,
  };
}

function blockersToMissingData(event: WarehouseStockEvent): string[] {
  return event.blockers.map((blocker) => blocker.textRu);
}

function riskFromBlockers(blockers: WarehouseStockEvent["blockers"], fallback: WarehouseStockEvent["riskLevel"]): WarehouseStockEvent["riskLevel"] {
  if (blockers.some((item) => item.kind === "stock_missing" || item.kind === "inventory_mismatch")) return "critical";
  if (blockers.some((item) => item.kind === "quantity_mismatch" || item.kind === "approval_missing")) return "high";
  if (blockers.length) return "medium";
  return fallback;
}

function eventForStock(context: WarehouseStockContext): WarehouseStockEvent[] {
  return context.stockItems.map((item) => {
    const issues = context.issues.filter((issue) => issue.materialId === item.materialId);
    const requested = issues.reduce((sum, issue) => sum + Math.max(0, issue.requestedQty - issue.issuedQty), 0);
    const available = availableQty(item);
    const deficit = Math.max(0, requested - available);
    const blockers: WarehouseStockEvent["blockers"] = [
      ...(deficit > 0 ? [{ kind: "stock_missing" as const, textRu: `Дефицит ${deficit} ${item.unit} блокирует связанную выдачу/работу.` }] : []),
      ...(item.reservedQty > 0 ? [{ kind: "reserved_not_available" as const, textRu: `В резерве ${item.reservedQty} ${item.unit}; это не доступный остаток.` }] : []),
      ...(item.location ? [] : [{ kind: "location_missing" as const, textRu: "Не указана точная складская локация материала." }]),
      ...(item.specificationText || item.specification?.specificationText ? [] : [{ kind: "specification_mismatch" as const, textRu: "Нет source-backed спецификации материала." }]),
    ];
    const riskLevel = riskFromBlockers(blockers, "low");
    const sourceRefs = unique([
      ...item.sourceRefs,
      ...(item.location?.sourceRefs ?? []),
      ...(item.specification?.sourceRefs ?? []),
      ...issues.flatMap((issue) => issue.sourceRefs),
    ]);
    return {
      id: `stock:${item.id}`,
      eventType: deficit > 0 ? "material_blocker" : "stock_overview",
      status: deficit > 0 && available > 0 ? "partial" : deficit > 0 ? "blocked" : "ok",
      materialId: item.materialId,
      materialNameRu: item.materialNameRu,
      specification: item.specification ?? { specificationText: item.specificationText },
      quantity: {
        requested,
        inStock: inStockQty(item),
        reserved: item.reservedQty,
        available,
        expectedIncoming: item.incomingQty,
        deficit,
        unit: item.unit,
      },
      location: locationToEvent(item.location) ?? {
        warehouseNameRu: item.warehouseNameRu,
        objectId: item.objectId,
        objectNameRu: item.objectNameRu,
      },
      linkedContext: {
        requestId: item.requestId,
        requestLineId: item.requestLineId,
        workId: item.workId,
        workNameRu: item.workNameRu,
        objectId: item.objectId,
        objectNameRu: item.objectNameRu,
        estimateLineId: item.estimateLineId,
      },
      blockers,
      riskLevel,
      sourceRefs,
      objectId: item.objectId,
      objectNameRu: item.objectNameRu,
      workId: item.workId,
      workNameRu: item.workNameRu,
      unit: item.unit,
      riskReasonsRu: blockers.length ? blockers.map((blocker) => blocker.textRu) : ["Остаток подтвержден источником и не блокирует текущую выдачу."],
      missingData: blockersToMissingData({
        id: "",
        eventType: "stock_overview",
        status: "ok",
        materialId: item.materialId,
        materialNameRu: item.materialNameRu,
        quantity: { unit: item.unit },
        linkedContext: {},
        blockers,
        riskLevel,
        sourceRefs,
        riskReasonsRu: [],
        missingData: [],
      }),
    };
  });
}

function eventForIncoming(context: WarehouseStockContext): WarehouseStockEvent[] {
  return context.incoming.map((item) => {
    const expected = item.expectedQty ?? item.waybillQty ?? item.quantity;
    const actual = item.actualQty ?? item.quantity;
    const sourceRefs = unique([...item.sourceRefs, ...item.documentRefs, item.waybillId ?? "", item.invoiceId ?? ""]);
    const blockers: WarehouseStockEvent["blockers"] = [
      ...(item.waybillId ? [] : [{ kind: "waybill_missing" as const, textRu: `По приходу ${item.id} не найдена накладная.` }]),
      ...(item.documentRefs.length ? [] : [{ kind: "document_missing" as const, textRu: `По приходу ${item.id} нет прикрепленного документа/сертификата.` }]),
      ...(expected !== actual ? [{ kind: "quantity_mismatch" as const, textRu: `Расхождение прихода: ожидалось ${expected}, факт ${actual} ${item.unit}.` }] : []),
      ...(item.status === "disputed" ? [{ kind: "approval_missing" as const, textRu: "Спорный приход требует маршрута согласования." }] : []),
    ];
    const riskLevel = riskFromBlockers(blockers, item.status === "accepted" ? "low" : "medium");
    return {
      id: `incoming:${item.id}`,
      eventType: "incoming_check",
      status: blockers.some((blocker) => blocker.kind === "quantity_mismatch")
        ? "needs_review"
        : item.status === "accepted"
          ? "completed_read_only"
          : blockers.length
            ? "blocked"
            : "ready_for_draft",
      materialId: item.materialId,
      materialNameRu: item.materialNameRu,
      quantity: {
        expectedIncoming: expected,
        actualIncoming: actual,
        unit: item.unit,
      },
      location: locationToEvent(item.location),
      linkedContext: {
        requestId: item.requestId,
        requestLineId: item.requestLineId,
        supplierId: item.supplierId,
        supplierNameRu: item.supplierNameRu,
        incomingId: item.id,
        documentIds: item.documentRefs,
      },
      blockers,
      riskLevel,
      sourceRefs,
      unit: item.unit,
      riskReasonsRu: blockers.length ? blockers.map((blocker) => blocker.textRu) : ["Приход имеет источник и не показывает расхождений."],
      missingData: blockers.map((blocker) => blocker.textRu),
    };
  });
}

function eventForIssues(context: WarehouseStockContext): WarehouseStockEvent[] {
  return context.issues.map((item) => {
    const stock = stockFor(context, item.materialId);
    const stockAvailable = stock ? availableQty(stock) : 0;
    const deficit = Math.max(0, item.requestedQty - item.issuedQty - stockAvailable);
    const blockers: WarehouseStockEvent["blockers"] = [
      ...(deficit > 0 ? [{ kind: "stock_missing" as const, textRu: `Нельзя выдать полный объем: дефицит ${deficit} ${item.unit}.` }] : []),
      ...(stock && stock.reservedQty > 0 ? [{ kind: "reserved_not_available" as const, textRu: `Резерв ${stock.reservedQty} ${item.unit} не считается доступным остатком.` }] : []),
      ...(item.objectId ? [] : [{ kind: "document_missing" as const, textRu: "Выдача не связана с объектом." }]),
      ...(item.workId ? [] : [{ kind: "document_missing" as const, textRu: "Выдача не связана с работой." }]),
      ...(item.status === "needs_approval" || item.approvalId ? [{ kind: "approval_missing" as const, textRu: "Выдача требует approval route перед фактическим движением." }] : []),
    ];
    const riskLevel = riskFromBlockers(blockers, item.status === "ready_for_pick" ? "low" : "medium");
    return {
      id: `issue:${item.id}`,
      eventType: "issue_readiness",
      status: deficit > 0 && stockAvailable > 0 ? "partial" : deficit > 0 ? "blocked" : item.status === "needs_approval" ? "pending_approval" : "ready_for_draft",
      materialId: item.materialId,
      materialNameRu: item.materialNameRu,
      specification: stock?.specification ?? (stock?.specificationText ? { specificationText: stock.specificationText } : undefined),
      quantity: {
        requested: item.requestedQty,
        requestedForIssue: item.requestedQty,
        issued: item.issuedQty,
        inStock: stock ? inStockQty(stock) : undefined,
        reserved: stock?.reservedQty ?? item.reservedQty,
        available: stockAvailable,
        deficit,
        unit: item.unit,
      },
      location: locationToEvent(stock?.location),
      linkedContext: {
        requestId: item.requestId,
        issueId: item.id,
        workId: item.workId,
        workNameRu: item.workNameRu,
        objectId: item.objectId,
        objectNameRu: item.objectNameRu,
        approvalId: item.approvalId,
      },
      blockers,
      riskLevel,
      sourceRefs: unique([...item.sourceRefs, ...(stock?.sourceRefs ?? [])]),
      objectId: item.objectId,
      objectNameRu: item.objectNameRu,
      workId: item.workId,
      workNameRu: item.workNameRu,
      unit: item.unit,
      riskReasonsRu: blockers.length ? blockers.map((blocker) => blocker.textRu) : ["Материал можно подготовить к выдаче как черновик; фактическая выдача не выполняется AI."],
      missingData: blockers.map((blocker) => blocker.textRu),
    };
  });
}

function eventForReservations(context: WarehouseStockContext): WarehouseStockEvent[] {
  return (context.reservations ?? []).map((item: WarehouseReservationItem) => {
    const blockers: WarehouseStockEvent["blockers"] = [
      ...(item.status === "expired" ? [{ kind: "approval_missing" as const, textRu: `Резерв ${item.id} просрочен; снятие только через человека/approval.` }] : []),
      ...(item.objectId ? [] : [{ kind: "document_missing" as const, textRu: `Резерв ${item.id} не связан с объектом.` }]),
      ...(item.workId ? [] : [{ kind: "document_missing" as const, textRu: `Резерв ${item.id} не связан с работой.` }]),
    ];
    return {
      id: `reservation:${item.id}`,
      eventType: "reservation_check",
      status: item.status === "pending_approval" ? "pending_approval" : blockers.length ? "needs_review" : "ok",
      materialId: item.materialId,
      materialNameRu: item.materialNameRu,
      quantity: { reserved: item.quantity, unit: item.unit },
      linkedContext: {
        requestId: item.requestId,
        reservationId: item.id,
        workId: item.workId,
        workNameRu: item.workNameRu,
        objectId: item.objectId,
        objectNameRu: item.objectNameRu,
      },
      blockers,
      riskLevel: riskFromBlockers(blockers, "low"),
      sourceRefs: item.sourceRefs,
      objectId: item.objectId,
      objectNameRu: item.objectNameRu,
      workId: item.workId,
      workNameRu: item.workNameRu,
      unit: item.unit,
      riskReasonsRu: blockers.length ? blockers.map((blocker) => blocker.textRu) : ["Резерв имеет связанный объект/работу."],
      missingData: blockers.map((blocker) => blocker.textRu),
    };
  });
}

function eventForTransfers(context: WarehouseStockContext): WarehouseStockEvent[] {
  return (context.transfers ?? []).map((item: WarehouseTransferItem) => {
    const blockers: WarehouseStockEvent["blockers"] = [
      ...(item.fromLocation ? [] : [{ kind: "location_missing" as const, textRu: `Перемещение ${item.id} без исходной локации.` }]),
      ...(item.toLocation ? [] : [{ kind: "location_missing" as const, textRu: `Перемещение ${item.id} без целевой локации.` }]),
      ...(item.status === "pending_approval" || item.approvalId ? [{ kind: "approval_missing" as const, textRu: `Перемещение ${item.id} требует approval route перед фактом.` }] : []),
    ];
    return {
      id: `transfer:${item.id}`,
      eventType: "transfer_check",
      status: item.status === "completed" ? "completed_read_only" : blockers.length ? "needs_review" : "ready_for_draft",
      materialId: item.materialId,
      materialNameRu: item.materialNameRu,
      quantity: { requested: item.quantity, unit: item.unit },
      location: locationToEvent(item.fromLocation),
      linkedContext: {
        transferId: item.id,
        workId: item.workId,
        workNameRu: item.workNameRu,
        objectId: item.objectId,
        objectNameRu: item.objectNameRu,
        approvalId: item.approvalId,
      },
      blockers,
      riskLevel: riskFromBlockers(blockers, "low"),
      sourceRefs: unique([...item.sourceRefs, ...(item.fromLocation?.sourceRefs ?? []), ...(item.toLocation?.sourceRefs ?? [])]),
      objectId: item.objectId,
      objectNameRu: item.objectNameRu,
      workId: item.workId,
      workNameRu: item.workNameRu,
      unit: item.unit,
      riskReasonsRu: blockers.length ? blockers.map((blocker) => blocker.textRu) : ["Перемещение можно подготовить как черновик; факт не выполняется AI."],
      missingData: blockers.map((blocker) => blocker.textRu),
    };
  });
}

function eventForInventory(context: WarehouseStockContext): WarehouseStockEvent[] {
  return (context.inventoryCounts ?? []).map((item: WarehouseInventoryCount) => {
    const mismatch = typeof item.countedQty === "number" && item.countedQty !== item.bookQty;
    const blockers: WarehouseStockEvent["blockers"] = [
      ...(mismatch ? [{ kind: "inventory_mismatch" as const, textRu: `Инвентаризация ${item.id}: учет ${item.bookQty}, факт ${item.countedQty} ${item.unit}.` }] : []),
      ...(typeof item.countedQty === "number" ? [] : [{ kind: "inventory_mismatch" as const, textRu: `Инвентаризация ${item.id} без фактического пересчета.` }]),
      ...(item.location ? [] : [{ kind: "location_missing" as const, textRu: `Инвентаризация ${item.id} без локации.` }]),
    ];
    return {
      id: `inventory:${item.id}`,
      eventType: "inventory_discrepancy",
      status: blockers.length ? "needs_review" : "ok",
      materialId: item.materialId,
      materialNameRu: item.materialNameRu,
      quantity: { inStock: item.bookQty, actualIncoming: item.countedQty, unit: item.unit },
      location: locationToEvent(item.location),
      linkedContext: { inventoryCountId: item.id },
      blockers,
      riskLevel: riskFromBlockers(blockers, "low"),
      sourceRefs: unique([...item.sourceRefs, ...(item.location?.sourceRefs ?? [])]),
      unit: item.unit,
      riskReasonsRu: blockers.length ? blockers.map((blocker) => blocker.textRu) : ["Факт инвентаризации совпадает с учетом."],
      missingData: blockers.map((blocker) => blocker.textRu),
    };
  });
}

function answerKindForIntent(intent: WarehouseStockIntent): WarehouseStockAnswer["answerKind"] {
  const normalized = normalizeWarehouseIntent(intent);
  if (normalized === "incoming_review" || normalized === "incoming_waybill_reconciliation") return "incoming_review";
  if (normalized === "issue_readiness") return "issue_readiness";
  if (normalized === "material_blockers" || normalized === "critical_deficits") return "material_blocker_report";
  if (normalized === "inventory_discrepancy_check") return "inventory_discrepancy_report";
  if (normalized === "reservation_check") return "reservation_report";
  if (normalized === "transfer_readiness") return "transfer_review";
  if (normalized === "draft_issue_document") return "draft_issue";
  if (normalized === "draft_discrepancy_act") return "draft_discrepancy_act";
  if (normalized === "warehouse_approval_handoff") return "approval_route";
  if (normalized === "warehouse_to_procurement_link" || normalized === "warehouse_to_work_link") return "handoff_draft";
  return "stock_summary";
}

function safeSourceType(type: string): WarehouseStockSourceType {
  if (type === "warehouse_stock") return "warehouse_stock";
  if (type === "procurement_request") return "procurement_request";
  if (type === "supplier_offer") return "supplier_offer";
  if (type === "work" || type === "object" || type === "zone" || type === "material" || type === "approval" || type === "chat_message") return type;
  if (type === "specification" || type === "project_pdf" || type === "engineering_pdf" || type === "estimate_pdf" || type === "boq") return "project_specification";
  if (type === "act" || type === "report" || type === "photo") return "document";
  return "document";
}

function sourcesFromContext(context: WarehouseStockContext): WarehouseStockAnswer["sources"] {
  const base = context.sources.map((source) => ({
    id: source.id,
    type: safeSourceType(source.type),
    labelRu: source.labelRu,
    page: source.page,
  }));
  const generated = [
    ...context.stockItems.map((item) => ({ id: item.id, type: "stock_item" as const, labelRu: `Stock item ${item.materialNameRu}` })),
    ...context.incoming.map((item) => ({ id: item.id, type: "incoming" as const, labelRu: `Incoming ${item.materialNameRu}` })),
    ...context.incoming.flatMap((item) => item.waybillId ? [{ id: item.waybillId, type: "waybill" as const, labelRu: `Накладная ${item.waybillId}` }] : []),
    ...context.incoming.flatMap((item) => item.invoiceId ? [{ id: item.invoiceId, type: "invoice" as const, labelRu: `Счет ${item.invoiceId}` }] : []),
    ...context.issues.map((item) => ({ id: item.id, type: "issue" as const, labelRu: `Issue ${item.materialNameRu}` })),
    ...(context.reservations ?? []).map((item) => ({ id: item.id, type: "reservation" as const, labelRu: `Reservation ${item.materialNameRu}` })),
    ...(context.transfers ?? []).map((item) => ({ id: item.id, type: "transfer" as const, labelRu: `Transfer ${item.materialNameRu}` })),
    ...(context.inventoryCounts ?? []).map((item) => ({ id: item.id, type: "inventory_count" as const, labelRu: `Inventory ${item.materialNameRu}` })),
  ];
  const seen = new Set<string>();
  return [...base, ...generated].filter((item) => {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nextStepForIntent(intent: WarehouseStockIntent): string {
  const normalized = normalizeWarehouseIntent(intent);
  if (normalized === "warehouse_to_procurement_link") return "Передать снабженцу подтвержденный дефицит как черновик, не создавая закупку напрямую.";
  if (normalized === "warehouse_to_work_link") return "Передать прорабу список material blockers без изменения статуса работы.";
  if (normalized === "warehouse_approval_handoff") return "Подготовить маршрут согласования в approval ledger для решения человека.";
  if (normalized === "draft_issue_document") return "Подготовить черновик частичной выдачи; фактическую выдачу выполняет человек после проверки.";
  if (normalized === "draft_discrepancy_act") return "Подготовить черновик акта расхождения и приложить документы/фото; списание не выполнять.";
  return "Проверить источники, документы и blockers перед любым складским действием человека.";
}

function composeAnswerText(params: {
  context: WarehouseStockContext;
  intent: WarehouseStockIntent;
  shortAnswerRu: string;
  events: WarehouseStockEvent[];
  missingData: string[];
  sourceTrace: string[];
  nextStepRu: string;
}): string {
  const materialRows = params.events
    .filter((event) => event.eventType === "stock_overview" || event.eventType === "material_blocker" || event.eventType === "issue_readiness")
    .map((event) => [
      `1. ${event.materialNameRu}`,
      `   Нужно: ${event.quantity.requested ?? event.quantity.requestedForIssue ?? "не указано"} ${event.quantity.unit}`,
      `   На складе: ${event.quantity.inStock ?? "нет данных"} ${event.quantity.unit}`,
      `   Зарезервировано: ${event.quantity.reserved ?? 0} ${event.quantity.unit}`,
      `   Доступно: ${event.quantity.available ?? "нет данных"} ${event.quantity.unit}`,
      `   Дефицит: ${event.quantity.deficit ?? 0} ${event.quantity.unit}`,
      `   Связанная работа: ${event.linkedContext.workId ?? "нет связи"}`,
      `   Связанная заявка: ${event.linkedContext.requestId ?? "нет связи"}`,
      `   Риск: ${event.riskLevel}`,
    ].join("\n"));
  const movementRows = params.events
    .filter((event) => event.eventType === "incoming_check" || event.eventType === "reservation_check" || event.eventType === "transfer_check" || event.eventType === "inventory_discrepancy")
    .map((event) => `- ${event.id}: ${event.materialNameRu}, статус ${event.status}, риск ${event.riskLevel}.`);
  return [
    "Ответ",
    "",
    "Коротко:",
    params.shortAnswerRu,
    "",
    "Период:",
    "сегодня / текущий экран склада",
    "",
    "Материалы:",
    ...(materialRows.length ? materialRows : ["- Подтвержденные материалы не найдены; факты не выдуманы."]),
    "",
    "Приход / выдача:",
    ...(movementRows.length ? movementRows : ["- Связанные приходы/выдачи/резервы не найдены."]),
    "",
    "Чего не хватает:",
    ...(params.missingData.length ? params.missingData.map((item) => `- ${item}`) : ["- Критичных missing data по доступным источникам нет."]),
    "",
    "Источники:",
    ...(params.sourceTrace.length ? params.sourceTrace.map((item) => `- ${item}`) : ["- Точный источник отсутствует; проектный факт не утверждался."]),
    "",
    "Следующий шаг:",
    params.nextStepRu,
    "",
    "Статус:",
    params.intent === "warehouse_approval_handoff"
      ? "Остатки не изменены. Приход не принят. Выдача не выполнена. Подготовлен маршрут согласования."
      : "Остатки не изменены. Приход не принят. Выдача не выполнена.",
  ].join("\n");
}

export function composeWarehouseStockAnswer(params: {
  context: WarehouseStockContext;
  intent: WarehouseStockIntent;
  questionRu: string;
  providerTrace: string[];
  missingData: string[];
  hiddenByPermission?: { sourceType: string; reasonRu: string }[];
}): WarehouseStockAnswer {
  const intent = normalizeWarehouseIntent(params.intent);
  const events = [
    ...eventForStock(params.context),
    ...eventForIncoming(params.context),
    ...eventForIssues(params.context),
    ...eventForReservations(params.context),
    ...eventForTransfers(params.context),
    ...eventForInventory(params.context),
  ];
  const sourceTrace = unique([
    ...params.context.sources.map((source) => source.id),
    ...params.context.stockItems.flatMap((item) => item.sourceRefs),
    ...params.context.incoming.flatMap((item) => [...item.sourceRefs, ...item.documentRefs, item.waybillId ?? "", item.invoiceId ?? ""]),
    ...params.context.issues.flatMap((item) => item.sourceRefs),
    ...(params.context.reservations ?? []).flatMap((item) => item.sourceRefs),
    ...(params.context.transfers ?? []).flatMap((item) => item.sourceRefs),
    ...(params.context.inventoryCounts ?? []).flatMap((item) => item.sourceRefs),
  ]);
  const allMissing = unique([
    ...params.missingData,
    ...events.flatMap((event) => event.missingData),
    ...(events.length ? [] : ["По экрану не найдены source-backed складские события."]),
  ]);
  const blockedIssues = events.filter((event) => event.eventType === "issue_readiness" && (event.status === "blocked" || event.status === "pending_approval")).length;
  const criticalMaterials = events.filter((event) => event.riskLevel === "critical" || event.riskLevel === "high").length;
  const readyToIssue = events.filter((event) => event.eventType === "issue_readiness" && (event.status === "ready_for_draft" || event.status === "partial")).length;
  const pendingIncoming = events.filter((event) => event.eventType === "incoming_check" && event.status !== "completed_read_only").length;
  const discrepancies = events.filter((event) => event.blockers.some((blocker) =>
    blocker.kind === "quantity_mismatch" || blocker.kind === "inventory_mismatch",
  ));
  const shortAnswerRu = events.length
    ? `Найдено ${params.context.stockItems.length} складских позиций, ${pendingIncoming} приходов на проверке, ${readyToIssue} выдач можно готовить как черновик; ${criticalMaterials} событий требуют внимания.`
    : "По складу не найдено подтвержденных строк; показаны точные причины отсутствия данных.";
  const nextStepRu = nextStepForIntent(intent);
  return {
    screenId: params.context.screenId,
    role: "warehouse",
    questionRu: params.questionRu,
    intent,
    answerKind: events.length ? answerKindForIntent(intent) : "exact_no_data_reason",
    titleRu: "Складская воронка материалов",
    shortAnswerRu,
    period: { labelRu: "сегодня / текущий экран склада" },
    events,
    totals: {
      stockItems: params.context.stockItems.length,
      criticalDeficits: events.filter((event) => (event.quantity.deficit ?? 0) > 0).length,
      pendingIncoming,
      readyToIssue,
      blockedIssues,
      discrepancies: discrepancies.length,
    },
    stockSummary: {
      totalItems: params.context.stockItems.length,
      availableQty: params.context.stockItems.reduce((sum, item) => sum + availableQty(item), 0),
      reservedQty: params.context.stockItems.reduce((sum, item) => sum + item.reservedQty, 0),
      incomingQty: params.context.stockItems.reduce((sum, item) => sum + item.incomingQty, 0),
      blockedIssues,
      criticalMaterials,
    },
    discrepancies: discrepancies.map((event) => ({
      eventId: event.id,
      reasonRu: event.riskReasonsRu.join("; "),
      sourceRefs: event.sourceRefs,
    })),
    risks: events.flatMap((event) =>
      event.riskReasonsRu.map((reasonRu) => ({
        eventId: event.id,
        level: event.riskLevel,
        reasonRu,
        sourceRefs: event.sourceRefs,
      })),
    ),
    sources: sourcesFromContext(params.context),
    missingData: allMissing,
    hiddenByPermission: params.hiddenByPermission ?? [],
    nextStepRu,
    answerRu: composeAnswerText({
      context: params.context,
      intent,
      shortAnswerRu,
      events,
      missingData: allMissing,
      sourceTrace,
      nextStepRu,
    }),
    sourceTrace,
    providerTrace: params.providerTrace,
    changedData: false,
    stockMutated: false,
    incomingAccepted: false,
    issueCompleted: false,
    transferCompleted: false,
    writeoffCompleted: false,
    autoApproval: false,
    issueExecuted: false,
    writeoffCreated: false,
    reservationCreated: false,
    fakeStockCreated: false,
    fakeIncomingCreated: false,
    fakeIssueCreated: false,
    fakeDocumentCreated: false,
    genericAnswerUsed: false,
  };
}
