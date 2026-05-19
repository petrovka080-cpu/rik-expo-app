import {
  answerConstructionQuestion,
  getConstructionProviderDescriptor,
  resolveConstructionNorms,
} from "../../src/lib/ai/constructionKnowledgeCore";
import { constructionSources, requestFor } from "./aiConstructionKnowledgeCore.fixtures";

describe("AI company standards provider", () => {
  it("uses company standard as source-backed basis without inventing norms", () => {
    expect(getConstructionProviderDescriptor("aiCompanyStandardsProvider")?.pure).toBe(true);
    const standardsOnly = constructionSources.filter((source) =>
      source.type === "company_standard" || source.type === "country_profile"
    );
    expect(resolveConstructionNorms({ countryCode: "KG", sources: standardsOnly }).allowedToMakeNormClaim).toBe(true);

    const answer = answerConstructionQuestion(requestFor("foreman", "какой стандарт нужен для закрытия", standardsOnly));
    expect(answer.sources.map((source) => source.type)).toContain("company_standard");
    expect(answer.changedData).toBe(false);
  });
});
