import {
  auditAiEstimateParameterCoverage11610,
  GREEN_AI_ESTIMATE_PARAMETER_COVERAGE_11610_READY,
} from "../../scripts/estimate/auditAiEstimateParameterCoverage11610";

jest.setTimeout(240_000);

describe("AI estimate parameter coverage for 11610 works", () => {
  it("covers every professional work with editable connected Russian parameter cards", () => {
    const { summary } = auditAiEstimateParameterCoverage11610();
    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PARAMETER_COVERAGE_11610_READY);
    expect(summary.catalog_total_templates).toBe(11610);
    expect(summary.parameter_schema_coverage).toBe("11610/11610");
    expect(summary.editable_parameter_card_template_coverage).toBe("11610/11610");
    expect(summary.dead_parameter_cards_count).toBe(0);
    expect(summary.hardcoded_capital_repair_only).toBe(false);
  });
});
