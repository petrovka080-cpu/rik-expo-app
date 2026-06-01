import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

describe("embedded AI air conditioning estimate", () => {
  it("keeps HVAC estimate intent ahead of foreman role context", () => {
    const answer = answerBuiltInAi({
      text: "смета на установку системы кондиционирования на 258 кв метров",
      route: "/ai?context=foreman",
      screenContext: "foreman",
      role: "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });

    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.estimate?.work.workKey).toBe("air_conditioning_system_installation");
  });
});
