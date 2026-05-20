import {
  DIRECTOR_ACTION_QUESTION_MAP,
  answerDirectorAction,
  answerDirectorCompanyQuestion,
} from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director buttons and free text use same pipeline", () => {
  it("routes all visible actions and free text through directorCompanyPipeline", () => {
    const context = buildDirectorRealCompanyFixture();
    const free = answerDirectorCompanyQuestion({ context, questionRu: "что мне решить сегодня" });
    const buttonAnswers = DIRECTOR_ACTION_QUESTION_MAP
      .filter((action) => action.screenId === "director.dashboard")
      .map((action) => answerDirectorAction({ context, actionId: action.actionId }));

    expect(free.providerTrace).toContain("directorCompanyPipeline");
    expect(buttonAnswers.every((answer) => answer.providerTrace.includes("directorCompanyPipeline"))).toBe(true);
    expect(buttonAnswers.every((answer) => answer.changedData === false)).toBe(true);
  });
});
