import {
  answerAiRoleBusinessWorkflow,
  renderAiRoleWorkflowAnswerRu,
} from "../../src/lib/ai/roleBusinessCopilots";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: answer composer", () => {
  it("renders user-facing workflow sections without raw JSON", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "director_daily_decision_queue",
      role: "director",
      screenId: "director",
      questionRu: "что мне решить сегодня",
    });
    const text = renderAiRoleWorkflowAnswerRu(answer);

    expect(text).toContain("Коротко");
    expect(text).toContain("Что найдено");
    expect(text).toContain("Открыть");
    expect(text).toContain("Следующий шаг");
    expect(text).toContain("Статус");
    expect(text).not.toContain('"workflowId"');
  });
});
