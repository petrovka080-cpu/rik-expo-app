import { buildEmbeddedAiAnswer, estimateFromAnswer, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("embedded AI estimate intent", () => {
  it("wins over foreman role context", () => {
    const answer = buildEmbeddedAiAnswer(WORLD_PROMPTS.hydroTurbine);

    expect(answer.route.intent).toBe("estimate");
    expect(answer.route.screenContext).toBe("foreman");
    expect(estimateFromAnswer(answer).work.workKey).toBe("micro_hydro_preparation");
    expect(answer.answerTextRu).not.toMatch(/я ai-ассистент прораба/i);
  });
});
