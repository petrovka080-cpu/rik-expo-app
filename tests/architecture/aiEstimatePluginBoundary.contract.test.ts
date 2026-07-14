import { validateAiEstimatePluginBoundary } from "../../src/lib/aiPlatform/plugins/estimate/validateAiEstimatePluginBoundary";

describe("AI estimate plugin boundary", () => {
  it("routes estimate through existing estimate runtime without a second engine", () => {
    const result = validateAiEstimatePluginBoundary();
    expect(result.ok).toBe(true);
    expect(result.ai_estimate_plugin_created).toBe(true);
    expect(result.estimate_plugin_calls_existing_estimate_runtime).toBe(true);
    expect(result.estimate_plugin_does_not_create_second_engine).toBe(true);
    expect(result.estimate_plugin_does_not_import_model_provider).toBe(true);
  });
});
