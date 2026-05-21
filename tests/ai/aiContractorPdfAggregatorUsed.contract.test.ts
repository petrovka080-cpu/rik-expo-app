import { contractorActionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor PDF aggregator usage", () => {
  it("keeps project/checklist evidence tied to a PDF page source", () => {
    const answer = contractorActionAnswer("acceptance_readiness");
    const pdf = answer.sources.find((source) => source.type === "pdf_chunk");

    expect(pdf).toBeDefined();
    expect(pdf?.page).toBeGreaterThan(0);
    expect(pdf?.id).toMatch(/pdf|document|checklist|DOC/i);
    expectContractorAnswerSafe(answer);
  });
});
