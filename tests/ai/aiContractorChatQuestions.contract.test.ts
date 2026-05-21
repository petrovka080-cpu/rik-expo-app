import { contractorQuestionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor chat questions", () => {
  it("drafts a foreman reply from own remark/chat context without mutating work", () => {
    const answer = contractorQuestionAnswer("что написать прорабу по замечанию");

    expect(answer.intent).toBe("remark_response_draft");
    expect(answer.answerKind).toBe("remark_response_draft");
    expect(answer.sources.map((source) => source.type)).toEqual(expect.arrayContaining(["remark", "chat_message"]));
    expect(answer.status).toBe("draft_prepared");
    expectContractorAnswerSafe(answer);
  });
});
