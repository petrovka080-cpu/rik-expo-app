import type { BuiltInAiIntentRoute, BuiltInAiToolName } from "./builtInAiTypes";

const TOOL_BY_INTENT: Record<BuiltInAiIntentRoute["intent"], BuiltInAiToolName[]> = {
  estimate: ["calculate_global_estimate"],
  product_search: ["search_material_products", "search_marketplace_products"],
  marketplace_lookup: ["search_marketplace_products", "search_material_products"],
  request_draft: ["create_consumer_repair_draft"],
  pdf_action: ["generate_estimate_pdf"],
  role_status_qa: ["get_role_data"],
  document_analysis: ["search_documents"],
  photo_repair: ["analyze_photo_repair", "calculate_global_estimate"],
  procurement: ["create_purchase_list", "search_material_products"],
  general_chat: ["get_screen_context"],
};

const FORBIDDEN_BY_INTENT: Record<BuiltInAiIntentRoute["intent"], string[]> = {
  estimate: ["role_qa", "generic_chat", "generic_request_draft", "legacy_estimate_engine"],
  product_search: ["generic_chat", "fake_stock", "fake_availability"],
  marketplace_lookup: ["generic_chat", "fake_seller", "fake_stock", "fake_availability"],
  request_draft: ["generic_request_draft_when_estimate_resolved"],
  pdf_action: ["markdown_as_truth", "fake_pdf_status"],
  role_status_qa: ["estimate_override", "product_search_override"],
  document_analysis: ["raw_provider_payload"],
  photo_repair: ["dangerous_diy"],
  procurement: ["fake_stock", "fake_availability"],
  general_chat: [],
};

export function applyBuiltInAiToolPolicy(route: BuiltInAiIntentRoute): BuiltInAiIntentRoute {
  const allowedTools = TOOL_BY_INTENT[route.intent];
  return {
    ...route,
    mustUseBackendTool: route.mustUseBackendTool || route.intent === "estimate" || route.intent === "product_search" || route.intent === "marketplace_lookup",
    allowedTools,
    forbiddenFallbacks: FORBIDDEN_BY_INTENT[route.intent],
  };
}
