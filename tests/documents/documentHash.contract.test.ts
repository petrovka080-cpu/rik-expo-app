import { createDocumentContentHash } from "../../src/lib/documents/evidenceIntelligence";

test("document content hash is deterministic", () => {
  const hash = createDocumentContentHash({ id: "doc-1", mimeType: "application/pdf", byteSize: 100 });
  expect(hash).toBe(createDocumentContentHash({ id: "doc-1", mimeType: "application/pdf", byteSize: 100 }));
  expect(hash).toMatch(/^doc-sha256-/);
});
