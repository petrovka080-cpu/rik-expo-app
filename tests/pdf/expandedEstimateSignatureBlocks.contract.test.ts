import { estimateSignatureBlocks } from "../../src/lib/pdf/estimateSignatureBlocks";
import { professionalExpandedPdfAudit } from "../professionalEstimateTemplates/professionalEstimateTestHelpers";

describe("expandedEstimateSignatureBlocks", () => {
  it("renders customer and contractor signature blocks", () => {
    const result = professionalExpandedPdfAudit();
    const policy = estimateSignatureBlocks();

    expect(policy.signature_blocks_present).toBe(true);
    expect(result.signature_blocks_present).toBe(true);
    expect(result.customer_signature_block_present).toBe(true);
    expect(result.contractor_signature_block_present).toBe(true);
  });
});
