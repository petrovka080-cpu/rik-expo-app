import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core does not post or approve payments", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/postPayment|approvePayment|createPayment|paymentMutated:\s*true/i);
});
