import { benchmarkAiEvalCostLatency, GREEN_AI_EVAL_COST_LATENCY } from "../../scripts/aiPlatform/benchmarkAiEvalCostLatency";

jest.setTimeout(60_000);

describe("AI EvalOps cost and latency budget", () => {
  it("records tokens, cost budget and slow case report for eval runs", async () => {
    const { summary } = await benchmarkAiEvalCostLatency({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_EVAL_COST_LATENCY);
    expect(summary.ai_eval_cost_budget_created).toBe(true);
    expect(summary.latency_budget_enforced).toBe(true);
    expect(summary.token_usage_recorded).toBe(true);
    expect(summary.cost_budget_recorded).toBe(true);
    expect(summary.slow_eval_case_report_created).toBe(true);
    expect(summary.blockers).toEqual([]);
  });
});
