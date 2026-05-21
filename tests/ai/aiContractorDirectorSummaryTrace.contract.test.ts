import { buildContractorAcceptanceMatrix } from "../../src/lib/ai/contractorAcceptance";

describe("contractor director summary trace", () => {
  it("marks director contractor blocker summary trace ready in the matrix", () => {
    const matrix = buildContractorAcceptanceMatrix({
      releaseVerifyPassed: false,
      webProofPassed: true,
      androidProofPassed: true,
    });

    expect(matrix.director_contractor_summary_trace_ready).toBe(true);
    expect(matrix.foreman_contractor_trace_ready).toBe(true);
    expect(matrix.office_contractor_document_gap_trace_ready).toBe(true);
    expect(matrix.accountant_contractor_limited_trace_ready).toBe(true);
  });
});
