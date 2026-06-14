import { professionalExpandedPdfAudit } from "../professionalEstimateTemplates/professionalEstimateTestHelpers";

describe("expandedEstimateNoFullNamesAppendix", () => {
  it("keeps expanded row names in the table instead of a full-names appendix", () => {
    const result = professionalExpandedPdfAudit();

    expect(result.full_names_appendix_removed).toBe(true);
    expect(result.compressed_estimate_mode_used).toBe(false);
  });
});
