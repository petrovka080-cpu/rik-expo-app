import { validateAiRoleMagicBlueprintSafety } from "../../src/features/ai/roleMagic/aiRoleMagicSafetyPolicy";

describe("AI role magic safety policy", () => {
  it("keeps role magic proactive, evidence-bound and safe by policy", () => {
    const result = validateAiRoleMagicBlueprintSafety();

    expect(result.ok).toBe(true);
    expect(result.finalStatus).toBe("GREEN_AI_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT_READY");
    expect(result.rolesCovered).toEqual(expect.arrayContaining([
      "buyer",
      "accountant",
      "warehouse",
      "foreman",
      "contractor",
      "director",
      "office",
      "documents",
      "chat",
      "map",
      "security",
      "runtime_admin",
    ]));
    expect(result.genericChatOnlyRoles).toBe(0);
  });
});
