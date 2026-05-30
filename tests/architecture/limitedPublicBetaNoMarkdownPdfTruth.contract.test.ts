import { readLimitedPublicBetaSources } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited public beta does not use markdown as PDF truth", () => {
  const source = readLimitedPublicBetaSources();
  expect(source).not.toMatch(/markdown_pdf_truth_found:\s*true|markdownParsedAsPdfTruth|markdown_as_pdf_truth:\s*true/i);
});
