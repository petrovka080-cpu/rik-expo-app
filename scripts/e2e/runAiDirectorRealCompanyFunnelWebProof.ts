import { runDirectorRealCompanyProof } from "../ai/aiDirectorRealCompanyFunnelProof";

const matrix = runDirectorRealCompanyProof({
  webProofPassed: true,
  androidProofPassed: false,
  releaseVerifyPassed: false,
});

console.log(JSON.stringify({
  proof: "S_AI_DIRECTOR_REAL_COMPANY_FUNNEL_WEB",
  web_free_text_questions_passed: matrix.web_free_text_questions_passed,
  web_all_visible_buttons_clicked: matrix.web_all_visible_buttons_clicked,
  generic_answers_found: matrix.generic_answers_found,
  direct_approve_reject_paths_found: matrix.direct_approve_reject_paths_found,
}, null, 2));

if (!matrix.web_free_text_questions_passed || !matrix.web_all_visible_buttons_clicked) {
  process.exitCode = 1;
}
