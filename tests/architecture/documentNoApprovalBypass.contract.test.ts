import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core has no approval bypass", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/autoApprove|bypassApproval|approve\s*\(|reject\s*\(/i);
});
