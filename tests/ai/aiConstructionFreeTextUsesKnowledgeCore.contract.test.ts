import {
  answerConstructionQuestion,
} from "../../src/lib/ai/constructionKnowledgeCore";
import { requestFor } from "./aiConstructionKnowledgeCore.fixtures";

describe("AI construction free text uses shared knowledge core", () => {
  it("routes role questions through constructionAnswerComposer and source policy", () => {
    const answer = answerConstructionQuestion(requestFor("foreman", "сверь работы со сметой и скажи что не закрыто"));
    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "constructionAnswerComposer",
      "constructionRoleScopedRetriever",
      "aiConstructionKnowledgeProvider",
      "aiRoleAccessPolicyProvider",
    ]));
    expect(answer.answerRu).toContain("Коротко:");
    expect(answer.answerRu).toContain("Источники:");
    expect(answer.answerRu).toContain("Статус:");
    expect(answer.changedData).toBe(false);
  });
});
