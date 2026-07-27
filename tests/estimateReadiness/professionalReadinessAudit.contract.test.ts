import {
  auditEstimate10000ProfessionalReadiness,
  STOP_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_NOT_READY,
} from "../../scripts/estimate/auditEstimate10000ProfessionalReadiness";

jest.setTimeout(90000);

describe("professional readiness audit 10000", () => {
  it("keeps the full 10000 gate closed while professional norm sources are unverified", () => {
    const result = auditEstimate10000ProfessionalReadiness({
      writeManifest: false,
      writeCatalogArtifacts: false,
    });

    expect(result.final_status).toBe(STOP_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_NOT_READY);
    expect(result.manifest_total_templates).toBe(10000);
    expect(result.ready_professional_count).toBe(0);
    expect(result.not_ready_count).toBe(10000);
    expect(result.generic_fallback_count).toBe(0);
    expect(result.generic_norm_rows_count).toBe(592693);
    expect(result.synthetic_family_default_count).toBe(0);
    expect(result.templates_only_generic_norms_count).toBe(6816);
    expect(result.templates_with_real_norm_sources_count).toBe(3184);
    expect(
      result.templates_only_generic_norms_count +
      result.templates_with_real_norm_sources_count
    ).toBe(result.manifest_total_templates);
    expect(result.full_10000_real_norm_green_claimed).toBe(false);
    expect(result.marketplace_touched).toBe(false);
    expect(result.native_build_started).toBe(false);
    expect(result.release_started).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "ready_professional_count:0",
      "not_ready_count:10000",
      expect.stringContaining("generic_norm_rows:"),
      "templates_only_generic_norms:6816",
    ]));
  });
});
