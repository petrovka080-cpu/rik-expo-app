import { validateAiEstimatePilotKpiReadiness } from "../../src/lib/platform/aiEstimatePilotKpiContract";

describe("AI estimate pilot KPI readiness", () => {
  it("defines P0, PDF/buyer, history, fake total and contract total SLOs", () => {
    const validation = validateAiEstimatePilotKpiReadiness();

    expect(validation.pilot_kpi_contract_created).toBe(true);
    expect(validation.p0_slo_defined).toBe(true);
    expect(validation.pdf_buyer_slo_defined).toBe(true);
    expect(validation.history_reload_slo_defined).toBe(true);
    expect(validation.fake_final_total_slo_defined).toBe(true);
    expect(validation.contract_total_claimed_slo_defined).toBe(true);
    expect(validation.passed).toBe(true);
  });
});
