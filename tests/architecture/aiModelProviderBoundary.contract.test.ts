import { validateAiModelProviderBoundary } from "../../src/lib/aiPlatform/providers/validateAiModelProviderBoundary";

describe("AI model provider boundary", () => {
  it("keeps model/provider calls behind platform provider adapters", () => {
    const result = validateAiModelProviderBoundary();
    expect(result.ok).toBe(true);
    expect(result.ai_model_provider_port_created).toBe(true);
    expect(result.provider_registry_created).toBe(true);
    expect(result.server_provider_adapter_created).toBe(true);
    expect(result.in_memory_provider_for_tests_created).toBe(true);
    expect(result.direct_llm_sdk_calls_outside_provider_count).toBe(0);
    expect(result.client_side_api_key_usage_count).toBe(0);
    expect(result.model_replacement_requires_adapter_only).toBe(true);
  });
});
