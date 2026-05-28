import fs from "node:fs";
import path from "node:path";

describe("global local PDF extraction sample", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "scripts/e2e/runGlobalLocalEstimatePdfExtractionSample.ts"),
    "utf8",
  );

  it("requires local context inside extracted PDF text before claiming PDF evidence", () => {
    expect(source).toContain("localRequiredText");
    expect(source).toContain("local_context_present_in_pdf");
    expect(source).toContain("requiredText");
    expect(source).toContain("pdf_text_extractable_sample");
    expect(source).toContain("BLOCKED_GLOBAL_LOCAL_PDF_EXTRACTION_SAMPLE_FAILED");
  });

  it("writes the artifact names consumed by the global local proof runner", () => {
    expect(source).toContain('writeJson("pdf_files_manifest"');
    expect(source).toContain('writeJson("pdf_text_extract"');
    expect(source).toContain('writeJson("pdf_extraction_results"');
    expect(source).toContain('`${name}.json`');
  });
});
