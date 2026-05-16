import { listAiRoleMagicBlueprints } from "../../src/features/ai/roleMagic/aiRoleMagicBlueprintRegistry";

describe("AI role magic does not create fake business data", () => {
  it("keeps all fake-data flags false and avoids hardcoded fake business facts", () => {
    const blueprints = listAiRoleMagicBlueprints();
    const text = JSON.stringify(blueprints);

    expect(blueprints.every((blueprint) => blueprint.safety.noFakeData)).toBe(true);
    expect(text).not.toMatch(/\bSupplier A\b|\bSupplier B\b|1 200 000|4 850 000|fake supplier|fake price|fake payment|fake document/i);
  });
});
