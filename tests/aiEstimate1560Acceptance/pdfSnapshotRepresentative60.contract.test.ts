import { pdfSnapshot60 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance PDF snapshot representative audit", () => {
  it("keeps 60 representative PDF snapshots expanded and clean", () => {
    const audit = pdfSnapshot60();
    expect(audit.pdf_representative_cases).toBe(60);
    expect(audit.pdf_representative_passed).toBe(60);
    expect(audit.failures).toEqual([]);
    expect(audit.results.every((result) => result.customerSignatureBlock && result.contractorSignatureBlock)).toBe(true);
    expect(audit.results.every((result) => !result.timelineBlockPresent && !result.scheduleBlockPresent)).toBe(true);
  });
});
