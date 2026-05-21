import { documentProof } from "./documentTestFixtures";

test("document deep links target the existing pdf viewer", () => {
  const { sourceRefs } = documentProof();
  const pdf = sourceRefs.find((ref) => ref.entityType === "pdf_document");
  expect(pdf?.appLink.route).toBe("/pdf-viewer");
  expect(pdf?.appLink.params.documentId).toBe("pdf_invoice_45");
});
