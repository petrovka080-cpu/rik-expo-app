import type { BuiltInAiAction, BuiltInAiIntentRoute, BuiltInAiToolResult } from "./builtInAiTypes";

export function buildBuiltInAiActions(route: BuiltInAiIntentRoute, result: BuiltInAiToolResult): BuiltInAiAction[] {
  if (result.estimate) {
    return [
      { id: "make_pdf", labelRu: "Сделать PDF", toolName: "generate_estimate_pdf", visible: true },
      { id: "save_estimate", labelRu: "Сохранить в сметы", visible: true },
      { id: "create_request", labelRu: "Создать заявку", toolName: "create_consumer_repair_draft", visible: true },
      { id: "clarify_city", labelRu: "Уточнить город", visible: true },
      { id: "refresh_prices", labelRu: "Обновить цены", visible: true },
      ...(route.screenContext === "foreman"
        ? [{ id: "send_to_director" as const, labelRu: "Передать директору", visible: true }]
        : []),
    ];
  }
  if (result.productSearch) {
    return [
      { id: "create_purchase_list", labelRu: "Создать закупку", toolName: "create_purchase_list", visible: true },
      { id: "make_pdf", labelRu: "Сделать PDF", toolName: "generate_estimate_pdf", visible: true },
      { id: "save_product_search", labelRu: "Сохранить подбор", visible: true },
      { id: "refresh_prices", labelRu: "Обновить цены", visible: true },
    ];
  }
  return [];
}
