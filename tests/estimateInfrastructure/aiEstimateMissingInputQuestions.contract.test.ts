import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildNormativeParameterCompletenessModel } from "../../src/lib/estimate/buildNormativeParameterCompletenessModel";
import { buildAiEstimateMissingInputQuestions } from "../../src/lib/estimate/buildAiEstimateMissingInputQuestions";

describe("AI estimate missing input questions", () => {
  it("ranks missing construction parameters and caps the visible list at five", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "missing-questions-water",
      rawInput: "Водоснабжение села длина 5000 м диаметр 110 мм",
      createdAt: "2026-07-09T00:00:00.000Z",
    });

    const model = buildNormativeParameterCompletenessModel(revision);
    const questions = buildAiEstimateMissingInputQuestions({ revision, model });

    expect(model?.passport.workFamily).toBe("water_supply");
    expect(questions?.questions.length).toBeLessThanOrEqual(5);
    expect(questions?.questions.some((question) => question.priority === "P0" || question.priority === "P1")).toBe(true);
    expect(questions?.questions.every((question) => !question.questionRu.includes(question.key))).toBe(true);
  });
});
