import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildAiEstimateMissingInputQuestions } from "../../src/lib/estimate/buildAiEstimateMissingInputQuestions";
import { applyAiEstimateMissingInputAnswer } from "../../src/lib/estimate/applyAiEstimateMissingInputAnswer";

describe("normative missing input flow", () => {
  it("adds a ranked missing parameter and creates a recalculated revision", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "normative-missing-flow",
      rawInput: "Водоснабжение села длина 5000 м",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const questions = buildAiEstimateMissingInputQuestions({ revision });
    const question = questions?.questions.find((item) => item.key === "diameter_mm") ?? questions?.questions[0];

    expect(question).toBeTruthy();
    const result = applyAiEstimateMissingInputAnswer({
      revision,
      paramKey: question!.key,
      rawValue: question!.key === "diameter_mm" ? "110 мм" : "12",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(result.revision.previousRevisionId).toBe(revision.revisionId);
    expect(result.revision.params[question!.key]).toBeTruthy();
    expect(result.cards.some((card) => card.key === question!.key && !card.missing)).toBe(true);
    expect(result.pdfBuyerPackageStale).toBe(true);
  });
});
