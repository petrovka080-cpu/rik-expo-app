import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

const FOREMAN_EXAMPLES = [
  "гидроизоляция 100 м²",
  "биологическая станция очистки 10 м³/сут",
  "УФ обеззараживание 1 комплект",
  "ПНР пожаротушения 1 система",
  "медицинские газы 40 точек",
  "СКС 120 точек",
  "контроль доступа 12 точек",
  "наружный водопровод 120 м.п.",
  "лифтовая шахта 12 этажей",
] as const;

describe("/ai?context=foreman shows measurable-work estimates with review warnings", () => {
  it("does not suppress top-level estimates when the work is measurable", () => {
    const results = FOREMAN_EXAMPLES.map((text) => {
      const answer = answerBuiltInAi({
        text,
        route: "/ai?context=foreman",
        screenContext: "foreman",
        role: "foreman",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      const estimate = answer.toolResult.estimate;
      return {
        text,
        intent: answer.route.intent,
        blockedBy: answer.toolResult.blockedBy ?? null,
        workKey: estimate?.work.workKey ?? null,
        rows: estimate?.sections.flatMap((section) => section.rows).length ?? 0,
        requiresReview: estimate?.requiresReview ?? false,
        questions: estimate?.clarifyingQuestions.length ?? 0,
      };
    });

    expect(results.map((item) => [item.text, item.intent, item.blockedBy, item.workKey])).toEqual(
      results.map((item) => [item.text, "estimate", null, item.workKey]),
    );
    expect(results.every((item) => item.workKey && item.workKey !== "other_construction_work")).toBe(true);
    expect(results.every((item) => item.rows >= 8 && item.requiresReview && item.questions > 0)).toBe(true);
  });
});
