import {
  buildAiRoleLiveTranscriptValueReport,
  type AiLiveTranscriptRole,
} from "../../scripts/e2e/aiRoleLiveTranscriptValue.shared";

export function expectRoleLiveValue(role: AiLiveTranscriptRole): void {
  const report = buildAiRoleLiveTranscriptValueReport({
    fullJestPassed: true,
    releaseVerifyPassed: true,
  });
  const score = report.scorecard.roles.find((item) => item.role === role);
  const transcripts = report.transcripts.filter((item) => item.role === role);

  expect(score).toBeDefined();
  expect(score?.question_count).toBeGreaterThanOrEqual(10);
  expect(score?.score_gte_7).toBe(true);
  expect(score?.generic_answers_found).toBe(0);
  expect(score?.unsafe_mutations_found).toBe(0);
  expect(score?.debug_text_visible).toBe(false);
  expect(score?.uses_app_data_all_questions).toBe(true);
  expect(score?.external_knowledge_used_safely).toBe(true);

  expect(transcripts).toHaveLength(10);
  expect(transcripts.every((item) => item.app_data_refs.length > 0)).toBe(true);
  expect(transcripts.every((item) => item.numeric_facts.length > 0)).toBe(true);
  expect(transcripts.every((item) => item.has_next_step)).toBe(true);
  expect(transcripts.every((item) => item.score >= 7)).toBe(true);
}

