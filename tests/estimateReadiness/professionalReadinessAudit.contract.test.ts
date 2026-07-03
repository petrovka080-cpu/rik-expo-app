import {
  auditEstimate10000ProfessionalReadiness,
  STOP_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_NOT_READY,
} from "../../scripts/estimate/auditEstimate10000ProfessionalReadiness";

jest.setTimeout(90000);

describe("professional readiness audit 10000", () => {
  it("keeps the full 10000 gate red while P1/P2 backfill is incomplete for P3", () => {
    const result = auditEstimate10000ProfessionalReadiness({
      writeManifest: false,
      writeCatalogArtifacts: false,
    });

    expect(result.final_status).toBe(STOP_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_NOT_READY);
    expect(result.manifest_total_templates).toBe(10000);
    expect(result.ready_professional_count).toBe(8998);
    expect(result.not_ready_count).toBe(1002);
    expect(result.generic_fallback_count).toBe(1002);
    expect(result.generic_norm_rows_count).toBe(39844);
    expect(result.synthetic_family_default_count).toBe(39844);
    expect(result.templates_only_generic_norms_count).toBe(1002);
    expect(result.templates_with_real_norm_sources_count).toBe(8998);
    expect(result.full_10000_real_norm_green_claimed).toBe(false);
    expect(result.marketplace_touched).toBe(false);
    expect(result.native_build_started).toBe(false);
    expect(result.release_started).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "ready_professional_count:8998",
      "not_ready_count:1002",
      "generic_fallback_count:1002",
    ]));
  });
});
