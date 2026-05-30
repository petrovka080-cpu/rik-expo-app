import { expectNoOwnerReplayPattern } from "./ownerReplayArchitectureTestHelpers";

test("owner replay architecture does not use markdown as PDF truth", () => {
  expectNoOwnerReplayPattern(/markdown_pdf_truth_found:\s*true|markdown-as-PDF-truth|markdownAsPdfTruth/i, "markdown PDF truth");
});
