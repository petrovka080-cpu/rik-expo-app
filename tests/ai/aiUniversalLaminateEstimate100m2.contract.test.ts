import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("universal laminate estimate live answer", () => {
  it("answers a messy laminate estimate question instead of falling back to foreman workday summary", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай сметуц на укладку ламинат на площади 100 кв м",
    });

    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.explicitUserIntentUsed).toBe(true);
    expect(answer.answerTextRu).toContain("ламинат");
    expect(answer.answerTextRu).toContain("100");
    expect(answer.answerTextRu).toContain("м²");
    expect(answer.answerTextRu).toContain("Смета");
    expect(answer.answerTextRu).toContain("Черновик подготовлен");
    expect(answer.answerTextRu).not.toContain("монтаж перегородок");
    expect(answer.answerTextRu).not.toContain("ГКЛ");
    expect(answer.answerTextRu).not.toContain("акт не подготовлен");
    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "constructionIntentRouter",
      "constructionWorkTypeClassifier",
      "constructionQuantityParser",
    ]));
  });
});
