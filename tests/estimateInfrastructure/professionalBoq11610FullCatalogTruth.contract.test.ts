import { auditProfessionalBoq11610FullCatalogTruth } from "../../scripts/estimate/auditProfessionalBoq11610FullCatalogTruth";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(180000);

describe("professional BOQ 11610 full catalog truth", () => {
  it("audits all templates without generic rows, wrong units, fake prices, or fake totals", () => {
    const summary = auditProfessionalBoq11610FullCatalogTruth();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.catalog_total_templates).toBe(11610);
    expect(summary.templates_audited).toBe("11610/11610");
    expect(summary.ready_professional_boq_count).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.names_only_template_count).toBe(0);
    expect(summary.template_only_generic_rows_count).toBe(0);
    expect(summary.wrong_unit_rows_count).toBe(0);
    expect(summary.unknown_unit_rows_count).toBe(0);
    expect(summary.fake_price_rows_count).toBe(0);
    expect(summary.fake_final_total_claimed).toBe(false);
  });
});
