import {
  auditAiEstimateCodeQualityBoundaries,
  GREEN_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES,
} from "../../scripts/estimate/auditAiEstimateCodeQualityBoundaries";

describe("AI estimate code quality boundaries", () => {
  it("keeps platform boundaries free of duplicate engines and low-level UI imports", () => {
    const { summary } = auditAiEstimateCodeQualityBoundaries({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES);
    expect(summary.circular_imports_count).toBe(0);
    expect(summary.ui_low_level_estimate_imports_count).toBe(0);
    expect(summary.duplicate_estimate_engines_count).toBe(0);
    expect(summary.direct_storage_access_violations_count).toBe(0);
  });
});
