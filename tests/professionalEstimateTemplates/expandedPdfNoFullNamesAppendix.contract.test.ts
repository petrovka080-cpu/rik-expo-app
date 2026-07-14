import { professionalExpandedPdfAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate expanded PDF appendix policy", () => {
  it("removes the full row names appendix from expanded estimate PDFs", () => {
    const result = professionalExpandedPdfAudit();

    expect(result.expanded_pdf_cases_total).toBeGreaterThanOrEqual(50);
    expect(result.full_names_appendix_removed).toBe(true);
    expect(result.compressed_estimate_mode_used).toBe(false);
  });
});
