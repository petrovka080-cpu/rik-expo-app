import {
  GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_NO_BUILDS,
  runExtendedProfessionalCertification,
} from "../../scripts/estimate/extendedProfessionalCertificationCore";
import { extended100CertificationSummary } from "../estimateGolden/extended100TestHelpers";

describe("extended AI estimate smoke evidence", () => {
  it("does not claim browser automation for headless route-equivalent smoke", () => {
    const summary = extended100CertificationSummary();

    expect(summary.smoke_execution_mode).toBe("headless_route_equivalent");
    expect(summary.headless_route_equivalent_smoke_passed).toBe(true);
    expect(summary.web_headless_route_equivalent_smoke_passed).toBe(true);
    expect(summary.android_chrome_headless_route_equivalent_smoke_passed).toBe(true);
    expect(summary.browser_automation_started).toBe(false);
    expect(summary.web_browser_automation_started).toBe(false);
    expect(summary.android_chrome_browser_automation_started).toBe(false);
    expect(summary.actual_web_browser_smoke_passed).toBe(false);
    expect(summary.actual_android_chrome_browser_smoke_passed).toBe(false);
    expect(summary.smoke_claims_actual_browser_automation).toBe(false);
  });

  it("does not claim full 10000-template certification when templates are skipped", () => {
    const summary = runExtendedProfessionalCertification({
      casesLimit: 100,
      fullLifecycleLimit: 3,
      promptParsingLimit: 10,
      includeAllTemplates: false,
      smokeTarget: "both",
      writeSummary: false,
    });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_NO_BUILDS);
    expect(summary.certification_scope).toBe("route_equivalent_smoke_without_10000_templates");
    expect(summary.full_certification_green).toBe(false);
    expect(summary.smoke_only_green).toBe(true);
    expect(summary.full_certification_not_claimed_when_templates_skipped).toBe(true);
    expect(summary.all_10000_templates_extended_validation_executed).toBe(false);
    expect(summary.all_10000_templates_extended_validation_passed).toBe(false);
    expect(summary.templates_validated_count).toBe(0);
    expect(summary.rows_validated_count).toBe(0);
  });
});
