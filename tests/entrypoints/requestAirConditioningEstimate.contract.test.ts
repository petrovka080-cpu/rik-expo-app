import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

describe("/request air conditioning estimate", () => {
  it("returns the HVAC dynamic estimate from the production request entrypoint", () => {
    const answer = answerBuiltInAi({
      text: "смета на установку системы кондиционирования на 258 кв метров",
      route: "/request",
      screenContext: "request",
      role: "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });

    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.estimate?.work.workKey).toBe("air_conditioning_system_installation");
    expect(answer.toolResult.estimate?.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(30);
  });
});
