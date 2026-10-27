import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantMediaDocumentNotFinalFact(mediaDocumentFinalFactFound = false) {
  return createAiInvariantCheck(
    "MEDIA_DOCUMENT_AI_NOT_FINAL_FACT",
    !mediaDocumentFinalFactFound,
    mediaDocumentFinalFactFound ? "Media/document AI analysis was presented as final fact." : undefined,
  );
}
