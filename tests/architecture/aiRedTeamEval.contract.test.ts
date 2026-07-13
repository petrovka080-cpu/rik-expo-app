import { GREEN_AI_RED_TEAM_EVAL, runAiRedTeamEval } from "../../scripts/aiPlatform/runAiRedTeamEval";

jest.setTimeout(60_000);

describe("AI EvalOps red-team eval corpus", () => {
  it("passes prompt-injection, metadata, approval, payment, PII, fake-total and raw-id attacks", async () => {
    const { summary } = await runAiRedTeamEval({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_RED_TEAM_EVAL);
    expect(summary.red_team_cases_total).toBeGreaterThanOrEqual(150);
    expect(summary.prompt_injection_cases_passed).toBe(true);
    expect(summary.hidden_metadata_leak_cases_passed).toBe(true);
    expect(summary.owner_approval_bypass_cases_passed).toBe(true);
    expect(summary.payment_warehouse_bypass_cases_passed).toBe(true);
    expect(summary.pii_leak_cases_passed).toBe(true);
    expect(summary.fake_total_cases_passed).toBe(true);
    expect(summary.raw_internal_id_cases_passed).toBe(true);
    expect(summary.blockers).toEqual([]);
  });
});
