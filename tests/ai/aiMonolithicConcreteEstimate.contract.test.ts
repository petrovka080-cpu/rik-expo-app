import { answerLiveAiForContext, classifyConstructionWorkType, parseConstructionQuantity } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: monolithic concrete estimate", () => {
  it("answers monolith pouring 1200 m2 as a construction estimate, not a foreman GKL summary", () => {
    const question = "дай смету на заливку монолита на 1200 кв метров";
    const answer = answerLiveAiForContext({ context: "foreman", userText: question });

    expect(classifyConstructionWorkType(question)).toBe("monolithic_concrete");
    expect(parseConstructionQuantity(question)).toMatchObject({
      area: 1200,
      areaUnit: "m2",
      quantitySource: "user_question",
    });
    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.answerTextRu).toContain("монолит");
    expect(answer.answerTextRu).toContain("1200");
    expect(answer.answerTextRu).toContain("опалуб");
    expect(answer.answerTextRu).toMatch(/армат|Армир/i);
    expect(answer.answerTextRu).toContain("Заливка");
    expect(answer.answerTextRu).not.toContain("ГКЛ");
    expect(answer.answerTextRu).not.toContain("монтаж перегородок");
    expect(answer.answerTextRu).not.toContain("PAY-GKL");
  });
});
