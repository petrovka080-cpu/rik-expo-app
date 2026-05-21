import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core does not log storage keys", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/console\.(log|warn|error).*storageKey/i);
  expect(source).toContain("canLogStorageKey: false");
});
