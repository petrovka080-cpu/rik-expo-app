import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

describe("embedded AI global local estimate", () => {
  it("uses location from the estimate prompt ahead of foreman default context", () => {
    const answer = answerBuiltInAi({
      text: "estimate for asphalt paving 10000 m2 in Almaty",
      screenContext: "foreman",
      route: "/ai?context=foreman",
      role: "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      userId: "test-user",
    });

    expect(answer.toolResult.estimate?.locale).toMatchObject({
      countryCode: "KZ",
      city: "Almaty",
      currency: "KZT",
    });
    expect(answer.toolResult.estimate?.totals.currency).toBe("KZT");
    expect(answer.answerTextRu).toMatch(/Almaty|Kazakhstan|KZT|VAT|source|currency/i);
  });

  it("shows an estimate with review questions for ambiguous measurable work", () => {
    const answer = answerBuiltInAi({
      text: "гидроизоляция 100 кв м",
      screenContext: "foreman",
      route: "/ai?context=foreman",
      role: "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      userId: "test-user",
    });

    const estimate = answer.toolResult.estimate;
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(estimate?.work.workKey).toBe("dynamic_waterproofing_estimate");
    expect(estimate?.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(18);
    expect(estimate?.requiresReview).toBe(true);
    expect(estimate?.clarifyingQuestions.join("\n")).toMatch(/Уточните объект|крыша|ванная|фундамент/i);
    expect(answer.answerTextRu).toMatch(/город|Bishkek|KGS|налог|Источник|точность/i);
  });
});
