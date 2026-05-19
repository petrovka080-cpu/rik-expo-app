import { groundedButtonTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI PDF aggregator grounding", () => {
  it("requires PDF and document traces for document-like actions", () => {
    const matrix = groundedQaMatrix();
    expect(matrix.pdf_questions_have_pdf_trace).toBe(true);
    expect(matrix.document_questions_have_document_trace).toBe(true);
    const pdfEntries = groundedButtonTrace().filter((entry) => entry.providerTrace.includes("aiPdfAggregatorSearchProvider"));
    expect(pdfEntries.length).toBeGreaterThan(0);
    expect(pdfEntries.every((entry) => entry.pdfTracePresent && entry.documentTracePresent)).toBe(true);
  });
});
