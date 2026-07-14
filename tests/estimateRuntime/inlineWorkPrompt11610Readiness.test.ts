import {
  audit11610InlinePromptParamReadiness,
  GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY,
} from "../../scripts/estimate/audit11610InlinePromptParamReadiness";

jest.setTimeout(180_000);

describe("inline work prompt 11610 readiness", () => {
  it("keeps every work passport ready for inline prompt params", () => {
    const { summary } = audit11610InlinePromptParamReadiness();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY);
    expect(summary.templates_audited).toBe(11610);
    expect(summary.templates_ready_for_inline_prompt_params).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.inline_prompt_cases_run).toBeGreaterThanOrEqual(300);
    expect(summary.inline_prompt_cases_passed).toBeGreaterThanOrEqual(300);
  });
});
