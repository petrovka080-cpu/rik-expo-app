import { createDocumentPreviewRefs } from "../../src/lib/documents/evidenceIntelligence";

test("document preview creates thumbnail and bounded page previews", () => {
  const preview = createDocumentPreviewRefs({ documentId: "doc-1", pageCount: 20 });
  expect(preview.thumbnail).toContain("doc-1");
  expect(preview.pageImages.length).toBeLessThanOrEqual(5);
});
