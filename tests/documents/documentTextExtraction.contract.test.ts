import { documentProof } from "./documentTestFixtures";

test("text extraction finds amount, company and materials as suggestions", () => {
  const { chunks } = documentProof();
  const fields = chunks.flatMap((chunk) => chunk.extractedFields.map((field) => field.field));
  expect(fields).toContain("amount");
  expect(fields).toContain("company_name");
  expect(fields).toContain("material");
});
