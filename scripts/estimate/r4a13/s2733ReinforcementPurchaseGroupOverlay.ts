import { overlayS2732PurchaseGroup, S2733_REINFORCEMENT_PURCHASE_GROUP_CATALOG_IDS, type PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";

export const REINFORCEMENT_PURCHASE_TARGETS_S2733 = S2733_REINFORCEMENT_PURCHASE_GROUP_CATALOG_IDS;
export const REINFORCEMENT_PURCHASE_S2733_CONTRACT = "reinforcement-order-and-delivery:s27-33.v1";

/** Keep the delivered bar schedules/components. Reuse the shared order
 * balance; direct project takeoff remains the requirement for each owner. */
export function overlayS2733ReinforcementPurchaseGroup(parent: PurchaseGroupRepresentative, _locatorId: string) {
  const overlay = overlayS2732PurchaseGroup(parent, { reinforcementOwners: true });
  const r = overlay.representative;
  for (const row of r.resources) {
    const operationId = row.category === "delivery" ? "steel-logistics" : row.category === "service" ? "control" : "reinforcement";
    row.resource_graph = { ...row.resource_graph, operationCompositionV1: {
      contractVersion: "canonical-operation-resource/v1", groupId: String(parent.definition.catalog_id), groupTitleRu: parent.passport.physical_result_ru,
      operationId, operationTitleRu: operationId === "steel-logistics" ? "Доставка арматурной стали или готовых каркасов"
        : operationId === "control" ? "Контроль и документация армирования" : "Подготовка, сборка и установка армирования",
      completionCriterionRu: operationId === "steel-logistics" ? "Принятый заказ стали согласован с массой отдельной доставки и подтверждённым расстоянием."
        : operationId === "control" ? "Проверены армирование, защитный слой и документы по утверждённому плану качества."
          : "Состав по утверждённой ведомости обеспечен сталью, проволокой, фиксаторами, применимыми муфтами, трудом и техникой; дефицит заказа не скрыт ручным количеством.",
    } };
  }
  return { ...overlay, addedFormulaIds: [], contract: REINFORCEMENT_PURCHASE_S2733_CONTRACT };
}
