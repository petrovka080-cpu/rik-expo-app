import { estimateExpandedTablePolicy } from "../../src/lib/pdf/estimateExpandedTablePolicy";
import { professionalExpandedPdfAudit } from "../professionalEstimateTemplates/professionalEstimateTestHelpers";

describe("expandedEstimateReadableRows", () => {
  it("keeps readable expanded estimate rows without internal keys", () => {
    const result = professionalExpandedPdfAudit();
    const policy = estimateExpandedTablePolicy();

    expect(policy.expanded_estimate_enabled).toBe(true);
    expect(policy.full_names_appendix_removed).toBe(true);
    expect(result.long_names_wrapped_in_table).toBe(true);
    expect(result.internal_keys_visible).toBe(0);
  });
});
