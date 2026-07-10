import {
  GREEN_AI_EVAL_FIXTURE_GENERATION,
  verifyAiEvalFixturesGenerated,
} from "../../scripts/aiPlatform/verifyAiEvalFixturesGenerated";

describe("AI EvalOps fixture generation", () => {
  it("fails closed if golden or red-team JSON is manually edited outside the generator", () => {
    const { summary } = verifyAiEvalFixturesGenerated({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_EVAL_FIXTURE_GENERATION);
    expect(summary.ai_eval_fixture_generator_created).toBe(true);
    expect(summary.golden_fixture_matches_generator).toBe(true);
    expect(summary.red_team_fixture_matches_generator).toBe(true);
    expect(summary.eval_cases_are_versioned).toBe(true);
    expect(summary.manual_golden_overwrite_rejected).toBe(true);
    expect(summary.golden_expected_update_requires_generator_change).toBe(true);
    expect(summary.blockers).toEqual([]);
  });
});
