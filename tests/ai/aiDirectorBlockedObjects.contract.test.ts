import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director blocked objects", () => {
  it("explains blocked objects through work, material, payment and document reasons", () => {
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "что блокирует объекты",
    });

    expect(answer.answerKind).toBe("cross_domain_risk_report");
    expect(answer.answerRu).toContain("Дом 1");
    expect(answer.answerRu).toContain("ГКЛ");
    expect(answer.answerRu).toContain("INV-1042");
    expect(answer.answerRu).toContain("Накладная");
  });
});
