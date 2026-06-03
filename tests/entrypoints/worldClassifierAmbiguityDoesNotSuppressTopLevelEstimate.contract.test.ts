import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { runWorldConstructionEstimateEngine } from "../../src/lib/ai/worldConstructionEstimateEngine";

const WORLD_AMBIGUOUS_OR_TEMPLATE_GAP_CASES = [
  "гидроизоляция 100 м²",
  "медицинские газы 40 точек",
  "наружный водопровод 120 м.п.",
  "лифтовая шахта 12 этажей",
] as const;

describe("world classifier ambiguity does not suppress top-level estimates", () => {
  it("allows low-level ambiguity/template-gap while /request and foreman still show estimates", () => {
    const results = WORLD_AMBIGUOUS_OR_TEMPLATE_GAP_CASES.map((text) => {
      const world = runWorldConstructionEstimateEngine({ text, countryCode: "KG", city: "Bishkek" });
      const request = answerBuiltInAi({ text, route: "/request", screenContext: "request", role: "consumer", countryCode: "KG", cityOrRegion: "Bishkek" });
      const foreman = answerBuiltInAi({ text, route: "/ai?context=foreman", screenContext: "foreman", role: "foreman", countryCode: "KG", cityOrRegion: "Bishkek" });
      return {
        text,
        worldBlocked: world.interpretation.shouldAskClarifyingQuestion || world.interpretation.shouldReturnTemplateGap,
        worldOutcome: world.interpretation.primitive.outcome,
        requestBlocked: request.toolResult.blockedBy ?? null,
        foremanBlocked: foreman.toolResult.blockedBy ?? null,
        requestWorkKey: request.toolResult.estimate?.work.workKey ?? null,
        foremanWorkKey: foreman.toolResult.estimate?.work.workKey ?? null,
      };
    });

    expect(results.every((item) => item.worldBlocked)).toBe(true);
    expect(results.every((item) => item.worldOutcome === "AMBIGUOUS_NEEDS_DISAMBIGUATION" || item.worldOutcome === "TEMPLATE_GAP_SAFE_TRIAGE")).toBe(true);
    expect(results.every((item) => item.requestBlocked === null && item.foremanBlocked === null)).toBe(true);
    expect(results.every((item) => item.requestWorkKey && item.requestWorkKey !== "other_construction_work")).toBe(true);
    expect(results.every((item) => item.foremanWorkKey && item.foremanWorkKey !== "other_construction_work")).toBe(true);
  });
});
