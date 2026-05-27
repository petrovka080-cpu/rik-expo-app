import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - PDF contract", () => {
  it("blocks markdown truth and requires structured PDF payload", () => {
    const source = changeControlSource();
    expect(source).toContain("PDF_STRUCTURED_PAYLOAD_REQUIRED");
    expect(source).toContain("PDF_MARKDOWN_TRUTH_FORBIDDEN");
    expect(source).toContain("professionalTable");
  });
});
