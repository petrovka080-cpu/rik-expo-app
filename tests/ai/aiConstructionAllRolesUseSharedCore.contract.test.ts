import {
  answerConstructionQuestion,
  type ConstructionRole,
} from "../../src/lib/ai/constructionKnowledgeCore";
import { constructionSources, requestFor } from "./aiConstructionKnowledgeCore.fixtures";

describe("AI construction all roles use shared core", () => {
  it("answers every role through the same construction provider trace", () => {
    const roles: ConstructionRole[] = [
      "foreman",
      "contractor",
      "buyer",
      "warehouse",
      "accountant",
      "documents",
      "office",
      "director",
    ];

    for (const role of roles) {
      const answer = answerConstructionQuestion(requestFor(
        role,
        "что важно на этом экране по работам, документам и источникам",
        constructionSources,
      ));
      expect(answer.providerTrace).toContain("aiConstructionKnowledgeProvider");
      expect(answer.providerTrace).toContain("constructionAnswerComposer");
      expect(answer.answerRu).toContain("Ответ");
      expect(answer.changedData).toBe(false);
    }
  });
});
