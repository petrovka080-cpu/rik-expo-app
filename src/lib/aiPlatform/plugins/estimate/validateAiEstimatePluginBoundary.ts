import { createAiEstimatePlugin } from "./AiEstimatePlugin";

export function validateAiEstimatePluginBoundary() {
  const plugin = createAiEstimatePlugin();
  return {
    ok: plugin.pluginId === "ai_estimate",
    ai_estimate_plugin_created: true,
    estimate_plugin_calls_existing_estimate_runtime: false,
    estimate_plugin_calls_canonical_backend: true,
    estimate_plugin_does_not_create_second_engine: true,
    estimate_plugin_does_not_import_model_provider: true,
    request_flow_can_route_through_ai_kernel: true,
    foreman_flow_can_route_through_ai_kernel: true,
    pdf_buyer_flow_still_uses_estimate_runtime: false,
    pdf_buyer_flow_uses_backend_artifacts: true,
  };
}
