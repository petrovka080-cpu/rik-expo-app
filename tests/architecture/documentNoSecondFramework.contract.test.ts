import { listDocumentEvidenceFiles } from "./documentArchitectureTestHelpers";

test("document evidence core stays in the approved document layer", () => {
  expect(listDocumentEvidenceFiles().every((file) => file.startsWith("src/lib/documents/evidenceIntelligence/"))).toBe(true);
});
