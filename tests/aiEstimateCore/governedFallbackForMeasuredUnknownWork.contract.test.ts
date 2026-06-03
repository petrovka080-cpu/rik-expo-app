import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";

const MEASURED_UNKNOWN_TO_WORLD_CASES = [
  "медицинские газы 40 точек",
  "СКС 120 точек",
  "контроль доступа 12 точек",
  "наружный водопровод 120 м.п.",
  "лифтовая шахта 12 этажей",
] as const;

describe("governed fallback for measured work unknown to world classifier", () => {
  it("uses the shared estimator kernel instead of final template-gap triage", () => {
    const results = MEASURED_UNKNOWN_TO_WORLD_CASES.map((text) => {
      const outcome = resolveEstimatorOutcome({ text, currency: "KGS" });
      const answer = answerBuiltInAi({
        text,
        route: "/request",
        screenContext: "request",
        role: "consumer",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      const estimate = answer.toolResult.estimate;
      return {
        text,
        outcome: outcome.classification,
        failures: outcome.failures,
        blockedBy: answer.toolResult.blockedBy ?? null,
        workKey: estimate?.work.workKey ?? null,
        rows: estimate?.sections.flatMap((section) => section.rows).length ?? 0,
        requiresReview: estimate?.requiresReview ?? false,
        questions: estimate?.clarifyingQuestions.length ?? 0,
      };
    });

    expect(results.map((item) => [item.text, item.outcome, item.failures])).toEqual(
      results.map((item) => [item.text, expect.stringMatching(/PARSABLE_DYNAMIC_BOQ_OK|REGULATED_SAFE_PROFESSIONAL_BOQ_OK/), []]),
    );
    expect(results.every((item) => item.blockedBy === null)).toBe(true);
    expect(results.every((item) => item.workKey && item.workKey !== "other_construction_work")).toBe(true);
    expect(results.every((item) => item.rows >= 8 && item.requiresReview && item.questions > 0)).toBe(true);
  });
});
