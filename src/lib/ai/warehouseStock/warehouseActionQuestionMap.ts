import { normalizeWarehouseIntent } from "./warehouseIntentRouter";
import type { WarehouseActionQuestion, WarehouseScreenId, WarehouseStockIntent } from "./warehouseStockTypes";

export const WAREHOUSE_ACTION_QUESTION_MAP: readonly WarehouseActionQuestion[] = [
  {
    screenId: "warehouse.main",
    actionId: "critical_deficits",
    labelRu: "Что критично",
    concreteQuestionRu:
      "Покажи критичные дефициты склада: какие материалы блокируют работы, сколько нужно, сколько доступно, что зарезервировано и какой следующий шаг.",
    requiredContext: ["period"],
    allowedSources: ["stock_item", "reservation", "work", "object", "procurement_request", "incoming"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.main",
    actionId: "issue_readiness",
    labelRu: "Что можно выдать",
    concreteQuestionRu:
      "Проверь, какие материалы можно выдать на объекты сегодня, а какие нельзя из-за дефицита, резерва, документов или approval.",
    requiredContext: ["period"],
    allowedSources: ["stock_item", "issue", "reservation", "work", "object", "approval"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.main",
    actionId: "incoming_review",
    labelRu: "Проверить приход",
    concreteQuestionRu:
      "Проверь ожидаемые и фактические приходы: количество, накладные, поставщика, расхождения, документы и что можно принять только после проверки.",
    requiredContext: ["period"],
    allowedSources: ["incoming", "waybill", "supplier_offer", "procurement_request", "document", "pdf_chunk"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.main",
    actionId: "inventory_discrepancy_check",
    labelRu: "Найти расхождения",
    concreteQuestionRu:
      "Найди расхождения между учетным остатком, фактом, приходом, выдачей, резервом, заявкой и документами.",
    requiredContext: ["period"],
    allowedSources: ["stock_item", "inventory_count", "incoming", "issue", "reservation", "document"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.main",
    actionId: "material_blockers",
    labelRu: "Материалы блокируют работы",
    concreteQuestionRu:
      "Покажи материалы, которые блокируют работы на объектах, и объясни связь: работа, объект, количество, склад, заявка, приход.",
    requiredContext: ["period"],
    allowedSources: ["stock_item", "work", "object", "procurement_request", "incoming", "estimate_line"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.main",
    actionId: "reservation_check",
    labelRu: "Показать резервы",
    concreteQuestionRu:
      "Покажи резервы: под какие объекты и работы зарезервирован материал, что просрочено и что нельзя освобождать без approval.",
    requiredContext: ["period"],
    allowedSources: ["stock_item", "reservation", "work", "object", "approval"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.main",
    actionId: "draft_issue_document",
    labelRu: "Подготовить выдачу",
    concreteQuestionRu:
      "Подготовь черновик выдачи материала на объект с количеством, основанием, работой и проверками, без фактической складской мутации.",
    requiredContext: ["material"],
    allowedSources: ["stock_item", "issue", "work", "object", "approval"],
    answerMode: "draft",
  },
  {
    screenId: "warehouse.main",
    actionId: "draft_discrepancy_act",
    labelRu: "Подготовить акт расхождения",
    concreteQuestionRu:
      "Подготовь черновик акта расхождения по приходу/остатку/инвентаризации с источниками и missing data, без финального списания.",
    requiredContext: ["incoming"],
    allowedSources: ["incoming", "waybill", "inventory_count", "document", "supplier_offer"],
    answerMode: "draft",
  },
  {
    screenId: "warehouse.incoming",
    actionId: "incoming_waybill_reconciliation",
    labelRu: "Сверить с накладной",
    concreteQuestionRu:
      "Сверь приход с заявкой, предложением поставщика, накладной и фактическим количеством; покажи расхождения и документы.",
    requiredContext: ["incoming"],
    allowedSources: ["incoming", "waybill", "procurement_request", "supplier_offer", "document", "pdf_chunk"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.issue",
    actionId: "issue_readiness",
    labelRu: "Проверить доступность",
    concreteQuestionRu:
      "Проверь доступность выдачи: нужно, на складе, резерв, доступно, объект, работа, документы и approval. Не выдавай материал.",
    requiredContext: ["issue"],
    allowedSources: ["stock_item", "issue", "reservation", "work", "object", "approval"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.stock.detail",
    actionId: "warehouse_to_work_link",
    labelRu: "Показать связанные работы",
    concreteQuestionRu:
      "Покажи движение материала и связанные работы/объекты/заявки/документы с source trace.",
    requiredContext: ["material"],
    allowedSources: ["stock_item", "issue", "reservation", "work", "object", "procurement_request", "document"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.transfers",
    actionId: "transfer_readiness",
    labelRu: "Проверить перемещение",
    concreteQuestionRu:
      "Проверь перемещение: откуда, куда, что, сколько, основание, документы и approval. Не перемещай материал.",
    requiredContext: ["period"],
    allowedSources: ["transfer", "stock_item", "warehouse_location", "document", "approval"],
    answerMode: "read",
  },
  {
    screenId: "warehouse.main",
    actionId: "warehouse_approval_handoff",
    labelRu: "Отправить на согласование",
    concreteQuestionRu:
      "Подготовь маршрут согласования для спорного прихода, выдачи, резерва или перемещения без автоматического approval.",
    requiredContext: ["period"],
    allowedSources: ["stock_item", "incoming", "issue", "reservation", "transfer", "approval", "document"],
    answerMode: "approval_route",
  },
] as const;

export function getWarehouseActionQuestion(
  actionId: WarehouseStockIntent,
  screenId?: WarehouseScreenId,
): WarehouseActionQuestion | null {
  const normalized = normalizeWarehouseIntent(actionId);
  return WAREHOUSE_ACTION_QUESTION_MAP.find((action) =>
    action.actionId === normalized && (!screenId || action.screenId === screenId),
  ) ?? WAREHOUSE_ACTION_QUESTION_MAP.find((action) => action.actionId === normalized) ?? null;
}
