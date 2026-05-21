import { contractorActionAnswer, expectContractorAnswerSafe, expectContractorOwnScope } from "./aiContractorAcceptanceTestHelpers";

describe("contractor work detail grounding", () => {
  it("grounds work detail in own work, object, zone, quantities, and source refs", () => {
    const answer = contractorActionAnswer("acceptance_blockers");
    const work = answer.events.find((event) => event.linkedContext.workId === "WRK-GKL");

    expect(work).toBeDefined();
    expect(work?.linkedContext.objectNameRu).toBeTruthy();
    expect(work?.linkedContext.zoneNameRu).toBeTruthy();
    expect(work?.quantities?.plannedQty).toBeGreaterThan(0);
    expect(work?.sourceRefs).toEqual(expect.arrayContaining(["src:contractor:work:WRK-GKL"]));
    expectContractorOwnScope(answer);
    expectContractorAnswerSafe(answer);
  });
});
