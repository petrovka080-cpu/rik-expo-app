import { contractorActionAnswer } from "./aiContractorAcceptanceTestHelpers";

describe("contractor office document gap trace", () => {
  it("keeps office task and document package gaps visible", () => {
    const answer = contractorActionAnswer("limited_payment_status_check");

    expect(answer.sources.map((source) => source.type)).toEqual(expect.arrayContaining(["office_task", "act"]));
    expect(answer.missingData.join("\n")).toMatch(/документ|подпись/i);
    expect(answer.changedData).toBe(false);
  });
});
