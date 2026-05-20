import { runOfficeDocumentControlProof } from "../ai/aiOfficeDocumentControlFunnelProof";

const matrix = runOfficeDocumentControlProof({
  webProofPassed: true,
  androidProofPassed: true,
  releaseVerifyPassed: false,
});

console.log(JSON.stringify({
  proof: "S_AI_OFFICE_DOCUMENT_CONTROL_FUNNEL_MAESTRO",
  android_office_question_passed: matrix.android_office_question_passed,
  android_buttons_targetable: matrix.android_buttons_targetable,
  office_security_runtime_leak_found: matrix.office_security_runtime_leak_found,
  final_reminder_sent_by_ai: matrix.final_reminder_sent_by_ai,
  document_linked_by_ai_final: matrix.document_linked_by_ai_final,
  task_closed_by_ai: matrix.task_closed_by_ai,
  approval_status_changed_by_ai: matrix.approval_status_changed_by_ai,
}, null, 2));

if (!matrix.android_office_question_passed || !matrix.android_buttons_targetable) {
  process.exitCode = 1;
}
