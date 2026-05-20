import { runOfficeDocumentControlProof } from "../ai/aiOfficeDocumentControlFunnelProof";

const matrix = runOfficeDocumentControlProof({
  webProofPassed: true,
  androidProofPassed: false,
  releaseVerifyPassed: false,
});

console.log(JSON.stringify({
  proof: "S_AI_OFFICE_DOCUMENT_CONTROL_FUNNEL_WEB",
  web_free_text_questions_passed: matrix.web_free_text_questions_passed,
  web_all_visible_buttons_clicked: matrix.web_all_visible_buttons_clicked,
  generic_answers_found: matrix.generic_answers_found,
  technical_copy_visible_to_user: matrix.technical_copy_visible_to_user,
  final_reminder_sent_by_ai: matrix.final_reminder_sent_by_ai,
  document_linked_by_ai_final: matrix.document_linked_by_ai_final,
  task_closed_by_ai: matrix.task_closed_by_ai,
  approval_status_changed_by_ai: matrix.approval_status_changed_by_ai,
}, null, 2));

if (!matrix.web_free_text_questions_passed || !matrix.web_all_visible_buttons_clicked) {
  process.exitCode = 1;
}
