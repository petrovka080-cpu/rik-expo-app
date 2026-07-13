import { validateLegacyAiEntrypointMigration } from "../../src/lib/aiPlatform/migration/validateLegacyAiEntrypointMigration";

describe("AI legacy entrypoint migration wrapper", () => {
  it("classifies legacy AI entrypoints without deleting behavior", () => {
    const result = validateLegacyAiEntrypointMigration();
    expect(result.ok).toBe(true);
    expect(result.legacy_ai_entrypoint_wrapper_created).toBe(true);
    expect(result.all_existing_ai_entrypoints_wrapped_or_classified).toBe(true);
    expect(result.user_visible_behavior_preserved).toBe(true);
    expect(result.legacy_outputs_contract_preserved).toBe(true);
    expect(result.ai_kernel_ledger_added).toBe(true);
  });
});
