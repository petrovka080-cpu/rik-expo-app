import {
  buildContinuousAiEstimateHeadlessSummary,
  GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE,
} from "../../src/lib/ai/estimateContinuousDetection";

jest.setTimeout(90_000);

describe("continuous AI estimate detector repeatability", () => {
  it("returns the same green summary for three runs on the same source", () => {
    const summaries = Array.from({ length: 3 }, () => buildContinuousAiEstimateHeadlessSummary({ phase: "post-fix" }));

    expect(summaries.every((summary) => summary.final_status === GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE)).toBe(true);
    expect(summaries.every((summary) => summary.remaining_failure_ids.length === 0)).toBe(true);
    expect(new Set(summaries.map((summary) => summary.templates_validated_count))).toEqual(new Set([10_000]));
    expect(new Set(summaries.map((summary) => JSON.stringify(summary.prompt_results.map((result) => [result.prompt_id, result.row_count, result.work_key])))).size).toBe(1);
  });
});
