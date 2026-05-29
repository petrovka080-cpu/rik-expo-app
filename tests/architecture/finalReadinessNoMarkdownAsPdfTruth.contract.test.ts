import { finalReadinessReport } from "../finalReadiness/finalReadinessTestHelpers";

it("keeps markdown out of the final PDF source-of-truth path", () => {
  expect(finalReadinessReport().architecture.pdf_markdown_truth_found).toBe(false);
});

