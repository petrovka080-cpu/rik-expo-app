import { listAiRoleMagicBlueprints } from "../../src/features/ai/roleMagic/aiRoleMagicBlueprintRegistry";

describe("AI role magic is not generic chat only", () => {
  it("requires prepared work and screen-native outputs before user questions", () => {
    const blueprints = listAiRoleMagicBlueprints();
    const genericChatOnly = blueprints.filter((blueprint) =>
      blueprint.aiMustPrepareBeforeUserAsks.length === 0 ||
      blueprint.screenCoverage.every((screen) => screen.aiPreparedOutput.length === 0),
    );

    expect(genericChatOnly).toEqual([]);
  });
});
