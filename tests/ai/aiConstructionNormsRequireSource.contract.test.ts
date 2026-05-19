import {
  answerConstructionQuestion,
  resolveConstructionNorms,
} from "../../src/lib/ai/constructionKnowledgeCore";
import { constructionSources, requestFor } from "./aiConstructionKnowledgeCore.fixtures";

describe("AI construction norms require source", () => {
  it("blocks norm claims without normative PDF or company standard", () => {
    const noNormSources = constructionSources.filter((source) =>
      source.type !== "normative_pdf" &&
      source.type !== "company_standard" &&
      source.type !== "country_profile"
    );
    const norms = resolveConstructionNorms({ countryCode: "KG", sources: noNormSources });
    expect(norms.allowedToMakeNormClaim).toBe(false);
    expect(norms.allowedToMakeCountrySpecificClaim).toBe(false);

    const answer = answerConstructionQuestion(requestFor("foreman", "какие нормы нужны для закрытия", noNormSources));
    expect(answer.status).toBe("blocked_missing_source");
    expect(answer.answerRu).toMatch(/Не найден нормативный PDF|country profile/);
    expect(answer.answerRu).not.toMatch(/По нормам Кыргызстана требуется/);
  });
});
