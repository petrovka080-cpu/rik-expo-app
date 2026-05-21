import { parseDocumentTextPages } from "../../src/lib/documents/evidenceIntelligence";

test("document parser preserves page numbers", () => {
  const pages = parseDocumentTextPages({ documentId: "doc-1", pages: ["page one", "page two"] });
  expect(pages.map((page) => page.pageNumber)).toEqual([1, 2]);
});
