import { overlayS2732PurchaseGroup, type PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
export { FORMWORK_MATERIAL_PURCHASE_TARGETS_S2733 } from "./s2733FormworkMaterialPurchaseScope";
export const FORMWORK_MATERIAL_PURCHASE_S2733_CONTRACT = "formwork-material-order-and-linked-delivery:s27-33.v1";
const operations: Readonly<Record<string, readonly [string, string]>> = {
  formwork: ["Комплект, установка, распалубка и возврат опалубки", "Подтверждённая раскладка обеспечена возвратным комплектом, расходниками, трудом, техникой и предусмотренной доставкой; аренда считается по количеству и сроку, расходники — по отдельной ведомости."],
  reinforcement: ["Подготовка и установка армирования", "Ведомость армирования обеспечена сталью, проволокой, фиксаторами, применимыми муфтами, трудом, техникой и контролем; принятый заказ стали определяет её отдельную доставку."],
  joint: ["Устройство предусмотренных проектом швов", "Применимые компоненты шва, труд, техника и контроль раскрыты по проектной спецификации; дефицит материала не скрыт ручным заказом."],
  "embedded-items": ["Установка закладных деталей", "Подтверждённые закладные, сварочные и защитные материалы, временные крепления, труд, техника и транспорт соответствуют проектной ведомости."],
  vibration: ["Виброуплотнение и очистка оборудования", "Объём, труд, оборудование, энергия, предусмотренные расходники, очистка и перевозки соответствуют подтверждённому профилю операции."],
  curing: ["Уход за свежеуложенным бетоном", "Выбранный способ ухода обеспечен предусмотренными материалами, трудом, оборудованием и контролем; альтернативные способы не суммируются."],
  finishing: ["Первичная отделка поверхности бетона", "Поверхность, труд, применимые инструменты и контроль определены проектной операцией."],
  "winter-heating": ["Применимый зимний прогрев", "При выбранном зимнем режиме предусмотрены кабель, труд и оборудование по подтверждённому плану."],
  "concrete-placement": ["Заказ, доставка и укладка бетонной смеси", "Принятый заказ смеси согласован с доставкой; проектные часы укладки, подачи и контроля не заменены количеством заказа."],
};
export function overlayS2733FormworkMaterialPurchase(parent: PurchaseGroupRepresentative) {
  const overlay = overlayS2732PurchaseGroup(parent, { formworkMaterialOwners: true });
  for (const row of overlay.representative.resources) {
    const id = String(row.row_id);
    const operationId = id.includes(":formwork:") ? "formwork" : id.includes(":reinforcement:") ? "reinforcement"
      : id.includes(":joint-") || id.includes(":joint:") ? "joint" : id.includes("embedded-items") ? "embedded-items"
        : id.startsWith("concrete-stairs-vibration:") ? "vibration" : /curing|:cure$/.test(id) ? "curing"
          : /finish/.test(id) ? "finishing" : /winter-heating|heating-transformer/.test(id) ? "winter-heating" : "concrete-placement";
    const [title, criterion] = operations[operationId];
    row.resource_graph = { ...row.resource_graph, operationCompositionV1: {
      contractVersion: "canonical-operation-resource/v1", groupId: String(parent.definition.catalog_id), groupTitleRu: parent.passport.physical_result_ru,
      operationId, operationTitleRu: title, completionCriterionRu: criterion,
    } };
  }
  return { ...overlay, addedFormulaIds: [], contract: FORMWORK_MATERIAL_PURCHASE_S2733_CONTRACT };
}
