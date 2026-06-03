import { evaluateMeasurableConstructionCase } from "../../scripts/e2e/measurableConstructionNeverFinalTriageCore";

const REQUEST_EXAMPLES = [
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

describe("/request shows measurable-work estimates with review warnings", () => {
  it("returns request drafts with estimate rows, questions and requiresReview", () => {
    const results = REQUEST_EXAMPLES.map((promptRu, index) =>
      evaluateMeasurableConstructionCase({ caseId: `request-example-${index + 1}`, promptRu }),
    );

    expect(results.map((item) => [item.prompt, item.failures])).toEqual(
      results.map((item) => [item.prompt, []]),
    );
    expect(results.every((item) => item.requestDraftRepairType !== "estimate_triage")).toBe(true);
    expect(results.every((item) => item.requestRows >= 8 && item.requestDraftItems > 0)).toBe(true);
    expect(results.every((item) => item.requestRequiresReview && item.requestQuestions > 0)).toBe(true);
  });
});
