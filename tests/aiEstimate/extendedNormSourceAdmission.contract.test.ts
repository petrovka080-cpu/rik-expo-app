import {
  runExtendedProfessionalCertification,
  STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_FAILED,
} from "../../scripts/estimate/extendedProfessionalCertificationCore";

describe("extended professional norm source admission", () => {
  it("keeps structural route evidence visible while unregistered sources block green", () => {
    const summary = runExtendedProfessionalCertification({
      casesLimit: 1,
      fullLifecycleLimit: 1,
      promptParsingLimit: 1,
      includeAllTemplates: false,
      smokeTarget: "both",
      writeSummary: false,
    });

    expect(summary.final_status).toBe(
      STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_FAILED,
    );
    expect(summary.norm_trace_visible).toBe(true);
    expect(summary.pdf_norm_sources_visible).toBe(true);
    expect(summary.buyer_boq_extended_projection_passed).toBe(true);
    expect(summary.registered_norm_sources_present).toBe(false);
    expect(summary.request_ui_registered_norm_sources).toBe(false);
    expect(summary.history_registered_norm_sources).toBe(false);
    expect(summary.pdf_registered_norm_sources_visible).toBe(false);
    expect(summary.buyer_registered_norm_sources).toBe(false);
    expect(summary.failure_ids).toEqual(expect.arrayContaining([
      "norm_source_admission:case_rows_unregistered",
      "norm_source_admission:request_rows_unregistered",
      "norm_source_admission:history_rows_unregistered",
      "norm_source_admission:pdf_rows_unregistered",
      "norm_source_admission:buyer_rows_unregistered",
    ]));
  });
});
