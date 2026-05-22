import { writeAiRoleLiveTranscriptValueArtifacts } from "../e2e/aiRoleLiveTranscriptValue.shared";

const report = writeAiRoleLiveTranscriptValueArtifacts();

console.log(JSON.stringify({
  wave: "S_AI_ROLE_LIVE_TRANSCRIPT_VALUE_CLOSEOUT",
  slice: "generic_rate",
  artifact: "artifacts/S_AI_ROLE_LIVE_TRANSCRIPT_generic_rate.json",
  total_answers: report.genericRate.total_answers,
  generic_answers_found: report.genericRate.generic_answers_found,
  generic_answer_rate: report.genericRate.generic_answer_rate,
  unsafe_mutations_found: report.genericRate.unsafe_mutations_found,
  debug_text_visible: report.genericRate.debug_text_visible,
}, null, 2));

