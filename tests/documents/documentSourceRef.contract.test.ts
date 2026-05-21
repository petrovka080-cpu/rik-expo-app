import { documentProof } from "./documentTestFixtures";

test("document source refs include page, chunk and highlight evidence", () => {
  const { sourceRefs } = documentProof();
  expect(sourceRefs.some((ref) => ref.entityType === "pdf_document" && ref.appLink.page === 1)).toBe(true);
  expect(sourceRefs.some((ref) => ref.entityType === "document_chunk" && ref.evidence?.chunkId)).toBe(true);
  expect(sourceRefs.some((ref) => ref.appLink.highlightText === "125 000 KGS")).toBe(true);
});
