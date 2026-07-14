import { renderOwnerReviewPacketPdf } from "../../src/features/pdf/renderOwnerReviewPacketPdf";
import { validateOwnerReviewPacketPdf } from "../../src/features/pdf/validateOwnerReviewPacketPdf";

describe("owner review packet PDF", () => {
  it("contains executive packet sections without claiming owner approval", () => {
    const pdf = renderOwnerReviewPacketPdf();
    const validation = validateOwnerReviewPacketPdf(pdf);

    expect(validation.owner_review_pdf_created).toBe(true);
    expect(validation.owner_review_pdf_valid).toBe(true);
    expect(validation.owner_review_pdf_does_not_claim_approval).toBe(true);
    expect(validation.owner_review_pdf_contains_limitations).toBe(true);
    expect(validation.owner_review_pdf_contains_go_no_go_checklist).toBe(true);
    expect(pdf.ownerApproved).toBe(false);
    expect(pdf.productionReleaseStarted).toBe(false);
    expect(pdf.contractTotalClaimed).toBe(false);
  });
});
