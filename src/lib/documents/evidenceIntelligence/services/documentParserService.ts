export type ParsedDocumentPage = {
  pageNumber: number;
  textRu: string;
  source: "pdf_text" | "ocr" | "manual_upload" | "media_scan" | "unknown";
};

export function parseDocumentTextPages(input: {
  documentId: string;
  pages: string[];
  source?: ParsedDocumentPage["source"];
}): ParsedDocumentPage[] {
  return input.pages.map((textRu, index) => ({
    pageNumber: index + 1,
    textRu,
    source: input.source ?? "pdf_text",
  }));
}
