import { contractorActionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor remarks", () => {
  it("shows open remarks and does not close or resolve them by AI", () => {
    const answer = contractorActionAnswer("open_remarks_check");

    expect(answer.intent).toBe("open_remarks_check");
    expect(answer.events.some((event) => event.linkedContext.remarkId === "RMK-14")).toBe(true);
    expect(answer.sources.some((source) => source.type === "remark")).toBe(true);
    expect(answer.remarkClosedByAi).toBe(false);
    expectContractorAnswerSafe(answer);
  });
});
