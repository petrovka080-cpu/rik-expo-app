import criticalCases from "../../data/estimate-acceptance/expanded-complex-critical-cases.json";
import coverageMap from "../../data/estimate-catalog/expanded-complex-coverage-map.json";
import missingFamilies from "../../data/estimate-catalog/expanded-complex-missing-families.json";
import readinessManifest from "../../data/estimate-catalog/expanded-complex-readiness-manifest.json";
import {
  auditExpandedComplexWorksCoverage10000,
  GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_COVERAGE_READY_NO_BUILDS,
} from "../../scripts/estimate/auditExpandedComplexWorksCoverage10000";

describe("expanded complex coverage audit", () => {
  it("materializes coverage/readiness artifacts without fake full 10000 green", () => {
    const summary = auditExpandedComplexWorksCoverage10000({ writeFiles: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_COVERAGE_READY_NO_BUILDS);
    expect(summary.expanded_work_families_count).toBeGreaterThanOrEqual(180);
    expect(summary.expanded_templates_count).toBeGreaterThanOrEqual(1000);
    expect(summary.required_calculators_count).toBeGreaterThanOrEqual(35);
    expect(summary.expanded_critical_cases_count).toBeGreaterThanOrEqual(60);
    expect(summary.all_expanded_critical_cases_passed).toBe(true);
    expect(summary.expanded_complex_pdf_grouped).toBe(true);
    expect(summary.expanded_complex_buyer_handoff_valid).toBe(true);
    expect(summary.full_10000_green_claimed).toBe(false);
    expect(summary.fake_green_claimed).toBe(false);

    expect(coverageMap.expanded_work_families_count).toBe(summary.expanded_work_families_count);
    expect(readinessManifest.not_ready_count).toBe(0);
    expect(missingFamilies.missing_required_family_ids).toHaveLength(0);
    expect(criticalCases.all_expanded_critical_cases_passed).toBe(true);
  });
});
