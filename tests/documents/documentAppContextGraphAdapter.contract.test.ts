import { documentProof } from "./documentTestFixtures";

test("document context graph exposes PDF and chunk source refs", () => {
  const { contextGraph } = documentProof();
  expect(contextGraph.providerTrace).toContain("aiContextGraphGenericEntityProvider");
  expect(contextGraph.sourceRefs.some((ref) => ref.entityType === "pdf_document")).toBe(true);
  expect(contextGraph.sourceRefs.some((ref) => ref.entityType === "document_chunk")).toBe(true);
});
