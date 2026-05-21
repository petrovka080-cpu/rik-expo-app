import {
  getAiRoleMixed150QuestionBank,
  answerAiMixedEvalQuestion,
  guardAiRealAnswer,
} from "../../src/lib/ai/evaluation/goldenBusinessDataset";

describe("S_AI_ROLE_MIXED_150: real answer guard", () => {
  it("rejects positive questions that lose required numeric facts", () => {
    const question = getAiRoleMixed150QuestionBank().find((item) =>
      item.answerMode === "positive_data_required" &&
      item.expectedNumericFacts.some((fact) => fact.key === "shortage_gkl"),
    );
    expect(question).toBeDefined();

    const answer = answerAiMixedEvalQuestion(question!);
    const broken = {
      ...answer,
      observedNumericFacts: answer.observedNumericFacts.filter((fact) => fact.key !== "shortage_gkl"),
    };

    expect(guardAiRealAnswer(question!, broken)).toMatchObject({
      passed: false,
      failureReason: "numeric_fact_missing",
    });
  });

  it("rejects positive questions that return empty-state copy", () => {
    const question = getAiRoleMixed150QuestionBank().find((item) => item.answerMode === "positive_data_required");
    expect(question).toBeDefined();

    const answer = answerAiMixedEvalQuestion(question!);
    const broken = {
      ...answer,
      answerTextRu: "Коротко:\nне найдено. проверьте фильтр.",
    };

    expect(guardAiRealAnswer(question!, broken)).toMatchObject({
      passed: false,
      failureReason: "positive_question_returned_empty",
    });
  });
});
