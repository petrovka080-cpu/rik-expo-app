import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

const HVAC_PROMPTS = [
  "смета на установку системы кондиционирования на 258 кв метров",
  "нужна смета для кондиционирования офиса 258 кв м",
] as const;

describe("known engineering work no template gap", () => {
  it("does not return manual fallback for parsable HVAC known work", () => {
    for (const text of HVAC_PROMPTS) {
      const answer = answerBuiltInAi({
        text,
        route: "/request",
        screenContext: "request",
        role: "consumer",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });

      expect(answer.toolResult.blockedBy).toBeUndefined();
      expect(answer.toolResult.fallbackUsed).toBeUndefined();
      expect(answer.toolResult.estimate?.work.workKey).toBe("air_conditioning_system_installation");
    }
  });
});
