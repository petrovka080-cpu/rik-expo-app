import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director executive summary", () => {
  it("keeps executive summary domain-separated and draft-only", () => {
    const answer = answerDirectorCompanyQuestion({
      context: { ...buildDirectorRealCompanyFixture(), screenId: "director.reports" },
      questionRu: "подготовь summary за неделю",
    });

    expect(answer.answerKind).toBe("executive_summary");
    expect(answer.answerRu).toContain("Стройка");
    expect(answer.answerRu).toContain("Снабжение");
    expect(answer.answerRu).toContain("Склад");
    expect(answer.answerRu).toContain("Финансы");
    expect(answer.finalSubmit).toBe(false);
  });
});
