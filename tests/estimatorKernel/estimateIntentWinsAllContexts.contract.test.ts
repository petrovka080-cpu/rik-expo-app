import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { UNIVERSAL_PROMPTS } from "./universalEstimatorTestHelpers";

describe("estimate intent wins all embedded contexts", () => {
  it("routes estimate prompts ahead of request and foreman screen roles", () => {
    for (const context of ["request", "foreman"] as const) {
      const answer = answerBuiltInAi({
        text: UNIVERSAL_PROMPTS.elevator,
        route: `/ai?context=${context}`,
        screenContext: context,
        role: context,
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      expect(answer.route.intent).toBe("estimate");
      expect(answer.toolResult.estimate?.work.workKey).toBe("passenger_elevator_installation");
      expect(answer.toolResult.fallbackUsed ?? "").not.toContain("request_draft_without_estimate_intent");
    }
  });
});
