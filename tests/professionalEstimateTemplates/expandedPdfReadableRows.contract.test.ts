import { professionalExpandedPdfAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate expanded PDF readable rows", () => {
  it("keeps full row names in the main table without internal keys or mojibake", () => {
    const result = professionalExpandedPdfAudit();

    expect(result.long_names_wrapped_in_table).toBe(true);
    expect(result.internal_keys_visible).toBe(0);
    expect(result.mojibake_found).toBe(0);
  });
});
