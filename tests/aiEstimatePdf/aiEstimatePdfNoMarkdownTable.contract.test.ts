import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF markdown table guard", () => {
  it("does not render markdown tables", () => {
    const { pdf } = buildSafeIntegrationPdf();
    expect(pdf.validation.details.markdownTableFound).toBe(false);
    expect(pdf.validation.text).not.toMatch(/^\s*\|.+\|\s*$/m);
  });
});
