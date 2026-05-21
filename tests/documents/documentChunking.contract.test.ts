import { chunkDocumentPages, parseDocumentTextPages } from "../../src/lib/documents/evidenceIntelligence";

test("document chunking produces bounded chunks", () => {
  const pages = parseDocumentTextPages({ documentId: "doc-1", pages: ["a".repeat(20)] });
  const chunks = chunkDocumentPages({
    documentId: "doc-1",
    pages,
    createdAt: "2026-05-21T00:00:00.000Z",
    maxChunkChars: 10,
  });
  expect(chunks).toHaveLength(2);
});
