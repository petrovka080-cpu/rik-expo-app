import { documentProof } from "./documentTestFixtures";

test("document chunks keep page and extraction metadata", () => {
  const { chunks } = documentProof();
  expect(chunks[0]?.documentId).toBe("pdf_invoice_45");
  expect(chunks[0]?.pageNumber).toBe(1);
  expect(chunks.some((chunk) => chunk.extractedFields.some((field) => field.field === "amount"))).toBe(true);
});
