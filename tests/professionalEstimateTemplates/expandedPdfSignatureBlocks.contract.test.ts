import { professionalExpandedPdfAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate expanded PDF signature blocks", () => {
  it("renders customer and contractor signature blocks at the end", () => {
    const result = professionalExpandedPdfAudit();

    expect(result.signature_blocks_present).toBe(true);
    expect(result.customer_signature_block_present).toBe(true);
    expect(result.contractor_signature_block_present).toBe(true);
  });
});
