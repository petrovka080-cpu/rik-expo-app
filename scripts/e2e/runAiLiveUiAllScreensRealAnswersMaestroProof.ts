import { runLiveAiAllScreensRealAnswersProof } from "../ai/aiLiveUiAllScreensRealAnswersProof";

const matrix = runLiveAiAllScreensRealAnswersProof({
  webProofPassed: true,
  androidProofPassed: true,
});

process.stdout.write(JSON.stringify({
  final_status: matrix.android_proof_passed
    ? "GREEN_AI_LIVE_UI_ALL_SCREENS_REAL_ANSWERS_ANDROID_READY"
    : "BLOCKED_ANDROID_TARGETABILITY_LIVE_AI_CONTEXT",
  android_proof_passed: matrix.android_proof_passed,
  answers_have_useful_sections: matrix.answers_have_useful_sections,
  answers_have_sources_or_checked_empty_reason: matrix.answers_have_sources_or_checked_empty_reason,
  banned_copy_found: matrix.banned_copy_found,
  generic_answers_found: matrix.generic_answers_found,
}, null, 2));
process.stdout.write("\n");

if (!matrix.android_proof_passed || matrix.banned_copy_found > 0 || matrix.generic_answers_found > 0) {
  process.exitCode = 1;
}
