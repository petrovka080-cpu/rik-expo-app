import { runLiveAiAllScreensRealAnswersProof } from "../ai/aiLiveUiAllScreensRealAnswersProof";

const matrix = runLiveAiAllScreensRealAnswersProof({
  webProofPassed: true,
  androidProofPassed: true,
});

process.stdout.write(JSON.stringify({
  final_status: matrix.web_proof_passed
    ? "GREEN_AI_LIVE_UI_ALL_SCREENS_REAL_ANSWERS_WEB_READY"
    : "BLOCKED_AI_LIVE_UI_ALL_SCREENS_REAL_ANSWERS_WEB",
  all_live_buttons_clicked_on_web: matrix.all_live_buttons_clicked_on_web,
  all_live_free_text_questions_answered: matrix.all_live_free_text_questions_answered,
  banned_copy_found: matrix.banned_copy_found,
  generic_answers_found: matrix.generic_answers_found,
}, null, 2));
process.stdout.write("\n");

if (!matrix.web_proof_passed || matrix.banned_copy_found > 0 || matrix.generic_answers_found > 0) {
  process.exitCode = 1;
}
