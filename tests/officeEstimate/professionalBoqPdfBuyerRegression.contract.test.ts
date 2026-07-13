import { auditProfessionalBoq11610SnapshotParity } from "../../scripts/estimate/auditProfessionalBoq11610SnapshotParity";
import { runProfessionalBoqPdfBuyerCriticalMatrix } from "../../scripts/estimate/runProfessionalBoqPdfBuyerCriticalMatrix";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(180000);

describe("professional BOQ 11610 PDF and buyer package regression", () => {
  it("keeps full catalog snapshot parity and critical PDF/buyer handoff green", () => {
    const snapshot = auditProfessionalBoq11610SnapshotParity();
    const critical = runProfessionalBoqPdfBuyerCriticalMatrix();

    expect(snapshot.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(snapshot.snapshot_parity_coverage).toBe("11610/11610");
    expect(snapshot.snapshot_rows_equal_boq_rows).toBe("11610/11610");
    expect(snapshot.snapshot_bound_to_revision).toBe(true);
    expect(snapshot.buyer_subset_derivable).toBe("11610/11610");
    expect(snapshot.debug_rows_in_snapshot_count).toBe(0);

    expect(critical.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(critical.pdf_buyer_critical_matrix_created).toBe(true);
    expect(critical.pdf_generation_cases_passed).toBe("100/100");
    expect(critical.buyer_package_cases_passed).toBe("100/100");
    expect(critical.pdf_rows_equal_snapshot_rows).toBe(true);
    expect(critical.buyer_package_is_procurement_subset).toBe(true);
    expect(critical.pdf_no_raw_debug_ids).toBe(true);
    expect(critical.buyer_no_raw_debug_ids).toBe(true);
    expect(critical.pdf_no_raw_base64).toBe(true);
  });
});
