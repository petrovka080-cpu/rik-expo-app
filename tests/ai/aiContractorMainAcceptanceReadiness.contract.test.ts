import { contractorActionAnswer, expectContractorAnswerSafe, expectContractorOwnScope } from "./aiContractorAcceptanceTestHelpers";

describe("contractor main acceptance readiness", () => {
  it("shows own assigned works, missing evidence, sources, and safe next step", () => {
    const answer = contractorActionAnswer("acceptance_readiness");

    expect(answer.answerKind).toBe("acceptance_readiness");
    expect(answer.sources.map((source) => source.type)).toEqual(expect.arrayContaining(["contractor_work", "photo", "act", "remark"]));
    expect(answer.missingData.join("\n")).toMatch(/фото после|подпись|документ/i);
    expect(answer.nextStepRu).toMatch(/фото|акт|RMK-14/i);
    expectContractorOwnScope(answer);
    expectContractorAnswerSafe(answer);
  });
});
