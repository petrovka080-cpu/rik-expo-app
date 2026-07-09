import {
  auditAiEstimateLayeredArchitecture,
  GREEN_AI_ESTIMATE_LAYERED_ARCHITECTURE,
} from "../../scripts/architecture/auditAiEstimateLayeredArchitecture";

describe("AI estimate layered architecture", () => {
  it("keeps domain, application, runtime, ports, adapters, contracts, migrations, observability and UI boundaries explicit", () => {
    const result = auditAiEstimateLayeredArchitecture();

    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_LAYERED_ARCHITECTURE);
    expect(result.adr_set_created).toBe(true);
    expect(result.target_layout_created).toBe(true);
    expect(result.ui_low_level_import_violations).toHaveLength(0);
  });
});
