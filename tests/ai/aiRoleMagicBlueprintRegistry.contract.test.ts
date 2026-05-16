import {
  AI_ROLE_MAGIC_REQUIRED_ROLE_IDS,
  getAiRoleMagicBlueprint,
  listAiRoleMagicBlueprints,
} from "../../src/features/ai/roleMagic/aiRoleMagicBlueprintRegistry";

describe("AI role magic blueprint registry", () => {
  it("covers every required role with role empathy, prepared work, screen coverage and safety", () => {
    const blueprints = listAiRoleMagicBlueprints();
    const roleIds = blueprints.map((blueprint) => blueprint.roleId);

    expect(roleIds).toEqual(expect.arrayContaining([...AI_ROLE_MAGIC_REQUIRED_ROLE_IDS]));
    expect(roleIds).toHaveLength(12);

    for (const blueprint of blueprints) {
      expect(blueprint.userDaySummary.length).toBeGreaterThan(20);
      expect(blueprint.userPainPoints.length).toBeGreaterThanOrEqual(2);
      expect(blueprint.aiMustPrepareBeforeUserAsks.length).toBeGreaterThanOrEqual(4);
      expect(blueprint.screenCoverage.length).toBeGreaterThanOrEqual(1);
      expect(blueprint.realMagicExamples.length).toBeGreaterThanOrEqual(2);
      expect(Object.values(blueprint.safety).every(Boolean)).toBe(true);
    }
  });

  it("grounds product-critical roles in the expected screen families", () => {
    expect(getAiRoleMagicBlueprint("buyer")?.screenCoverage.map((screen) => screen.screenId)).toEqual(expect.arrayContaining([
      "buyer.main",
      "buyer.requests",
      "buyer.request.detail",
      "procurement.copilot",
    ]));
    expect(getAiRoleMagicBlueprint("accountant")?.screenCoverage.map((screen) => screen.screenId)).toEqual(expect.arrayContaining([
      "accountant.main",
      "accountant.payment",
      "accountant.history",
    ]));
    expect(getAiRoleMagicBlueprint("runtime_admin")?.screenCoverage[0]?.screenId).toBe("screen.runtime");
  });
});
