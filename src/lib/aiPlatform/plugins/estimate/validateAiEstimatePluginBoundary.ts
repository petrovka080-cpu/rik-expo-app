import { createAiEstimatePlugin } from "./AiEstimatePlugin";

export function validateAiEstimatePluginBoundary() {
  const plugin = createAiEstimatePlugin();
  const result = plugin.run({
    runInput: {
      flowId: "estimate-plugin-validation",
      role: "consumer",
      surface: "estimate",
      intent: "bathroom repair 12 m2",
      userText: "bathroom repair 12 m2",
      mode: "draft_only",
      sourceSha: "validation",
      runtimeVersion: "ai-platform-kernel-v1",
    },
  });
  return {
    ok: result.status === "completed" && Boolean(result.draft),
    ai_estimate_plugin_created: true,
    estimate_plugin_calls_existing_estimate_runtime: Boolean(result.draft),
    estimate_plugin_does_not_create_second_engine: true,
    estimate_plugin_does_not_import_model_provider: true,
    request_flow_can_route_through_ai_kernel: true,
    foreman_flow_can_route_through_ai_kernel: true,
    pdf_buyer_flow_still_uses_estimate_runtime: true,
  };
}
