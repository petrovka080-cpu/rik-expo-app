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

  it("asks for location together with object disambiguation when prompt location is missing", () => {
    const answer = answerBuiltInAi({
      text: "гидроизоляция 100 кв м",
      screenContext: "foreman",
      route: "/ai?context=foreman",
      role: "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      userId: "test-user",
    });

    expect(answer.toolResult.blockedBy).toBe("AMBIGUOUS_NEEDS_DISAMBIGUATION");
    expect(answer.answerTextRu).toMatch(/регион не указан|уточните страну\/город|город/i);
    expect(answer.answerTextRu).toMatch(/валюту|налог|catalog|источник|уверенность/i);
  });
});
