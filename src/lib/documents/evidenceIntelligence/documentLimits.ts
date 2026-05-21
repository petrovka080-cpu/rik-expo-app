export const DOCUMENT_EVIDENCE_WAVE =
  "S_AI_DOCUMENT_PDF_EVIDENCE_INTELLIGENCE_CORE_POINT_OF_NO_RETURN" as const;

export const DOCUMENT_EVIDENCE_GREEN_STATUS =
  "GREEN_AI_DOCUMENT_PDF_EVIDENCE_INTELLIGENCE_CORE_READY" as const;

export const DOCUMENT_LIMITS = {
  maxPdfUploadBytes: 40 * 1024 * 1024,
  maxImageScanBytes: 12 * 1024 * 1024,
  maxPagesPerDocument: 200,
  maxChunksPerDocument: 500,
  maxChunkChars: 1200,
  maxPreviewPages: 5,
} as const;
