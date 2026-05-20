import { runDirectorRealCompanyProof } from "../ai/aiDirectorRealCompanyFunnelProof";

const matrix = runDirectorRealCompanyProof({
  webProofPassed: true,
  androidProofPassed: true,
  releaseVerifyPassed: false,
});

console.log(JSON.stringify({
  proof: "S_AI_DIRECTOR_REAL_COMPANY_FUNNEL_MAESTRO",
  android_director_question_passed: matrix.android_director_question_passed,
  android_buttons_targetable: matrix.android_buttons_targetable,
  raw_runtime_visible_to_director: matrix.raw_runtime_visible_to_director,
  direct_approve_reject_paths_found: matrix.direct_approve_reject_paths_found,
}, null, 2));

if (!matrix.android_director_question_passed || !matrix.android_buttons_targetable) {
  process.exitCode = 1;
}
