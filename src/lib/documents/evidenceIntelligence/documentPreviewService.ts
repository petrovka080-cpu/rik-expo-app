import { DOCUMENT_LIMITS } from "./documentLimits";

export function createDocumentPreviewRefs(input: {
  documentId: string;
  pageCount?: number;
}): { thumbnail: string; pageImages: string[] } {
  const pageCount = Math.max(1, Math.min(input.pageCount ?? 1, DOCUMENT_LIMITS.maxPreviewPages));
  return {
    thumbnail: `document-preview:${input.documentId}:thumbnail`,
    pageImages: Array.from(
      { length: pageCount },
      (_, index) => `document-preview:${input.documentId}:page-${index + 1}`,
    ),
  };
}
