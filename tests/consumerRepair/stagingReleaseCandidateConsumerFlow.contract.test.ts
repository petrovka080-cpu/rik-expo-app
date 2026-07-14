import { loadStagingReleaseCandidateCases } from "../../scripts/estimate/runAiEstimateStagingReleaseCandidateCases";

describe("staging release candidate consumer repair flow corpus", () => {
  it("uses Russian prompts and stable case ids for consumer request flow", () => {
    const fixture = loadStagingReleaseCandidateCases();
    const consumer = fixture.cases.filter((testCase) => testCase.category === "consumer_request");

    expect(consumer).toHaveLength(10);
    expect(consumer.every((testCase) => /[А-Яа-яЁё]/.test(testCase.prompt_ru))).toBe(true);
    expect(consumer.map((testCase) => testCase.case_id)).toContain("consumer-001");
  });
});
