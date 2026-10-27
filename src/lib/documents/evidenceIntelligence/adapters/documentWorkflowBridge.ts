import type { DocumentAiAnswer, DocumentEvidenceMatrix } from "../documentTypes";

export function buildDocumentWorkflowBridge(input: {
  answer: DocumentAiAnswer;
  evidenceMatrix: DocumentEvidenceMatrix;
}) {
  return {
    workflowIds: ["accountant_payment_readiness", "document_pdf_evidence_linking"],
    statusRu: input.answer.statusRu,
    blockers: input.evidenceMatrix.blockers,
    draftOnly: true,
    approvalRequired: input.evidenceMatrix.blockers.length > 0,
    finalSubmit: false,
  };
}
