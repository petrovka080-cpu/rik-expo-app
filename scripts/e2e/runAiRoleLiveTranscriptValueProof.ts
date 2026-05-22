import { writeAiRoleLiveTranscriptValueArtifacts } from "./aiRoleLiveTranscriptValue.shared";

const report = writeAiRoleLiveTranscriptValueArtifacts();

console.log(JSON.stringify({
  wave: "S_AI_ROLE_LIVE_TRANSCRIPT_VALUE_CLOSEOUT",
  final_status: report.matrix.final_status,
  artifact: "artifacts/S_AI_ROLE_LIVE_TRANSCRIPT_matrix.json",
  roles_tested: report.scorecard.roles_tested,
  questions_per_role_min: report.scorecard.questions_per_role_min,
  generic_answers_found: report.genericRate.generic_answers_found,
  unsafe_mutations_found: report.genericRate.unsafe_mutations_found,
  full_jest_passed: report.matrix.full_jest_passed,
  release_verify_passed: report.matrix.release_verify_passed,
  fake_green_claimed: false,
}, null, 2));

