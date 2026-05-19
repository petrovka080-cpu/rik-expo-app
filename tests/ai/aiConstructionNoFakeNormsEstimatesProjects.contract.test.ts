import {
  answerConstructionQuestion,
} from "../../src/lib/ai/constructionKnowledgeCore";
import { constructionSources, requestFor } from "./aiConstructionKnowledgeCore.fixtures";

describe("AI construction no fake norms, estimates, projects", () => {
  it("does not assert project, estimate, supplier or price facts without matching sources", () => {
    const onlyWork = constructionSources.filter((source) => source.type === "work");
    const answer = answerConstructionQuestion(requestFor(
      "buyer",
      "сверь проект, смету, поставщиков и цены",
      onlyWork,
    ));

    expect(answer.status).toBe("blocked_missing_source");
    expect(answer.facts.some((fact) => fact.claimKind === "project")).toBe(false);
    expect(answer.facts.some((fact) => fact.claimKind === "estimate")).toBe(false);
    expect(answer.facts.some((fact) => fact.claimKind === "supplier")).toBe(false);
    expect(answer.answerRu).not.toMatch(/42 м²|Supplier A|Supplier B|По проекту требуется|По нормам/);
    expect(answer.changedData).toBe(false);
  });
});
