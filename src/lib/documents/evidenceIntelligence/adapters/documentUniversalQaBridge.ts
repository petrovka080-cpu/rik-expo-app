import type { DocumentAiAnswer, DocumentAsset, DocumentSourceRef } from "../documentTypes";

export function buildDocumentUniversalQaBridge(input: {
  document: DocumentAsset;
  answer: DocumentAiAnswer;
  sourceRefs: readonly DocumentSourceRef[];
}) {
  return {
    sourcePlan: ["app_context_graph", "pdf_document", "app_data"],
    documentId: input.document.id,
    universalSectionsReady: true,
    answerTextRu: input.answer.textRu,
    sourceRefIds: input.sourceRefs.map((ref) => ref.id),
    changedData: false,
    finalSubmit: false,
  };
}
