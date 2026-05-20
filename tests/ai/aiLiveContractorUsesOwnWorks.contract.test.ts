import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

describe("live contractor uses own works", () => {
  it("answers acceptance blockers without leaking other supplier private data", () => {
    const answer = answerLiveAiForContext({
      context: "contractor",
      userText: "Что мешает приёмке",
      forceActionId: "contractor_acceptance_blockers",
    });

    expect(answer.pipelineKey).toBe("contractorAcceptance");
    expect(answer.providerTrace).toEqual(expect.arrayContaining(["contractorAcceptance"]));
    expect(answer.answerTextRu).toMatch(/Монтаж перегородок|own works|при/i);
    expect(answer.crossRoleLeaksFound).toBe(0);
    expect(answer.answerTextRu).not.toMatch(/другой поставщик|other supplier private/i);
    expectUsefulLiveAnswer(answer);
  });
});
