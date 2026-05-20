import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director free text questions", () => {
  it("understands cross-domain director questions through the same pipeline", () => {
    const context = buildDirectorRealCompanyFixture();
    const questions = [
      "что мне решить сегодня",
      "что блокирует объекты",
      "что по деньгам",
      "какие риски по закупкам и складу",
      "какие документы мешают оплате",
      "кому что поручить",
    ];

    const answers = questions.map((questionRu) => answerDirectorCompanyQuestion({ context, questionRu }));

    expect(answers.every((answer) => answer.providerTrace[0] === "directorCompanyPipeline")).toBe(true);
    expect(answers.every((answer) => answer.genericAnswerUsed === false)).toBe(true);
    expect(answers.every((answer) => answer.sourceTrace.length > 0)).toBe(true);
  });
});
