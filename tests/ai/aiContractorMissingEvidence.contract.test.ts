import { contractorActionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor missing evidence", () => {
  it("reports missing photos and evidence without creating fake evidence", () => {
    const answer = contractorActionAnswer("missing_photos_check");

    expect(answer.intent).toBe("missing_photos_check");
    expect(answer.missingData.join("\n")).toMatch(/фото после/i);
    expect(answer.sources.some((source) => source.type === "photo")).toBe(true);
    expect(answer.evidenceCreatedByAi).toBe(false);
    expect(JSON.stringify(answer)).not.toMatch(/fake_photo|fake_evidence/i);
    expectContractorAnswerSafe(answer);
  });
});
