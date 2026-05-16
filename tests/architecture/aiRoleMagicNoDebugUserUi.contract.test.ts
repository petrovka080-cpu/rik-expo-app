import { listAiRoleMagicBlueprints } from "../../src/features/ai/roleMagic/aiRoleMagicBlueprintRegistry";

describe("AI role magic hides debug and provider-copy from user UI", () => {
  it("does not put runtime, policy or provider failure copy into role-facing blueprint text", () => {
    const text = JSON.stringify(listAiRoleMagicBlueprints());

    expect(text).not.toMatch(/Data-aware context|allowedIntents|blockedIntents|safe guide mode|raw policy dump|raw runtime transport|raw BFF debug/i);
    expect(text).not.toMatch(/provider unavailable|module unavailable|AI-ключи не настроены|AI keys are not configured/i);
  });
});
