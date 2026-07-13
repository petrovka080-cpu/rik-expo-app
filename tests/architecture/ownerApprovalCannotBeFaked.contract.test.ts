import { renderOwnerReviewPacketPdf } from "../../src/features/pdf/renderOwnerReviewPacketPdf";
import { buildDefaultAiEstimateOwnerReviewChecklist } from "../../src/lib/platform/aiEstimateGoNoGoChecklist";
import { validateAiEstimateBusinessReadiness } from "../../src/lib/platform/validateAiEstimateBusinessReadiness";

describe("owner approval cannot be faked by owner-review packet", () => {
  it("keeps owner approval pending across business, checklist and PDF artifacts", () => {
    const readiness = validateAiEstimateBusinessReadiness();
    const checklist = buildDefaultAiEstimateOwnerReviewChecklist();
    const pdf = renderOwnerReviewPacketPdf();

    expect(readiness.owner_approval_not_faked).toBe(true);
    expect(checklist.owner_go_no_go_status).toBe("PENDING_OWNER_REVIEW");
    expect(checklist.go_cannot_be_auto_set_by_agent).toBe(true);
    expect(pdf.body).toContain("owner_go_no_go_status=PENDING_OWNER_REVIEW");
    expect(pdf.body).toContain("owner_approved=false");
    expect(pdf.body).not.toMatch(/owner_approved\s*=\s*true/i);
  });
});
